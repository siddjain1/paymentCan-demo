// src/services/routingEngine.ts
// Internal routing engine: delivers R2P requests to participant endpoints via HTTP POST.
// HTTP client and sleep function are injectable for testability.

import * as https from 'https'
import * as http from 'http'
import { r2pRepo, auditRepo, transitionRepo } from './r2pRequest'

// ── Constants ─────────────────────────────────────────────────

const MAX_ATTEMPTS = 4       // 1 initial + 3 retries
const BASE_DELAY_MS = 1_000  // delays: 1s, 2s, 4s → max 7s total

// ── Types ─────────────────────────────────────────────────────

export interface DeliveryResult {
  status: 'delivered' | 'failed'
  statusCode?: number
  error?: string
}

export type HttpClient = (url: string, body: unknown) => Promise<{ statusCode: number }>
export type SleepFn = (ms: number) => Promise<void>

// ── Default HTTP client ───────────────────────────────────────

function defaultHttpClient(url: string, body: unknown): Promise<{ statusCode: number }> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const parsed = new URL(url)
    const lib = parsed.protocol === 'https:' ? https : http
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname || '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }
    const req = lib.request(options, (res) => {
      resolve({ statusCode: res.statusCode ?? 0 })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

// ── Injectable client and sleep ───────────────────────────────

let httpClient: HttpClient = defaultHttpClient
let sleepFn: SleepFn = (ms) => new Promise((r) => setTimeout(r, ms))

export function setHttpClient(client: HttpClient): void { httpClient = client }
export function resetHttpClient(): void { httpClient = defaultHttpClient }

export function setSleepFn(fn: SleepFn): void { sleepFn = fn }
export function resetSleepFn(): void { sleepFn = (ms) => new Promise((r) => setTimeout(r, ms)) }

// ── dispatch ──────────────────────────────────────────────────

export async function dispatch(
  r2pId: string,
  endpoint: string,
  payload: unknown
): Promise<DeliveryResult> {
  const now = new Date().toISOString()

  // 1. Transition created → sent
  const current = r2pRepo.findById(r2pId)
  if (current && current.status === 'created') {
    r2pRepo.update(r2pId, { status: 'sent', updated_at: now }, current.version)
    transitionRepo.append({
      r2p_id: r2pId,
      from_status: 'created',
      to_status: 'sent',
      actor: 'routing-engine',
    })
  }

  // 2. Retry loop with exponential backoff
  let lastError: string | undefined
  let lastStatusCode: number | undefined

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await sleepFn(BASE_DELAY_MS * 2 ** (attempt - 1))
    }

    auditRepo.append({
      r2p_id: r2pId,
      event_type: `DELIVERY_ATTEMPT_${attempt + 1}`,
      actor: 'routing-engine',
      detail: JSON.stringify({ endpoint, attempt: attempt + 1 }),
    })

    try {
      const response = await httpClient(endpoint, payload)
      const is2xx = response.statusCode >= 200 && response.statusCode < 300

      if (is2xx) {
        auditRepo.append({
          r2p_id: r2pId,
          event_type: 'DELIVERY_CONFIRMED',
          actor: 'routing-engine',
          detail: JSON.stringify({ statusCode: response.statusCode, attempt: attempt + 1 }),
        })
        return { status: 'delivered', statusCode: response.statusCode }
      }

      lastStatusCode = response.statusCode
      lastError = `HTTP ${response.statusCode}`
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err)
    }
  }

  // 3. All attempts exhausted — mark delivery_failed
  const exhaustedAt = new Date().toISOString()
  const sentRow = r2pRepo.findById(r2pId)
  if (sentRow && sentRow.status === 'sent') {
    r2pRepo.update(r2pId, { status: 'delivery_failed', updated_at: exhaustedAt }, sentRow.version)
    transitionRepo.append({
      r2p_id: r2pId,
      from_status: 'sent',
      to_status: 'delivery_failed',
      actor: 'routing-engine',
    })
  }

  auditRepo.append({
    r2p_id: r2pId,
    event_type: 'DELIVERY_EXHAUSTED',
    actor: 'routing-engine',
    detail: JSON.stringify({ attempts: MAX_ATTEMPTS, lastError }),
  })

  // Stub: real notification delivered via Event Publisher (ticket 6.5)
  auditRepo.append({
    r2p_id: r2pId,
    event_type: 'ORIGINATOR_NOTIFIED',
    actor: 'routing-engine',
    detail: JSON.stringify({ reason: 'delivery_failed' }),
  })

  return { status: 'failed', error: lastError, statusCode: lastStatusCode }
}
