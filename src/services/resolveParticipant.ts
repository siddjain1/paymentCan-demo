// src/services/resolveParticipant.ts
// Stub routing directory — resolves a debtor account number to a participant.
// Replace with RTR Exchange routing directory lookup in production.

export interface ParticipantRecord {
  participantId: string
  endpointUrl: string
}

// Hardcoded test account mappings.
const ROUTING_TABLE: Record<string, ParticipantRecord> = {
  'DEBTOR-ACC-001': { participantId: 'BANKA_CA', endpointUrl: 'http://stub-payer-fi/rtp/deliver' },
  'DEBTOR-ACC-002': { participantId: 'BANKB_CA', endpointUrl: 'http://stub-payer-fi/rtp/deliver' },
  'TEST-ACCOUNT-1': { participantId: 'TESTBANK', endpointUrl: 'http://stub-payer-fi/rtp/deliver' },
}

export function resolveParticipant(debtorAccountId: string): ParticipantRecord | null {
  return ROUTING_TABLE[debtorAccountId] ?? null
}

// Participant registry for entitlement checks.
const PARTICIPANT_REGISTRY: Set<string> = new Set([
  'BANKA_CA',
  'BANKB_CA',
  'TESTBANK',
  'PART-001',
])

export function isEntitledParticipant(participantId: string): boolean {
  return PARTICIPANT_REGISTRY.has(participantId)
}
