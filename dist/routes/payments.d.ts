interface Request {
    params: Record<string, string>;
    body: Record<string, unknown>;
}
interface Response {
    status(code: number): Response;
    json(body: unknown): Response;
}
type NextFunction = (err?: unknown) => void;
type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;
interface Router {
    post(path: string, ...handlers: RequestHandler[]): void;
}
export declare function mountPayments(router: Router): void;
export {};
//# sourceMappingURL=payments.d.ts.map