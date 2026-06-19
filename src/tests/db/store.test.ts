// src/tests/db/store.test.ts
// Unit tests for the in-memory store (src/db/store.ts).

import {
  resetStore,
  listAll,
  findById,
  findByParticipantId,
  findByProxy,
  createEntry,
  updateEntry,
  deleteEntry,
} from '../../db/store'
import { TEST_PARTICIPANTS } from '../../db/seed'

beforeEach(() => {
  resetStore()
})

describe('store — seed state', () => {
  it('contains all 5 test participants after reset', () => {
    expect(listAll()).toHaveLength(TEST_PARTICIPANTS.length)
  })

  it('finds a seeded participant by participantId', () => {
    const entry = findByParticipantId('BANK_A')
    expect(entry).toBeDefined()
    expect(entry?.proxyType).toBe('email')
    expect(entry?.proxyValue).toBe('payer@banka.ca')
    expect(entry?.active).toBe(true)
  })

  it('finds a seeded participant by proxy', () => {
    const entry = findByProxy('phone', '+16135550001')
    expect(entry).toBeDefined()
    expect(entry?.participantId).toBe('BANK_C')
  })
})

describe('store — createEntry', () => {
  it('creates a new entry and indexes it', () => {
    const entry = createEntry({
      participantId: 'BANK_NEW',
      proxyType: 'email',
      proxyValue: 'new@bank.ca',
      endpointUrl: 'http://localhost:9000',
    })
    expect(entry.id).toBeDefined()
    expect(entry.active).toBe(true)
    expect(findById(entry.id)).toEqual(entry)
    expect(findByParticipantId('BANK_NEW')).toEqual(entry)
    expect(findByProxy('email', 'new@bank.ca')).toEqual(entry)
    expect(listAll()).toHaveLength(TEST_PARTICIPANTS.length + 1)
  })
})

describe('store — updateEntry', () => {
  it('updates endpointUrl and returns the updated entry', () => {
    const original = findByParticipantId('BANK_A')!
    const updated = updateEntry(original.id, { endpointUrl: 'http://localhost:9999' })
    expect(updated).toBeDefined()
    expect(updated?.endpointUrl).toBe('http://localhost:9999')
    // id and participantId must not change
    expect(updated?.id).toBe(original.id)
    expect(updated?.participantId).toBe(original.participantId)
  })

  it('deactivates an entry', () => {
    const original = findByParticipantId('BANK_B')!
    updateEntry(original.id, { active: false })
    const entry = findById(original.id)
    expect(entry?.active).toBe(false)
  })

  it('returns undefined for unknown id', () => {
    const result = updateEntry('non-existent-id', { active: false })
    expect(result).toBeUndefined()
  })
})

describe('store — deleteEntry', () => {
  it('removes entry from all indexes', () => {
    const entry = findByParticipantId('BANK_E')!
    const deleted = deleteEntry(entry.id)
    expect(deleted).toBe(true)
    expect(findById(entry.id)).toBeUndefined()
    expect(findByParticipantId('BANK_E')).toBeUndefined()
    expect(findByProxy('alias', 'corp-alias-1')).toBeUndefined()
    expect(listAll()).toHaveLength(TEST_PARTICIPANTS.length - 1)
  })

  it('returns false for unknown id', () => {
    expect(deleteEntry('does-not-exist')).toBe(false)
  })
})

// ── resetStore() AC ───────────────────────────────────────────

describe('resetStore() — clears all in-memory data and re-seeds', () => {
  it('clears custom entries added after seed', () => {
    createEntry({
      participantId: 'TEMP_BANK',
      proxyType: 'alias',
      proxyValue: 'temp-alias',
      endpointUrl: 'http://localhost:9999',
    })
    expect(listAll()).toHaveLength(TEST_PARTICIPANTS.length + 1)

    resetStore()

    expect(listAll()).toHaveLength(TEST_PARTICIPANTS.length)
    expect(findByParticipantId('TEMP_BANK')).toBeUndefined()
  })

  it('restores all seed participants after clearing', () => {
    // Remove all entries
    listAll().forEach((e) => deleteEntry(e.id))
    expect(listAll()).toHaveLength(0)

    resetStore()

    expect(listAll()).toHaveLength(TEST_PARTICIPANTS.length)
    expect(findByParticipantId('BANK_A')).toBeDefined()
    expect(findByProxy('phone', '+16135550001')).toBeDefined()
    expect(findByProxy('alias', 'corp-alias-1')).toBeDefined()
  })

  it('proxy indexes are rebuilt after reset', () => {
    resetStore()
    const byEmail = findByProxy('email', 'payer@banka.ca')
    expect(byEmail?.participantId).toBe('BANK_A')
  })
})
