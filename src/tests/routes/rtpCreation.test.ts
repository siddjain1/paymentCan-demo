// src/tests/routes/rtpCreation.test.ts
// S1.1 acceptance criteria tests for POST /rtp/v1/requests

import { mountRtpRequests } from '../../routes/rtpRequests'
import { resetR2PStore } from '../../db/r2pStore'

// ── Mock request / response ───────────────────────────────────

interface MockResponse {
  statusCode: number
  body: string
  headers: Record<string, string>
  status(code: number): MockResponse
  set(header: string, value: string): MockResponse
  send(body: string): void
}

function makeRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: '',
    headers: {},
    status(code: number) { this.statusCode = code; return this },
    set(header: string, value: string) { this.headers[header] = value; return this },
    send(body: string) { this.body = body },
  }
  return res
}

// ── Minimal mock router ───────────────────────────────────────

type Handler = (...args: unknown[]) => unknown

interface RouteEntry { method: string; path: string; handlers: Handler[] }

function makeRouter() {
  const routes: RouteEntry[] = []
  const router = {
    post: (path: string, ...handlers: Handler[]) => { routes.push({ method: 'POST', path, handlers }) },
  }
  return { router, routes }
}

function runHandlers(handlers: Handler[], req: unknown, res: MockResponse): MockResponse {
  let idx = 0
  function next(err?: unknown) {
    if (err || idx >= handlers.length) return
    handlers[idx++](req, res, next)
  }
  next()
  return res
}

// ── Valid pain.013 XML fixture ────────────────────────────────

const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <CdtrPmtActvtnReq>
    <GrpHdr>
      <MsgId>MSG-TEST-001</MsgId>
      <CreDtTm>2026-06-22T10:00:00Z</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMTINF-TEST-001</PmtInfId>
      <ReqdExctnDt>2026-06-25</ReqdExctnDt>
      <Cdtr>
        <Nm>Acme Corp</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <Othr>
            <Id>CREDITOR-ACC-001</Id>
          </Othr>
        </Id>
      </CdtrAcct>
      <CdtTrfTx>
        <Amt>
          <InstdAmt Ccy="CAD">250.00</InstdAmt>
        </Amt>
        <Dbtr>
          <Nm>John Doe</Nm>
        </Dbtr>
        <DbtrAcct>
          <Id>
            <Othr>
              <Id>DEBTOR-ACC-001</Id>
            </Othr>
          </Id>
        </DbtrAcct>
        <RmtInf>
          <Ustrd>Invoice #001</Ustrd>
        </RmtInf>
      </CdtTrfTx>
    </PmtInf>
  </CdtrPmtActvtnReq>
</Document>`

const entitledHeaders = { 'x-participant-id': 'BANKA_CA' }

// ── Setup ─────────────────────────────────────────────────────

let postHandlers: Handler[] = []

beforeAll(() => {
  const { router, routes } = makeRouter()
  mountRtpRequests(router as Parameters<typeof mountRtpRequests>[0])
  const route = routes.find((r) => r.method === 'POST' && r.path === '/rtp/v1/requests')
  if (!route) throw new Error('POST /rtp/v1/requests not registered')
  postHandlers = route.handlers
})

beforeEach(() => { resetR2PStore() })

// ── AC 1: Valid pain.013 → 202 + pain.002 ACCP with RtpTransactionId ─

describe('S1.1 AC1 — valid pain.013 returns 202 ACCP with unique RtpTransactionId', () => {
  it('returns 202 and pain.002 ACCP XML with a UUID OrgnlInstrId', () => {
    const req = { headers: entitledHeaders, body: validXml }
    const res = runHandlers(postHandlers, req, makeRes())

    expect(res.statusCode).toBe(202)
    expect(res.headers['Content-Type']).toBe('application/xml')
    expect(res.body).toContain('<GrpSts>ACCP</GrpSts>')
    expect(res.body).toContain('<TxSts>ACCP</TxSts>')
    const m = /<OrgnlInstrId>([^<]+)<\/OrgnlInstrId>/.exec(res.body)
    expect(m).not.toBeNull()
    expect(m![1]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('generates a unique RtpTransactionId for each distinct request', () => {
    const xml2 = validXml.replace('MSG-TEST-001', 'MSG-TEST-002')
    const res1 = runHandlers(postHandlers, { headers: entitledHeaders, body: validXml }, makeRes())
    const res2 = runHandlers(postHandlers, { headers: entitledHeaders, body: xml2 }, makeRes())

    const id1 = /<OrgnlInstrId>([^<]+)<\/OrgnlInstrId>/.exec(res1.body)?.[1]
    const id2 = /<OrgnlInstrId>([^<]+)<\/OrgnlInstrId>/.exec(res2.body)?.[1]
    expect(id1).toBeTruthy()
    expect(id2).toBeTruthy()
    expect(id1).not.toBe(id2)
  })
})

// ── AC 2: Unentitled participant → 403 BE01 ──────────────────

describe('S1.1 AC3 — unauthenticated participant returns 403 BE01', () => {
  it('returns 403 with BE01 when X-Participant-Id header is missing', () => {
    const req = { headers: {}, body: validXml }
    const res = runHandlers(postHandlers, req, makeRes())

    expect(res.statusCode).toBe(403)
    expect(res.body).toContain('<Cd>BE01</Cd>')
  })

  it('returns 403 with BE01 when participant is not in registry', () => {
    const req = { headers: { 'x-participant-id': 'GHOST_BANK' }, body: validXml }
    const res = runHandlers(postHandlers, req, makeRes())

    expect(res.statusCode).toBe(403)
    expect(res.body).toContain('<Cd>BE01</Cd>')
  })
})

// ── AC: Duplicate request returns original ID with ED05 ───────

describe('S1.1 — duplicate request returns original RtpTransactionId', () => {
  it('returns ED05 and the original ID on second identical submission', () => {
    const req = { headers: entitledHeaders, body: validXml }
    const res1 = runHandlers(postHandlers, { ...req }, makeRes())
    const originalId = /<OrgnlInstrId>([^<]+)<\/OrgnlInstrId>/.exec(res1.body)?.[1]

    const res2 = runHandlers(postHandlers, { ...req }, makeRes())
    expect(res2.body).toContain('<Cd>ED05</Cd>')
    expect(res2.body).toContain(originalId!)
  })
})

// ── AC: Unroutable account → 400 AC01 ────────────────────────

describe('S1.1 — unroutable debtor account returns 400 AC01', () => {
  it('returns 400 AC01 when DebtorAccount is not in routing table', () => {
    const xml = validXml.replace('DEBTOR-ACC-001', 'UNKNOWN-ACC-999')
    const req = { headers: entitledHeaders, body: xml }
    const res = runHandlers(postHandlers, req, makeRes())

    expect(res.statusCode).toBe(400)
    expect(res.body).toContain('<Cd>AC01</Cd>')
  })
})

// ── AC: Missing mandatory field → 400 MS03 ───────────────────

describe('S1.1 — missing mandatory field returns 400 MS03', () => {
  it('returns 400 MS03 when MsgId is missing', () => {
    const xml = validXml.replace('<MsgId>MSG-TEST-001</MsgId>', '')
    const req = { headers: entitledHeaders, body: xml }
    const res = runHandlers(postHandlers, req, makeRes())

    expect(res.statusCode).toBe(400)
    expect(res.body).toContain('<Cd>MS03</Cd>')
  })
})

// ── AC: Non-CAD currency → 400 AM03 ──────────────────────────

describe('S1.1 — non-CAD currency returns 400 AM03', () => {
  it('returns 400 AM03 for USD currency', () => {
    const xml = validXml.replace('Ccy="CAD"', 'Ccy="USD"')
    const req = { headers: entitledHeaders, body: xml }
    const res = runHandlers(postHandlers, req, makeRes())

    expect(res.statusCode).toBe(400)
    expect(res.body).toContain('<Cd>AM03</Cd>')
  })
})
