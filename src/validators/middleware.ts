import { validate } from './iso20022'
import type { MessageType } from './iso20022'

// Minimal Express-compatible types — avoids requiring @types/express
interface Request {
  body: unknown
}

interface Response {
  status(code: number): Response
  json(body: unknown): Response
}

type NextFunction = () => void

export type RequestHandler = (req: Request, res: Response, next: NextFunction) => void

export function validateISO20022(messageType: MessageType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = validate(messageType, (req.body ?? {}) as Record<string, unknown>)
    if (!result.valid) {
      res.status(400).json({
        code: result.code,
        fields: result.fields,
      })
      return
    }
    next()
  }
}
