import { MessageType } from './iso20022';
interface Request {
    body: Record<string, unknown>;
}
interface Response {
    status(code: number): Response;
    json(body: unknown): Response;
}
type NextFunction = (err?: unknown) => void;
type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;
export declare function validateISO20022(messageType: MessageType): RequestHandler;
export {};
//# sourceMappingURL=middleware.d.ts.map