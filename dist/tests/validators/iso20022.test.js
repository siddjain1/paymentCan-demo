"use strict";
/**
 * Unit tests for src/validators/iso20022.ts and src/validators/middleware.ts
 * No network or filesystem calls at test time — schemas are loaded via loadSchema
 * which caches after first read. Tests manipulate SCHEMA_VERSION via env before import.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Helpers used across tests
const VALID_PAIN013 = {
    payerId: 'PAYER_001',
    payeeId: 'PAYEE_001',
    amount: 250.00,
    currency: 'CAD',
    dueDate: '2026-12-31',
    expiryTimestamp: '2026-12-31T23:59:59Z',
    idempotencyKey: 'idem-abc-123',
};
const VALID_PAIN014 = {
    r2pId: '550e8400-e29b-41d4-a716-446655440000',
    responseType: 'accept',
    participantId: 'BANK_A',
    respondedAt: '2026-06-19T10:00:00Z',
};
const VALID_CAMT087 = {
    r2pId: '550e8400-e29b-41d4-a716-446655440000',
    participantId: 'BANK_A',
    modifications: { amount: 100.00 },
};
describe('validate() — pain.013', () => {
    let validate;
    beforeAll(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        validate = require('../validators/iso20022').validate;
    });
    it('returns { valid: true } for a fully valid pain.013 payload', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = validate('pain.013', { ...VALID_PAIN013 });
        expect(result).toEqual({ valid: true });
    });
    it('returns VALIDATION_ERROR with field payerId when payerId is missing', () => {
        const payload = { ...VALID_PAIN013 };
        delete payload.payerId;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = validate('pain.013', payload);
        expect(result.valid).toBe(false);
        expect(result.code).toBe('VALIDATION_ERROR');
        expect(result.fields.some((f) => f.field === 'payerId')).toBe(true);
    });
    it('returns field error on amount when amount is a string', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = validate('pain.013', { ...VALID_PAIN013, amount: '250' });
        expect(result.valid).toBe(false);
        expect(result.fields.some((f) => f.field === 'amount')).toBe(true);
    });
    it('returns field error on currency when length is not 3', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = validate('pain.013', { ...VALID_PAIN013, currency: 'CA' });
        expect(result.valid).toBe(false);
        expect(result.fields.some((f) => f.field === 'currency')).toBe(true);
    });
    it('returns field error on dueDate when format is invalid', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = validate('pain.013', { ...VALID_PAIN013, dueDate: '31-12-2026' });
        expect(result.valid).toBe(false);
        expect(result.fields.some((f) => f.field === 'dueDate')).toBe(true);
    });
    it('returns field error on expiryTimestamp when timezone is absent', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = validate('pain.013', {
            ...VALID_PAIN013,
            expiryTimestamp: '2026-12-31T23:59:59',
        });
        expect(result.valid).toBe(false);
        expect(result.fields.some((f) => f.field === 'expiryTimestamp')).toBe(true);
    });
});
describe('validate() — pain.014', () => {
    let validate;
    beforeAll(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        validate = require('../validators/iso20022').validate;
    });
    it('returns { valid: true } for a fully valid pain.014 payload', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = validate('pain.014', { ...VALID_PAIN014 });
        expect(result).toEqual({ valid: true });
    });
    it('returns field error on responseType when value is not in enum', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = validate('pain.014', {
            ...VALID_PAIN014,
            responseType: 'maybe',
        });
        expect(result.valid).toBe(false);
        expect(result.fields.some((f) => f.field === 'responseType')).toBe(true);
    });
});
describe('validate() — camt.087', () => {
    let validate;
    beforeAll(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        validate = require('../validators/iso20022').validate;
    });
    it('returns { valid: true } for a fully valid camt.087 payload', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = validate('camt.087', { ...VALID_CAMT087 });
        expect(result).toEqual({ valid: true });
    });
    it('returns field error on modifications when it is missing', () => {
        const payload = { ...VALID_CAMT087 };
        delete payload.modifications;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = validate('camt.087', payload);
        expect(result.valid).toBe(false);
        expect(result.fields.some((f) => f.field === 'modifications')).toBe(true);
    });
    it('returns field error on modifications when it has none of the allowed keys', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = validate('camt.087', {
            ...VALID_CAMT087,
            modifications: { unknownKey: 'foo' },
        });
        expect(result.valid).toBe(false);
        expect(result.fields.some((f) => f.field === 'modifications')).toBe(true);
    });
});
describe('validate() — unknown messageType', () => {
    let validate;
    beforeAll(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        validate = require('../validators/iso20022').validate;
    });
    it('throws an Error for an unknown messageType', () => {
        expect(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ;
            validate('pain.999', {});
        }).toThrow(/Unknown messageType/);
    });
});
describe('SCHEMA_VERSION env var', () => {
    it('schema files exist for the default 2019 version', () => {
        const schemasDir = path.resolve(__dirname, '../../validators/schemas');
        expect(fs.existsSync(path.join(schemasDir, 'pain.013.2019.json'))).toBe(true);
        expect(fs.existsSync(path.join(schemasDir, 'pain.014.2019.json'))).toBe(true);
        expect(fs.existsSync(path.join(schemasDir, 'camt.087.2019.json'))).toBe(true);
    });
});
describe('validateISO20022() middleware', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let validateISO20022;
    beforeAll(() => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        validateISO20022 = require('../validators/middleware').validateISO20022;
    });
    it('calls next() when payload is valid', () => {
        const middleware = validateISO20022('pain.013');
        const req = { body: { ...VALID_PAIN013 } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
        const next = jest.fn();
        middleware(req, res, next);
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });
    it('returns 400 with VALIDATION_ERROR body when payload is invalid', () => {
        const middleware = validateISO20022('pain.013');
        const req = { body: { ...VALID_PAIN013, amount: 'not-a-number' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
        const next = jest.fn();
        middleware(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
    });
});
//# sourceMappingURL=iso20022.test.js.map