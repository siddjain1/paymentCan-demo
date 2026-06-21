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

interface FieldDefinition {
  field: string
  type: 'string' | 'number' | 'boolean' | 'isoDate' | 'isoDatetime' | 'object'
  length?: number
  enum?: string[]
  minKeys?: string[]
}

interface SchemaDefinition {
  messageType: string
  version: string
  required: FieldDefinition[]
  optional: FieldDefinition[]
}

const SCHEMA_VERSION = process.env.SCHEMA_VERSION ?? '2019'
const schemaCache = new Map<string, SchemaDefinition>()

function loadSchema(messageType: MessageType): SchemaDefinition {
  const cacheKey = `${messageType}.${SCHEMA_VERSION}`
  const cached = schemaCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  const filename = `${messageType}.${SCHEMA_VERSION}.json`
  const filepath = path.resolve(__dirname, 'schemas', filename)

  let raw: string
  try {
    raw = fs.readFileSync(filepath, 'utf8')
  } catch {
    throw new Error(`Unknown messageType: ${messageType}`)
  }

  const schema = JSON.parse(raw) as SchemaDefinition
  schemaCache.set(cacheKey, schema)
  return schema
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const TIMEZONE_REGEX = /[Z+\-]\d*(:?\d+)?$/

function validateField(
  field: string,
  value: unknown,
  def: FieldDefinition
): FieldError | null {
  // presence check
  if (value === undefined || value === null) {
    return { field, message: `${field} is required` }
  }

  switch (def.type) {
    case 'string': {
      if (typeof value !== 'string' || value.trim().length === 0) {
        return { field, message: `${field} must be a non-empty string` }
      }
      if (def.length !== undefined && value.length !== def.length) {
        return { field, message: `${field} must be exactly ${def.length} characters` }
      }
      if (def.enum !== undefined && !def.enum.includes(value)) {
        return {
          field,
          message: `${field} must be one of: ${def.enum.join(', ')}`
        }
      }
      return null
    }

    case 'number': {
      if (typeof value !== 'number' || !isFinite(value) || value <= 0) {
        return { field, message: `${field} must be a positive finite number` }
      }
      return null
    }

    case 'boolean': {
      if (typeof value !== 'boolean') {
        return { field, message: `${field} must be a boolean` }
      }
      return null
    }

    case 'isoDate': {
      if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value) || isNaN(Date.parse(value))) {
        return { field, message: `${field} must be a valid date in YYYY-MM-DD format` }
      }
      return null
    }

    case 'isoDatetime': {
      if (
        typeof value !== 'string' ||
        isNaN(Date.parse(value)) ||
        !TIMEZONE_REGEX.test(value)
      ) {
        return {
          field,
          message: `${field} must be a valid ISO 8601 datetime with timezone`
        }
      }
      return null
    }

    case 'object': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { field, message: `${field} must be an object` }
      }
      if (def.minKeys !== undefined) {
        const obj = value as Record<string, unknown>
        const hasAtLeastOne = def.minKeys.some((k) => k in obj && obj[k] !== undefined)
        if (!hasAtLeastOne) {
          return {
            field,
            message: `${field} must contain at least one of: ${def.minKeys.join(', ')}`
          }
        }
      }
      return null
    }

    default:
      return null
  }
}

export function validate(
  messageType: MessageType,
  payload: Record<string, unknown>
): ValidationResult {
  const schema = loadSchema(messageType)
  const errors: FieldError[] = []

  for (const def of schema.required) {
    const error = validateField(def.field, payload[def.field], def)
    if (error !== null) {
      errors.push(error)
    }
  }

  for (const def of schema.optional) {
    const value = payload[def.field]
    if (value !== undefined && value !== null) {
      const error = validateField(def.field, value, def)
      if (error !== null) {
        errors.push(error)
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, code: 'VALIDATION_ERROR', fields: errors }
  }

  return { valid: true }
}
