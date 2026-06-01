-- 012_restrict_destructive_to_superadmin.sql
-- Restringe las acciones destructivas (DELETE) al rol SUPERADMIN.
--
-- Hasta ahora cada tabla de negocio tenía una única política `FOR ALL
-- USING (is_admin())`, que cubre SELECT/INSERT/UPDATE *y* DELETE. Como en RLS
-- basta con que UNA política permisiva autorice la operación, no alcanza con
-- añadir una política de DELETE más estricta: hay que QUITAR el DELETE de la
-- política amplia. Por eso cada `FOR ALL` se reemplaza por políticas separadas
-- de SELECT/INSERT/UPDATE (que siguen usando is_admin(), sin cambios para
-- ADMIN) más una política `FOR DELETE` que exige is_superadmin().
--
-- Las RPC delete_order_cascade / delete_client_hard (011) son SECURITY DEFINER
-- y corren como service_role: ignoran RLS, así que siguen funcionando. Su única
-- puerta es el chequeo de rol en las rutas API, que se endurece por separado a
-- isSuperAdmin().
--
-- IDEMPOTENCIA: cada CREATE POLICY va precedido de DROP POLICY IF EXISTS (tanto
-- del nombre viejo como del nuevo), porque CREATE POLICY no soporta
-- IF NOT EXISTS. Así la migración es re-ejecutable sin abortar con
-- "policy already exists".
--
-- RIESGO RESIDUAL CONOCIDO (desactivación de clientes): la desactivación
-- (soft-delete con is_active=false) es técnicamente un UPDATE, no un DELETE.
-- La política UPDATE de `clients` sigue siendo is_admin() porque un ADMIN debe
-- poder editar datos del cliente (nombre, correo, teléfono). En la aplicación
-- la desactivación SOLO se alcanza por DELETE /api/clients/[id], que ya exige
-- isSuperAdmin(). A nivel de RLS crudo un ADMIN podría, vía PostgREST directo,
-- hacer UPDATE de is_active; se acepta ese riesgo residual (actor ADMIN de
-- confianza, acción reversible, sin ruta expuesta en la UI). RLS no puede
-- distinguir el cambio de is_active de otras ediciones legítimas sin un trigger
-- que compare OLD/NEW, y un trigger rompería el soft-delete legítimo que corre
-- como service_role (donde is_superadmin() es false).

-- ── Helper: is_superadmin() ─────────────────────────────────────────────
-- Espejo de is_admin() (ver 009), pero exige el rol SUPERADMIN exacto.
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'SUPERADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── CLIENTS ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can do everything with clients" ON clients;
DROP POLICY IF EXISTS "Admins can view clients" ON clients;
DROP POLICY IF EXISTS "Admins can insert clients" ON clients;
DROP POLICY IF EXISTS "Admins can update clients" ON clients;
DROP POLICY IF EXISTS "Superadmins can delete clients" ON clients;
CREATE POLICY "Admins can view clients" ON clients
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert clients" ON clients
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update clients" ON clients
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Superadmins can delete clients" ON clients
  FOR DELETE USING (is_superadmin());

-- ── EXPENSE_TYPES ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage expense types" ON expense_types;
DROP POLICY IF EXISTS "Admins can insert expense types" ON expense_types;
DROP POLICY IF EXISTS "Admins can update expense types" ON expense_types;
DROP POLICY IF EXISTS "Superadmins can delete expense types" ON expense_types;
CREATE POLICY "Admins can insert expense types" ON expense_types
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update expense types" ON expense_types
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Superadmins can delete expense types" ON expense_types
  FOR DELETE USING (is_superadmin());
-- (El SELECT lo cubre la política pública "Everyone can view expense types".)

-- ── EXPENSES ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can view expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON expenses;
DROP POLICY IF EXISTS "Superadmins can delete expenses" ON expenses;
CREATE POLICY "Admins can view expenses" ON expenses
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert expenses" ON expenses
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update expenses" ON expenses
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Superadmins can delete expenses" ON expenses
  FOR DELETE USING (is_superadmin());

-- ── ORDERS ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can do everything with orders" ON orders;
DROP POLICY IF EXISTS "Admins can view orders" ON orders;
DROP POLICY IF EXISTS "Admins can insert orders" ON orders;
DROP POLICY IF EXISTS "Admins can update orders" ON orders;
DROP POLICY IF EXISTS "Superadmins can delete orders" ON orders;
CREATE POLICY "Admins can view orders" ON orders
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert orders" ON orders
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update orders" ON orders
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Superadmins can delete orders" ON orders
  FOR DELETE USING (is_superadmin());

-- ── ORDER_STATUS_HISTORY ────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage status history" ON order_status_history;
DROP POLICY IF EXISTS "Admins can view status history" ON order_status_history;
DROP POLICY IF EXISTS "Admins can insert status history" ON order_status_history;
DROP POLICY IF EXISTS "Admins can update status history" ON order_status_history;
DROP POLICY IF EXISTS "Superadmins can delete status history" ON order_status_history;
CREATE POLICY "Admins can view status history" ON order_status_history
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert status history" ON order_status_history
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update status history" ON order_status_history
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Superadmins can delete status history" ON order_status_history
  FOR DELETE USING (is_superadmin());

-- ── ORDER_STATUS_PHOTOS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage status photos" ON order_status_photos;
DROP POLICY IF EXISTS "Admins can view status photos" ON order_status_photos;
DROP POLICY IF EXISTS "Admins can insert status photos" ON order_status_photos;
DROP POLICY IF EXISTS "Admins can update status photos" ON order_status_photos;
DROP POLICY IF EXISTS "Superadmins can delete status photos" ON order_status_photos;
CREATE POLICY "Admins can view status photos" ON order_status_photos
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert status photos" ON order_status_photos
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update status photos" ON order_status_photos
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Superadmins can delete status photos" ON order_status_photos
  FOR DELETE USING (is_superadmin());

-- ── ORDER_IMAGES ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage order images" ON order_images;
DROP POLICY IF EXISTS "Admins can view order images" ON order_images;
DROP POLICY IF EXISTS "Admins can insert order images" ON order_images;
DROP POLICY IF EXISTS "Admins can update order images" ON order_images;
DROP POLICY IF EXISTS "Superadmins can delete order images" ON order_images;
CREATE POLICY "Admins can view order images" ON order_images
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert order images" ON order_images
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update order images" ON order_images
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Superadmins can delete order images" ON order_images
  FOR DELETE USING (is_superadmin());

-- ── PAYMENTS ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage payments" ON payments;
DROP POLICY IF EXISTS "Admins can view payments" ON payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON payments;
DROP POLICY IF EXISTS "Admins can update payments" ON payments;
DROP POLICY IF EXISTS "Superadmins can delete payments" ON payments;
CREATE POLICY "Admins can view payments" ON payments
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert payments" ON payments
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update payments" ON payments
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Superadmins can delete payments" ON payments
  FOR DELETE USING (is_superadmin());

-- ── PAYMENT_PHOTOS ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage payment photos" ON payment_photos;
DROP POLICY IF EXISTS "Admins can view payment photos" ON payment_photos;
DROP POLICY IF EXISTS "Admins can insert payment photos" ON payment_photos;
DROP POLICY IF EXISTS "Admins can update payment photos" ON payment_photos;
DROP POLICY IF EXISTS "Superadmins can delete payment photos" ON payment_photos;
CREATE POLICY "Admins can view payment photos" ON payment_photos
  FOR SELECT USING (is_admin());
CREATE POLICY "Admins can insert payment photos" ON payment_photos
  FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admins can update payment photos" ON payment_photos
  FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Superadmins can delete payment photos" ON payment_photos
  FOR DELETE USING (is_superadmin());
