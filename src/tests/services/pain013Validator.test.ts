// src/tests/services/pain013Validator.test.ts
// S1.2 acceptance criteria tests for validatePain013Fields()

import { validatePain013Fields } from '../../services/pain013Validator'
import { Pain013Fields } from '../../services/pain013Parser'

const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10)
const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10)

const validFields: Pain013Fields = {
  msgId: 'MSG-001',
  creationDateTime: '2026-06-22T10:00:00Z',
  numberOfTransactions: '1',
  pmtInfId: 'PMTINF-001',
  instructedAmount: 250.00,
  currency: 'CAD',
  creditorName: 'Acme Corp',
  creditorAccountId: 'CREDITOR-ACC-001',
  debtorName: 'John Doe',
  debtorAccountId: 'DEBTOR-ACC-001',
  requestedExecutionDate: tomorrow,
  remittanceInfo: 'Invoice #001',
}

// ── AC: all valid → passes ────────────────────────────────────

describe('validatePain013Fields — valid fields', () => {
  it('returns valid:true when all mandatory fields are present and valid', () => {
    expect(validatePain013Fields(validFields)).toEqual({ valid: true })
  })

  it('accepts optional expiryDateTime when after creationDateTime', () => {
    const fields = { ...validFields, expiryDateTime: '2026-12-31T23:59:59Z' }
    expect(validatePain013Fields(fields)).toEqual({ valid: true })
  })
})

// ── AC: missing mandatory field → MS03 ───────────────────────

describe('validatePain013Fields — missing mandatory fields → MS03', () => {
  const mandatoryFields: { key: keyof Pain013Fields; expectedField: string }[] = [
    { key: 'msgId',                 expectedField: 'GrpHdr/MsgId' },
    { key: 'creationDateTime',      expectedField: 'GrpHdr/CreDtTm' },
    { key: 'numberOfTransactions',  expectedField: 'GrpHdr/NbOfTxs' },
    { key: 'requestedExecutionDate',expectedField: 'PmtInf/ReqdExctnDt' },
    { key: 'creditorName',          expectedField: 'PmtInf/Cdtr/Nm' },
    { key: 'creditorAccountId',     expectedField: 'PmtInf/CdtrAcct/Id' },
    { key: 'debtorName',            expectedField: 'PmtInf/Dbtr/Nm' },
    { key: 'debtorAccountId',       expectedField: 'PmtInf/DbtrAcct/Id' },
  ]

  for (const { key, expectedField } of mandatoryFields) {
    it(`returns MS03 when ${key} is empty`, () => {
      const fields = { ...validFields, [key]: '' }
      const result = validatePain013Fields(fields)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.reasonCode).toBe('MS03')
        expect(result.field).toBe(expectedField)
        expect(result.detail).toContain(expectedField)
      }
    })
  }

  it('returns MS03 when pmtInfId is empty', () => {
    const fields = { ...validFields, pmtInfId: '' }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasonCode).toBe('MS03')
      expect(result.field).toBe('PmtInf/PmtInfId')
    }
  })

  it('returns MS03 when remittanceInfo is empty', () => {
    const fields = { ...validFields, remittanceInfo: '' }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasonCode).toBe('MS03')
      expect(result.field).toBe('PmtInf/RmtInf/Ustrd')
    }
  })
})

// ── AC: field max-length checks → MS03 ───────────────────────

describe('validatePain013Fields — max-length checks → MS03', () => {
  it('returns MS03 when msgId exceeds 35 characters', () => {
    const fields = { ...validFields, msgId: 'A'.repeat(36) }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasonCode).toBe('MS03')
      expect(result.field).toBe('GrpHdr/MsgId')
    }
  })

  it('accepts msgId of exactly 35 characters', () => {
    const fields = { ...validFields, msgId: 'A'.repeat(35) }
    expect(validatePain013Fields(fields)).toEqual({ valid: true })
  })

  it('returns MS03 when pmtInfId exceeds 35 characters', () => {
    const fields = { ...validFields, pmtInfId: 'B'.repeat(36) }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasonCode).toBe('MS03')
      expect(result.field).toBe('PmtInf/PmtInfId')
    }
  })

  it('accepts pmtInfId of exactly 35 characters', () => {
    const fields = { ...validFields, pmtInfId: 'B'.repeat(35) }
    expect(validatePain013Fields(fields)).toEqual({ valid: true })
  })
})

// ── AC: ISO 8601 format check → MS03 ─────────────────────────

describe('validatePain013Fields — ISO 8601 CreDtTm format → MS03', () => {
  it('returns MS03 when creationDateTime is a date-only string', () => {
    const fields = { ...validFields, creationDateTime: '2026-06-22' }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasonCode).toBe('MS03')
      expect(result.field).toBe('GrpHdr/CreDtTm')
    }
  })

  it('returns MS03 when creationDateTime has no timezone', () => {
    const fields = { ...validFields, creationDateTime: '2026-06-22T10:00:00' }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasonCode).toBe('MS03')
      expect(result.field).toBe('GrpHdr/CreDtTm')
    }
  })

  it('accepts ISO 8601 with +offset', () => {
    const fields = { ...validFields, creationDateTime: '2026-06-22T10:00:00+05:30' }
    expect(validatePain013Fields(fields)).toEqual({ valid: true })
  })
})

// ── AC: past ReqdExctnDt → DT01 ──────────────────────────────

describe('validatePain013Fields — past RequestedExecutionDate → DT01', () => {
  it('returns DT01 when ReqdExctnDt is yesterday', () => {
    const fields = { ...validFields, requestedExecutionDate: yesterday }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasonCode).toBe('DT01')
      expect(result.field).toBe('PmtInf/ReqdExctnDt')
    }
  })

  it('accepts today as a valid ReqdExctnDt', () => {
    const today = new Date().toISOString().slice(0, 10)
    const fields = { ...validFields, requestedExecutionDate: today }
    expect(validatePain013Fields(fields)).toEqual({ valid: true })
  })
})

// ── AC: non-CAD currency → AM03 ──────────────────────────────

describe('validatePain013Fields — non-CAD currency → AM03', () => {
  it('returns AM03 for USD', () => {
    const fields = { ...validFields, currency: 'USD' }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reasonCode).toBe('AM03')
  })

  it('returns AM03 for empty currency', () => {
    const fields = { ...validFields, currency: '' }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reasonCode).toBe('AM03')
  })
})

// ── AC: zero or negative amount → AM03 ───────────────────────

describe('validatePain013Fields — zero/negative amount → AM03', () => {
  it('returns AM03 for amount = 0', () => {
    const fields = { ...validFields, instructedAmount: 0 }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reasonCode).toBe('AM03')
  })

  it('returns AM03 for negative amount', () => {
    const fields = { ...validFields, instructedAmount: -1 }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reasonCode).toBe('AM03')
  })
})

// ── AC: ExpiryDateTime <= CreDtTm → DT01 ─────────────────────

describe('validatePain013Fields — invalid ExpiryDateTime → DT01', () => {
  it('returns DT01 when ExpiryDateTime equals CreationDateTime', () => {
    const fields = { ...validFields, expiryDateTime: '2026-06-22T10:00:00Z' }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.reasonCode).toBe('DT01')
      expect(result.field).toBe('XpryDt')
    }
  })

  it('returns DT01 when ExpiryDateTime is before CreationDateTime', () => {
    const fields = { ...validFields, expiryDateTime: '2026-06-21T10:00:00Z' }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reasonCode).toBe('DT01')
  })
})

// ── AC: validator runs before routing (no side-effects on failure) ─

describe('validatePain013Fields — fail-fast, no routing on failure', () => {
  it('returns only the first error when multiple fields are invalid', () => {
    const fields = { ...validFields, currency: 'USD', instructedAmount: 0 }
    const result = validatePain013Fields(fields)
    expect(result.valid).toBe(false)
    if (!result.valid) {
      // currency checked before amount — only AM03 for currency returned
      expect(result.reasonCode).toBe('AM03')
      expect(result.detail).toContain('Currency')
    }
  })
})
