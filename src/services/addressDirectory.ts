// src/services/addressDirectory.ts
// Service layer for Address Directory.
// Translates repository results into service-level responses.

import * as repo from '../db/repository'
import type { AddressEntry, CreateEntryInput, UpdateEntryInput } from '../db/repository'

export type { AddressEntry }

// ── Spec-required types (ticket 1.3) ──────────────────────────

export type ProxyType = 'email' | 'phone' | 'alias'

export interface ParticipantAddress {
  participantId: string
  participantEndpoint: string
  accountRef: string
  ttlSeconds: number
}

const VALID_PROXY_TYPES: ReadonlySet<string> = new Set<ProxyType>(['email', 'phone', 'alias'])

/** Account refs follow the pattern ACC-{BANKX}-001. */
const ACCOUNT_REF_MAP: Record<string, string> = {
  BANK_A: 'ACC-BANKA-001',
  BANK_B: 'ACC-BANKB-001',
  BANK_C: 'ACC-BANKC-001',
  BANK_D: 'ACC-BANKD-001',
  BANK_E: 'ACC-BANKE-001',
}

/**
 * Core spec function: resolves a proxy identifier to a ParticipantAddress.
 * Returns null when no participant is registered for the given proxy.
 */
export function resolve(
  proxyType: ProxyType,
  proxyValue: string
): ParticipantAddress | null {
  const result = repo.getByProxy(proxyType, proxyValue)
  if (!result.ok) return null
  const entry = result.value
  if (!entry.active) return null
  return {
    participantId: entry.participantId,
    participantEndpoint: entry.endpointUrl,
    accountRef: ACCOUNT_REF_MAP[entry.participantId] ?? `ACC-${entry.participantId}-001`,
    ttlSeconds: 300,
  }
}

export function isValidProxyType(value: string): value is ProxyType {
  return VALID_PROXY_TYPES.has(value)
}

export interface ServiceError {
  status: 400 | 404 | 409
  code: string
  message: string
}

export type ServiceResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ServiceError }

function mapRepoError(err: repo.RepositoryError): ServiceError {
  switch (err.code) {
    case 'NOT_FOUND':
      return { status: 404, code: 'NOT_FOUND', message: err.message }
    case 'CONFLICT':
      return { status: 409, code: 'CONFLICT', message: err.message }
  }
}

// ── list ──────────────────────────────────────────────────────

export function listAddresses(): AddressEntry[] {
  return repo.getAll()
}

// ── resolve (lookup by proxy) ─────────────────────────────────

export interface ResolveInput {
  proxyType: string
  proxyValue: string
}

export function resolveProxy(input: ResolveInput): ServiceResult<AddressEntry> {
  if (!input.proxyType || !input.proxyType.trim()) {
    return { ok: false, error: { status: 400, code: 'VALIDATION_ERROR', message: 'proxyType is required' } }
  }
  if (!input.proxyValue || !input.proxyValue.trim()) {
    return { ok: false, error: { status: 400, code: 'VALIDATION_ERROR', message: 'proxyValue is required' } }
  }

  const result = repo.getByProxy(input.proxyType.trim(), input.proxyValue.trim())
  if (!result.ok) return { ok: false, error: mapRepoError(result.error) }

  if (!result.value.active) {
    return {
      ok: false,
      error: { status: 404, code: 'NOT_FOUND', message: `Proxy ${input.proxyType}:${input.proxyValue} is inactive` },
    }
  }

  return { ok: true, value: result.value }
}

// ── get by id ─────────────────────────────────────────────────

export function getAddress(id: string): ServiceResult<AddressEntry> {
  const result = repo.getById(id)
  if (!result.ok) return { ok: false, error: mapRepoError(result.error) }
  return { ok: true, value: result.value }
}

// ── get by participantId ──────────────────────────────────────

export function getAddressByParticipant(participantId: string): ServiceResult<AddressEntry> {
  const result = repo.getByParticipantId(participantId)
  if (!result.ok) return { ok: false, error: mapRepoError(result.error) }
  return { ok: true, value: result.value }
}

// ── register ──────────────────────────────────────────────────

export interface RegisterInput {
  participantId: string
  proxyType: string
  proxyValue: string
  endpointUrl: string
}

const ALLOWED_PROXY_TYPES = ['email', 'phone', 'alias']
const URL_RE = /^https?:\/\/.+/

export function registerAddress(input: RegisterInput): ServiceResult<AddressEntry> {
  const errors: string[] = []

  if (!input.participantId || !input.participantId.trim()) {
    errors.push('participantId is required')
  }
  if (!input.proxyType || !ALLOWED_PROXY_TYPES.includes(input.proxyType)) {
    errors.push(`proxyType must be one of: ${ALLOWED_PROXY_TYPES.join(', ')}`)
  }
  if (!input.proxyValue || !input.proxyValue.trim()) {
    errors.push('proxyValue is required')
  }
  if (!input.endpointUrl || !URL_RE.test(input.endpointUrl)) {
    errors.push('endpointUrl must be a valid http/https URL')
  }

  if (errors.length > 0) {
    return { ok: false, error: { status: 400, code: 'VALIDATION_ERROR', message: errors.join('; ') } }
  }

  const payload: CreateEntryInput = {
    participantId: input.participantId.trim(),
    proxyType: input.proxyType.trim(),
    proxyValue: input.proxyValue.trim(),
    endpointUrl: input.endpointUrl.trim(),
  }

  const result = repo.create(payload)
  if (!result.ok) return { ok: false, error: mapRepoError(result.error) }
  return { ok: true, value: result.value }
}

// ── update ────────────────────────────────────────────────────

export interface UpdateInput {
  endpointUrl?: string
  active?: boolean
}

export function updateAddress(id: string, input: UpdateInput): ServiceResult<AddressEntry> {
  if (input.endpointUrl !== undefined && !URL_RE.test(input.endpointUrl)) {
    return {
      ok: false,
      error: { status: 400, code: 'VALIDATION_ERROR', message: 'endpointUrl must be a valid http/https URL' },
    }
  }

  const payload: UpdateEntryInput = {}
  if (input.endpointUrl !== undefined) payload.endpointUrl = input.endpointUrl
  if (input.active !== undefined) payload.active = input.active

  const result = repo.update(id, payload)
  if (!result.ok) return { ok: false, error: mapRepoError(result.error) }
  return { ok: true, value: result.value }
}

// ── deregister ────────────────────────────────────────────────

export function deregisterAddress(id: string): ServiceResult<true> {
  const result = repo.remove(id)
  if (!result.ok) return { ok: false, error: mapRepoError(result.error) }
  return { ok: true, value: true }
}
