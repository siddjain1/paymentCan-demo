import express, { Request, Response, NextFunction } from 'express'
import swaggerUi from 'swagger-ui-express'
import { applyRoutes } from './routes'
import { swaggerSpec } from './swagger'

export function createApp() {
  const app = express()

  app.use(express.json())
  app.use(express.text({ type: ['application/xml', 'text/xml', 'text/plain'] }))

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') { res.sendStatus(204); return }
    next()
  })

  applyRoutes(app as Parameters<typeof applyRoutes>[0])

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'r2p-platform', timestamp: new Date().toISOString() })
  })

  return app
}
