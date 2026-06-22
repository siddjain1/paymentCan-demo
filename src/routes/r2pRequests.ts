// src/routes/r2pRequests.ts
// Express router for POST /r2p/requests.

import { createRequest, modifyRequest, cancelRequest, acknowledgeRequest, respondToRequest, getRequest } from '../services/r2pRequest'
import { validateISO20022 } from '../validators/middleware'

// ── Minimal Express-compatible types ──────────────────────────

interface Request {
  params: Record<string, string>
  query: Record<string, string | string[]>
  body: Record<string, unknown>
}

interface Response {
  status(code: number): Response
  json(body: unknown): Response
}

type NextFunction = (err?: unknown) => void
type RequestHandler = (req: Request, res: Response, next: NextFunction) => void

interface Router {
  get(path: string, ...handlers: RequestHandler[]): void
  post(path: string, ...handlers: RequestHandler[]): void
  patch(path: string, ...handlers: RequestHandler[]): void
  delete(path: string, ...handlers: RequestHandler[]): void
}

// ── Route handler ─────────────────────────────────────────────

const createRequestHandler: RequestHandler = (req, res, _next) => {
  const b = req.body
  const result = createRequest({
    payerId:         String(b['payerId'] ?? ''),
    payeeId:         String(b['payeeId'] ?? ''),
    amount:          Number(b['amount']),
    currency:        String(b['currency'] ?? ''),
    dueDate:         String(b['dueDate'] ?? ''),
    expiryTimestamp: String(b['expiryTimestamp'] ?? ''),
    remittanceInfo:  b['remittanceInfo'] !== undefined ? String(b['remittanceInfo']) : undefined,
    idempotencyKey:  String(b['idempotencyKey'] ?? ''),
  })

  if (!result.ok) {
    const status = result.code === 'DUPLICATE_REQUEST' ? 409 : 404
    res.status(status).json({ code: result.code, message: result.message })
    return
  }

  res.status(201).json({ r2pId: result.r2pId, status: result.status, createdAt: result.createdAt })
}

// ── PATCH /r2p/requests/:r2pId ────────────────────────────────

const modifyRequestHandler: RequestHandler = (req, res, _next) => {
  const { r2pId } = req.params
  const patch = req.body as Record<string, unknown>

  const input: { amount?: number; dueDate?: string; expiryTimestamp?: string; remittanceInfo?: string } = {}
  if ('amount' in patch) input.amount = patch['amount'] as number
  if ('dueDate' in patch) input.dueDate = patch['dueDate'] as string
  if ('expiryTimestamp' in patch) input.expiryTimestamp = patch['expiryTimestamp'] as string
  if ('remittanceInfo' in patch) input.remittanceInfo = patch['remittanceInfo'] as string

  const result = modifyRequest(r2pId, input)
  if (!result.ok) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      INVALID_STATE_TRANSITION: 409,
      NO_FIELDS_TO_UPDATE: 400,
      VALIDATION_ERROR: 400,
    }
    res.status(statusMap[result.code] ?? 400).json({ code: result.code, message: result.message })
    return
  }
  res.status(200).json({ r2pId: result.r2pId, status: result.status, updatedAt: result.updatedAt })
}

// ── DELETE /r2p/requests/:r2pId ──────────────────────────────

const cancelRequestHandler: RequestHandler = (req, res, _next) => {
  const { r2pId } = req.params
  const result = cancelRequest(r2pId)
  if (!result.ok) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      INVALID_STATE_TRANSITION: 409,
    }
    res.status(statusMap[result.code] ?? 400).json({ code: result.code, message: result.message })
    return
  }
  res.status(200).json({ r2pId: result.r2pId, status: result.status, cancelledAt: result.cancelledAt })
}

// ── POST /r2p/requests/:r2pId/acknowledge ─────────────────────

const acknowledgeRequestHandler: RequestHandler = (req, res, _next) => {
  const { r2pId } = req.params
  const b = req.body
  const result = acknowledgeRequest(r2pId, {
    participantId: String(b['participantId'] ?? ''),
    receivedAt:    String(b['receivedAt'] ?? ''),
  })
  if (!result.ok) {
    const statusMap: Record<string, number> = {
      NOT_FOUND:            404,
      ALREADY_ACKNOWLEDGED: 409,
    }
    res.status(statusMap[result.code] ?? 400).json({ code: result.code, message: result.message })
    return
  }
  res.status(200).json({ r2pId: result.r2pId, status: result.status })
}

// ── POST /r2p/requests/:r2pId/respond ────────────────────────

const respondToRequestHandler: RequestHandler = (req, res, _next) => {
  const { r2pId } = req.params
  const b = req.body
  const respondInput: Parameters<typeof respondToRequest>[1] = {
    responseType:  String(b['responseType'] ?? '') as 'accept' | 'decline' | 'defer',
    participantId: String(b['participantId'] ?? ''),
    respondedAt:   String(b['respondedAt'] ?? ''),
  }
  if (b['amount'] !== undefined) respondInput.amount = Number(b['amount'])

  const result = respondToRequest(r2pId, respondInput)
  if (!result.ok) {
    const statusMap: Record<string, number> = {
      NOT_FOUND:                404,
      INVALID_STATE_TRANSITION: 409,
      EXPIRED:                  409,
      VALIDATION_ERROR:         400,
      AMOUNT_MISMATCH:          400,
    }
    res.status(statusMap[result.code] ?? 400).json({ code: result.code, message: result.message })
    return
  }
  res.status(200).json({ r2pId: result.r2pId, status: result.status })
}

// ── GET /r2p/requests/:r2pId ──────────────────────────────────

const getRequestHandler: RequestHandler = (req, res, _next) => {
  const { r2pId } = req.params
  const result = getRequest(r2pId)
  if (!result.ok) {
    res.status(404).json({ code: result.code, message: result.message })
    return
  }
  res.status(200).json(result.request)
}

// ── Mount ─────────────────────────────────────────────────────

export function mountR2PRequests(router: Router): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router.post('/r2p/requests', validateISO20022('pain.013') as any as RequestHandler, createRequestHandler)
  router.get('/r2p/requests/:r2pId', getRequestHandler)
  router.patch('/r2p/requests/:r2pId', modifyRequestHandler)
  router.delete('/r2p/requests/:r2pId', cancelRequestHandler)
  router.post('/r2p/requests/:r2pId/acknowledge', acknowledgeRequestHandler)
  router.post('/r2p/requests/:r2pId/respond', respondToRequestHandler)
}
