import type { AddressEntry } from '../db/repository';
export type { AddressEntry };
export type ProxyType = 'email' | 'phone' | 'alias';
export interface ParticipantAddress {
    participantId: string;
    participantEndpoint: string;
    accountRef: string;
    ttlSeconds: number;
}
/**
 * Core spec function: resolves a proxy identifier to a ParticipantAddress.
 * Returns null when no participant is registered for the given proxy.
 */
export declare function resolve(proxyType: ProxyType, proxyValue: string): ParticipantAddress | null;
export declare function isValidProxyType(value: string): value is ProxyType;
export interface ServiceError {
    status: 400 | 404 | 409;
    code: string;
    message: string;
}
export type ServiceResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: ServiceError;
};
export declare function listAddresses(): AddressEntry[];
export interface ResolveInput {
    proxyType: string;
    proxyValue: string;
}
export declare function resolveProxy(input: ResolveInput): ServiceResult<AddressEntry>;
export declare function getAddress(id: string): ServiceResult<AddressEntry>;
export declare function getAddressByParticipant(participantId: string): ServiceResult<AddressEntry>;
export interface RegisterInput {
    participantId: string;
    proxyType: string;
    proxyValue: string;
    endpointUrl: string;
}
export declare function registerAddress(input: RegisterInput): ServiceResult<AddressEntry>;
export interface UpdateInput {
    endpointUrl?: string;
    active?: boolean;
}
export declare function updateAddress(id: string, input: UpdateInput): ServiceResult<AddressEntry>;
export declare function deregisterAddress(id: string): ServiceResult<true>;
//# sourceMappingURL=addressDirectory.d.ts.map