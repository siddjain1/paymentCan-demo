-- up
CREATE TABLE IF NOT EXISTS "R2PPayment" (
  id                   UUID PRIMARY KEY,
  request_id           UUID NOT NULL REFERENCES "R2PRequest"(id),
  payment_reference    TEXT NOT NULL UNIQUE,
  amount               NUMERIC(18,2) NOT NULL,
  currency             CHAR(3) NOT NULL,
  settlement_status    TEXT NOT NULL DEFAULT 'pending',
  settled_at           TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- down
DROP TABLE IF EXISTS "R2PPayment";
