// src/services/pain013Validator.ts
// Validates parsed Pain013Fields against mandatory field rules.
// Returns on first failure (fail-fast). No routing is called before this passes.

import { Pain013Fields } from './pain013Parser'

export type ReasonCode = 'MS03' | 'AM03' | 'DT01'

export type ValidationResult =
  | { valid: true }
  | { valid: false; reasonCode: ReasonCode; field: string; detail: string }

function fail(reasonCode: ReasonCode, field: string, detail: string): ValidationResult {
  return { valid: false, reasonCode, field, detail }
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10)
}

const ISO8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/

export function validatePain013Fields(f: Pain013Fields): ValidationResult {
  // Presence checks (belt-and-suspenders — parser already enforces these)
  if (!f.msgId)
    return fail('MS03', 'GrpHdr/MsgId', 'Missing field: GrpHdr/MsgId')
  if (f.msgId.length > 35)
    return fail('MS03', 'GrpHdr/MsgId', 'GrpHdr/MsgId must not exceed 35 characters')
  if (!f.creationDateTime)
    return fail('MS03', 'GrpHdr/CreDtTm', 'Missing field: GrpHdr/CreDtTm')
  if (!ISO8601_RE.test(f.creationDateTime) || isNaN(Date.parse(f.creationDateTime)))
    return fail('MS03', 'GrpHdr/CreDtTm', 'GrpHdr/CreDtTm must be a valid ISO 8601 datetime')
  if (!f.numberOfTransactions)
    return fail('MS03', 'GrpHdr/NbOfTxs', 'Missing field: GrpHdr/NbOfTxs')
  if (!f.pmtInfId)
    return fail('MS03', 'PmtInf/PmtInfId', 'Missing field: PmtInf/PmtInfId')
  if (f.pmtInfId.length > 35)
    return fail('MS03', 'PmtInf/PmtInfId', 'PmtInf/PmtInfId must not exceed 35 characters')
  if (!f.requestedExecutionDate)
    return fail('MS03', 'PmtInf/ReqdExctnDt', 'Missing field: PmtInf/ReqdExctnDt')
  if (!f.creditorName)
    return fail('MS03', 'PmtInf/Cdtr/Nm', 'Missing field: PmtInf/Cdtr/Nm')
  if (!f.creditorAccountId)
    return fail('MS03', 'PmtInf/CdtrAcct/Id', 'Missing field: PmtInf/CdtrAcct/Id')
  if (!f.debtorName)
    return fail('MS03', 'PmtInf/Dbtr/Nm', 'Missing field: PmtInf/Dbtr/Nm')
  if (!f.debtorAccountId)
    return fail('MS03', 'PmtInf/DbtrAcct/Id', 'Missing field: PmtInf/DbtrAcct/Id')
  if (!f.remittanceInfo)
    return fail('MS03', 'PmtInf/RmtInf/Ustrd', 'Missing field: PmtInf/RmtInf/Ustrd')

  // Date: ReqdExctnDt must be >= today UTC
  if (f.requestedExecutionDate < todayUtc())
    return fail('DT01', 'PmtInf/ReqdExctnDt', 'RequestedExecutionDate must not be in the past')

  // Currency: must be CAD
  if (f.currency !== 'CAD')
    return fail('AM03', 'PmtInf/CdtTrfTx/Amt/InstdAmt/@Ccy', 'Currency must be CAD')

  // Amount: must be > 0
  if (f.instructedAmount <= 0)
    return fail('AM03', 'PmtInf/CdtTrfTx/Amt/InstdAmt', 'InstructedAmount must be greater than 0')

  // ExpiryDateTime (optional): if present must be after CreDtTm
  if (f.expiryDateTime !== undefined) {
    if (new Date(f.expiryDateTime) <= new Date(f.creationDateTime))
      return fail('DT01', 'XpryDt', 'ExpiryDateTime must be after CreationDateTime')
  }

  return { valid: true }
}
