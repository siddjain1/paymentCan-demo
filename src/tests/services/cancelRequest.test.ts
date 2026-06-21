// src/tests/services/cancelRequest.test.ts
// Unit tests for cancelRequest() service — ticket 2.3 ACs.

import {
  createRequest,
  cancelRequest,
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
  remittanceInfo: 'Invoice #99',
  idempotencyKey: 'idem-cancel-001',
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

// ── AC: Valid cancel returns { ok: true, r2pId, status, cancelledAt } ──

describe('cancelRequest — valid cancel', () => {
  it('returns ok:true with r2pId, status=cancelled, cancelledAt for created state', () => {
    const id = seedRequest()
    const result = cancelRequest(id)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.r2pId).toBe(id)
    expect(result.status).toBe('cancelled')
    expect(typeof result.cancelledAt).toBe('string')
    expect(new Date(result.cancelledAt).toISOString()).toBe(result.cancelledAt)
  })

  it('cancels a request in sent state', () => {
    const id = seedRequest()
    forceStatus(id, 'sent')
    const result = cancelRequest(id)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.status).toBe('cancelled')
  })

  it('cancels a request in delivered state', () => {
    const id = seedRequest()
    forceStatus(id, 'delivered')
    const result = cancelRequest(id)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.status).toBe('cancelled')
  })
})

// ── AC: Cancellation persisted to store ──────────────────────

describe('cancelRequest — persistence', () => {
  it('status is updated to cancelled in the store', () => {
    const id = seedRequest()
    cancelRequest(id)
    const row = r2pRepo.findById(id)
    expect(row?.status).toBe('cancelled')
  })

  it('version is incremented after cancellation', () => {
    const id = seedRequest()
    const before = r2pRepo.findById(id)
    cancelRequest(id)
    const after = r2pRepo.findById(id)
    expect(after?.version).toBe((before?.version ?? 0) + 1)
  })
})

// ── AC: 404 NOT_FOUND for unknown r2pId ──────────────────────

describe('cancelRequest — NOT_FOUND', () => {
  it('returns NOT_FOUND for a non-existent r2pId', () => {
    const result = cancelRequest('00000000-0000-7000-0000-000000000000')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('NOT_FOUND')
  })
})

// ── AC: 409 INVALID_STATE_TRANSITION for post-acceptance states ──

describe('cancelRequest — INVALID_STATE_TRANSITION', () => {
  const blockedStates = ['accepted', 'payment_processing', 'paid', 'payment_failed', 'expired', 'cancelled']

  blockedStates.forEach((state) => {
    it(`returns INVALID_STATE_TRANSITION when status is ${state}`, () => {
      const id = seedRequest()
      forceStatus(id, state)
      const result = cancelRequest(id)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.code).toBe('INVALID_STATE_TRANSITION')
    })
  })
})

// ── AC: Audit entry appended with REQUEST_CANCELLED ───────────

describe('cancelRequest — audit trail', () => {
  it('appends REQUEST_CANCELLED audit entry after successful cancel', () => {
    const id = seedRequest()
    cancelRequest(id)

    const audits = auditRepo.list().filter((a) => a.event_type === 'REQUEST_CANCELLED')
    expect(audits).toHaveLength(1)
    expect(audits[0].r2p_id).toBe(id)
    expect(audits[0].actor).toBe('system')
    const detail = JSON.parse(audits[0].detail)
    expect(detail.previousStatus).toBe('created')
  })

  it('does not append audit entry on NOT_FOUND', () => {
    cancelRequest('nonexistent-id')
    const cancelled = auditRepo.list().filter((a) => a.event_type === 'REQUEST_CANCELLED')
    expect(cancelled).toHaveLength(0)
  })

  it('does not append audit entry on INVALID_STATE_TRANSITION', () => {
    const id = seedRequest()
    forceStatus(id, 'paid')
    cancelRequest(id)
    const cancelled = auditRepo.list().filter((a) => a.event_type === 'REQUEST_CANCELLED')
    expect(cancelled).toHaveLength(0)
  })
})

// ── AC: State transition recorded: {previousStatus} → cancelled ──

describe('cancelRequest — state transition', () => {
  it('appends transition from created → cancelled', () => {
    const id = seedRequest()
    cancelRequest(id)

    const transitions = transitionRepo.list().filter(
      (t) => t.r2p_id === id && t.to_status === 'cancelled'
    )
    expect(transitions).toHaveLength(1)
    expect(transitions[0].from_status).toBe('created')
    expect(transitions[0].to_status).toBe('cancelled')
    expect(transitions[0].actor).toBe('system')
  })

  it('records correct from_status when cancelling from sent', () => {
    const id = seedRequest()
    forceStatus(id, 'sent')
    cancelRequest(id)

    const transitions = transitionRepo.list().filter(
      (t) => t.r2p_id === id && t.to_status === 'cancelled'
    )
    expect(transitions).toHaveLength(1)
    expect(transitions[0].from_status).toBe('sent')
  })

  it('does not append transition on failure', () => {
    cancelRequest('nonexistent-id')
    const transitions = transitionRepo.list().filter((t) => t.to_status === 'cancelled')
    expect(transitions).toHaveLength(0)
  })
})

// ── AC: resetStore() ensures isolation ───────────────────────

describe('resetStore() — isolation', () => {
  it('cleared store means prior requests are gone', () => {
    const id = seedRequest()
    resetStore()
    const result = cancelRequest(id)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('NOT_FOUND')
  })
})
