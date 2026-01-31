-- ============================================
-- BORDADOS PERRINO - ESQUEMA INICIAL
-- ============================================
-- Optimizado para: Performance, Costo mínimo, Seguridad (RLS)
-- Generado desde análisis del código existente
-- ============================================

-- ============================================
-- 1. EXTENSIONES NECESARIAS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 2. TIPOS ENUMERADOS (Performance: evita joins)
-- ============================================

-- Estados de pedido (del código: src/lib/utils/status.ts)
CREATE TYPE order_status AS ENUM (
  'RECIBIDO',
  'CONFECCION', 
  'RETIRO',
  'PARCIALMENTE_ENTREGADO',
  'ENTREGADO',
  'CANCELADO'
);

-- Tipos de servicio (del código: orders/new/page.tsx)
CREATE TYPE service_type AS ENUM (
  'Llaveros',
  'DTF',
  'Impresión',
  'Impresión y Planchado',
  'Impresión, Planchado y Tela',
  'Sublimación',
  'Bordados'
);

-- Métodos de pago (del código: orders/[id]/page.tsx)
CREATE TYPE payment_method AS ENUM (
  'efectivo',
  'transferencia',
  'tarjeta',
  'otro'
);

-- Roles de usuario
CREATE TYPE user_role AS ENUM (
  'ADMIN',
  'CLIENT'
);

-- ============================================
-- 3. TABLAS PRINCIPALES
-- ============================================

-- --------------------------------------------
-- PROFILES (extiende auth.users de Supabase)
-- --------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'CLIENT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para búsqueda por email (login)
CREATE INDEX idx_profiles_email ON profiles(email);
-- Índice para filtrar por rol (admin queries)
CREATE INDEX idx_profiles_role ON profiles(role);

-- --------------------------------------------
-- CLIENTS (clientes del negocio)
-- --------------------------------------------
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Puede estar vinculado a un usuario o no (clientes sin cuenta)
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Datos básicos (del código: clients/[id]/page.tsx)
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  cedula TEXT, -- Agregado recientemente
  address TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_user_id ON clients(user_id);
-- Índice para búsqueda por teléfono
CREATE INDEX idx_clients_phone ON clients(phone);

-- --------------------------------------------
-- EXPENSE_TYPES (tipos de gastos)
-- --------------------------------------------
CREATE TABLE expense_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'bg-slate-500',
  is_system BOOLEAN NOT NULL DEFAULT FALSE, -- Tipos predefinidos no eliminables
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- --------------------------------------------
-- EXPENSES (gastos del negocio)
-- --------------------------------------------
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expense_type_id UUID NOT NULL REFERENCES expense_types(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para reportes y filtros
CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_type ON expenses(expense_type_id);
-- Índice compuesto para filtros de dashboard (mes actual)
CREATE INDEX idx_expenses_date_type ON expenses(date, expense_type_id);

-- --------------------------------------------
-- ORDERS (pedidos)
-- --------------------------------------------
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- ID legible para humanos (ORD-001, etc.)
  order_number TEXT NOT NULL UNIQUE,
  
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  
  -- Detalles del pedido
  description TEXT NOT NULL,
  service_type service_type NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
  
  -- Estado y flags
  status order_status NOT NULL DEFAULT 'RECIBIDO',
  is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Fechas
  due_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices optimizados para los filtros más usados
-- 1. Listado principal: filtro por estado (más usado)
CREATE INDEX idx_orders_status ON orders(status);
-- 2. Filtro por cliente (vista de cliente y admin)
CREATE INDEX idx_orders_client ON orders(client_id);
-- 3. Ordenamiento por fecha de creación
CREATE INDEX idx_orders_created ON orders(created_at DESC);
-- 4. Filtro combinado status + fecha (dashboard)
CREATE INDEX idx_orders_status_created ON orders(status, created_at DESC);
-- 5. Pedidos urgentes
CREATE INDEX idx_orders_urgent ON orders(is_urgent) WHERE is_urgent = TRUE;
-- 6. Pedidos por fecha de entrega (para calcular atrasados)
CREATE INDEX idx_orders_due_date ON orders(due_date);

-- Secuencia para order_number
CREATE SEQUENCE order_number_seq START 1;

-- --------------------------------------------
-- ORDER_STATUS_HISTORY (historial de estados)
-- --------------------------------------------
CREATE TABLE order_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status order_status NOT NULL,
  observations TEXT,
  changed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para obtener historial de un pedido
CREATE INDEX idx_status_history_order ON order_status_history(order_id, changed_at DESC);

-- --------------------------------------------
-- ORDER_STATUS_PHOTOS (fotos del historial)
-- --------------------------------------------
CREATE TABLE order_status_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  status_history_id UUID NOT NULL REFERENCES order_status_history(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_photos_history ON order_status_photos(status_history_id);

-- --------------------------------------------
-- ORDER_IMAGES (diseños/referencias del pedido)
-- --------------------------------------------
CREATE TABLE order_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_images_order ON order_images(order_id);

-- --------------------------------------------
-- PAYMENTS (abonos/pagos)
-- --------------------------------------------
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  method payment_method NOT NULL,
  notes TEXT,
  received_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para obtener pagos de un pedido
CREATE INDEX idx_payments_order ON payments(order_id, payment_date DESC);
-- Índice para reportes de ingresos por fecha
CREATE INDEX idx_payments_date ON payments(payment_date DESC);

-- --------------------------------------------
-- PAYMENT_PHOTOS (comprobantes de pago)
-- --------------------------------------------
CREATE TABLE payment_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_photos_payment ON payment_photos(payment_id);

-- ============================================
-- 4. FUNCIONES AUXILIARES
-- ============================================

-- Función para generar order_number automáticamente
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'ORD-' || LPAD(nextval('order_number_seq')::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  WHEN (NEW.order_number IS NULL)
  EXECUTE FUNCTION generate_order_number();

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con updated_at
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clients_updated BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_expenses_updated BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función para crear historial al cambiar estado
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_order_status_log
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_status_change();

-- Función para crear perfil automáticamente al registrarse
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'CLIENT')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 5. VISTAS PARA OPTIMIZAR QUERIES FRECUENTES
-- ============================================

-- Vista de clientes con estadísticas (evita N+1 en listado)
CREATE VIEW clients_with_stats AS
SELECT 
  c.*,
  COALESCE(order_stats.total_orders, 0) as total_orders,
  COALESCE(order_stats.active_orders, 0) as active_orders,
  COALESCE(order_stats.completed_orders, 0) as completed_orders,
  COALESCE(order_stats.total_spent, 0) as total_spent,
  order_stats.last_order_date
FROM clients c
LEFT JOIN (
  SELECT 
    client_id,
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE status IN ('RECIBIDO', 'CONFECCION', 'RETIRO', 'PARCIALMENTE_ENTREGADO')) as active_orders,
    COUNT(*) FILTER (WHERE status = 'ENTREGADO') as completed_orders,
    SUM(total) as total_spent,
    MAX(created_at) as last_order_date
  FROM orders
  GROUP BY client_id
) order_stats ON c.id = order_stats.client_id;

-- Vista de pedidos con info de pago (evita N+1)
CREATE VIEW orders_with_payments AS
SELECT 
  o.*,
  c.name as client_name,
  c.email as client_email,
  c.phone as client_phone,
  c.cedula as client_cedula,
  c.address as client_address,
  COALESCE(p.total_paid, 0) as total_paid,
  o.total - COALESCE(p.total_paid, 0) as remaining_balance,
  CASE 
    WHEN o.total <= COALESCE(p.total_paid, 0) THEN 'PAID'
    WHEN COALESCE(p.total_paid, 0) > 0 THEN 'PARTIAL'
    ELSE 'PENDING'
  END as payment_status,
  o.due_date < CURRENT_DATE AND o.status NOT IN ('ENTREGADO', 'CANCELADO') as is_delayed,
  o.due_date - CURRENT_DATE as days_remaining
FROM orders o
JOIN clients c ON o.client_id = c.id
LEFT JOIN (
  SELECT order_id, SUM(amount) as total_paid
  FROM payments
  GROUP BY order_id
) p ON o.id = p.order_id;

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_photos ENABLE ROW LEVEL SECURITY;

-- Función helper para verificar si es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- POLÍTICAS RLS
-- ==========================================

-- PROFILES
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());
  
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (is_admin());

-- CLIENTS (solo admins pueden gestionar)
CREATE POLICY "Admins can do everything with clients" ON clients
  FOR ALL USING (is_admin());

CREATE POLICY "Clients can view their linked record" ON clients
  FOR SELECT USING (user_id = auth.uid());

-- EXPENSE_TYPES (solo admins)
CREATE POLICY "Admins can manage expense types" ON expense_types
  FOR ALL USING (is_admin());

CREATE POLICY "Everyone can view expense types" ON expense_types
  FOR SELECT USING (TRUE);

-- EXPENSES (solo admins)
CREATE POLICY "Admins can manage expenses" ON expenses
  FOR ALL USING (is_admin());

-- ORDERS
CREATE POLICY "Admins can do everything with orders" ON orders
  FOR ALL USING (is_admin());

CREATE POLICY "Clients can view their orders" ON orders
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    )
  );

-- ORDER_STATUS_HISTORY
CREATE POLICY "Admins can manage status history" ON order_status_history
  FOR ALL USING (is_admin());

CREATE POLICY "Clients can view their order history" ON order_status_history
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN clients c ON o.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- ORDER_STATUS_PHOTOS
CREATE POLICY "Admins can manage status photos" ON order_status_photos
  FOR ALL USING (is_admin());

CREATE POLICY "Clients can view their order photos" ON order_status_photos
  FOR SELECT USING (
    status_history_id IN (
      SELECT h.id FROM order_status_history h
      JOIN orders o ON h.order_id = o.id
      JOIN clients c ON o.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- ORDER_IMAGES
CREATE POLICY "Admins can manage order images" ON order_images
  FOR ALL USING (is_admin());

CREATE POLICY "Clients can view their order images" ON order_images
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN clients c ON o.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- PAYMENTS
CREATE POLICY "Admins can manage payments" ON payments
  FOR ALL USING (is_admin());

CREATE POLICY "Clients can view their payments" ON payments
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN clients c ON o.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- PAYMENT_PHOTOS
CREATE POLICY "Admins can manage payment photos" ON payment_photos
  FOR ALL USING (is_admin());

CREATE POLICY "Clients can view their payment photos" ON payment_photos
  FOR SELECT USING (
    payment_id IN (
      SELECT p.id FROM payments p
      JOIN orders o ON p.order_id = o.id
      JOIN clients c ON o.client_id = c.id
      WHERE c.user_id = auth.uid()
    )
  );

-- ============================================
-- 7. STORAGE BUCKETS (para imágenes)
-- ============================================
-- Nota: Ejecutar en la UI de Supabase Storage o via API
-- Buckets necesarios:
-- - order-images (diseños/referencias)
-- - status-photos (fotos de historial)
-- - payment-receipts (comprobantes de pago)

-- ============================================
-- FIN DEL ESQUEMA
-- ============================================
