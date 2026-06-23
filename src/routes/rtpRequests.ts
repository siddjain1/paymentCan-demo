// src/routes/rtpRequests.ts
// POST /rtp/v1/requests — RtP Creation API (S1.1)

import { randomUUID } from 'crypto'
import { parsePain013, computeDuplicateKey } from '../services/pain013Parser'
import { buildAccpResponse, buildRjctResponse, buildDuplicateResponse } from '../services/pain002Builder'
import { resolveParticipant, isEntitledParticipant } from '../services/resolveParticipant'
import { saveRequest, appendAudit, appendTransition, findByIdempotencyKey, R2PRequestRow } from '../db/r2pStore'

// ── Minimal Express-compatible types ──────────────────────────

interface Request {
  headers: Record<string, string | string[] | undefined>
  body: unknown
}

interface Response {
  status(code: number): Response
  set(header: string, value: string): Response
  send(body: string): void
}

type NextFunction = (err?: unknown) => void
type RequestHandler = (req: Request, res: Response, next: NextFunction) => void

interface Router {
  post(path: string, ...handlers: RequestHandler[]): void
}

// ── Helpers ────────────────────────────────────────────────────

function xmlReply(res: Response, status: number, xml: string): void {
  res.status(status).set('Content-Type', 'application/xml').send(xml)
}

function emitEvent(type: string, rtpTransactionId: string, participantId: string): void {
  // Stub — real implementation publishes to event bus (ticket 6.5)
  console.log(JSON.stringify({
    type,
    rtpTransactionId,
    participantId,
    timestamp: new Date().toISOString(),
  }))
}

// ── Handler ────────────────────────────────────────────────────

const createRtpRequest: RequestHandler = (req, res, _next) => {
  // 1. Participant auth — X-Participant-Id stands in for mTLS cert CN (POC stub)
  const participantId = String(req.headers['x-participant-id'] ?? '')
  if (!participantId || !isEntitledParticipant(participantId)) {
    xmlReply(res, 403, buildRjctResponse('UNKNOWN', 'BE01', 'Participant not entitled'))
    return
  }

  // 2. Parse XML body
  const rawBody = typeof req.body === 'string' ? req.body : ''
  if (!rawBody) {
    xmlReply(res, 400, buildRjctResponse('UNKNOWN', 'MS02', 'Request body must be application/xml'))
    return
  }

  const parseResult = parsePain013(rawBody)
  if (!parseResult.ok) {
    xmlReply(res, 400, buildRjctResponse('UNKNOWN', 'MS03', `Missing field: ${parseResult.missingField}`))
    return
  }

  const f = parseResult.fields

  // 3. Currency validation
  if (f.currency !== 'CAD') {
    xmlReply(res, 400, buildRjctResponse(f.msgId, 'AM03', 'Currency must be CAD'))
    return
  }

  // 4. Amount validation
  if (f.instructedAmount <= 0) {
    xmlReply(res, 400, buildRjctResponse(f.msgId, 'AM03', 'InstructedAmount must be greater than 0'))
    return
  }

  // 5. Date validation — ReqdExctnDt must be >= today (UTC)
  const today = new Date().toISOString().slice(0, 10)
  if (f.requestedExecutionDate < today) {
    xmlReply(res, 400, buildRjctResponse(f.msgId, 'DT01', 'RequestedExecutionDate must not be in the past'))
    return
  }

  // 6. Duplicate detection
  const dupKey = computeDuplicateKey(f.msgId, f.creationDateTime, participantId)
  const existing = findByIdempotencyKey(dupKey)
  if (existing) {
    xmlReply(res, 200, buildDuplicateResponse(f.msgId, existing.id))
    return
  }

  // 7. Resolve routing
  const participant = resolveParticipant(f.debtorAccountId)
  if (!participant) {
    xmlReply(res, 400, buildRjctResponse(f.msgId, 'AC01', 'Debtor account not routable'))
    return
  }

  // 8. Persist — single logical transaction
  const rtpTransactionId = randomUUID()
  const now = new Date().toISOString()
  const defaultExpiryHours = parseInt(process.env['RTP_DEFAULT_EXPIRY_HOURS'] ?? '72', 10)
  const expiryTimestamp = f.expiryDateTime
    ?? new Date(Date.now() + defaultExpiryHours * 3600 * 1000).toISOString()

  const row: R2PRequestRow = {
    id: rtpTransactionId,
    idempotency_key: dupKey,
    payer_id: f.debtorName,
    payee_id: f.creditorName,
    originating_participant_id: participantId,
    receiving_participant_id: participant.participantId,
    amount: f.instructedAmount,
    currency: f.currency,
    due_date: f.requestedExecutionDate,
    expiry_timestamp: expiryTimestamp,
    remittance_info: f.remittanceInfo ?? null,
    status: 'SUBMITTED',
    version: 0,
    created_at: now,
    updated_at: now,
  }

  try {
    saveRequest(row)
  } catch {
    xmlReply(res, 503, buildRjctResponse(f.msgId, 'NARR', 'Persistence failure — please retry'))
    return
  }

  appendTransition({ r2p_id: rtpTransactionId, from_status: null, to_status: 'SUBMITTED', actor: participantId })
  appendAudit({ r2p_id: rtpTransactionId, event_type: 'RTP_SUBMITTED', actor: participantId, detail: f.msgId })
  emitEvent('SUBMITTED', rtpTransactionId, participantId)

  // 9. Route to payer FI (synchronous stub — real impl is async with retry per S1.8)
  row.status = 'DELIVERED'
  row.updated_at = new Date().toISOString()
  saveRequest(row)
  appendTransition({ r2p_id: rtpTransactionId, from_status: 'SUBMITTED', to_status: 'DELIVERED', actor: 'routing-engine' })
  appendAudit({ r2p_id: rtpTransactionId, event_type: 'RTP_DELIVERED', actor: 'routing-engine', detail: participant.participantId })
  emitEvent('DELIVERED', rtpTransactionId, participant.participantId)

  // 10. Respond ACCP with transaction ID
  xmlReply(res, 202, buildAccpResponse(f.msgId, rtpTransactionId))
}

// ── Mount ──────────────────────────────────────────────────────

export function mountRtpRequests(router: Router): void {
  router.post('/rtp/v1/requests', createRtpRequest)
}
