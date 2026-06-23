export interface CreateRequestInput {
    payerId: string;
    payeeId: string;
    amount: number;
    currency: string;
    dueDate: string;
    expiryTimestamp: string;
    remittanceInfo?: string;
    idempotencyKey: string;
}
export type CreateRequestResult = {
    ok: true;
    r2pId: string;
    status: 'created';
    createdAt: string;
} | {
    ok: false;
    code: 'DUPLICATE_REQUEST' | 'PAYER_NOT_FOUND';
    message: string;
};
export interface ModifyRequestInput {
    amount?: number;
    dueDate?: string;
    expiryTimestamp?: string;
    remittanceInfo?: string;
}
export type ModifyRequestResult = {
    ok: true;
    r2pId: string;
    status: string;
    updatedAt: string;
} | {
    ok: false;
    code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION' | 'NO_FIELDS_TO_UPDATE' | 'VALIDATION_ERROR';
    message: string;
};
export type CancelRequestResult = {
    ok: true;
    r2pId: string;
    status: 'cancelled';
    cancelledAt: string;
} | {
    ok: false;
    code: 'NOT_FOUND' | 'INVALID_STATE_TRANSITION';
    message: string;
};
export interface AcknowledgeRequestInput {
    participantId: string;
    receivedAt: string;
}
export type AcknowledgeRequestResult = {
    ok: true;
    r2pId: string;
    status: 'delivered';
} | {
    ok: false;
    code: 'NOT_FOUND' | 'ALREADY_ACKNOWLEDGED';
    message: string;
};
export interface AcknowledgementRow {
    r2p_id: string;
    participant_id: string;
    received_at: string;
    created_at: string;
}
export interface RespondToRequestInput {
    responseType: 'accept' | 'decline' | 'defer';
    participantId: string;
    respondedAt: string;
    amount?: number;
}
export type RespondToRequestResult = {
    ok: true;
    r2pId: string;
    status: string;
} | {
    ok: false;
    code: 'VALIDATION_ERROR' | 'AMOUNT_MISMATCH' | 'NOT_FOUND' | 'EXPIRED' | 'INVALID_STATE_TRANSITION';
    message: string;
};
export interface R2PResponseRow {
    response_id: string;
    r2p_id: string;
    response_type: 'accept' | 'decline' | 'defer';
    responding_participant_id: string;
    responded_at: string;
    created_at: string;
}
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
export interface AuditRow {
    r2p_id: string;
    event_type: string;
    actor: string;
    detail: string;
    created_at: string;
}
export interface StateTransitionRow {
    r2p_id: string;
    from_status: string | null;
    to_status: string;
    actor: string;
    created_at: string;
}
/**
 * Generates a UUID v7 (time-ordered).
 * Structure: {8 hex ts}-{4 hex ts}-7{3 hex rand}-{4 hex rand}-{12 hex rand}
 */
export declare function generateR2PId(): string;
export declare const r2pRepo: {
    findByIdempotencyKey(key: string): R2PRequestRow | undefined;
    save(row: R2PRequestRow): void;
    findById(id: string): R2PRequestRow | undefined;
    listAll(): R2PRequestRow[];
    update(id: string, fields: Partial<R2PRequestRow> & {
        updated_at: string;
    }, expectedVersion: number): R2PRequestRow;
};
export declare const auditRepo: {
    append(entry: Omit<AuditRow, "created_at">): void;
    list(): AuditRow[];
};
export declare const transitionRepo: {
    append(entry: Omit<StateTransitionRow, "created_at">): void;
    list(): StateTransitionRow[];
};
export declare const responseRepo: {
    findByR2PId(r2pId: string): R2PResponseRow | undefined;
    save(row: R2PResponseRow): void;
    list(): R2PResponseRow[];
};
export declare const ackRepo: {
    findByR2PId(r2pId: string): AcknowledgementRow | undefined;
    save(row: AcknowledgementRow): void;
    list(): AcknowledgementRow[];
};
/** Reset all in-memory stores. Only for use in tests. */
export declare function resetStore(): void;
export declare function createRequest(input: CreateRequestInput): CreateRequestResult;
export declare function modifyRequest(r2pId: string, patch: ModifyRequestInput): ModifyRequestResult;
export declare function cancelRequest(r2pId: string): CancelRequestResult;
export declare function acknowledgeRequest(r2pId: string, input: AcknowledgeRequestInput): AcknowledgeRequestResult;
export declare function respondToRequest(r2pId: string, input: RespondToRequestInput): RespondToRequestResult;
//# sourceMappingURL=r2pRequest.d.ts.map