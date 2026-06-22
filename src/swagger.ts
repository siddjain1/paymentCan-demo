// src/swagger.ts
// OpenAPI 3.0 spec for the R2P Platform POC.

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'R2P Platform API',
    version: '0.1.0',
    description: 'Payments Canada Request-to-Pay (R2P) Platform — POC',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Local dev' }],

  tags: [
    { name: 'R2P Requests', description: 'EPIC 2 — Payee Journey: Request Initiation' },
    { name: 'Payer Journey', description: 'EPIC 4 — Payer Journey: Acknowledgement & Response' },
    { name: 'Payment Journey', description: 'EPIC 5 — Payment Execution & Settlement' },
    { name: 'Address Directory', description: 'EPIC 1 — Infrastructure: POC Address Directory stub' },
    { name: 'Health', description: 'Platform health check' },
  ],

  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          code:    { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Human-readable description' },
        },
      },
      ValidationError: {
        type: 'object',
        properties: {
          code:   { type: 'string', example: 'VALIDATION_ERROR' },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field:   { type: 'string' },
                message: { type: 'string' },
              },
            },
          },
        },
      },
      R2PRequestResponse: {
        type: 'object',
        properties: {
          r2pId:     { type: 'string', format: 'uuid', example: '0190abcd-ef01-7234-8abc-def012345678' },
          status:    { type: 'string', example: 'created' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      R2PModifyResponse: {
        type: 'object',
        properties: {
          r2pId:     { type: 'string', format: 'uuid' },
          status:    { type: 'string', example: 'created' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AddressEntry: {
        type: 'object',
        properties: {
          id:            { type: 'string', format: 'uuid' },
          participantId: { type: 'string', example: 'BANK_A' },
          proxyType:     { type: 'string', enum: ['email', 'phone', 'alias'] },
          proxyValue:    { type: 'string', example: 'payer@banka.ca' },
          endpointUrl:   { type: 'string', format: 'uri', example: 'http://localhost:4001' },
          active:        { type: 'boolean' },
          createdAt:     { type: 'string', format: 'date-time' },
          updatedAt:     { type: 'string', format: 'date-time' },
        },
      },
      R2PStatusResponse: {
        type: 'object',
        properties: {
          r2pId:           { type: 'string', format: 'uuid', example: '0190abcd-ef01-7234-8abc-def012345678' },
          status:          { type: 'string', example: 'delivered' },
          payerId:         { type: 'string', example: 'payer@banka.ca' },
          payeeId:         { type: 'string', example: 'payee@bankb.ca' },
          amount:          { type: 'number', example: 500.00 },
          currency:        { type: 'string', example: 'CAD' },
          dueDate:         { type: 'string', format: 'date', example: '2026-12-31' },
          expiryTimestamp: { type: 'string', format: 'date-time', example: '2026-12-31T23:59:59Z' },
          remittanceInfo:  { type: 'string', nullable: true, example: 'Invoice #1042' },
          createdAt:       { type: 'string', format: 'date-time' },
          updatedAt:       { type: 'string', format: 'date-time' },
        },
      },
      ParticipantAddress: {
        type: 'object',
        properties: {
          participantId:       { type: 'string', example: 'BANK_A' },
          participantEndpoint: { type: 'string', example: 'http://localhost:4001' },
          accountRef:          { type: 'string', example: 'ACC-BANKA-001' },
          ttlSeconds:          { type: 'integer', example: 300 },
        },
      },
    },
  },

  paths: {
    '/r2p/requests': {
      post: {
        tags: ['R2P Requests'],
        summary: 'Create R2P request (2.1)',
        description: [
          'Validates the request body against the **pain.013** ISO 20022 schema,',
          'resolves the payer proxy via the Address Directory, generates a UUID v7',
          'transaction ID, enforces idempotency, and persists the request.',
          '',
          '**Seeded payer proxies (email):** `payer@banka.ca`, `payee@bankb.ca`',
          '',
          '**Seeded payer proxies (phone):** `+16135550001`, `+14165550002`',
          '',
          '**Seeded payer proxies (alias):** `corp-alias-1`',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['payerId', 'payeeId', 'amount', 'currency', 'dueDate', 'expiryTimestamp', 'idempotencyKey'],
                properties: {
                  payerId:          { type: 'string', example: 'payer@banka.ca' },
                  payeeId:          { type: 'string', example: 'payee@bankb.ca' },
                  amount:           { type: 'number', example: 250.00 },
                  currency:         { type: 'string', minLength: 3, maxLength: 3, example: 'CAD' },
                  dueDate:          { type: 'string', format: 'date', example: '2026-12-31' },
                  expiryTimestamp:  { type: 'string', format: 'date-time', example: '2026-12-31T23:59:59Z' },
                  remittanceInfo:   { type: 'string', example: 'Invoice #123' },
                  idempotencyKey:   { type: 'string', example: 'demo-key-001' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Request created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/R2PRequestResponse' } } },
          },
          '400': {
            description: 'Validation error (pain.013 schema failure)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationError' } } },
          },
          '404': {
            description: 'Payer proxy not found in Address Directory',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '409': {
            description: 'Duplicate idempotencyKey',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/r2p/requests/{r2pId}': {
      get: {
        tags: ['R2P Requests'],
        summary: 'Get R2P request status (6.1)',
        description: 'Returns the current status and all fields for a given R2P request. Use this after any state-changing call to confirm the transition.',
        parameters: [
          {
            name: 'r2pId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'The r2pId returned by POST /r2p/requests',
          },
        ],
        responses: {
          '200': {
            description: 'Request found — current status and all fields',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/R2PStatusResponse' } } },
          },
          '404': {
            description: 'Unknown r2pId',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      patch: {
        tags: ['R2P Requests'],
        summary: 'Modify R2P request (2.2)',
        description: [
          'Modifies permissible fields on an existing request.',
          'Only allowed when status is **`created`** or **`sent`**.',
          '',
          'All fields are optional — include only those you want to change.',
        ].join('\n'),
        parameters: [
          {
            name: 'r2pId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'The r2pId returned by POST /r2p/requests',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                minProperties: 1,
                properties: {
                  amount:          { type: 'number', example: 300.00 },
                  dueDate:         { type: 'string', format: 'date', example: '2027-01-15' },
                  expiryTimestamp: { type: 'string', format: 'date-time', example: '2027-01-15T23:59:59Z' },
                  remittanceInfo:  { type: 'string', example: 'Updated: Invoice #456' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Request modified',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/R2PModifyResponse' } } },
          },
          '400': {
            description: 'Validation error or empty patch body',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'Unknown r2pId',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '409': {
            description: 'Request not in a modifiable state (delivered or later)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
      delete: {
        tags: ['R2P Requests'],
        summary: 'Cancel R2P request (2.3)',
        description: [
          'Cancels an active R2P request before the payer accepts it.',
          'Only allowed when status is **`created`**, **`sent`**, or **`delivered`**.',
          '',
          'Post-acceptance states (`accepted`, `payment_processing`, `paid`, `payment_failed`, `expired`, `cancelled`) return 409.',
        ].join('\n'),
        parameters: [
          {
            name: 'r2pId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'The r2pId returned by POST /r2p/requests',
          },
        ],
        responses: {
          '200': {
            description: 'Request cancelled',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    r2pId:       { type: 'string', format: 'uuid' },
                    status:      { type: 'string', example: 'cancelled' },
                    cancelledAt: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Unknown r2pId',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '409': {
            description: 'Request not in a cancellable state',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/r2p/requests/{r2pId}/acknowledge': {
      post: {
        tags: ['Payer Journey'],
        summary: 'Acknowledge R2P request receipt (4.1)',
        description: [
          'Records a timestamped acknowledgement from the receiving participant.',
          'Transitions request status from **`sent`** to **`delivered`**.',
          'Emits an `acknowledged` event to the Event Publisher.',
          '',
          'Returns **409 ALREADY_ACKNOWLEDGED** if the request was previously acknowledged.',
        ].join('\n'),
        parameters: [
          {
            name: 'r2pId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'The r2pId of the request to acknowledge',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['participantId', 'receivedAt'],
                properties: {
                  participantId: { type: 'string', example: 'BANK_A' },
                  receivedAt:    { type: 'string', format: 'date-time', example: '2026-07-01T10:00:00Z' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Request acknowledged — status is now delivered',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    r2pId:  { type: 'string', format: 'uuid' },
                    status: { type: 'string', example: 'delivered' },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Unknown r2pId',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '409': {
            description: 'Request already acknowledged',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/r2p/requests/{r2pId}/respond': {
      post: {
        tags: ['Payer Journey'],
        summary: 'Submit payer response (4.2)',
        description: [
          'Receives the payer\'s decision: **accept**, **decline**, or **defer**.',
          'Request must be in `delivered` state and not expired.',
          '',
          '- **accept** → status `accepted`, Payment Execution Engine triggered (stub)',
          '- **decline** → status `declined`, originator notified',
          '- **defer** → status `deferred`, originator notified',
        ].join('\n'),
        parameters: [
          {
            name: 'r2pId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'The r2pId of the request to respond to',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['responseType', 'participantId', 'respondedAt'],
                properties: {
                  responseType:  { type: 'string', enum: ['accept', 'decline', 'defer'], example: 'accept' },
                  participantId: { type: 'string', example: 'BANK_A' },
                  respondedAt:   { type: 'string', format: 'date-time', example: '2026-07-01T11:00:00Z' },
                  amount:        { type: 'number', example: 200.00, description: 'Optional — if provided must match the original request amount' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Response recorded — status reflects the payer decision',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    r2pId:  { type: 'string', format: 'uuid' },
                    status: { type: 'string', example: 'accepted' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid responseType',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'Unknown r2pId',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '409': {
            description: 'Request expired or not in delivered state',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/r2p/payments': {
      post: {
        tags: ['Payment Journey'],
        summary: 'Submit R2P-linked payment (5.1)',
        description: [
          'Triggered by an accepted R2P response. Creates a real-time payment message',
          'referencing the R2P transaction ID and submits it to the settlement rail.',
          '',
          '**POC:** Settlement rail is stubbed — auto-returns success after 500ms.',
          '',
          'Request must be in `accepted` state and `paymentAmount` must match the original request amount.',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['r2pId', 'paymentAmount', 'currency', 'payerId', 'payeeId'],
                properties: {
                  r2pId:         { type: 'string', format: 'uuid', example: '0190abcd-ef01-7234-8abc-def012345678' },
                  paymentAmount: { type: 'number', example: 200.00 },
                  currency:      { type: 'string', minLength: 3, maxLength: 3, example: 'CAD' },
                  payerId:       { type: 'string', example: 'payer@banka.ca' },
                  payeeId:       { type: 'string', example: 'payee@bankb.ca' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Payment submitted — status is processing',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    paymentId: { type: 'string', format: 'uuid' },
                    r2pId:     { type: 'string', format: 'uuid' },
                    status:    { type: 'string', example: 'processing' },
                  },
                },
              },
            },
          },
          '400': {
            description: 'paymentAmount does not match original request amount',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'R2P request not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '409': {
            description: 'Request not in accepted state',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/internal/address-directory/resolve': {
      get: {
        tags: ['Address Directory'],
        summary: 'Resolve proxy to participant endpoint (1.3)',
        parameters: [
          {
            name: 'proxyType',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['email', 'phone', 'alias'] },
          },
          {
            name: 'proxyValue',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            examples: {
              email: { summary: 'Email proxy', value: 'payer@banka.ca' },
              phone: { summary: 'Phone proxy', value: '+16135550001' },
              alias: { summary: 'Alias proxy', value: 'corp-alias-1' },
            },
          },
        ],
        responses: {
          '200': {
            description: 'Resolved participant address',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ParticipantAddress' } } },
          },
          '400': {
            description: 'Missing or invalid proxyType',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '404': {
            description: 'No participant found for given proxy',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/addresses': {
      get: {
        tags: ['Address Directory'],
        summary: 'List all registered addresses',
        responses: {
          '200': {
            description: 'Array of address entries',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/AddressEntry' } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Address Directory'],
        summary: 'Register a new participant address',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['participantId', 'proxyType', 'proxyValue', 'endpointUrl'],
                properties: {
                  participantId: { type: 'string', example: 'BANK_F' },
                  proxyType:     { type: 'string', enum: ['email', 'phone', 'alias'] },
                  proxyValue:    { type: 'string', example: 'newbank@bankf.ca' },
                  endpointUrl:   { type: 'string', format: 'uri', example: 'http://localhost:4006' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Address registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AddressEntry' } } },
          },
          '400': {
            description: 'Validation error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '409': {
            description: 'Participant already registered',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },

    '/addresses/{id}': {
      get: {
        tags: ['Address Directory'],
        summary: 'Get address by ID',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Address entry', content: { 'application/json': { schema: { $ref: '#/components/schemas/AddressEntry' } } } },
          '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        tags: ['Address Directory'],
        summary: 'Update address endpoint or active flag',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  endpointUrl: { type: 'string', format: 'uri' },
                  active:      { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/AddressEntry' } } } },
          '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Address Directory'],
        summary: 'Deregister an address',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '204': { description: 'Deregistered' },
          '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/addresses/participant/{participantId}': {
      get: {
        tags: ['Address Directory'],
        summary: 'Get address by participantId',
        parameters: [{ name: 'participantId', in: 'path', required: true, schema: { type: 'string', example: 'BANK_A' } }],
        responses: {
          '200': { description: 'Address entry', content: { 'application/json': { schema: { $ref: '#/components/schemas/AddressEntry' } } } },
          '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/addresses/resolve': {
      get: {
        tags: ['Address Directory'],
        summary: 'Resolve proxy (CRUD layer)',
        parameters: [
          { name: 'proxyType', in: 'query', required: true, schema: { type: 'string', enum: ['email', 'phone', 'alias'] } },
          { name: 'proxyValue', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Resolved', content: { 'application/json': { schema: { $ref: '#/components/schemas/AddressEntry' } } } },
          '400': { description: 'Invalid input', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },

    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Platform health check',
        responses: {
          '200': {
            description: 'Service is up',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status:    { type: 'string', example: 'ok' },
                    service:   { type: 'string', example: 'r2p-platform' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
