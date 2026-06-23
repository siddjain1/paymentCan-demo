export interface AddressEntry {
    id: string;
    participantId: string;
    proxyType: string;
    proxyValue: string;
    endpointUrl: string;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}
export declare function findById(id: string): AddressEntry | undefined;
export declare function findByParticipantId(participantId: string): AddressEntry | undefined;
export declare function findByProxy(proxyType: string, proxyValue: string): AddressEntry | undefined;
export declare function listAll(): AddressEntry[];
export interface CreateEntryInput {
    participantId: string;
    proxyType: string;
    proxyValue: string;
    endpointUrl: string;
}
export declare function createEntry(input: CreateEntryInput): AddressEntry;
export interface UpdateEntryInput {
    endpointUrl?: string;
    active?: boolean;
}
export declare function updateEntry(id: string, input: UpdateEntryInput): AddressEntry | undefined;
export declare function deleteEntry(id: string): boolean;
/** Reset the store to the seeded state. Only for use in tests. */
export declare function resetStore(): void;
//# sourceMappingURL=store.d.ts.map