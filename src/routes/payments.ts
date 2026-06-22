// src/routes/payments.ts
// Express route handler for POST /r2p/payments.

import { submitPayment } from '../services/paymentEngine'

// ── Minimal Express-compatible types ──────────────────────────

interface Request {
  params: Record<string, string>
  body:   Record<string, unknown>
}

interface Response {
  status(code: number): Response
  json(body: unknown): Response
}

type NextFunction   = (err?: unknown) => void
type RequestHandler = (req: Request, res: Response, next: NextFunction) => void

interface Router {
  post(path: string, ...handlers: RequestHandler[]): void
}

// ── POST /r2p/payments ────────────────────────────────────────

const submitPaymentHandler: RequestHandler = (req, res, _next) => {
  const b = req.body
  void submitPayment({
    r2pId:         String(b['r2pId']         ?? ''),
    paymentAmount: Number(b['paymentAmount']),
    currency:      String(b['currency']       ?? ''),
    payerId:       String(b['payerId']        ?? ''),
    payeeId:       String(b['payeeId']        ?? ''),
  }).then((result) => {
    if (!result.ok) {
      const statusMap: Record<string, number> = {
        R2P_NOT_FOUND:            404,
        INVALID_STATE_TRANSITION: 409,
        AMOUNT_MISMATCH:          400,
      }
      res.status(statusMap[result.code] ?? 400).json({ code: result.code, message: result.message })
      return
    }
    res.status(201).json({ paymentId: result.paymentId, r2pId: result.r2pId, status: result.status })
  })
}

// ── Mount ─────────────────────────────────────────────────────

export function mountPayments(router: Router): void {
  router.post('/r2p/payments', submitPaymentHandler)
}
