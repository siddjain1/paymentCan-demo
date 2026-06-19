import * as fs from 'fs'
import * as path from 'path'

export type MessageType = 'pain.013' | 'pain.014' | 'camt.087'

export interface FieldError {
  field: string
  message: string
}

export type ValidationResult =
  | { valid: true }
  | { valid: false; code: 'VALIDATION_ERROR'; fields: FieldError[] }

// ────────────────────────────────────────────────────────────
// Schema definition types
// ────────────────────────────────────────────────────────────

interface BaseFieldDef {
  field: string
  type: string
}

interface StringFieldDef extends BaseFieldDef {
  type: 'string'
  length?: number
}

interface NumberFieldDef extends BaseFieldDef {
  type: 'number'
  min?: number
}

interface BooleanFieldDef extends BaseFieldDef {
  type: 'boolean'
}

interface IsoDateFieldDef extends BaseFieldDef {
  type: 'isoDate'
}

interface IsoDatetimeFieldDef extends BaseFieldDef {
  type: 'isoDatetime'
  future?: boolean
}

interface UuidFieldDef extends BaseFieldDef {
  type: 'uuid'
}

interface EnumFieldDef extends BaseFieldDef {
  type: 'enum'
  values: string[]
}

interface ObjectFieldDef extends BaseFieldDef {
  type: 'object'
  minKeys?: number
  allowedKeys?: string[]
}

type FieldDef =
  | StringFieldDef
  | NumberFieldDef
  | BooleanFieldDef
  | IsoDateFieldDef
  | IsoDatetimeFieldDef
  | UuidFieldDef
  | EnumFieldDef
  | ObjectFieldDef

interface SchemaDefinition {
  messageType: string
  version: string
  required: FieldDef[]
  optional: FieldDef[]
}

// ────────────────────────────────────────────────────────────
// Schema loading
// ────────────────────────────────────────────────────────────

const SCHEMA_VERSION = process.env.SCHEMA_VERSION ?? '2019'
const SCHEMAS_DIR = path.join(__dirname, 'schemas')

const schemaCache: Map<string, SchemaDefinition> = new Map()

export function loadSchema(messageType: MessageType): SchemaDefinition {
  const cacheKey = `${messageType}.${SCHEMA_VERSION}`
  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)!
  }

  const filePath = path.join(SCHEMAS_DIR, `${messageType}.${SCHEMA_VERSION}.json`)

  if (!fs.existsSync(filePath)) {
    throw new Error(
      `ISO 20022 schema not found: messageType="${messageType}", version="${SCHEMA_VERSION}" (expected file: ${filePath})`
    )
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  const schema: SchemaDefinition = JSON.parse(raw) as SchemaDefinition
  schemaCache.set(cacheKey, schema)
  return schema
}

// Exported for testing purposes — clears the in-memory cache so tests can
// reload schemas or swap SCHEMA_VERSION between test cases.
export function clearSchemaCache(): void {
  schemaCache.clear()
}

// ────────────────────────────────────────────────────────────
// Type checkers
// ────────────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validateField(
  def: FieldDef,
  value: unknown,
  nowMs: number
): string | null {
  switch (def.type) {
    case 'string': {
      if (typeof value !== 'string') return `must be a string`
      if (value.trim().length === 0) return `must not be empty`
      if (def.length !== undefined && value.length !== def.length) {
        return `must be exactly ${def.length} character(s)`
      }
      return null
    }

    case 'number': {
      if (typeof value !== 'number' || isNaN(value)) return `must be a number`
      if (def.min !== undefined && value <= def.min) {
        return `must be greater than ${def.min}`
      }
      return null
    }

    case 'boolean': {
      if (typeof value !== 'boolean') return `must be a boolean`
      return null
    }

    case 'isoDate': {
      if (typeof value !== 'string') return `must be a string in YYYY-MM-DD format`
      if (!ISO_DATE_RE.test(value)) return `must be a valid date in YYYY-MM-DD format`
      const d = new Date(value + 'T00:00:00Z')
      if (isNaN(d.getTime())) return `must be a valid calendar date`
      return null
    }

    case 'isoDatetime': {
      if (typeof value !== 'string') return `must be a string in ISO 8601 datetime format`
      if (!ISO_DATETIME_RE.test(value)) {
        return `must be a valid ISO 8601 datetime with timezone (e.g. 2024-01-01T12:00:00Z)`
      }
      const d = new Date(value)
      if (isNaN(d.getTime())) return `must be a valid datetime`
      if (def.future === true && d.getTime() <= nowMs) {
        return `must be a future datetime`
      }
      return null
    }

    case 'uuid': {
      if (typeof value !== 'string') return `must be a string UUID`
      if (!UUID_RE.test(value)) return `must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)`
      return null
    }

    case 'enum': {
      if (typeof value !== 'string') return `must be a string`
      if (!def.values.includes(value)) {
        return `must be one of: ${def.values.join(', ')}`
      }
      return null
    }

    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return `must be an object`
      }
      const obj = value as Record<string, unknown>
      const keys = Object.keys(obj)

      if (def.allowedKeys !== undefined) {
        const invalidKeys = keys.filter(k => !def.allowedKeys!.includes(k))
        if (invalidKeys.length > 0) {
          return `contains unknown key(s): ${invalidKeys.join(', ')}. Allowed: ${def.allowedKeys.join(', ')}`
        }
      }

      const effectiveMinKeys = def.minKeys ?? 0
      if (keys.length < effectiveMinKeys) {
        const allowed = def.allowedKeys ? def.allowedKeys.join(', ') : 'any'
        return `must have at least ${effectiveMinKeys} key(s). Allowed keys: ${allowed}`
      }

      return null
    }

    default: {
      return null
    }
  }
}

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────

const VALID_MESSAGE_TYPES: MessageType[] = ['pain.013', 'pain.014', 'camt.087']

export function validate(
  messageType: MessageType,
  payload: Record<string, unknown>
): ValidationResult {
  if (!VALID_MESSAGE_TYPES.includes(messageType)) {
    throw new Error(
      `Unknown messageType: "${messageType}". Valid types: ${VALID_MESSAGE_TYPES.join(', ')}`
    )
  }

  const schema = loadSchema(messageType)
  const errors: FieldError[] = []
  const nowMs = Date.now()

  for (const def of schema.required) {
    const value = payload[def.field]
    if (value === undefined || value === null) {
      errors.push({ field: def.field, message: `field is required` })
      continue
    }
    const msg = validateField(def, value, nowMs)
    if (msg !== null) {
      errors.push({ field: def.field, message: msg })
    }
  }

  for (const def of schema.optional) {
    const value = payload[def.field]
    if (value === undefined || value === null) {
      continue
    }
    const msg = validateField(def, value, nowMs)
    if (msg !== null) {
      errors.push({ field: def.field, message: msg })
    }
  }

  if (errors.length > 0) {
    return { valid: false, code: 'VALIDATION_ERROR', fields: errors }
  }

  return { valid: true }
}
