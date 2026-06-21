import { validate, MessageType, ValidationResult } from './iso20022'

// Inline Express-compatible types — express is not a project dependency
interface Request {
  body: Record<string, unknown>
}

interface Response {
  status(code: number): Response
  json(body: unknown): Response
}

type NextFunction = (err?: unknown) => void
type RequestHandler = (req: Request, res: Response, next: NextFunction) => void

export function validateISO20022(messageType: MessageType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result: ValidationResult = validate(messageType, req.body)
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
