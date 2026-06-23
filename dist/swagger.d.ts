export declare const swaggerSpec: {
    openapi: string;
    info: {
        title: string;
        version: string;
        description: string;
    };
    servers: {
        url: string;
        description: string;
    }[];
    tags: {
        name: string;
        description: string;
    }[];
    components: {
        schemas: {
            Error: {
                type: string;
                properties: {
                    code: {
                        type: string;
                        example: string;
                    };
                    message: {
                        type: string;
                        example: string;
                    };
                };
            };
            ValidationError: {
                type: string;
                properties: {
                    code: {
                        type: string;
                        example: string;
                    };
                    fields: {
                        type: string;
                        items: {
                            type: string;
                            properties: {
                                field: {
                                    type: string;
                                };
                                message: {
                                    type: string;
                                };
                            };
                        };
                    };
                };
            };
            R2PRequestResponse: {
                type: string;
                properties: {
                    r2pId: {
                        type: string;
                        format: string;
                        example: string;
                    };
                    status: {
                        type: string;
                        example: string;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            R2PModifyResponse: {
                type: string;
                properties: {
                    r2pId: {
                        type: string;
                        format: string;
                    };
                    status: {
                        type: string;
                        example: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            AddressEntry: {
                type: string;
                properties: {
                    id: {
                        type: string;
                        format: string;
                    };
                    participantId: {
                        type: string;
                        example: string;
                    };
                    proxyType: {
                        type: string;
                        enum: string[];
                    };
                    proxyValue: {
                        type: string;
                        example: string;
                    };
                    endpointUrl: {
                        type: string;
                        format: string;
                        example: string;
                    };
                    active: {
                        type: string;
                    };
                    createdAt: {
                        type: string;
                        format: string;
                    };
                    updatedAt: {
                        type: string;
                        format: string;
                    };
                };
            };
            ParticipantAddress: {
                type: string;
                properties: {
                    participantId: {
                        type: string;
                        example: string;
                    };
                    participantEndpoint: {
                        type: string;
                        example: string;
                    };
                    accountRef: {
                        type: string;
                        example: string;
                    };
                    ttlSeconds: {
                        type: string;
                        example: number;
                    };
                };
            };
        };
    };
    paths: {
        '/r2p/requests': {
            post: {
                tags: string[];
                summary: string;
                description: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    payerId: {
                                        type: string;
                                        example: string;
                                    };
                                    payeeId: {
                                        type: string;
                                        example: string;
                                    };
                                    amount: {
                                        type: string;
                                        example: number;
                                    };
                                    currency: {
                                        type: string;
                                        minLength: number;
                                        maxLength: number;
                                        example: string;
                                    };
                                    dueDate: {
                                        type: string;
                                        format: string;
                                        example: string;
                                    };
                                    expiryTimestamp: {
                                        type: string;
                                        format: string;
                                        example: string;
                                    };
                                    remittanceInfo: {
                                        type: string;
                                        example: string;
                                    };
                                    idempotencyKey: {
                                        type: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '409': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/r2p/requests/{r2pId}': {
            patch: {
                tags: string[];
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                minProperties: number;
                                properties: {
                                    amount: {
                                        type: string;
                                        example: number;
                                    };
                                    dueDate: {
                                        type: string;
                                        format: string;
                                        example: string;
                                    };
                                    expiryTimestamp: {
                                        type: string;
                                        format: string;
                                        example: string;
                                    };
                                    remittanceInfo: {
                                        type: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '409': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                tags: string[];
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                    description: string;
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        r2pId: {
                                            type: string;
                                            format: string;
                                        };
                                        status: {
                                            type: string;
                                            example: string;
                                        };
                                        cancelledAt: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '409': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/r2p/requests/{r2pId}/acknowledge': {
            post: {
                tags: string[];
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    participantId: {
                                        type: string;
                                        example: string;
                                    };
                                    receivedAt: {
                                        type: string;
                                        format: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        r2pId: {
                                            type: string;
                                            format: string;
                                        };
                                        status: {
                                            type: string;
                                            example: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '409': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/r2p/requests/{r2pId}/respond': {
            post: {
                tags: string[];
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                    description: string;
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    responseType: {
                                        type: string;
                                        enum: string[];
                                        example: string;
                                    };
                                    participantId: {
                                        type: string;
                                        example: string;
                                    };
                                    respondedAt: {
                                        type: string;
                                        format: string;
                                        example: string;
                                    };
                                    amount: {
                                        type: string;
                                        example: number;
                                        description: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        r2pId: {
                                            type: string;
                                            format: string;
                                        };
                                        status: {
                                            type: string;
                                            example: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '409': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/r2p/payments': {
            post: {
                tags: string[];
                summary: string;
                description: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    r2pId: {
                                        type: string;
                                        format: string;
                                        example: string;
                                    };
                                    paymentAmount: {
                                        type: string;
                                        example: number;
                                    };
                                    currency: {
                                        type: string;
                                        minLength: number;
                                        maxLength: number;
                                        example: string;
                                    };
                                    payerId: {
                                        type: string;
                                        example: string;
                                    };
                                    payeeId: {
                                        type: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        paymentId: {
                                            type: string;
                                            format: string;
                                        };
                                        r2pId: {
                                            type: string;
                                            format: string;
                                        };
                                        status: {
                                            type: string;
                                            example: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '409': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/internal/address-directory/resolve': {
            get: {
                tags: string[];
                summary: string;
                parameters: ({
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        enum: string[];
                    };
                    examples?: undefined;
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        enum?: undefined;
                    };
                    examples: {
                        email: {
                            summary: string;
                            value: string;
                        };
                        phone: {
                            summary: string;
                            value: string;
                        };
                        alias: {
                            summary: string;
                            value: string;
                        };
                    };
                })[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/addresses': {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    items: {
                                        $ref: string;
                                    };
                                };
                            };
                        };
                    };
                };
            };
            post: {
                tags: string[];
                summary: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    participantId: {
                                        type: string;
                                        example: string;
                                    };
                                    proxyType: {
                                        type: string;
                                        enum: string[];
                                    };
                                    proxyValue: {
                                        type: string;
                                        example: string;
                                    };
                                    endpointUrl: {
                                        type: string;
                                        format: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '201': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '409': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/addresses/{id}': {
            get: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            put: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                properties: {
                                    endpointUrl: {
                                        type: string;
                                        format: string;
                                    };
                                    active: {
                                        type: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
            delete: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        format: string;
                    };
                }[];
                responses: {
                    '204': {
                        description: string;
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/addresses/participant/{participantId}': {
            get: {
                tags: string[];
                summary: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        example: string;
                    };
                }[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/addresses/resolve': {
            get: {
                tags: string[];
                summary: string;
                parameters: ({
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        enum: string[];
                    };
                } | {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                        enum?: undefined;
                    };
                })[];
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '400': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    '404': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
            };
        };
        '/health': {
            get: {
                tags: string[];
                summary: string;
                responses: {
                    '200': {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    type: string;
                                    properties: {
                                        status: {
                                            type: string;
                                            example: string;
                                        };
                                        service: {
                                            type: string;
                                            example: string;
                                        };
                                        timestamp: {
                                            type: string;
                                            format: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
    };
};
//# sourceMappingURL=swagger.d.ts.map