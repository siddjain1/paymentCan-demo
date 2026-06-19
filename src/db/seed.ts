// src/db/seed.ts
// Applies seed data for 5 test participants into EventSubscription.
// Uses INSERT ... ON CONFLICT DO NOTHING for idempotency.

import { PoolClient } from 'pg'
import { randomUUID } from 'crypto'

export interface Participant {
  participantId: string
  proxyType: string
  proxyValue: string
  endpointUrl: string
}

export const TEST_PARTICIPANTS: Participant[] = [
  { participantId: 'BANK_A', proxyType: 'email',  proxyValue: 'payer@banka.ca',    endpointUrl: 'http://localhost:4001' },
  { participantId: 'BANK_B', proxyType: 'email',  proxyValue: 'payee@bankb.ca',    endpointUrl: 'http://localhost:4002' },
  { participantId: 'BANK_C', proxyType: 'phone',  proxyValue: '+16135550001',       endpointUrl: 'http://localhost:4003' },
  { participantId: 'BANK_D', proxyType: 'phone',  proxyValue: '+14165550002',       endpointUrl: 'http://localhost:4004' },
  { participantId: 'BANK_E', proxyType: 'alias',  proxyValue: 'corp-alias-1',       endpointUrl: 'http://localhost:4005' },
]

/**
 * In-memory map: participantId -> Participant for fast address-directory lookups.
 */
export const PARTICIPANT_MAP: Map<string, Participant> = new Map(
  TEST_PARTICIPANTS.map((p) => [p.participantId, p])
)

/**
 * Inserts (or skips if already present) the 5 test participants
 * into the EventSubscription table.
 */
export async function seedParticipants(client: PoolClient): Promise<void> {
  for (const p of TEST_PARTICIPANTS) {
    await client.query(
      `INSERT INTO "EventSubscription" (id, participant_id, proxy_type, proxy_value, endpoint_url, active)
       VALUES ($1, $2, $3, $4, $5, true)
       ON CONFLICT (participant_id) DO NOTHING`,
      [randomUUID(), p.participantId, p.proxyType, p.proxyValue, p.endpointUrl]
    )
  }
}
