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

export interface ModifyRequestInput {
  amount?: number
  dueDate?: string
  expiryTimestamp?: string
  remittanceInfo?: string
}

export type ModifyRequestResult =
  | { ok: true; r2pId: string; status: string; updatedAt: string }
  | { ok: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' | 'NO_FIELDS_TO_UPDATE' | 'VALIDATION_ERROR'; message: string }

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
  update(id: string, fields: Partial<R2PRequestRow> & { updated_at: string }, expectedVersion: number): R2PRequestRow {
    const current = requestsById.get(id)
    if (!current) throw new Error(`Record not found: ${id}`)
    if (current.version !== expectedVersion) throw new Error(`Version mismatch: expected ${expectedVersion}, got ${current.version}`)
    const updated: R2PRequestRow = { ...current, ...fields, version: current.version + 1 }
    requestsById.set(id, updated)
    requestsByIdempotencyKey.set(updated.idempotency_key, updated)
    return updated
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

// ── modifyRequest ─────────────────────────────────────────────

const MODIFIABLE_STATES = ['created', 'sent']

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false
  const d = new Date(s)
  return !isNaN(d.getTime())
}

function isValidISO8601WithTimezone(s: string): boolean {
  // Must have timezone indicator: Z or +/-HH:MM
  if (!/Z$|[+-]\d{2}:\d{2}$/.test(s)) return false
  const d = new Date(s)
  return !isNaN(d.getTime())
}

export function modifyRequest(r2pId: string, patch: ModifyRequestInput): ModifyRequestResult {
  // 1. Empty patch check
  const recognisedKeys: (keyof ModifyRequestInput)[] = ['amount', 'dueDate', 'expiryTimestamp', 'remittanceInfo']
  const presentKeys = recognisedKeys.filter((k) => k in patch)
  if (presentKeys.length === 0) {
    return { ok: false, code: 'NO_FIELDS_TO_UPDATE', message: 'Patch body is empty or contains no recognised fields' }
  }

  // 2. Fetch
  const current = r2pRepo.findById(r2pId)
  if (!current) {
    return { ok: false, code: 'NOT_FOUND', message: `Request not found: ${r2pId}` }
  }

  // 3. State guard
  if (!MODIFIABLE_STATES.includes(current.status)) {
    return { ok: false, code: 'INVALID_STATE_TRANSITION', message: `Cannot modify request in state: ${current.status}` }
  }

  // 4. Field validation
  if ('amount' in patch) {
    const v = patch.amount
    if (typeof v !== 'number' || !isFinite(v) || v <= 0) {
      return { ok: false, code: 'VALIDATION_ERROR', message: 'amount must be a finite number greater than 0' }
    }
  }
  if ('dueDate' in patch) {
    if (typeof patch.dueDate !== 'string' || !isValidDate(patch.dueDate)) {
      return { ok: false, code: 'VALIDATION_ERROR', message: 'dueDate must be a valid date in YYYY-MM-DD format' }
    }
  }
  if ('expiryTimestamp' in patch) {
    if (typeof patch.expiryTimestamp !== 'string' || !isValidISO8601WithTimezone(patch.expiryTimestamp)) {
      return { ok: false, code: 'VALIDATION_ERROR', message: 'expiryTimestamp must be a valid ISO 8601 datetime with timezone' }
    }
  }
  if ('remittanceInfo' in patch) {
    if (typeof patch.remittanceInfo !== 'string') {
      return { ok: false, code: 'VALIDATION_ERROR', message: 'remittanceInfo must be a string' }
    }
  }

  // 5. Apply patch
  const now = new Date().toISOString()
  const updateFields: Partial<R2PRequestRow> & { updated_at: string } = { updated_at: now }
  if ('amount' in patch) updateFields.amount = patch.amount
  if ('dueDate' in patch) updateFields.due_date = patch.dueDate
  if ('expiryTimestamp' in patch) updateFields.expiry_timestamp = patch.expiryTimestamp
  if ('remittanceInfo' in patch) updateFields.remittance_info = patch.remittanceInfo ?? null

  const updated = r2pRepo.update(r2pId, updateFields, current.version)

  // 6. Audit
  auditRepo.append({
    r2p_id: r2pId,
    event_type: 'REQUEST_MODIFIED',
    actor: 'system',
    detail: JSON.stringify(patch),
  })

  // 7. Transition record (same status → same status)
  transitionRepo.append({
    r2p_id: r2pId,
    from_status: current.status,
    to_status: current.status,
    actor: 'system',
  })

  // 8. Return
  return { ok: true, r2pId, status: updated.status, updatedAt: updated.updated_at }
}
