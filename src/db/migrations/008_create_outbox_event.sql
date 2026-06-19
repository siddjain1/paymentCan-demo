-- up
CREATE TABLE IF NOT EXISTS "OutboxEvent" (
  id              UUID PRIMARY KEY,
  event_type      TEXT NOT NULL,
  entity_id       TEXT NOT NULL,
  participant_id  TEXT NOT NULL,
  payload         TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  retry_count     INTEGER NOT NULL DEFAULT 0,
  next_retry_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at    TIMESTAMPTZ
);

-- down
DROP TABLE IF EXISTS "OutboxEvent";
