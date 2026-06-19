// src/routes/addressDirectory.ts
// Express router for Address Directory endpoints.
// Uses inline Express-compatible types (mirrors pattern in src/validators/middleware.ts).

import * as svc from '../services/addressDirectory'
import type { ServiceError } from '../services/addressDirectory'
import { isValidProxyType } from '../services/addressDirectory'

// ── Minimal Express-compatible types (no @types/express required) ──
interface Request {
  params: Record<string, string>
  query: Record<string, string | string[]>
  body: unknown
}

interface Response {
  status(code: number): Response
  json(body: unknown): Response
}

type NextFunction = () => void
type RequestHandler = (req: Request, res: Response, next: NextFunction) => void

interface Router {
  get(path: string, handler: RequestHandler): void
  post(path: string, handler: RequestHandler): void
  put(path: string, handler: RequestHandler): void
  delete(path: string, handler: RequestHandler): void
}

// ── helpers ───────────────────────────────────────────────────

function sendError(res: Response, err: ServiceError): Response {
  return res.status(err.status).json({ code: err.code, message: err.message })
}

function body(req: Request): Record<string, unknown> {
  return (req.body ?? {}) as Record<string, unknown>
}

// ── handlers ──────────────────────────────────────────────────

/** GET /addresses — list all registered addresses */
const listAddresses: RequestHandler = (_req, res, _next) => {
  res.status(200).json(svc.listAddresses())
}

/** GET /addresses/resolve?proxyType=email&proxyValue=foo@bar.ca */
const resolveProxy: RequestHandler = (req, res, _next) => {
  const proxyType = String(req.query['proxyType'] ?? '')
  const proxyValue = String(req.query['proxyValue'] ?? '')
  const result = svc.resolveProxy({ proxyType, proxyValue })
  if (!result.ok) return sendError(res, result.error)
  res.status(200).json(result.value)
}

/** GET /addresses/:id */
const getAddress: RequestHandler = (req, res, _next) => {
  const result = svc.getAddress(req.params['id'] ?? '')
  if (!result.ok) return sendError(res, result.error)
  res.status(200).json(result.value)
}

/** GET /addresses/participant/:participantId */
const getByParticipant: RequestHandler = (req, res, _next) => {
  const result = svc.getAddressByParticipant(req.params['participantId'] ?? '')
  if (!result.ok) return sendError(res, result.error)
  res.status(200).json(result.value)
}

/** POST /addresses — register a new address */
const registerAddress: RequestHandler = (req, res, _next) => {
  const b = body(req)
  const result = svc.registerAddress({
    participantId: String(b['participantId'] ?? ''),
    proxyType: String(b['proxyType'] ?? ''),
    proxyValue: String(b['proxyValue'] ?? ''),
    endpointUrl: String(b['endpointUrl'] ?? ''),
  })
  if (!result.ok) return sendError(res, result.error)
  res.status(201).json(result.value)
}

/** PUT /addresses/:id — update endpointUrl and/or active flag */
const updateAddress: RequestHandler = (req, res, _next) => {
  const b = body(req)
  const input: { endpointUrl?: string; active?: boolean } = {}
  if (b['endpointUrl'] !== undefined) input.endpointUrl = String(b['endpointUrl'])
  if (b['active'] !== undefined) input.active = Boolean(b['active'])

  const result = svc.updateAddress(req.params['id'] ?? '', input)
  if (!result.ok) return sendError(res, result.error)
  res.status(200).json(result.value)
}

/** DELETE /addresses/:id — deregister an address */
const deregisterAddress: RequestHandler = (req, res, _next) => {
  const result = svc.deregisterAddress(req.params['id'] ?? '')
  if (!result.ok) return sendError(res, result.error)
  res.status(204).json({})
}

// ── Spec-required internal route (ticket 1.3) ─────────────────
// GET /internal/address-directory/resolve?proxyType=X&proxyValue=Y
// Error codes match the spec: INVALID_PROXY_TYPE, PARTICIPANT_NOT_FOUND

export const internalResolveHandler: RequestHandler = (req, res, _next) => {
  const proxyTypeRaw = req.query['proxyType']
  const proxyValueRaw = req.query['proxyValue']

  // 400 — missing params
  if (!proxyTypeRaw) {
    res.status(400).json({ code: 'INVALID_PROXY_TYPE', message: 'proxyType must be one of: email, phone, alias' })
    return
  }
  if (!proxyValueRaw) {
    res.status(400).json({ code: 'MISSING_PARAM', message: 'proxyValue is required' })
    return
  }

  const proxyType = String(proxyTypeRaw)
  const proxyValue = String(proxyValueRaw)

  // 400 — invalid proxy type
  if (!isValidProxyType(proxyType)) {
    res.status(400).json({ code: 'INVALID_PROXY_TYPE', message: 'proxyType must be one of: email, phone, alias' })
    return
  }

  // resolve
  const address = svc.resolve(proxyType, proxyValue)
  if (!address) {
    res.status(404).json({ code: 'PARTICIPANT_NOT_FOUND', message: 'No participant found for given proxy' })
    return
  }

  res.status(200).json(address)
}

// ── mount ─────────────────────────────────────────────────────

export function mountAddressDirectory(router: Router): void {
  // Internal spec-required route
  router.get('/internal/address-directory/resolve', internalResolveHandler)
  // Order matters: /resolve and /participant/:id before /:id to avoid param capture
  router.get('/addresses/resolve', resolveProxy)
  router.get('/addresses/participant/:participantId', getByParticipant)
  router.get('/addresses/:id', getAddress)
  router.get('/addresses', listAddresses)
  router.post('/addresses', registerAddress)
  router.put('/addresses/:id', updateAddress)
  router.delete('/addresses/:id', deregisterAddress)
}
