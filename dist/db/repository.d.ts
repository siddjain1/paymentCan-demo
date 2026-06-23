import { AddressEntry, CreateEntryInput, UpdateEntryInput } from './store';
export type { AddressEntry, CreateEntryInput, UpdateEntryInput };
export interface RepositoryError {
    code: 'NOT_FOUND' | 'CONFLICT';
    message: string;
}
export type RepositoryResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: RepositoryError;
};
export declare function getAll(): AddressEntry[];
export declare function getById(id: string): RepositoryResult<AddressEntry>;
export declare function getByParticipantId(participantId: string): RepositoryResult<AddressEntry>;
export declare function getByProxy(proxyType: string, proxyValue: string): RepositoryResult<AddressEntry>;
export declare function create(input: CreateEntryInput): RepositoryResult<AddressEntry>;
export declare function update(id: string, input: UpdateEntryInput): RepositoryResult<AddressEntry>;
export declare function remove(id: string): RepositoryResult<true>;
//# sourceMappingURL=repository.d.ts.map