-- up
CREATE TABLE IF NOT EXISTS "AuditStore" (
  id           UUID PRIMARY KEY,
  event_type   TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    TEXT NOT NULL,
  actor        TEXT,
  payload      TEXT NOT NULL,
  occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION audit_store_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'AuditStore rows are immutable';
END;
$$;

CREATE OR REPLACE TRIGGER audit_store_no_update
  BEFORE UPDATE OR DELETE ON "AuditStore"
  FOR EACH ROW EXECUTE FUNCTION audit_store_immutable();

-- down
DROP TRIGGER IF EXISTS audit_store_no_update ON "AuditStore";
DROP FUNCTION IF EXISTS audit_store_immutable();
DROP TABLE IF EXISTS "AuditStore";
