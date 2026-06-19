-- up
CREATE TABLE IF NOT EXISTS "R2PAcknowledgement" (
  id                  UUID PRIMARY KEY,
  request_id          UUID NOT NULL REFERENCES "R2PRequest"(id),
  participant_id      TEXT NOT NULL,
  acknowledged_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- down
DROP TABLE IF EXISTS "R2PAcknowledgement";
