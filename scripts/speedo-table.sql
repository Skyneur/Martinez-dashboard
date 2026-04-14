-- Table: speedo_logs
-- Tracks daily speedo quota completions per member.
-- One row per (member_id, date) — use upsert on that pair.

CREATE TABLE IF NOT EXISTS speedo_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  amount      NUMERIC(4,1) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  note        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (member_id, date)
);

-- RLS (same open policy as other tables while you're in dev)
ALTER TABLE speedo_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_speedo_logs"
  ON speedo_logs
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
