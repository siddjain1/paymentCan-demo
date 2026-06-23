import { PoolClient } from 'pg';
export interface Participant {
    participantId: string;
    proxyType: string;
    proxyValue: string;
    endpointUrl: string;
}
export declare const TEST_PARTICIPANTS: Participant[];
/**
 * In-memory map: participantId -> Participant for fast address-directory lookups.
 */
export declare const PARTICIPANT_MAP: Map<string, Participant>;
/**
 * Inserts (or skips if already present) the 5 test participants
 * into the EventSubscription table.
 */
export declare function seedParticipants(client: PoolClient): Promise<void>;
//# sourceMappingURL=seed.d.ts.map