export type MessageType = 'pain.013' | 'pain.014' | 'camt.087';
export interface FieldError {
    field: string;
    message: string;
}
export type ValidationResult = {
    valid: true;
} | {
    valid: false;
    code: 'VALIDATION_ERROR';
    fields: FieldError[];
};
export declare function validate(messageType: MessageType, payload: Record<string, unknown>): ValidationResult;
//# sourceMappingURL=iso20022.d.ts.map