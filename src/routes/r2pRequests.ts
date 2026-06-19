// src/routes/r2pRequests.ts
// Express router for POST /r2p/requests.

import { createRequest } from '../services/r2pRequest'
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

// ── Mount ─────────────────────────────────────────────────────

export function mountR2PRequests(router: Router): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  router.post('/r2p/requests', validateISO20022('pain.013') as any as RequestHandler, createRequestHandler)
}
