export interface R2PRequestRow {
    id: string;
    idempotency_key: string;
    payer_id: string;
    payee_id: string;
    originating_participant_id: string;
    receiving_participant_id: string;
    amount: number;
    currency: string;
    due_date: string;
    expiry_timestamp: string;
    remittance_info: string | null;
    status: string;
    version: number;
    created_at: string;
    updated_at: string;
}
export interface AuditEntry {
    id: string;
    r2p_id: string;
    event_type: string;
    actor: string;
    detail: string;
    created_at: string;
}
export interface StateTransition {
    id: string;
    r2p_id: string;
    from_status: string | null;
    to_status: string;
    actor: string;
    created_at: string;
}
export declare function findByIdempotencyKey(key: string): R2PRequestRow | undefined;
export declare function findRequestById(id: string): R2PRequestRow | undefined;
export declare function saveRequest(row: R2PRequestRow): R2PRequestRow;
export declare function listRequests(): R2PRequestRow[];
export interface AppendAuditInput {
    r2p_id: string;
    event_type: string;
    actor: string;
    detail: string;
}
export declare function appendAudit(input: AppendAuditInput): AuditEntry;
export declare function getAuditLog(r2pId: string): AuditEntry[];
export interface AppendTransitionInput {
    r2p_id: string;
    from_status: string | null;
    to_status: string;
    actor: string;
}
export declare function appendTransition(input: AppendTransitionInput): StateTransition;
export declare function getTransitions(r2pId: string): StateTransition[];
/** Reset all R2P store state. Only for use in tests. */
export declare function resetR2PStore(): void;
//# sourceMappingURL=r2pStore.d.ts.map