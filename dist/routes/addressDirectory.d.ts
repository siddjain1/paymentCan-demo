interface Request {
    params: Record<string, string>;
    query: Record<string, string | string[]>;
    body: unknown;
}
interface Response {
    status(code: number): Response;
    json(body: unknown): Response;
}
type NextFunction = () => void;
type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;
interface Router {
    get(path: string, handler: RequestHandler): void;
    post(path: string, handler: RequestHandler): void;
    put(path: string, handler: RequestHandler): void;
    delete(path: string, handler: RequestHandler): void;
}
export declare const internalResolveHandler: RequestHandler;
export declare function mountAddressDirectory(router: Router): void;
export {};
//# sourceMappingURL=addressDirectory.d.ts.map