export interface SubmitPaymentInput {
    r2pId: string;
    paymentAmount: number;
    currency: string;
    payerId: string;
    payeeId: string;
}
export type SubmitPaymentResult = {
    ok: true;
    paymentId: string;
    r2pId: string;
    status: 'processing';
} | {
    ok: false;
    code: 'R2P_NOT_FOUND' | 'INVALID_STATE_TRANSITION' | 'AMOUNT_MISMATCH';
    message: string;
};
export interface R2PPaymentRow {
    payment_id: string;
    r2p_id: string;
    amount: number;
    currency: string;
    payer_id: string;
    payee_id: string;
    status: 'processing' | 'settled' | 'failed';
    submitted_at: string;
    settled_at?: string;
}
export type SettlementRailFn = (paymentId: string) => Promise<{
    success: boolean;
}>;
export declare const paymentRepo: {
    save(row: R2PPaymentRow): void;
    findById(id: string): R2PPaymentRow | undefined;
    findByR2PId(r2pId: string): R2PPaymentRow | undefined;
    update(paymentId: string, fields: Partial<R2PPaymentRow>): void;
    list(): R2PPaymentRow[];
};
/** Reset store. Only for use in tests. */
export declare function resetPaymentStore(): void;
export declare function setSettlementRail(fn: SettlementRailFn): void;
export declare function resetSettlementRail(): void;
export declare function submitPayment(input: SubmitPaymentInput): Promise<SubmitPaymentResult>;
export declare function handleSettlementCallback(paymentId: string, success: boolean): Promise<void>;
//# sourceMappingURL=paymentEngine.d.ts.map