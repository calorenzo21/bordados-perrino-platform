-- Migration: Add INACTIVE value to user_role enum
-- Purpose: Enable soft-delete of administrators. Instead of hard-deleting an admin
-- (which destroys audit trail references), we set their role to INACTIVE and ban
-- them in Supabase Auth. This preserves FK references in order_status_history.changed_by,
-- payments.received_by, etc., while completely blocking access.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'INACTIVE';
