interface Router {
    get(path: string, ...handlers: ((...args: unknown[]) => unknown)[]): void;
    post(path: string, ...handlers: ((...args: unknown[]) => unknown)[]): void;
    put(path: string, ...handlers: ((...args: unknown[]) => unknown)[]): void;
    patch(path: string, ...handlers: ((...args: unknown[]) => unknown)[]): void;
    delete(path: string, ...handlers: ((...args: unknown[]) => unknown)[]): void;
    use(...args: unknown[]): void;
}
export declare function applyRoutes(router: Router): void;
export {};
//# sourceMappingURL=index.d.ts.map