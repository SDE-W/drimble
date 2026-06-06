CREATE TABLE IF NOT EXISTS deployments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('git', 'upload')),
  source_ref  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','building','deploying','running','failed')),
  image_tag   TEXT,
  container_id TEXT,
  host_port   INTEGER CHECK (host_port BETWEEN 30000 AND 32000),
  url         TEXT,
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_status_created ON deployments(status, created_at DESC);