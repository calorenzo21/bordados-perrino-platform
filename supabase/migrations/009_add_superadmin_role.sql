-- Add SUPERADMIN to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPERADMIN';

-- Update is_admin() to match both ADMIN and SUPERADMIN.
-- All existing RLS policies use this function, so they automatically
-- grant access to SUPERADMIN without touching individual policies.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPERADMIN')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- After deploying this migration, promote the owner to SUPERADMIN:
-- UPDATE profiles SET role = 'SUPERADMIN' WHERE email = '<owner-email>';
