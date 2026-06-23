// src/tests/services/acknowledgeRequest.test.ts
// Unit tests for acknowledgeRequest() service — ticket 4.1 ACs.

import {
  createRequest,
  acknowledgeRequest,
  resetStore,
  r2pRepo,
  auditRepo,
  transitionRepo,
  ackRepo,
} from '../../services/r2pRequest'
import { resetStore as resetAddressStore } from '../../db/store'

// ── Fixtures ──────────────────────────────────────────────────

const baseInput = {
  payerId: 'payer@banka.ca',
  payeeId: 'payee@bankb.ca',
  amount: 150.0,
  currency: 'CAD',
  dueDate: '2026-08-01',
  expiryTimestamp: '2026-08-01T23:59:59Z',
  remittanceInfo: 'Invoice #42',
  idempotencyKey: 'idem-ack-001',
}

const ackInput = {
  participantId: 'BANK_A',
  receivedAt: '2026-07-01T10:00:00Z',
}

function seedRequest(): string {
  const result = createRequest(baseInput)
  if (!result.ok) throw new Error('Seed failed: ' + result.message)
  return result.r2pId
}

function forceStatus(id: string, status: string): void {
  const row = r2pRepo.findById(id)
  if (!row) throw new Error(`Row not found: ${id}`)
  r2pRepo.update(id, { updated_at: new Date().toISOString(), status }, row.version)
}

beforeEach(() => {
  resetStore()
  resetAddressStore()
})

// ── AC: Status transitions to `delivered` on valid acknowledgement ──

describe('acknowledgeRequest — valid ack', () => {
  it('returns ok:true with r2pId and status=delivered', () => {
    const id = seedRequest()
    forceStatus(id, 'sent')
    const result = acknowledgeRequest(id, ackInput)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.r2pId).toBe(id)
    expect(result.status).toBe('delivered')
  })

  it('updates status to delivered in the store', () => {
    const id = seedRequest()
    forceStatus(id, 'sent')
    acknowledgeRequest(id, ackInput)
    expect(r2pRepo.findById(id)?.status).toBe('delivered')
  })

  it('increments version on the request row', () => {
    const id = seedRequest()
    forceStatus(id, 'sent')
    const before = r2pRepo.findById(id)
    acknowledgeRequest(id, ackInput)
    const after = r2pRepo.findById(id)
    expect(after?.version).toBe((before?.version ?? 0) + 1)
  })
})

// ── AC: Timestamped acknowledgement persisted to R2PAcknowledgement table ──

describe('acknowledgeRequest — persistence', () => {
  it('persists acknowledgement row with correct fields', () => {
    const id = seedRequest()
    forceStatus(id, 'sent')
    acknowledgeRequest(id, ackInput)

    const ack = ackRepo.findByR2PId(id)
    expect(ack).toBeDefined()
    expect(ack?.r2p_id).toBe(id)
    expect(ack?.participant_id).toBe(ackInput.participantId)
    expect(ack?.received_at).toBe(ackInput.receivedAt)
    expect(typeof ack?.created_at).toBe('string')
  })
})

// ── AC: 409 ALREADY_ACKNOWLEDGED returned on duplicate ack ───

describe('acknowledgeRequest — ALREADY_ACKNOWLEDGED', () => {
  it('returns ALREADY_ACKNOWLEDGED on second call for same r2pId', () => {
    const id = seedRequest()
    forceStatus(id, 'sent')
    acknowledgeRequest(id, ackInput)

    const result = acknowledgeRequest(id, { participantId: 'BANK_B', receivedAt: '2026-07-01T11:00:00Z' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('ALREADY_ACKNOWLEDGED')
  })

  it('does not overwrite existing ack row on duplicate', () => {
    const id = seedRequest()
    forceStatus(id, 'sent')
    acknowledgeRequest(id, ackInput)
    acknowledgeRequest(id, { participantId: 'BANK_B', receivedAt: '2026-07-01T11:00:00Z' })

    const ack = ackRepo.findByR2PId(id)
    expect(ack?.participant_id).toBe(ackInput.participantId)
  })
})

// ── AC: 404 NOT_FOUND for unknown r2pId ──────────────────────

describe('acknowledgeRequest — NOT_FOUND', () => {
  it('returns NOT_FOUND for a non-existent r2pId', () => {
    const result = acknowledgeRequest('00000000-0000-7000-0000-000000000000', ackInput)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('NOT_FOUND')
  })
})

// ── AC: `acknowledged` event emitted to Event Publisher ──────

describe('acknowledgeRequest — event emission', () => {
  it('appends REQUEST_ACKNOWLEDGED audit entry', () => {
    const id = seedRequest()
    forceStatus(id, 'sent')
    acknowledgeRequest(id, ackInput)

    const acks = auditRepo.list().filter((a) => a.event_type === 'REQUEST_ACKNOWLEDGED')
    expect(acks).toHaveLength(1)
    expect(acks[0].r2p_id).toBe(id)
    expect(acks[0].actor).toBe(ackInput.participantId)
  })

  it('appends EVENT_ACKNOWLEDGED_EMITTED audit entry', () => {
    const id = seedRequest()
    forceStatus(id, 'sent')
    acknowledgeRequest(id, ackInput)

    const emitted = auditRepo.list().filter((a) => a.event_type === 'EVENT_ACKNOWLEDGED_EMITTED')
    expect(emitted).toHaveLength(1)
    expect(emitted[0].r2p_id).toBe(id)
    expect(emitted[0].actor).toBe('event-publisher')
  })

  it('does not emit event on NOT_FOUND', () => {
    acknowledgeRequest('nonexistent-id', ackInput)
    const emitted = auditRepo.list().filter((a) => a.event_type === 'EVENT_ACKNOWLEDGED_EMITTED')
    expect(emitted).toHaveLength(0)
  })

  it('does not emit event on ALREADY_ACKNOWLEDGED', () => {
    const id = seedRequest()
    forceStatus(id, 'sent')
    acknowledgeRequest(id, ackInput)
    acknowledgeRequest(id, ackInput)

    const emitted = auditRepo.list().filter((a) => a.event_type === 'EVENT_ACKNOWLEDGED_EMITTED')
    expect(emitted).toHaveLength(1)
  })
})

// ── AC: State transition recorded ────────────────────────────

describe('acknowledgeRequest — state transition', () => {
  it('appends transition from sent → delivered', () => {
    const id = seedRequest()
    forceStatus(id, 'sent')
    acknowledgeRequest(id, ackInput)

    const transitions = transitionRepo.list().filter(
      (t) => t.r2p_id === id && t.to_status === 'delivered'
    )
    expect(transitions).toHaveLength(1)
    expect(transitions[0].from_status).toBe('sent')
    expect(transitions[0].to_status).toBe('delivered')
    expect(transitions[0].actor).toBe(ackInput.participantId)
  })

  it('does not append transition on failure', () => {
    acknowledgeRequest('nonexistent-id', ackInput)
    const transitions = transitionRepo.list().filter((t) => t.to_status === 'delivered')
    expect(transitions).toHaveLength(0)
  })
})

// ── AC: resetStore() ensures isolation ───────────────────────

describe('resetStore() — isolation', () => {
  it('clears acknowledgements between tests', () => {
    const id = seedRequest()
    forceStatus(id, 'sent')
    acknowledgeRequest(id, ackInput)
    resetStore()
    resetAddressStore()

    const id2 = seedRequest()
    forceStatus(id2, 'sent')
    const result = acknowledgeRequest(id2, ackInput)
    expect(result.ok).toBe(true)
  })
})
