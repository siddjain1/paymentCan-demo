// src/routes/index.ts
// Aggregates all route modules and mounts them onto a router.

import { mountAddressDirectory } from './addressDirectory'
import { mountR2PRequests } from './r2pRequests'

interface Router {
  get(path: string, ...handlers: ((...args: unknown[]) => unknown)[]): void
  post(path: string, ...handlers: ((...args: unknown[]) => unknown)[]): void
  put(path: string, ...handlers: ((...args: unknown[]) => unknown)[]): void
  patch(path: string, ...handlers: ((...args: unknown[]) => unknown)[]): void
  delete(path: string, ...handlers: ((...args: unknown[]) => unknown)[]): void
  use(...args: unknown[]): void
}

export function applyRoutes(router: Router): void {
  mountAddressDirectory(router as Parameters<typeof mountAddressDirectory>[0])
  mountR2PRequests(router as Parameters<typeof mountR2PRequests>[0])
}
