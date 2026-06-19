// src/tests/services/r2pRequest.test.ts
// Unit tests for createRequest() service — ticket 2.1 ACs.

import {
  createRequest,
  resetStore,
  r2pRepo,
  auditRepo,
  transitionRepo,
  generateR2PId,
} from '../../services/r2pRequest'
import { resetStore as resetAddressStore } from '../../db/store'

// Valid pain.013 input using a seeded email proxy (payer@banka.ca → BANK_A)
const validInput = {
  payerId: 'payer@banka.ca',
  payeeId: 'payee@bankb.ca',
  amount: 100.0,
  currency: 'CAD',
  dueDate: '2026-07-01',
  expiryTimestamp: '2026-07-01T23:59:59Z',
  remittanceInfo: 'Invoice #42',
  idempotencyKey: 'idem-key-001',
}

beforeEach(() => {
  resetStore()
  resetAddressStore()
})

// ── AC: Valid request returns { ok: true, r2pId, status, createdAt } ──

describe('createRequest — valid input', () => {
  it('returns ok:true with r2pId, status=created, createdAt', () => {
    const result = createRequest(validInput)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.r2pId).toBeTruthy()
    expect(result.status).toBe('created')
    expect(typeof result.createdAt).toBe('string')
    expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt)
  })
})

// ── AC: r2pId is UUID v7 (time-ordered hex prefix) ──────────────

describe('generateR2PId()', () => {
  it('produces a string matching UUID v7 format', () => {
    const id = generateR2PId()
    // Pattern: 8-4-4-4-12 hex chars, version digit = 7
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('first segment encodes a recent timestamp (hex > 0)', () => {
    const id = generateR2PId()
    // First 8 hex chars are top 32 bits of the 48-bit ms timestamp
    const tsHex = id.slice(0, 8)
    const ts = parseInt(tsHex, 16)
    expect(ts).toBeGreaterThan(0)
  })

  it('IDs generated across different milliseconds are ordered', async () => {
    const id1 = generateR2PId()
    await new Promise((r) => setTimeout(r, 2))
    const id2 = generateR2PId()
    expect(id2 > id1).toBe(true)
  })
})

// ── AC: Duplicate idempotencyKey returns 409 DUPLICATE_REQUEST ──

describe('createRequest — duplicate idempotencyKey', () => {
  it('returns DUPLICATE_REQUEST on second call with same key', () => {
    createRequest(validInput)
    const result = createRequest({ ...validInput })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('DUPLICATE_REQUEST')
  })
})

// ── AC: Unknown payer proxy returns 404 PAYER_NOT_FOUND ─────────

describe('createRequest — unknown payer', () => {
  it('returns PAYER_NOT_FOUND for unregistered email', () => {
    const result = createRequest({
      ...validInput,
      payerId: 'nobody@unknown.ca',
      idempotencyKey: 'idem-unknown',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('PAYER_NOT_FOUND')
  })
})

// ── AC: Request persisted with all fields correct ────────────────

describe('createRequest — persistence', () => {
  it('persists row to in-memory store with correct fields', () => {
    const result = createRequest(validInput)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const row = r2pRepo.findById(result.r2pId)
    expect(row).toBeDefined()
    if (!row) return

    expect(row.id).toBe(result.r2pId)
    expect(row.idempotency_key).toBe(validInput.idempotencyKey)
    expect(row.payer_id).toBe(validInput.payerId)
    expect(row.payee_id).toBe(validInput.payeeId)
    expect(row.amount).toBe(validInput.amount)
    expect(row.currency).toBe(validInput.currency)
    expect(row.due_date).toBe(validInput.dueDate)
    expect(row.expiry_timestamp).toBe(validInput.expiryTimestamp)
    expect(row.remittance_info).toBe(validInput.remittanceInfo)
    expect(row.status).toBe('created')
    expect(row.version).toBe(0)
    expect(row.originating_participant_id).toBe('PLATFORM')
    expect(row.receiving_participant_id).toBe('BANK_A')
  })

  it('findByIdempotencyKey returns the row', () => {
    createRequest(validInput)
    const row = r2pRepo.findByIdempotencyKey(validInput.idempotencyKey)
    expect(row).toBeDefined()
    expect(row?.payer_id).toBe(validInput.payerId)
  })
})

// ── AC: Audit entry appended with event_type REQUEST_CREATED ────

describe('createRequest — audit trail', () => {
  it('appends audit entry with event_type=REQUEST_CREATED', () => {
    const result = createRequest(validInput)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const audits = auditRepo.list()
    expect(audits).toHaveLength(1)
    expect(audits[0].r2p_id).toBe(result.r2pId)
    expect(audits[0].event_type).toBe('REQUEST_CREATED')
    expect(audits[0].actor).toBe('system')
    expect(typeof audits[0].detail).toBe('string')
    // detail should contain the input as JSON
    const detail = JSON.parse(audits[0].detail)
    expect(detail.idempotencyKey).toBe(validInput.idempotencyKey)
  })
})

// ── AC: State transition appended: null → created ────────────────

describe('createRequest — state transition', () => {
  it('appends state transition null→created', () => {
    const result = createRequest(validInput)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    const transitions = transitionRepo.list()
    expect(transitions).toHaveLength(1)
    expect(transitions[0].r2p_id).toBe(result.r2pId)
    expect(transitions[0].from_status).toBeNull()
    expect(transitions[0].to_status).toBe('created')
    expect(transitions[0].actor).toBe('system')
  })
})

// ── AC: resetStore() ensures isolation between tests ─────────────

describe('resetStore()', () => {
  it('clears all stores so subsequent calls start fresh', () => {
    createRequest(validInput)
    resetStore()

    const rows = r2pRepo.listAll()
    expect(rows).toHaveLength(0)
    expect(auditRepo.list()).toHaveLength(0)
    expect(transitionRepo.list()).toHaveLength(0)

    // After reset the same idempotencyKey must succeed again
    const result = createRequest(validInput)
    expect(result.ok).toBe(true)
  })
})

// ── No audit/transition on failure ───────────────────────────────

describe('createRequest — no side effects on failure', () => {
  it('does not write audit or transition on PAYER_NOT_FOUND', () => {
    createRequest({ ...validInput, payerId: 'ghost@ghost.ca', idempotencyKey: 'k2' })
    expect(auditRepo.list()).toHaveLength(0)
    expect(transitionRepo.list()).toHaveLength(0)
  })

  it('does not write audit or transition on DUPLICATE_REQUEST', () => {
    createRequest(validInput)
    createRequest({ ...validInput })
    // Only one audit entry from the first successful call
    expect(auditRepo.list()).toHaveLength(1)
    expect(transitionRepo.list()).toHaveLength(1)
  })
})
