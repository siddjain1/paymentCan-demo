// src/tests/routes/r2pRequests.test.ts
// Integration-style tests for POST /r2p/requests route.
// Uses mock req/res — no HTTP server required.

import { resetStore } from '../../services/r2pRequest'
import { resetStore as resetAddressStore } from '../../db/store'
import { mountR2PRequests } from '../../routes/r2pRequests'

// ── Mock Request / Response ───────────────────────────────────

interface MockResponse {
  statusCode: number
  body: unknown
  status(code: number): MockResponse
  json(data: unknown): MockResponse
}

function makeRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(data: unknown) {
      this.body = data
      return this
    },
  }
  return res
}

// ── Minimal mock router that collects routes ──────────────────

interface RouteEntry {
  method: string
  path: string
  handlers: ((...args: unknown[]) => unknown)[]
}

function makeRouter() {
  const routes: RouteEntry[] = []
  const router = {
    get: (path: string, ...handlers: ((...args: unknown[]) => unknown)[]) => {
      routes.push({ method: 'GET', path, handlers })
    },
    post: (path: string, ...handlers: ((...args: unknown[]) => unknown)[]) => {
      routes.push({ method: 'POST', path, handlers })
    },
    patch: (path: string, ...handlers: ((...args: unknown[]) => unknown)[]) => {
      routes.push({ method: 'PATCH', path, handlers })
    },
    put: (path: string, ...handlers: ((...args: unknown[]) => unknown)[]) => {
      routes.push({ method: 'PUT', path, handlers })
    },
    delete: (path: string, ...handlers: ((...args: unknown[]) => unknown)[]) => {
      routes.push({ method: 'DELETE', path, handlers })
    },
  }
  return { router, routes }
}

// ── Execute middleware chain ──────────────────────────────────

function runHandlers(
  handlers: ((...args: unknown[]) => unknown)[],
  req: unknown,
  res: MockResponse
): MockResponse {
  let idx = 0
  function next(err?: unknown) {
    if (err || idx >= handlers.length) return
    const handler = handlers[idx++]
    handler(req, res, next)
  }
  next()
  return res
}

// ── Setup ─────────────────────────────────────────────────────

let postHandlers: ((...args: unknown[]) => unknown)[] = []

beforeAll(() => {
  const { router, routes } = makeRouter()
  mountR2PRequests(router as any)
  const postRoute = routes.find((r) => r.method === 'POST' && r.path === '/r2p/requests')
  if (!postRoute) throw new Error('POST /r2p/requests route not registered')
  postHandlers = postRoute.handlers
})

beforeEach(() => {
  resetStore()
  resetAddressStore()
})

// ── Valid body ────────────────────────────────────────────────

const validBody = {
  payerId: 'payer@banka.ca',
  payeeId: 'payee@bankb.ca',
  amount: 250.0,
  currency: 'CAD',
  dueDate: '2026-08-01',
  expiryTimestamp: '2026-08-01T23:59:59Z',
  remittanceInfo: 'Rent',
  idempotencyKey: 'route-idem-001',
}

// ── AC: 201 { r2pId, status: "created", createdAt } ─────────

describe('POST /r2p/requests — valid request', () => {
  it('returns 201 with r2pId, status=created, createdAt', () => {
    const req = { params: {}, query: {}, body: { ...validBody } }
    const res = makeRes()
    runHandlers(postHandlers, req, res)

    expect(res.statusCode).toBe(201)
    const body = res.body as { r2pId: string; status: string; createdAt: string }
    expect(body.r2pId).toBeTruthy()
    expect(body.status).toBe('created')
    expect(typeof body.createdAt).toBe('string')
  })
})

// ── AC: 409 DUPLICATE_REQUEST ────────────────────────────────

describe('POST /r2p/requests — duplicate idempotencyKey', () => {
  it('returns 409 DUPLICATE_REQUEST on second call', () => {
    const req1 = { params: {}, query: {}, body: { ...validBody } }
    const req2 = { params: {}, query: {}, body: { ...validBody } }
    runHandlers(postHandlers, req1, makeRes())
    const res2 = makeRes()
    runHandlers(postHandlers, req2, res2)

    expect(res2.statusCode).toBe(409)
    const body = res2.body as { code: string }
    expect(body.code).toBe('DUPLICATE_REQUEST')
  })
})

// ── AC: 400 VALIDATION_ERROR for invalid pain.013 payload ────

describe('POST /r2p/requests — invalid pain.013 payload', () => {
  it('returns 400 VALIDATION_ERROR when amount is missing', () => {
    const { amount: _omit, ...noAmount } = validBody
    const req = { params: {}, query: {}, body: noAmount as Record<string, unknown> }
    const res = makeRes()
    runHandlers(postHandlers, req, res)

    expect(res.statusCode).toBe(400)
    const body = res.body as { code: string; fields: unknown[] }
    expect(body.code).toBe('VALIDATION_ERROR')
    expect(Array.isArray(body.fields)).toBe(true)
    expect(body.fields.length).toBeGreaterThan(0)
  })

  it('returns 400 VALIDATION_ERROR when currency is wrong length', () => {
    const req = { params: {}, query: {}, body: { ...validBody, currency: 'CA', idempotencyKey: 'idem-currency' } }
    const res = makeRes()
    runHandlers(postHandlers, req, res)

    expect(res.statusCode).toBe(400)
    const body = res.body as { code: string; fields: { field: string }[] }
    expect(body.code).toBe('VALIDATION_ERROR')
    const currencyError = body.fields.find((f) => f.field === 'currency')
    expect(currencyError).toBeDefined()
  })

  it('returns 400 VALIDATION_ERROR when payerId is missing', () => {
    const { payerId: _omit, ...noPayerId } = validBody
    const req = { params: {}, query: {}, body: noPayerId as Record<string, unknown> }
    const res = makeRes()
    runHandlers(postHandlers, req, res)

    expect(res.statusCode).toBe(400)
    const body = res.body as { code: string; fields: { field: string }[] }
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 VALIDATION_ERROR when dueDate is not a date', () => {
    const req = {
      params: {}, query: {},
      body: { ...validBody, dueDate: 'not-a-date', idempotencyKey: 'idem-date' }
    }
    const res = makeRes()
    runHandlers(postHandlers, req, res)

    expect(res.statusCode).toBe(400)
    const body = res.body as { code: string }
    expect(body.code).toBe('VALIDATION_ERROR')
  })
})

// ── AC: 404 PAYER_NOT_FOUND ───────────────────────────────────

describe('POST /r2p/requests — unknown payer proxy', () => {
  it('returns 404 PAYER_NOT_FOUND for unregistered payerId', () => {
    const req = {
      params: {}, query: {},
      body: { ...validBody, payerId: 'ghost@nowhere.ca', idempotencyKey: 'idem-ghost' }
    }
    const res = makeRes()
    runHandlers(postHandlers, req, res)

    expect(res.statusCode).toBe(404)
    const body = res.body as { code: string }
    expect(body.code).toBe('PAYER_NOT_FOUND')
  })
})
