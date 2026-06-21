// src/services/routingEngine.ts
// Internal routing engine: delivers R2P requests to participant endpoints via HTTP POST.
// HTTP client is injectable for testability — swap via setHttpClient() in tests.

import * as https from 'https'
import * as http from 'http'
import { r2pRepo, auditRepo, transitionRepo } from './r2pRequest'

// ── Types ─────────────────────────────────────────────────────

export interface DeliveryResult {
  status: 'delivered' | 'failed'
  statusCode?: number
  error?: string
}

export type HttpClient = (url: string, body: unknown) => Promise<{ statusCode: number }>

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

// ── Injectable client ─────────────────────────────────────────

let httpClient: HttpClient = defaultHttpClient

export function setHttpClient(client: HttpClient): void {
  httpClient = client
}

export function resetHttpClient(): void {
  httpClient = defaultHttpClient
}

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

  // 2. Record dispatch attempt
  auditRepo.append({
    r2p_id: r2pId,
    event_type: 'DELIVERY_DISPATCHED',
    actor: 'routing-engine',
    detail: JSON.stringify({ endpoint }),
  })

  // 3. HTTP POST
  try {
    const response = await httpClient(endpoint, payload)
    const is2xx = response.statusCode >= 200 && response.statusCode < 300

    if (is2xx) {
      // 4. Success
      auditRepo.append({
        r2p_id: r2pId,
        event_type: 'DELIVERY_CONFIRMED',
        actor: 'routing-engine',
        detail: JSON.stringify({ statusCode: response.statusCode }),
      })
      return { status: 'delivered', statusCode: response.statusCode }
    }

    // 5. Non-2xx
    auditRepo.append({
      r2p_id: r2pId,
      event_type: 'DELIVERY_FAILED',
      actor: 'routing-engine',
      detail: JSON.stringify({ statusCode: response.statusCode }),
    })
    return { status: 'failed', statusCode: response.statusCode }

  } catch (err) {
    // 5. Network error
    const message = err instanceof Error ? err.message : String(err)
    auditRepo.append({
      r2p_id: r2pId,
      event_type: 'DELIVERY_FAILED',
      actor: 'routing-engine',
      detail: JSON.stringify({ error: message }),
    })
    return { status: 'failed', error: message }
  }
}
