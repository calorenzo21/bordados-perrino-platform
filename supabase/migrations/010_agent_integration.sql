-- ============================================
-- AGENT INTEGRATION — supporting schema for bordados-perrino-agent
-- ============================================
-- 1. conversations_needing_attention — audit trail for human handoffs (EP-5).
-- 2. clients_active_phone_idx — partial index for EP-1 phone lookup performance.
-- ============================================

-- --------------------------------------------
-- 1. conversations_needing_attention
-- --------------------------------------------
-- One row per escalation surfaced by the agent (UC-IN-08, 11, 12, 13, 14).
-- The agent inserts via service-role (createAdminClient bypasses RLS); the
-- admin UI will later READ + UPDATE rows using is_admin() RLS.
CREATE TABLE IF NOT EXISTS conversations_needing_attention (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  summary     TEXT NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 500),
  reason      TEXT NOT NULL CHECK (reason IN
              ('complaint','cancel','modify','rtbf','explicit','out_of_scope')),
  resolved    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Open items first, then chronological — matches the inbox UX.
CREATE INDEX IF NOT EXISTS idx_conv_attention_inbox
  ON conversations_needing_attention (resolved, created_at DESC);

-- Cross-reference for "this client's open handoffs" filter.
CREATE INDEX IF NOT EXISTS idx_conv_attention_client
  ON conversations_needing_attention (client_id, created_at DESC);

ALTER TABLE conversations_needing_attention ENABLE ROW LEVEL SECURITY;

-- Only admins can read / update handoff rows from the UI.
-- The agent itself goes through service-role and bypasses RLS.
CREATE POLICY "Admins manage handoff queue" ON conversations_needing_attention
  FOR ALL USING (is_admin());

-- --------------------------------------------
-- 2. Partial index on clients(phone) for EP-1
-- --------------------------------------------
-- Existing idx_clients_phone covers all rows. The agent only ever looks up
-- ACTIVE clients (soft-deleted ones are intentionally invisible). A partial
-- index is smaller, hotter in cache, and skipped during writes that toggle
-- is_active.
CREATE INDEX IF NOT EXISTS clients_active_phone_idx
  ON clients (phone)
  WHERE is_active = TRUE;

-- ============================================
-- END
-- ============================================
