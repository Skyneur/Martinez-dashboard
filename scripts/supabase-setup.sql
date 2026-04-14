-- ============================================================
-- Martinez Dashboard — Tables Supabase
-- À exécuter dans Supabase > SQL Editor
-- ============================================================

-- ── members ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id            TEXT PRIMARY KEY,          -- Discord snowflake
  discord_id    TEXT,                      -- colonne alternative (optionnel)
  name          TEXT        NOT NULL,
  initials      TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'associe',
  discord_tag   TEXT        NOT NULL DEFAULT '',
  discord_avatar TEXT,
  mission_id    TEXT,
  total_earned  NUMERIC     NOT NULL DEFAULT 0,
  weekly_earned NUMERIC     NOT NULL DEFAULT 0,
  monthly_earned NUMERIC    NOT NULL DEFAULT 0,
  missions_completed INT    NOT NULL DEFAULT 0,
  success_rate  NUMERIC     NOT NULL DEFAULT 0,
  last_seen     TIMESTAMPTZ,
  joined_at     DATE        NOT NULL DEFAULT CURRENT_DATE,
  active        BOOLEAN     NOT NULL DEFAULT true
);

-- ── missions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS missions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT        NOT NULL,
  description TEXT        NOT NULL,
  assigned_to TEXT,
  deadline    TIMESTAMPTZ NOT NULL,
  target      NUMERIC     NOT NULL DEFAULT 0,
  progress    NUMERIC     NOT NULL DEFAULT 0,
  status      TEXT        NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── transactions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  member_id TEXT,
  type      TEXT        NOT NULL,  -- 'SALE' | 'PROPRE'
  activity  TEXT        NOT NULL,
  amount    NUMERIC     NOT NULL,
  proof     TEXT
);

-- ── daily_logs ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   TEXT        NOT NULL,
  date        DATE        NOT NULL,
  atms        INT         NOT NULL DEFAULT 0,
  acid_farm   INT         NOT NULL DEFAULT 0,
  UNIQUE (member_id, date)
);

-- ── weekly_assignments ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     TEXT NOT NULL,
  week_day      TEXT NOT NULL,
  mission_label TEXT NOT NULL,
  UNIQUE (member_id, week_day)
);

-- ── mission_reports ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mission_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id     TEXT        NOT NULL,
  mission_label TEXT        NOT NULL,
  details       TEXT        NOT NULL DEFAULT '',
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proof_data    TEXT,                       -- base64 de l'image
  status        TEXT        NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  reviewed_by   TEXT,
  reviewed_at   TIMESTAMPTZ,
  review_note   TEXT        NOT NULL DEFAULT ''
);

-- ── money_reports ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS money_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id   TEXT        NOT NULL,
  amount      NUMERIC     NOT NULL,
  source      TEXT        NOT NULL DEFAULT '',
  notes       TEXT        NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proof_data  TEXT,                         -- base64 de l'image
  status      TEXT        NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT        NOT NULL DEFAULT ''
);

-- ============================================================
-- RLS (Row Level Security)
-- Active le RLS mais autorise tout avec la clé anon.
-- Adapte les policies selon tes besoins de sécurité.
-- ============================================================

ALTER TABLE members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_reports    ENABLE ROW LEVEL SECURITY;

-- Accès complet pour la clé anon (dashboard utilise la clé publique)
CREATE POLICY "anon full access" ON members          FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access" ON missions         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access" ON transactions     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access" ON daily_logs       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access" ON weekly_assignments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access" ON mission_reports  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full access" ON money_reports    FOR ALL TO anon USING (true) WITH CHECK (true);
