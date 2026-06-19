-- up
CREATE TABLE IF NOT EXISTS "R2PStateTransition" (
  id           UUID PRIMARY KEY,
  request_id   UUID NOT NULL REFERENCES "R2PRequest"(id),
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  actor        TEXT NOT NULL,
  reason       TEXT,
  transitioned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- down
DROP TABLE IF EXISTS "R2PStateTransition";
