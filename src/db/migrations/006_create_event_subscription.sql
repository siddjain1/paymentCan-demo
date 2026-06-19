-- up
CREATE TABLE IF NOT EXISTS "EventSubscription" (
  id                UUID PRIMARY KEY,
  participant_id    TEXT NOT NULL UNIQUE,
  proxy_type        TEXT NOT NULL,
  proxy_value       TEXT NOT NULL,
  endpoint_url      TEXT NOT NULL,
  active            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- down
DROP TABLE IF EXISTS "EventSubscription";
