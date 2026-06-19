// src/routes/index.ts
// Aggregates all route modules and mounts them onto a router.

import { mountAddressDirectory } from './addressDirectory'

interface Router {
  get(path: string, handler: (...args: unknown[]) => unknown): void
  post(path: string, handler: (...args: unknown[]) => unknown): void
  put(path: string, handler: (...args: unknown[]) => unknown): void
  delete(path: string, handler: (...args: unknown[]) => unknown): void
}

export function applyRoutes(router: Router): void {
  mountAddressDirectory(router as Parameters<typeof mountAddressDirectory>[0])
}
