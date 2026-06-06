CREATE TABLE IF NOT EXISTS deployment_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  seq           INTEGER NOT NULL,
  ts            TIMESTAMPTZ NOT NULL,
  line          TEXT NOT NULL,
  phase         TEXT NOT NULL CHECK (phase IN ('clone','build','run','register','system')),
  UNIQUE (deployment_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployment_seq
  ON deployment_logs(deployment_id, seq ASC);

CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployment_phase
  ON deployment_logs(deployment_id, phase, seq ASC);