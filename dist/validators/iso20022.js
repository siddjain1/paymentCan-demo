"use strict";
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
exports.validate = validate;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const SCHEMA_VERSION = process.env.SCHEMA_VERSION ?? '2019';
const schemaCache = new Map();
function loadSchema(messageType) {
    const cacheKey = `${messageType}.${SCHEMA_VERSION}`;
    const cached = schemaCache.get(cacheKey);
    if (cached !== undefined) {
        return cached;
    }
    const filename = `${messageType}.${SCHEMA_VERSION}.json`;
    const filepath = path.resolve(__dirname, 'schemas', filename);
    let raw;
    try {
        raw = fs.readFileSync(filepath, 'utf8');
    }
    catch {
        throw new Error(`Unknown messageType: ${messageType}`);
    }
    const schema = JSON.parse(raw);
    schemaCache.set(cacheKey, schema);
    return schema;
}
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIMEZONE_REGEX = /[Z+\-]\d*(:?\d+)?$/;
function validateField(field, value, def) {
    // presence check
    if (value === undefined || value === null) {
        return { field, message: `${field} is required` };
    }
    switch (def.type) {
        case 'string': {
            if (typeof value !== 'string' || value.trim().length === 0) {
                return { field, message: `${field} must be a non-empty string` };
            }
            if (def.length !== undefined && value.length !== def.length) {
                return { field, message: `${field} must be exactly ${def.length} characters` };
            }
            if (def.enum !== undefined && !def.enum.includes(value)) {
                return {
                    field,
                    message: `${field} must be one of: ${def.enum.join(', ')}`
                };
            }
            return null;
        }
        case 'number': {
            if (typeof value !== 'number' || !isFinite(value) || value <= 0) {
                return { field, message: `${field} must be a positive finite number` };
            }
            return null;
        }
        case 'boolean': {
            if (typeof value !== 'boolean') {
                return { field, message: `${field} must be a boolean` };
            }
            return null;
        }
        case 'isoDate': {
            if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value) || isNaN(Date.parse(value))) {
                return { field, message: `${field} must be a valid date in YYYY-MM-DD format` };
            }
            return null;
        }
        case 'isoDatetime': {
            if (typeof value !== 'string' ||
                isNaN(Date.parse(value)) ||
                !TIMEZONE_REGEX.test(value)) {
                return {
                    field,
                    message: `${field} must be a valid ISO 8601 datetime with timezone`
                };
            }
            return null;
        }
        case 'object': {
            if (typeof value !== 'object' || value === null || Array.isArray(value)) {
                return { field, message: `${field} must be an object` };
            }
            if (def.minKeys !== undefined) {
                const obj = value;
                const hasAtLeastOne = def.minKeys.some((k) => k in obj && obj[k] !== undefined);
                if (!hasAtLeastOne) {
                    return {
                        field,
                        message: `${field} must contain at least one of: ${def.minKeys.join(', ')}`
                    };
                }
            }
            return null;
        }
        default:
            return null;
    }
}
function validate(messageType, payload) {
    const schema = loadSchema(messageType);
    const errors = [];
    for (const def of schema.required) {
        const error = validateField(def.field, payload[def.field], def);
        if (error !== null) {
            errors.push(error);
        }
    }
    for (const def of schema.optional) {
        const value = payload[def.field];
        if (value !== undefined && value !== null) {
            const error = validateField(def.field, value, def);
            if (error !== null) {
                errors.push(error);
            }
        }
    }
    if (errors.length > 0) {
        return { valid: false, code: 'VALIDATION_ERROR', fields: errors };
    }
    return { valid: true };
}
//# sourceMappingURL=iso20022.js.map