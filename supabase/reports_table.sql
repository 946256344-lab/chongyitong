-- ============================================================
-- Pet Med-Pal: reports table
-- Run this once in Supabase → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS reports (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  token      UUID        DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  lang       TEXT        NOT NULL DEFAULT 'zh',   -- 'zh' | 'en'
  data       JSONB       NOT NULL,                -- full ReportData JSON
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security: anyone who knows the token can read the row.
-- UUID tokens (128-bit) are practically unguessable.
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read by token"
  ON reports FOR SELECT
  USING (true);

-- Only the service-role key (used server-side) can insert/update/delete.
-- No INSERT policy → anon/public cannot create rows.

-- ============================================================
-- How to insert a report (run from your admin script or
-- Supabase SQL Editor; paste in the JSON from content/reports/):
-- ============================================================
--
-- INSERT INTO reports (lang, data)
-- VALUES (
--   'en',
--   '{ ...paste PM-2026-0047.json content here... }'::jsonb
-- )
-- RETURNING token;   -- ← copy this token, put it in the email link
--
-- Link sent to user:
--   https://severepetcondition.site/report/<token>
-- ============================================================
