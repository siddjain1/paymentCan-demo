// src/db/r2pStore.ts
// In-memory store for R2P requests, audit entries, and state transitions.
// No external database — backed by Maps.

import { randomUUID } from 'crypto'

// ── R2P Request ───────────────────────────────────────────────

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

// ── Audit Entry ───────────────────────────────────────────────

export interface AuditEntry {
  id: string
  r2p_id: string
  event_type: string
  actor: string
  detail: string
  created_at: string
}

// ── State Transition ──────────────────────────────────────────

export interface StateTransition {
  id: string
  r2p_id: string
  from_status: string | null
  to_status: string
  actor: string
  created_at: string
}

// ── Indexes ───────────────────────────────────────────────────

const requestsById: Map<string, R2PRequestRow> = new Map()
const requestsByIdempotencyKey: Map<string, R2PRequestRow> = new Map()
const auditLog: AuditEntry[] = []
const stateTransitions: StateTransition[] = []

// ── Request operations ────────────────────────────────────────

export function findByIdempotencyKey(key: string): R2PRequestRow | undefined {
  return requestsByIdempotencyKey.get(key)
}

export function findRequestById(id: string): R2PRequestRow | undefined {
  return requestsById.get(id)
}

export function saveRequest(row: R2PRequestRow): R2PRequestRow {
  requestsById.set(row.id, row)
  requestsByIdempotencyKey.set(row.idempotency_key, row)
  return row
}

export function listRequests(): R2PRequestRow[] {
  return Array.from(requestsById.values())
}

// ── Audit operations ──────────────────────────────────────────

export interface AppendAuditInput {
  r2p_id: string
  event_type: string
  actor: string
  detail: string
}

export function appendAudit(input: AppendAuditInput): AuditEntry {
  const entry: AuditEntry = {
    id: randomUUID(),
    r2p_id: input.r2p_id,
    event_type: input.event_type,
    actor: input.actor,
    detail: input.detail,
    created_at: new Date().toISOString(),
  }
  auditLog.push(entry)
  return entry
}

export function getAuditLog(r2pId: string): AuditEntry[] {
  return auditLog.filter((e) => e.r2p_id === r2pId)
}

// ── State transition operations ───────────────────────────────

export interface AppendTransitionInput {
  r2p_id: string
  from_status: string | null
  to_status: string
  actor: string
}

export function appendTransition(input: AppendTransitionInput): StateTransition {
  const transition: StateTransition = {
    id: randomUUID(),
    r2p_id: input.r2p_id,
    from_status: input.from_status,
    to_status: input.to_status,
    actor: input.actor,
    created_at: new Date().toISOString(),
  }
  stateTransitions.push(transition)
  return transition
}

export function getTransitions(r2pId: string): StateTransition[] {
  return stateTransitions.filter((t) => t.r2p_id === r2pId)
}

// ── Test helpers ──────────────────────────────────────────────

/** Reset all R2P store state. Only for use in tests. */
export function resetR2PStore(): void {
  requestsById.clear()
  requestsByIdempotencyKey.clear()
  auditLog.length = 0
  stateTransitions.length = 0
}
