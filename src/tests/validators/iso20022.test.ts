import { validate, clearSchemaCache, MessageType } from '../../validators/iso20022'
import { validateISO20022 } from '../../validators/middleware'

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 86_400_000).toISOString() // +1 day
const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'

function validPain013(): Record<string, unknown> {
  return {
    payerId: 'payer-001',
    payeeId: 'payee-001',
    amount: 100.5,
    currency: 'CAD',
    dueDate: '2030-12-31',
    expiryTimestamp: FUTURE,
    idempotencyKey: 'idem-key-abc123',
  }
}

function validPain014(): Record<string, unknown> {
  return {
    r2pId: VALID_UUID,
    responseType: 'accept',
    participantId: 'participant-001',
    respondedAt: '2030-01-01T10:00:00Z',
  }
}

function validCamt087(): Record<string, unknown> {
  return {
    r2pId: VALID_UUID,
    participantId: 'participant-001',
    modifications: { amount: 200 },
  }
}

beforeEach(() => {
  clearSchemaCache()
})

// ────────────────────────────────────────────────────────────
// pain.013 tests
// ────────────────────────────────────────────────────────────

describe('validate pain.013', () => {
  it('returns valid:true for a fully valid payload', () => {
    expect(validate('pain.013', validPain013())).toEqual({ valid: true })
  })

  it('returns valid:true with optional remittanceInfo present', () => {
    const payload = { ...validPain013(), remittanceInfo: 'Invoice #42' }
    expect(validate('pain.013', payload)).toEqual({ valid: true })
  })

  it('does not mutate the payload', () => {
    const payload = validPain013()
    const copy = { ...payload }
    validate('pain.013', payload)
    expect(payload).toEqual(copy)
  })

  it.each(['payerId', 'payeeId', 'currency', 'dueDate', 'expiryTimestamp', 'idempotencyKey', 'amount'])(
    'returns VALIDATION_ERROR when %s is missing',
    (field) => {
      const payload = validPain013()
      delete payload[field]
      const result = validate('pain.013', payload)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.code).toBe('VALIDATION_ERROR')
        expect(result.fields.some(f => f.field === field)).toBe(true)
      }
    }
  )

  it('returns field error when amount is a string', () => {
    const payload = { ...validPain013(), amount: '100' }
    const result = validate('pain.013', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'amount')).toBe(true)
    }
  })

  it('returns field error when amount is zero', () => {
    const payload = { ...validPain013(), amount: 0 }
    const result = validate('pain.013', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'amount')).toBe(true)
    }
  })

  it('returns field error when amount is negative', () => {
    const payload = { ...validPain013(), amount: -10 }
    const result = validate('pain.013', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'amount')).toBe(true)
    }
  })

  it('returns field error when currency is not 3 chars', () => {
    const payload = { ...validPain013(), currency: 'CA' }
    const result = validate('pain.013', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'currency')).toBe(true)
    }
  })

  it('returns field error when dueDate is not YYYY-MM-DD', () => {
    const payload = { ...validPain013(), dueDate: '31/12/2030' }
    const result = validate('pain.013', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'dueDate')).toBe(true)
    }
  })

  it('returns field error when dueDate has no timezone marker (missing T)', () => {
    const payload = { ...validPain013(), dueDate: '2030-13-01' }
    const result = validate('pain.013', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'dueDate')).toBe(true)
    }
  })

  it('returns field error when expiryTimestamp has no timezone', () => {
    const payload = { ...validPain013(), expiryTimestamp: '2030-01-01T10:00:00' }
    const result = validate('pain.013', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'expiryTimestamp')).toBe(true)
    }
  })

  it('returns field error when expiryTimestamp is in the past', () => {
    const past = new Date(Date.now() - 3600_000).toISOString()
    const payload = { ...validPain013(), expiryTimestamp: past }
    const result = validate('pain.013', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'expiryTimestamp')).toBe(true)
    }
  })

  it('returns field error when payerId is empty string', () => {
    const payload = { ...validPain013(), payerId: '' }
    const result = validate('pain.013', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'payerId')).toBe(true)
    }
  })

  it('accumulates multiple field errors at once', () => {
    const payload = { ...validPain013(), amount: 'bad', currency: 'X' }
    const result = validate('pain.013', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.length).toBeGreaterThanOrEqual(2)
    }
  })
})

// ────────────────────────────────────────────────────────────
// pain.014 tests
// ────────────────────────────────────────────────────────────

describe('validate pain.014', () => {
  it('returns valid:true for a fully valid payload', () => {
    expect(validate('pain.014', validPain014())).toEqual({ valid: true })
  })

  it.each(['accept', 'decline', 'defer'])(
    'accepts responseType "%s"',
    (responseType) => {
      const payload = { ...validPain014(), responseType }
      expect(validate('pain.014', payload)).toEqual({ valid: true })
    }
  )

  it('returns field error when responseType is invalid', () => {
    const payload = { ...validPain014(), responseType: 'approve' }
    const result = validate('pain.014', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'responseType')).toBe(true)
    }
  })

  it('returns field error when r2pId is not a valid UUID', () => {
    const payload = { ...validPain014(), r2pId: 'not-a-uuid' }
    const result = validate('pain.014', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'r2pId')).toBe(true)
    }
  })

  it('returns field error when respondedAt has no timezone', () => {
    const payload = { ...validPain014(), respondedAt: '2030-01-01T10:00:00' }
    const result = validate('pain.014', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'respondedAt')).toBe(true)
    }
  })

  it.each(['r2pId', 'responseType', 'participantId', 'respondedAt'])(
    'returns VALIDATION_ERROR when %s is missing',
    (field) => {
      const payload = validPain014()
      delete payload[field]
      const result = validate('pain.014', payload)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.fields.some(f => f.field === field)).toBe(true)
      }
    }
  )
})

// ────────────────────────────────────────────────────────────
// camt.087 tests
// ────────────────────────────────────────────────────────────

describe('validate camt.087', () => {
  it('returns valid:true for a fully valid payload', () => {
    expect(validate('camt.087', validCamt087())).toEqual({ valid: true })
  })

  it.each([
    [{ amount: 500 }],
    [{ dueDate: '2030-12-31' }],
    [{ expiryTimestamp: FUTURE }],
    [{ remittanceInfo: 'updated info' }],
    [{ amount: 500, dueDate: '2030-12-31' }],
  ])(
    'accepts valid modifications object %j',
    (modifications) => {
      const payload = { ...validCamt087(), modifications }
      expect(validate('camt.087', payload)).toEqual({ valid: true })
    }
  )

  it('returns field error when modifications is empty object', () => {
    const payload = { ...validCamt087(), modifications: {} }
    const result = validate('camt.087', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'modifications')).toBe(true)
    }
  })

  it('returns field error when modifications contains unknown keys', () => {
    const payload = { ...validCamt087(), modifications: { unknownField: 'x' } }
    const result = validate('camt.087', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'modifications')).toBe(true)
    }
  })

  it('returns field error when modifications is not an object', () => {
    const payload = { ...validCamt087(), modifications: ['amount'] }
    const result = validate('camt.087', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'modifications')).toBe(true)
    }
  })

  it('returns field error when r2pId is not a valid UUID', () => {
    const payload = { ...validCamt087(), r2pId: 'bad-id' }
    const result = validate('camt.087', payload)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.fields.some(f => f.field === 'r2pId')).toBe(true)
    }
  })

  it.each(['r2pId', 'participantId', 'modifications'])(
    'returns VALIDATION_ERROR when %s is missing',
    (field) => {
      const payload = validCamt087()
      delete payload[field]
      const result = validate('camt.087', payload)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.fields.some(f => f.field === field)).toBe(true)
      }
    }
  )
})

// ────────────────────────────────────────────────────────────
// Unknown messageType
// ────────────────────────────────────────────────────────────

describe('validate — unknown messageType', () => {
  it('throws a descriptive error for an unknown messageType', () => {
    expect(() => {
      validate('pacs.002' as MessageType, {})
    }).toThrow(/Unknown messageType/)
  })
})

// ────────────────────────────────────────────────────────────
// validateISO20022 middleware
// ────────────────────────────────────────────────────────────

describe('validateISO20022 middleware', () => {
  function makeResMock() {
    let statusCode = 200
    let body: unknown = null
    const res = {
      status(code: number) { statusCode = code; return res },
      json(b: unknown) { body = b; return res },
      getStatusCode: () => statusCode,
      getBody: () => body,
    }
    return res
  }

  it('calls next() for a valid pain.013 payload', () => {
    const middleware = validateISO20022('pain.013')
    const req = { body: validPain013() }
    const res = makeResMock()
    const next = jest.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(res.getStatusCode()).toBe(200)
  })

  it('returns 400 JSON with VALIDATION_ERROR for an invalid pain.013 payload', () => {
    const middleware = validateISO20022('pain.013')
    const payload = { ...validPain013() }
    delete (payload as Record<string, unknown>)['payerId']
    const req = { body: payload }
    const res = makeResMock()
    const next = jest.fn()

    middleware(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.getStatusCode()).toBe(400)
    const body = res.getBody() as { code: string; fields: { field: string; message: string }[] }
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(body.fields.some((f: { field: string }) => f.field === 'payerId')).toBe(true)
  })

  it('does not modify the request body on success', () => {
    const middleware = validateISO20022('pain.013')
    const originalPayload = validPain013()
    const req = { body: { ...originalPayload } }
    const res = makeResMock()
    const next = jest.fn()

    middleware(req, res, next)

    expect(req.body).toEqual(originalPayload)
  })

  it('calls next() for a valid pain.014 payload', () => {
    const middleware = validateISO20022('pain.014')
    const req = { body: validPain014() }
    const res = makeResMock()
    const next = jest.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })

  it('calls next() for a valid camt.087 payload', () => {
    const middleware = validateISO20022('camt.087')
    const req = { body: validCamt087() }
    const res = makeResMock()
    const next = jest.fn()

    middleware(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
  })
})
