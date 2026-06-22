// src/services/r2pRequest.ts
// Service layer for R2P request creation.
// Uses in-memory stores for requests, audit log, and state transitions.

import { randomUUID } from 'crypto'
import { resolve } from './addressDirectory'
import { dispatch } from './routingEngine'

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

export type CancelRequestResult =
  | { ok: true; r2pId: string; status: 'cancelled'; cancelledAt: string }
  | { ok: false; code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION'; message: string }

export interface AcknowledgeRequestInput {
  participantId: string
  receivedAt: string
}

export type AcknowledgeRequestResult =
  | { ok: true; r2pId: string; status: 'delivered' }
  | { ok: false; code: 'NOT_FOUND' | 'ALREADY_ACKNOWLEDGED'; message: string }

export interface AcknowledgementRow {
  r2p_id: string
  participant_id: string
  received_at: string
  created_at: string
}

export interface RespondToRequestInput {
  responseType: 'accept' | 'decline' | 'defer'
  participantId: string
  respondedAt: string
}

export type RespondToRequestResult =
  | { ok: true; r2pId: string; status: string }
  | { ok: false; code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'EXPIRED' | 'INVALID_STATE_TRANSITION'; message: string }

export interface R2PResponseRow {
  response_id: string
  r2p_id: string
  response_type: 'accept' | 'decline' | 'defer'
  responding_participant_id: string
  responded_at: string
  created_at: string
}

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
const acknowledgements: Map<string, AcknowledgementRow> = new Map()
const responses: Map<string, R2PResponseRow> = new Map()

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

export const responseRepo = {
  findByR2PId(r2pId: string): R2PResponseRow | undefined {
    return responses.get(r2pId)
  },
  save(row: R2PResponseRow): void {
    responses.set(row.r2p_id, row)
  },
  list(): R2PResponseRow[] {
    return Array.from(responses.values())
  },
}

export const ackRepo = {
  findByR2PId(r2pId: string): AcknowledgementRow | undefined {
    return acknowledgements.get(r2pId)
  },
  save(row: AcknowledgementRow): void {
    acknowledgements.set(row.r2p_id, row)
  },
  list(): AcknowledgementRow[] {
    return Array.from(acknowledgements.values())
  },
}

// ── Test helpers ──────────────────────────────────────────────

/** Reset all in-memory stores. Only for use in tests. */
export function resetStore(): void {
  requestsByIdempotencyKey.clear()
  requestsById.clear()
  auditLog.length = 0
  stateTransitions.length = 0
  acknowledgements.clear()
  responses.clear()
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

  // 7. Route to receiving participant (fire-and-forget — ticket 3.1)
  // Deferred to next tick so createRequest() returns 'created' before dispatch mutates state.
  setTimeout(() => {
    void dispatch(r2pId, resolved.participantEndpoint, {
      r2pId,
      payerId: input.payerId,
      payeeId: input.payeeId,
      amount: input.amount,
      currency: input.currency,
      dueDate: input.dueDate,
    })
  }, 0)

  // 8. Return
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

// ── cancelRequest ─────────────────────────────────────────────

const CANCELLABLE_STATES = ['created', 'sent', 'delivered', 'delivery_failed']

export function cancelRequest(r2pId: string): CancelRequestResult {
  // 1. Fetch
  const current = r2pRepo.findById(r2pId)
  if (!current) {
    return { ok: false, code: 'NOT_FOUND', message: `Request not found: ${r2pId}` }
  }

  // 2. State guard
  if (!CANCELLABLE_STATES.includes(current.status)) {
    return { ok: false, code: 'INVALID_STATE_TRANSITION', message: `Cannot cancel request in state: ${current.status}` }
  }

  // 3. Apply cancellation
  const now = new Date().toISOString()
  r2pRepo.update(r2pId, { status: 'cancelled', updated_at: now }, current.version)

  // 4. Audit
  auditRepo.append({
    r2p_id: r2pId,
    event_type: 'REQUEST_CANCELLED',
    actor: 'system',
    detail: JSON.stringify({ previousStatus: current.status }),
  })

  // 5. State transition
  transitionRepo.append({
    r2p_id: r2pId,
    from_status: current.status,
    to_status: 'cancelled',
    actor: 'system',
  })

  // 6. Return
  return { ok: true, r2pId, status: 'cancelled', cancelledAt: now }
}

// ── acknowledgeRequest ────────────────────────────────────────

export function acknowledgeRequest(r2pId: string, input: AcknowledgeRequestInput): AcknowledgeRequestResult {
  // 1. Fetch
  const current = r2pRepo.findById(r2pId)
  if (!current) {
    return { ok: false, code: 'NOT_FOUND', message: `Request not found: ${r2pId}` }
  }

  // 2. Duplicate ack check
  if (ackRepo.findByR2PId(r2pId)) {
    return { ok: false, code: 'ALREADY_ACKNOWLEDGED', message: 'Request has already been acknowledged' }
  }

  const now = new Date().toISOString()

  // 3. Persist acknowledgement
  ackRepo.save({
    r2p_id: r2pId,
    participant_id: input.participantId,
    received_at: input.receivedAt,
    created_at: now,
  })

  // 4. Transition → delivered
  r2pRepo.update(r2pId, { status: 'delivered', updated_at: now }, current.version)

  // 5. Audit
  auditRepo.append({
    r2p_id: r2pId,
    event_type: 'REQUEST_ACKNOWLEDGED',
    actor: input.participantId,
    detail: JSON.stringify({ participantId: input.participantId, receivedAt: input.receivedAt }),
  })

  // 6. State transition
  transitionRepo.append({
    r2p_id: r2pId,
    from_status: current.status,
    to_status: 'delivered',
    actor: input.participantId,
  })

  // 7. Emit acknowledged event (stub — ticket 6.5)
  auditRepo.append({
    r2p_id: r2pId,
    event_type: 'EVENT_ACKNOWLEDGED_EMITTED',
    actor: 'event-publisher',
    detail: JSON.stringify({ participantId: input.participantId }),
  })

  return { ok: true, r2pId, status: 'delivered' }
}

// ── respondToRequest ──────────────────────────────────────────

const VALID_RESPONSE_TYPES = ['accept', 'decline', 'defer'] as const

const RESPONSE_STATUS_MAP: Record<string, string> = {
  accept:  'accepted',
  decline: 'declined',
  defer:   'deferred',
}

export function respondToRequest(r2pId: string, input: RespondToRequestInput): RespondToRequestResult {
  // 1. Fetch
  const current = r2pRepo.findById(r2pId)
  if (!current) {
    return { ok: false, code: 'NOT_FOUND', message: `Request not found: ${r2pId}` }
  }

  // 2. State guard
  if (current.status !== 'delivered') {
    return { ok: false, code: 'INVALID_STATE_TRANSITION', message: `Cannot respond to request in state: ${current.status}` }
  }

  // 3. Expiry check
  if (new Date(current.expiry_timestamp) < new Date()) {
    return { ok: false, code: 'EXPIRED', message: 'Request has expired' }
  }

  // 4. Input validation
  if (!(VALID_RESPONSE_TYPES as readonly string[]).includes(input.responseType)) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'responseType must be one of: accept, decline, defer' }
  }

  const now = new Date().toISOString()
  const newStatus = RESPONSE_STATUS_MAP[input.responseType]

  // 5. Persist response
  responseRepo.save({
    response_id: randomUUID(),
    r2p_id: r2pId,
    response_type: input.responseType,
    responding_participant_id: input.participantId,
    responded_at: input.respondedAt,
    created_at: now,
  })

  // 6. Transition status
  r2pRepo.update(r2pId, { status: newStatus, updated_at: now }, current.version)

  transitionRepo.append({
    r2p_id: r2pId,
    from_status: 'delivered',
    to_status: newStatus,
    actor: input.participantId,
  })

  // 7. Audit
  auditRepo.append({
    r2p_id: r2pId,
    event_type: `RESPONSE_${input.responseType.toUpperCase()}`,
    actor: input.participantId,
    detail: JSON.stringify({ responseType: input.responseType, respondedAt: input.respondedAt }),
  })

  // 8. Accept → trigger Payment Execution Engine (stub — ticket 5.1)
  if (input.responseType === 'accept') {
    auditRepo.append({
      r2p_id: r2pId,
      event_type: 'PAYMENT_TRIGGERED',
      actor: 'payment-engine',
      detail: JSON.stringify({ r2pId, triggeredAt: now }),
    })
  }

  // 9. Notify originating participant (stub — ticket 6.5)
  auditRepo.append({
    r2p_id: r2pId,
    event_type: 'EVENT_RESPONDED_EMITTED',
    actor: 'event-publisher',
    detail: JSON.stringify({ responseType: input.responseType, participantId: input.participantId }),
  })

  return { ok: true, r2pId, status: newStatus }
}
