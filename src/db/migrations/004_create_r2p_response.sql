-- up
CREATE TABLE IF NOT EXISTS "R2PResponse" (
  id              UUID PRIMARY KEY,
  request_id      UUID NOT NULL REFERENCES "R2PRequest"(id),
  payer_id        TEXT NOT NULL,
  response_type   TEXT NOT NULL,
  reason          TEXT,
  amount          NUMERIC(18,2),
  responded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- down
DROP TABLE IF EXISTS "R2PResponse";
