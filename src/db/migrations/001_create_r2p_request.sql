-- up
CREATE TABLE IF NOT EXISTS "R2PRequest" (
  id                         UUID PRIMARY KEY,
  idempotency_key            TEXT NOT NULL UNIQUE,
  payer_id                   TEXT NOT NULL,
  payee_id                   TEXT NOT NULL,
  originating_participant_id TEXT NOT NULL,
  receiving_participant_id   TEXT NOT NULL,
  amount                     NUMERIC(18,2) NOT NULL,
  currency                   CHAR(3) NOT NULL,
  due_date                   DATE NOT NULL,
  expiry_timestamp           TIMESTAMPTZ NOT NULL,
  remittance_info            TEXT,
  status                     TEXT NOT NULL DEFAULT 'created',
  version                    INTEGER NOT NULL DEFAULT 0,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- down
DROP TABLE IF EXISTS "R2PRequest";
