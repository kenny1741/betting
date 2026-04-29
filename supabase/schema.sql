-- =============================================
-- Football IQ — Supabase Schema
-- Run this in your Supabase SQL Editor
-- =============================================

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id            BIGINT PRIMARY KEY,
  league_id     INT NOT NULL,
  league_name   TEXT NOT NULL,
  league_logo   TEXT,
  league_country TEXT,
  season        INT NOT NULL,
  home_team_id  INT NOT NULL,
  home_team_name TEXT NOT NULL,
  home_team_logo TEXT,
  away_team_id  INT NOT NULL,
  away_team_name TEXT NOT NULL,
  away_team_logo TEXT,
  kickoff       TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'SCHEDULED',
  minute        INT,
  home_score    INT,
  away_score    INT,
  venue         TEXT,
  synced_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
  match_id       BIGINT PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  home_win_pct   INT NOT NULL,
  draw_pct       INT NOT NULL,
  away_win_pct   INT NOT NULL,
  btts_yes_pct   INT NOT NULL DEFAULT 50,
  over25_pct     INT NOT NULL DEFAULT 50,
  over15_pct     INT NOT NULL DEFAULT 70,
  pick           TEXT NOT NULL,
  confidence     INT NOT NULL,
  reasoning      JSONB NOT NULL DEFAULT '[]',
  is_top_pick    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Team stats table (standings cache)
CREATE TABLE IF NOT EXISTS team_stats (
  team_id        INT NOT NULL,
  league_id      INT NOT NULL,
  season         INT NOT NULL,
  form           TEXT,
  position       INT,
  played         INT DEFAULT 0,
  wins           INT DEFAULT 0,
  draws          INT DEFAULT 0,
  losses         INT DEFAULT 0,
  goals_for      INT DEFAULT 0,
  goals_against  INT DEFAULT 0,
  points         INT DEFAULT 0,
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, league_id, season)
);

-- Goal events table
CREATE TABLE IF NOT EXISTS goal_events (
  id         BIGSERIAL PRIMARY KEY,
  match_id   BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  minute     INT NOT NULL,
  scorer     TEXT NOT NULL,
  assist     TEXT,
  team       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'normal'
);

-- Lineups table
CREATE TABLE IF NOT EXISTS lineups (
  match_id      BIGINT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id       INT NOT NULL,
  team          TEXT NOT NULL,
  formation     TEXT,
  start_xi      JSONB DEFAULT '[]',
  substitutes   JSONB DEFAULT '[]',
  PRIMARY KEY (match_id, team_id)
);

-- Sync log (track last sync times)
CREATE TABLE IF NOT EXISTS sync_log (
  id          BIGSERIAL PRIMARY KEY,
  sync_type   TEXT NOT NULL,
  status      TEXT NOT NULL,
  message     TEXT,
  records     INT DEFAULT 0,
  synced_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_matches_kickoff    ON matches(kickoff);
CREATE INDEX IF NOT EXISTS idx_matches_status     ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_league     ON matches(league_id);
CREATE INDEX IF NOT EXISTS idx_predictions_pick   ON predictions(pick);
CREATE INDEX IF NOT EXISTS idx_predictions_topick ON predictions(is_top_pick);

-- Enable RLS
ALTER TABLE matches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE goal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log    ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "public_read_matches"     ON matches     FOR SELECT USING (true);
CREATE POLICY "public_read_predictions" ON predictions FOR SELECT USING (true);
CREATE POLICY "public_read_team_stats"  ON team_stats  FOR SELECT USING (true);
CREATE POLICY "public_read_goals"       ON goal_events FOR SELECT USING (true);
CREATE POLICY "public_read_lineups"     ON lineups     FOR SELECT USING (true);
CREATE POLICY "public_read_sync_log"    ON sync_log    FOR SELECT USING (true);

-- Service role write access
CREATE POLICY "service_write_matches"     ON matches     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_predictions" ON predictions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_team_stats"  ON team_stats  FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_goals"       ON goal_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_lineups"     ON lineups     FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_write_sync_log"    ON sync_log    FOR ALL USING (auth.role() = 'service_role');
