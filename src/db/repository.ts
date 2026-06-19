// src/db/repository.ts
// Repository layer for Address Directory.
// Wraps the in-memory store and enforces business constraints.

import {
  AddressEntry,
  CreateEntryInput,
  UpdateEntryInput,
  findById,
  findByParticipantId,
  findByProxy,
  listAll,
  createEntry,
  updateEntry,
  deleteEntry,
} from './store'

export type { AddressEntry, CreateEntryInput, UpdateEntryInput }

export interface RepositoryError {
  code: 'NOT_FOUND' | 'CONFLICT'
  message: string
}

export type RepositoryResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: RepositoryError }

function ok<T>(value: T): RepositoryResult<T> {
  return { ok: true, value }
}

function fail<T>(code: RepositoryError['code'], message: string): RepositoryResult<T> {
  return { ok: false, error: { code, message } }
}

// ── queries ───────────────────────────────────────────────────

export function getAll(): AddressEntry[] {
  return listAll()
}

export function getById(id: string): RepositoryResult<AddressEntry> {
  const entry = findById(id)
  if (!entry) return fail('NOT_FOUND', `No address entry found for id "${id}"`)
  return ok(entry)
}

export function getByParticipantId(participantId: string): RepositoryResult<AddressEntry> {
  const entry = findByParticipantId(participantId)
  if (!entry) return fail('NOT_FOUND', `No address entry found for participantId "${participantId}"`)
  return ok(entry)
}

export function getByProxy(proxyType: string, proxyValue: string): RepositoryResult<AddressEntry> {
  const entry = findByProxy(proxyType, proxyValue)
  if (!entry) {
    return fail('NOT_FOUND', `No address entry found for proxy ${proxyType}:${proxyValue}`)
  }
  return ok(entry)
}

// ── mutations ─────────────────────────────────────────────────

export function create(input: CreateEntryInput): RepositoryResult<AddressEntry> {
  if (findByParticipantId(input.participantId)) {
    return fail('CONFLICT', `Address entry already exists for participantId "${input.participantId}"`)
  }
  if (findByProxy(input.proxyType, input.proxyValue)) {
    return fail('CONFLICT', `Address entry already exists for proxy ${input.proxyType}:${input.proxyValue}`)
  }
  return ok(createEntry(input))
}

export function update(id: string, input: UpdateEntryInput): RepositoryResult<AddressEntry> {
  const result = updateEntry(id, input)
  if (!result) return fail('NOT_FOUND', `No address entry found for id "${id}"`)
  return ok(result)
}

export function remove(id: string): RepositoryResult<true> {
  const deleted = deleteEntry(id)
  if (!deleted) return fail('NOT_FOUND', `No address entry found for id "${id}"`)
  return ok(true)
}
