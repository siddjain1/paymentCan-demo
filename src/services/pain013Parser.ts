// src/services/pain013Parser.ts
// Extracts mandatory fields from a pain.013.001.07 XML string.
// Uses tag-level string extraction — no external XML library required.

import { createHash } from 'crypto'

export interface Pain013Fields {
  msgId: string
  creationDateTime: string
  numberOfTransactions: string
  instructedAmount: number
  currency: string
  creditorName: string
  creditorAccountId: string
  debtorName: string
  debtorAccountId: string
  requestedExecutionDate: string
  expiryDateTime?: string
  remittanceInfo?: string
}

export type Pain013ParseResult =
  | { ok: true; fields: Pain013Fields }
  | { ok: false; missingField: string }

// Returns the inner content of the first matching tag, or undefined.
function tagContent(xml: string, tag: string): string | undefined {
  const openIdx = xml.indexOf(`<${tag}`)
  if (openIdx === -1) return undefined
  const bodyStart = xml.indexOf('>', openIdx)
  if (bodyStart === -1) return undefined
  const closeIdx = xml.indexOf(`</${tag}>`, bodyStart)
  if (closeIdx === -1) return undefined
  return xml.slice(bodyStart + 1, closeIdx).trim()
}

// Extracts InstdAmt value and Ccy attribute.
function extractInstdAmt(xml: string): { amount: number; currency: string } | undefined {
  const m = /<InstdAmt\s+Ccy="([A-Z]{3})">([\d.]+)<\/InstdAmt>/i.exec(xml)
  if (!m) return undefined
  const amount = parseFloat(m[2])
  if (isNaN(amount)) return undefined
  return { currency: m[1], amount }
}

// Resolves an account ID from an account block (CdtrAcct or DbtrAcct).
// Tries Othr/Id first (most common in pain.013), then IBAN.
function extractAccountId(accountBlock: string): string | undefined {
  const othrBlock = tagContent(accountBlock, 'Othr')
  if (othrBlock) return tagContent(othrBlock, 'Id')
  return tagContent(accountBlock, 'IBAN')
}

export function parsePain013(xml: string): Pain013ParseResult {
  const msgId = tagContent(xml, 'MsgId')
  if (!msgId) return { ok: false, missingField: 'GrpHdr/MsgId' }

  const creationDateTime = tagContent(xml, 'CreDtTm')
  if (!creationDateTime) return { ok: false, missingField: 'GrpHdr/CreDtTm' }

  const numberOfTransactions = tagContent(xml, 'NbOfTxs')
  if (!numberOfTransactions) return { ok: false, missingField: 'GrpHdr/NbOfTxs' }

  const requestedExecutionDate = tagContent(xml, 'ReqdExctnDt')
  if (!requestedExecutionDate) return { ok: false, missingField: 'PmtInf/ReqdExctnDt' }

  const amtResult = extractInstdAmt(xml)
  if (!amtResult) return { ok: false, missingField: 'PmtInf/CdtTrfTx/Amt/InstdAmt' }

  const cdtrBlock = tagContent(xml, 'Cdtr')
  const creditorName = cdtrBlock ? tagContent(cdtrBlock, 'Nm') : undefined
  if (!creditorName) return { ok: false, missingField: 'PmtInf/Cdtr/Nm' }

  // Account ID is nested as CdtrAcct/Id/Othr/Id — pass the full account block to extractAccountId
  const cdtrAcctBlock = tagContent(xml, 'CdtrAcct')
  const creditorAccountId = cdtrAcctBlock ? extractAccountId(cdtrAcctBlock) : undefined
  if (!creditorAccountId) return { ok: false, missingField: 'PmtInf/CdtrAcct/Id' }

  const dbtrBlock = tagContent(xml, 'Dbtr')
  const debtorName = dbtrBlock ? tagContent(dbtrBlock, 'Nm') : undefined
  if (!debtorName) return { ok: false, missingField: 'PmtInf/Dbtr/Nm' }

  const dbtrAcctBlock = tagContent(xml, 'DbtrAcct')
  const debtorAccountId = dbtrAcctBlock ? extractAccountId(dbtrAcctBlock) : undefined
  if (!debtorAccountId) return { ok: false, missingField: 'PmtInf/DbtrAcct/Id' }

  const xpryBlock = tagContent(xml, 'XpryDt')
  const expiryDateTime = xpryBlock ? tagContent(xpryBlock, 'Dt') ?? xpryBlock : undefined

  const rmtBlock = tagContent(xml, 'RmtInf')
  const remittanceInfo = rmtBlock ? tagContent(rmtBlock, 'Ustrd') ?? rmtBlock : undefined

  return {
    ok: true,
    fields: {
      msgId,
      creationDateTime,
      numberOfTransactions,
      instructedAmount: amtResult.amount,
      currency: amtResult.currency,
      creditorName,
      creditorAccountId,
      debtorName,
      debtorAccountId,
      requestedExecutionDate,
      expiryDateTime,
      remittanceInfo,
    },
  }
}

export function computeDuplicateKey(
  msgId: string,
  creationDateTime: string,
  originatorParticipantId: string
): string {
  const dateOnly = creationDateTime.slice(0, 10)
  return createHash('sha256')
    .update(`${msgId}:${dateOnly}:${originatorParticipantId}`)
    .digest('hex')
}
