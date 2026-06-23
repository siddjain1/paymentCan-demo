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
export interface R2PStateTransitionRow {
    id: string;
    request_id: string;
    from_status: string | null;
    to_status: string;
    actor: string;
    reason: string | null;
    transitioned_at: string;
}
export interface R2PAcknowledgementRow {
    id: string;
    request_id: string;
    participant_id: string;
    acknowledged_at: string;
}
export interface R2PResponseRow {
    id: string;
    request_id: string;
    payer_id: string;
    response_type: string;
    reason: string | null;
    amount: number | null;
    responded_at: string;
}
export interface R2PPaymentRow {
    id: string;
    request_id: string;
    payment_reference: string;
    amount: number;
    currency: string;
    settlement_status: string;
    settled_at: string | null;
    created_at: string;
}
export interface EventSubscriptionRow {
    id: string;
    participant_id: string;
    proxy_type: string;
    proxy_value: string;
    endpoint_url: string;
    active: boolean;
    created_at: string;
}
export interface AuditStoreRow {
    id: string;
    event_type: string;
    entity_type: string;
    entity_id: string;
    actor: string | null;
    payload: string;
    occurred_at: string;
}
export interface OutboxEventRow {
    id: string;
    event_type: string;
    entity_id: string;
    participant_id: string;
    payload: string;
    status: 'pending' | 'delivered' | 'failed';
    retry_count: number;
    next_retry_at: string | null;
    created_at: string;
    delivered_at: string | null;
}
//# sourceMappingURL=schema.d.ts.map