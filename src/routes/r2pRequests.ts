// src/routes/r2pRequests.ts
// Express router for POST /r2p/requests.

import { createRequest, modifyRequest } from '../services/r2pRequest'
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
  post(path: string, ...handlers: RequestHandler[]): void
  patch(path: string, ...handlers: RequestHandler[]): void
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

// ── Mount ─────────────────────────────────────────────────────

export function mountR2PRequests(router: Router): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router.post('/r2p/requests', validateISO20022('pain.013') as any as RequestHandler, createRequestHandler)
  router.patch('/r2p/requests/:r2pId', modifyRequestHandler)
}
