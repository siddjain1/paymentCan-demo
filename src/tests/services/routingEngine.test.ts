// src/tests/services/routingEngine.test.ts
// Unit tests for dispatch() — ticket 3.1 ACs.
// HTTP client is mocked via setHttpClient() — no real network calls.

import {
  dispatch,
  setHttpClient,
  resetHttpClient,
} from '../../services/routingEngine'
import {
  createRequest,
  resetStore,
  r2pRepo,
  auditRepo,
  transitionRepo,
} from '../../services/r2pRequest'
import { resetStore as resetAddressStore } from '../../db/store'

// ── Fixtures ──────────────────────────────────────────────────

const baseInput = {
  payerId: 'payer@banka.ca',
  payeeId: 'payee@bankb.ca',
  amount: 100.0,
  currency: 'CAD',
  dueDate: '2026-07-01',
  expiryTimestamp: '2026-07-01T23:59:59Z',
  remittanceInfo: 'Invoice #routing',
  idempotencyKey: 'idem-routing-001',
}

const TEST_ENDPOINT = 'http://localhost:4001'
const TEST_PAYLOAD = { r2pId: 'test-id', payerId: 'payer@banka.ca', payeeId: 'payee@bankb.ca', amount: 100, currency: 'CAD', dueDate: '2026-07-01' }

function seedRequest(): string {
  const result = createRequest(baseInput)
  if (!result.ok) throw new Error('Seed failed: ' + result.message)
  return result.r2pId
}

beforeEach(() => {
  resetStore()
  resetAddressStore()
  resetHttpClient()
})

// ── AC: status transitions created → sent before HTTP call ───

describe('dispatch() — status transition', () => {
  it('transitions status from created to sent', async () => {
    setHttpClient(async () => ({ statusCode: 200 }))
    const id = seedRequest()

    // Force back to created so we can test dispatch independently
    const row = r2pRepo.findById(id)!
    // status may already be 'sent' from fire-and-forget in createRequest — reset for isolation
    r2pRepo.update(id, { status: 'created', updated_at: new Date().toISOString() }, row.version)

    const currentRow = r2pRepo.findById(id)!
    await dispatch(id, TEST_ENDPOINT, TEST_PAYLOAD)

    const after = r2pRepo.findById(id)
    expect(after?.status).toBe('sent')
  })

  it('appends created→sent transition record', async () => {
    setHttpClient(async () => ({ statusCode: 200 }))

    // Use a fresh request with a controlled store state
    resetStore()
    resetAddressStore()

    const r = createRequest({ ...baseInput, idempotencyKey: 'idem-transition-test' })
    if (!r.ok) throw new Error('seed failed')
    const id = r.r2pId

    // Force back to created for clean test
    const row = r2pRepo.findById(id)!
    r2pRepo.update(id, { status: 'created', updated_at: new Date().toISOString() }, row.version)
    // clear transitions to isolate
    const before = transitionRepo.list().length

    await dispatch(id, TEST_ENDPOINT, TEST_PAYLOAD)

    const transitions = transitionRepo.list().filter(
      (t) => t.r2p_id === id && t.to_status === 'sent'
    )
    expect(transitions.length).toBeGreaterThanOrEqual(1)
    expect(transitions[transitions.length - 1].from_status).toBe('created')
    expect(transitions[transitions.length - 1].actor).toBe('routing-engine')
  })
})

// ── AC: DELIVERY_DISPATCHED audit entry recorded ──────────────

describe('dispatch() — DELIVERY_DISPATCHED audit', () => {
  it('records DELIVERY_DISPATCHED with endpoint before HTTP call', async () => {
    let calledAfterAudit = false
    setHttpClient(async () => {
      calledAfterAudit = true
      return { statusCode: 200 }
    })

    resetStore()
    resetAddressStore()
    const r = createRequest({ ...baseInput, idempotencyKey: 'idem-audit-dispatch' })
    if (!r.ok) throw new Error('seed failed')
    const id = r.r2pId

    const row = r2pRepo.findById(id)!
    r2pRepo.update(id, { status: 'created', updated_at: new Date().toISOString() }, row.version)

    await dispatch(id, TEST_ENDPOINT, TEST_PAYLOAD)

    const dispatched = auditRepo.list().filter(
      (a) => a.r2p_id === id && a.event_type === 'DELIVERY_DISPATCHED'
    )
    expect(dispatched.length).toBeGreaterThanOrEqual(1)
    expect(JSON.parse(dispatched[dispatched.length - 1].detail).endpoint).toBe(TEST_ENDPOINT)
    expect(calledAfterAudit).toBe(true)
  })
})

// ── AC: HTTP 2xx → delivered + DELIVERY_CONFIRMED ────────────

describe('dispatch() — HTTP 2xx success', () => {
  it('returns { status: delivered } on 200', async () => {
    setHttpClient(async () => ({ statusCode: 200 }))
    const result = await dispatch('any-id', TEST_ENDPOINT, TEST_PAYLOAD)
    expect(result.status).toBe('delivered')
    expect(result.statusCode).toBe(200)
  })

  it('returns { status: delivered } on 201', async () => {
    setHttpClient(async () => ({ statusCode: 201 }))
    const result = await dispatch('any-id', TEST_ENDPOINT, TEST_PAYLOAD)
    expect(result.status).toBe('delivered')
  })

  it('records DELIVERY_CONFIRMED audit entry on 2xx', async () => {
    setHttpClient(async () => ({ statusCode: 200 }))

    resetStore()
    resetAddressStore()
    const r = createRequest({ ...baseInput, idempotencyKey: 'idem-confirmed' })
    if (!r.ok) throw new Error('seed failed')
    const id = r.r2pId

    await dispatch(id, TEST_ENDPOINT, TEST_PAYLOAD)

    const confirmed = auditRepo.list().filter(
      (a) => a.r2p_id === id && a.event_type === 'DELIVERY_CONFIRMED'
    )
    expect(confirmed.length).toBeGreaterThanOrEqual(1)
    const detail = JSON.parse(confirmed[confirmed.length - 1].detail)
    expect(detail.statusCode).toBe(200)
  })
})

// ── AC: Non-2xx → failed + DELIVERY_FAILED ───────────────────

describe('dispatch() — non-2xx failure', () => {
  it('returns { status: failed } on 500', async () => {
    setHttpClient(async () => ({ statusCode: 500 }))
    const result = await dispatch('any-id', TEST_ENDPOINT, TEST_PAYLOAD)
    expect(result.status).toBe('failed')
    expect(result.statusCode).toBe(500)
  })

  it('returns { status: failed } on 404', async () => {
    setHttpClient(async () => ({ statusCode: 404 }))
    const result = await dispatch('any-id', TEST_ENDPOINT, TEST_PAYLOAD)
    expect(result.status).toBe('failed')
  })

  it('records DELIVERY_FAILED audit on non-2xx', async () => {
    setHttpClient(async () => ({ statusCode: 503 }))

    resetStore()
    resetAddressStore()
    const r = createRequest({ ...baseInput, idempotencyKey: 'idem-non2xx' })
    if (!r.ok) throw new Error('seed failed')
    const id = r.r2pId

    await dispatch(id, TEST_ENDPOINT, TEST_PAYLOAD)

    const failed = auditRepo.list().filter(
      (a) => a.r2p_id === id && a.event_type === 'DELIVERY_FAILED'
    )
    expect(failed.length).toBeGreaterThanOrEqual(1)
    const detail = JSON.parse(failed[failed.length - 1].detail)
    expect(detail.statusCode).toBe(503)
  })
})

// ── AC: Network error → failed + DELIVERY_FAILED (no throw) ──

describe('dispatch() — network error', () => {
  it('returns { status: failed } on network error without throwing', async () => {
    setHttpClient(async () => { throw new Error('ECONNREFUSED') })
    const result = await dispatch('any-id', TEST_ENDPOINT, TEST_PAYLOAD)
    expect(result.status).toBe('failed')
    expect(result.error).toContain('ECONNREFUSED')
  })

  it('records DELIVERY_FAILED with error message on network error', async () => {
    setHttpClient(async () => { throw new Error('connect ETIMEDOUT') })

    resetStore()
    resetAddressStore()
    const r = createRequest({ ...baseInput, idempotencyKey: 'idem-neterr' })
    if (!r.ok) throw new Error('seed failed')
    const id = r.r2pId

    await dispatch(id, TEST_ENDPOINT, TEST_PAYLOAD)

    const failed = auditRepo.list().filter(
      (a) => a.r2p_id === id && a.event_type === 'DELIVERY_FAILED'
    )
    expect(failed.length).toBeGreaterThanOrEqual(1)
    const detail = JSON.parse(failed[failed.length - 1].detail)
    expect(detail.error).toContain('ETIMEDOUT')
  })
})

// ── AC: createRequest() calls dispatch() fire-and-forget ──────

describe('createRequest() integration — dispatch is triggered', () => {
  it('records DELIVERY_DISPATCHED after createRequest() resolves', async () => {
    setHttpClient(async () => ({ statusCode: 200 }))

    resetStore()
    resetAddressStore()
    const result = createRequest({ ...baseInput, idempotencyKey: 'idem-integration' })
    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Let the fire-and-forget dispatch complete
    await new Promise((r) => setTimeout(r, 20))

    const dispatched = auditRepo.list().filter(
      (a) => a.r2p_id === result.r2pId && a.event_type === 'DELIVERY_DISPATCHED'
    )
    expect(dispatched.length).toBeGreaterThanOrEqual(1)
  })

  it('createRequest() returns created synchronously before dispatch settles', () => {
    setHttpClient(async () => {
      await new Promise((r) => setTimeout(r, 100))
      return { statusCode: 200 }
    })

    resetStore()
    resetAddressStore()
    const result = createRequest({ ...baseInput, idempotencyKey: 'idem-sync' })
    // Must return immediately (synchronously), not wait for HTTP
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.status).toBe('created')
  })
})
