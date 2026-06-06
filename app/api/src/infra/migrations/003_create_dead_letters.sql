CREATE TABLE IF NOT EXISTS dead_letters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       TEXT NOT NULL UNIQUE,
  job_type     TEXT NOT NULL,
  tenant_id    TEXT NOT NULL,
  payload      JSONB NOT NULL DEFAULT '{}',
  attempts     INTEGER NOT NULL,
  errors       JSONB NOT NULL DEFAULT '[]',
  dead_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  resolved_by  TEXT,
  resolution   TEXT,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dead_letters_job_id ON dead_letters(job_id);
CREATE INDEX IF NOT EXISTS idx_dead_letters_tenant ON dead_letters(tenant_id, dead_at DESC);
CREATE INDEX IF NOT EXISTS idx_dead_letters_job_type ON dead_letters(job_type, dead_at DESC);
CREATE INDEX IF NOT EXISTS idx_dead_letters_unresolved ON dead_letters(resolved_at, dead_at DESC)
  WHERE resolved_at IS NULL;