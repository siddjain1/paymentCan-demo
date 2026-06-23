export interface DeliveryResult {
    status: 'delivered' | 'failed';
    statusCode?: number;
    error?: string;
}
export type HttpClient = (url: string, body: unknown) => Promise<{
    statusCode: number;
}>;
export type SleepFn = (ms: number) => Promise<void>;
export declare function setHttpClient(client: HttpClient): void;
export declare function resetHttpClient(): void;
export declare function setSleepFn(fn: SleepFn): void;
export declare function resetSleepFn(): void;
export declare function dispatch(r2pId: string, endpoint: string, payload: unknown): Promise<DeliveryResult>;
//# sourceMappingURL=routingEngine.d.ts.map