// src/db/store.ts
// In-memory store for Address Directory entries.
// Backed by a Map — no external database required.

import { randomUUID } from 'crypto'
import { TEST_PARTICIPANTS, Participant } from './seed'

export interface AddressEntry {
  id: string
  participantId: string
  proxyType: string
  proxyValue: string
  endpointUrl: string
  active: boolean
  createdAt: string
  updatedAt: string
}

function toEntry(p: Participant): AddressEntry {
  const now = new Date().toISOString()
  return {
    id: randomUUID(),
    participantId: p.participantId,
    proxyType: p.proxyType,
    proxyValue: p.proxyValue,
    endpointUrl: p.endpointUrl,
    active: true,
    createdAt: now,
    updatedAt: now,
  }
}

// Primary index: id -> entry
const byId: Map<string, AddressEntry> = new Map()
// Secondary index: participantId -> entry
const byParticipantId: Map<string, AddressEntry> = new Map()
// Secondary index: "proxyType:proxyValue" -> entry
const byProxy: Map<string, AddressEntry> = new Map()

function proxyKey(proxyType: string, proxyValue: string): string {
  return `${proxyType}:${proxyValue}`
}

function addToIndexes(entry: AddressEntry): void {
  byId.set(entry.id, entry)
  byParticipantId.set(entry.participantId, entry)
  byProxy.set(proxyKey(entry.proxyType, entry.proxyValue), entry)
}

function removeFromIndexes(entry: AddressEntry): void {
  byId.delete(entry.id)
  byParticipantId.delete(entry.participantId)
  byProxy.delete(proxyKey(entry.proxyType, entry.proxyValue))
}

// Seed from TEST_PARTICIPANTS on first import
TEST_PARTICIPANTS.forEach((p) => {
  if (!byParticipantId.has(p.participantId)) {
    addToIndexes(toEntry(p))
  }
})

// ── read ──────────────────────────────────────────────────────

export function findById(id: string): AddressEntry | undefined {
  return byId.get(id)
}

export function findByParticipantId(participantId: string): AddressEntry | undefined {
  return byParticipantId.get(participantId)
}

export function findByProxy(proxyType: string, proxyValue: string): AddressEntry | undefined {
  return byProxy.get(proxyKey(proxyType, proxyValue))
}

export function listAll(): AddressEntry[] {
  return Array.from(byId.values())
}

// ── write ─────────────────────────────────────────────────────

export interface CreateEntryInput {
  participantId: string
  proxyType: string
  proxyValue: string
  endpointUrl: string
}

export function createEntry(input: CreateEntryInput): AddressEntry {
  const now = new Date().toISOString()
  const entry: AddressEntry = {
    id: randomUUID(),
    participantId: input.participantId,
    proxyType: input.proxyType,
    proxyValue: input.proxyValue,
    endpointUrl: input.endpointUrl,
    active: true,
    createdAt: now,
    updatedAt: now,
  }
  addToIndexes(entry)
  return entry
}

export interface UpdateEntryInput {
  endpointUrl?: string
  active?: boolean
}

export function updateEntry(id: string, input: UpdateEntryInput): AddressEntry | undefined {
  const existing = byId.get(id)
  if (!existing) return undefined

  const updated: AddressEntry = {
    ...existing,
    ...(input.endpointUrl !== undefined ? { endpointUrl: input.endpointUrl } : {}),
    ...(input.active !== undefined ? { active: input.active } : {}),
    updatedAt: new Date().toISOString(),
  }

  removeFromIndexes(existing)
  addToIndexes(updated)
  return updated
}

export function deleteEntry(id: string): boolean {
  const existing = byId.get(id)
  if (!existing) return false
  removeFromIndexes(existing)
  return true
}

// ── test helpers ──────────────────────────────────────────────

/** Reset the store to the seeded state. Only for use in tests. */
export function resetStore(): void {
  byId.clear()
  byParticipantId.clear()
  byProxy.clear()
  TEST_PARTICIPANTS.forEach((p) => addToIndexes(toEntry(p)))
}
