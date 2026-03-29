-- Add is_active flag to clients for soft-delete support
-- Hard delete: clients with no orders (likely created by mistake)
-- Soft delete: clients with orders (preserve history, just hide from lists)

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Index for filtering active clients efficiently
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients (is_active);
