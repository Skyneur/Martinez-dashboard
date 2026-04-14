-- Table: member_warns
-- One warn per member per week (boss issues it manually after quota check)

CREATE TABLE IF NOT EXISTS member_warns (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,          -- Monday of the failed week
  reason     TEXT NOT NULL DEFAULT 'Quota hebdomadaire non atteint',
  issued_by  TEXT NOT NULL,          -- name of the boss who issued it
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE member_warns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_member_warns"
  ON member_warns FOR ALL TO anon
  USING (true) WITH CHECK (true);
