// src/services/r2pRequest.ts
// Service layer for R2P request creation.
// Uses in-memory stores for requests, audit log, and state transitions.

import { randomUUID } from 'crypto'
import { resolve } from './addressDirectory'

// ── Types ─────────────────────────────────────────────────────

export interface CreateRequestInput {
  payerId: string
  payeeId: string
  amount: number
  currency: string
  dueDate: string
  expiryTimestamp: string
  remittanceInfo?: string
  idempotencyKey: string
}

export type CreateRequestResult =
  | { ok: true; r2pId: string; status: 'created'; createdAt: string }
  | { ok: false; code: 'DUPLICATE_REQUEST' | 'PAYER_NOT_FOUND'; message: string }

export interface R2PRequestRow {
  id: string
  idempotency_key: string
  payer_id: string
  payee_id: string
  originating_participant_id: string
  receiving_participant_id: string
  amount: number
  currency: string
  due_date: string
  expiry_timestamp: string
  remittance_info: string | null
  status: string
  version: number
  created_at: string
  updated_at: string
}

export interface AuditRow {
  r2p_id: string
  event_type: string
  actor: string
  detail: string
  created_at: string
}

export interface StateTransitionRow {
  r2p_id: string
  from_status: string | null
  to_status: string
  actor: string
  created_at: string
}

// ── In-memory stores ──────────────────────────────────────────

const requestsByIdempotencyKey: Map<string, R2PRequestRow> = new Map()
const requestsById: Map<string, R2PRequestRow> = new Map()
const auditLog: AuditRow[] = []
const stateTransitions: StateTransitionRow[] = []

// ── ID generation ─────────────────────────────────────────────

/**
 * Generates a UUID v7 (time-ordered).
 * Structure: {8 hex ts}-{4 hex ts}-7{3 hex rand}-{4 hex rand}-{12 hex rand}
 */
export function generateR2PId(): string {
  const ts = Date.now().toString(16).padStart(12, '0')
  const rand = randomUUID().replace(/-/g, '').slice(12)
  return `${ts.slice(0, 8)}-${ts.slice(8)}-7${rand.slice(0, 3)}-${rand.slice(3, 7)}-${rand.slice(7, 19)}`
}

// ── Repository helpers ────────────────────────────────────────

export const r2pRepo = {
  findByIdempotencyKey(key: string): R2PRequestRow | undefined {
    return requestsByIdempotencyKey.get(key)
  },
  save(row: R2PRequestRow): void {
    requestsByIdempotencyKey.set(row.idempotency_key, row)
    requestsById.set(row.id, row)
  },
  findById(id: string): R2PRequestRow | undefined {
    return requestsById.get(id)
  },
  listAll(): R2PRequestRow[] {
    return Array.from(requestsById.values())
  },
}

export const auditRepo = {
  append(entry: Omit<AuditRow, 'created_at'>): void {
    auditLog.push({ ...entry, created_at: new Date().toISOString() })
  },
  list(): AuditRow[] {
    return [...auditLog]
  },
}

export const transitionRepo = {
  append(entry: Omit<StateTransitionRow, 'created_at'>): void {
    stateTransitions.push({ ...entry, created_at: new Date().toISOString() })
  },
  list(): StateTransitionRow[] {
    return [...stateTransitions]
  },
}

// ── Test helpers ──────────────────────────────────────────────

/** Reset all in-memory stores. Only for use in tests. */
export function resetStore(): void {
  requestsByIdempotencyKey.clear()
  requestsById.clear()
  auditLog.length = 0
  stateTransitions.length = 0
}

// ── Service ───────────────────────────────────────────────────

export function createRequest(input: CreateRequestInput): CreateRequestResult {
  // 1. Idempotency check
  if (r2pRepo.findByIdempotencyKey(input.idempotencyKey)) {
    return { ok: false, code: 'DUPLICATE_REQUEST', message: 'A request with this idempotency key already exists' }
  }

  // 2. Resolve payer proxy (treat payerId as email proxy per spec POC)
  const resolved = resolve('email', input.payerId)
  if (!resolved) {
    return { ok: false, code: 'PAYER_NOT_FOUND', message: `Payer proxy not found: ${input.payerId}` }
  }

  // 3. Generate r2pId
  const r2pId = generateR2PId()
  const now = new Date().toISOString()

  // 4. Persist request
  const row: R2PRequestRow = {
    id: r2pId,
    idempotency_key: input.idempotencyKey,
    payer_id: input.payerId,
    payee_id: input.payeeId,
    originating_participant_id: 'PLATFORM',
    receiving_participant_id: resolved.participantId,
    amount: input.amount,
    currency: input.currency,
    due_date: input.dueDate,
    expiry_timestamp: input.expiryTimestamp,
    remittance_info: input.remittanceInfo ?? null,
    status: 'created',
    version: 0,
    created_at: now,
    updated_at: now,
  }
  r2pRepo.save(row)

  // 5. Audit trail
  auditRepo.append({
    r2p_id: r2pId,
    event_type: 'REQUEST_CREATED',
    actor: 'system',
    detail: JSON.stringify(input),
  })

  // 6. State transition
  transitionRepo.append({
    r2p_id: r2pId,
    from_status: null,
    to_status: 'created',
    actor: 'system',
  })

  // 7. Return
  return { ok: true, r2pId, status: 'created', createdAt: row.created_at }
}
