# Base de Datos Bordados Perrino - Setup Guide

## Resumen de lo Creado

### Entidades (10 tablas)

| Tabla | Propósito |
|-------|-----------|
| `profiles` | Extiende auth.users con rol y datos personales |
| `clients` | Clientes del negocio (con o sin cuenta de usuario) |
| `expense_types` | Categorías de gastos (Personal, Castillo, etc.) |
| `expenses` | Registro de gastos del negocio |
| `orders` | Pedidos con estado, totales, fechas |
| `order_status_history` | Historial de cambios de estado |
| `order_status_photos` | Fotos adjuntas al historial |
| `order_images` | Diseños/referencias del pedido |
| `payments` | Abonos/pagos de pedidos |
| `payment_photos` | Comprobantes de pago |

### Relaciones Clave

```
profiles (1) ──── (0..1) clients
clients (1) ──── (N) orders
orders (1) ──── (N) order_status_history
orders (1) ──── (N) order_images
orders (1) ──── (N) payments
order_status_history (1) ──── (N) order_status_photos
payments (1) ──── (N) payment_photos
expense_types (1) ──── (N) expenses
```

### Índices Creados

| Índice | Tabla | Razón |
|--------|-------|-------|
| `idx_orders_status` | orders | Filtro principal en listado de pedidos |
| `idx_orders_client` | orders | Vista de pedidos por cliente |
| `idx_orders_created` | orders | Ordenamiento por fecha |
| `idx_orders_status_created` | orders | Dashboard: pedidos activos recientes |
| `idx_orders_urgent` | orders | Filtro pedidos urgentes (parcial) |
| `idx_orders_due_date` | orders | Cálculo de pedidos atrasados |
| `idx_expenses_date` | expenses | Reportes por fecha |
| `idx_expenses_date_type` | expenses | Dashboard: gastos del mes |
| `idx_payments_order` | payments | Historial de pagos por pedido |
| `idx_payments_date` | payments | Reportes de ingresos |

### Políticas RLS

| Entidad | Admin | Cliente |
|---------|-------|---------|
| profiles | Ver todos | Solo el suyo |
| clients | CRUD completo | Solo su registro vinculado |
| expenses | CRUD completo | Sin acceso |
| expense_types | CRUD completo | Solo lectura |
| orders | CRUD completo | Solo sus pedidos (lectura) |
| order_status_history | CRUD completo | Solo sus pedidos (lectura) |
| payments | CRUD completo | Solo sus pedidos (lectura) |

### Vistas Optimizadas

- `clients_with_stats`: Clientes con métricas pre-calculadas (evita N+1)
- `orders_with_payments`: Pedidos con total pagado y saldo (evita joins repetidos)

---

## Cómo Ejecutar

### Opción 1: Usando MCP execute_sql

1. Abre el archivo `001_initial_schema.sql`
2. Copia todo el contenido
3. En el MCP de Supabase, usa `execute_sql` con el contenido
4. Repite para `002_seed_data.sql`

### Opción 2: SQL Editor de Supabase

1. Ve a tu proyecto en [app.supabase.com](https://app.supabase.com)
2. Navega a **SQL Editor**
3. Crea un nuevo query
4. Pega el contenido de `001_initial_schema.sql` y ejecuta
5. Crea otro query con `002_seed_data.sql` y ejecuta

### Opción 3: Supabase CLI

```bash
# Instalar CLI si no lo tienes
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref TU_PROJECT_REF

# Ejecutar migraciones
supabase db push
```

---

## Crear Usuarios de Prueba

Después de ejecutar las migraciones, crea los usuarios manualmente:

### 1. Usuario Admin

- **Email**: `admin@bordadosperrino.com`
- **Password**: `Admin123!`
- **User Metadata** (en el formulario de creación):
```json
{
  "first_name": "Admin",
  "last_name": "Perrino",
  "role": "ADMIN"
}
```

### 2. Usuario Cliente (María García)

- **Email**: `maria@email.com`
- **Password**: `Cliente123!`
- **User Metadata**:
```json
{
  "first_name": "María",
  "last_name": "García",
  "role": "CLIENT"
}
```

Luego vincular el cliente:
```sql
UPDATE clients 
SET user_id = 'UUID_DEL_USUARIO_MARIA'
WHERE email = 'maria@email.com';
```

---

## Storage Buckets (Crear Manualmente)

En Supabase Dashboard → Storage, crear:

1. **order-images** - Diseños y referencias de pedidos
2. **status-photos** - Fotos del historial de estados
3. **payment-receipts** - Comprobantes de pago

Configurar como públicos o con políticas según necesidad.

---

## Mapa UI → Datos

### Dashboard Admin (`/admin/dashboard`)

| Sección | Query |
|---------|-------|
| Pedidos Activos | `SELECT COUNT(*) FROM orders WHERE status IN ('RECIBIDO','CONFECCION','RETIRO','PARCIALMENTE_ENTREGADO')` |
| Ingresos del Mes | `SELECT SUM(amount) FROM payments WHERE payment_date >= date_trunc('month', now())` |
| Gastos del Mes | `SELECT SUM(amount) FROM expenses WHERE date >= date_trunc('month', now())` |
| Clientes Totales | `SELECT COUNT(*) FROM clients` |
| Pedidos Completados | `SELECT COUNT(*) FROM orders WHERE status = 'ENTREGADO'` |
| Distribución por Estado | `SELECT status, COUNT(*) FROM orders GROUP BY status` |
| Pedidos por Período | `SELECT date_trunc('month', created_at), COUNT(*) FROM orders GROUP BY 1` |
| Volumen por Servicio | `SELECT service_type, COUNT(*), SUM(total) FROM orders GROUP BY service_type` |

### Clientes Admin (`/admin/clients`)

| Sección | Query |
|---------|-------|
| Lista | `SELECT * FROM clients_with_stats ORDER BY created_at DESC` |
| Detalle | `SELECT * FROM clients_with_stats WHERE id = $1` |
| Pedidos del Cliente | `SELECT * FROM orders_with_payments WHERE client_id = $1` |

### Pedidos Admin (`/admin/orders`)

| Sección | Query |
|---------|-------|
| Lista | `SELECT * FROM orders_with_payments ORDER BY is_urgent DESC, created_at DESC` |
| Por Estado | `SELECT * FROM orders_with_payments WHERE status = $1` |
| Detalle | `SELECT * FROM orders_with_payments WHERE id = $1` |
| Historial | `SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY changed_at` |
| Pagos | `SELECT * FROM payments WHERE order_id = $1 ORDER BY payment_date` |

### Gastos Admin (`/admin/expenses`)

| Sección | Query |
|---------|-------|
| Lista | `SELECT e.*, et.name, et.color FROM expenses e JOIN expense_types et ON e.expense_type_id = et.id` |
| Por Tipo | Agregar `WHERE expense_type_id = $1` |
| Totales | `SELECT SUM(amount), expense_type_id FROM expenses GROUP BY expense_type_id` |

### Panel Cliente (`/client/panel`)

| Sección | Query (con RLS) |
|---------|-----------------|
| Mis Pedidos | `SELECT * FROM orders_with_payments` (RLS filtra automáticamente) |
| Estadísticas | Derivadas de los pedidos del cliente |

### Detalle Pedido Cliente (`/client/orders/[id]`)

| Sección | Query (con RLS) |
|---------|-----------------|
| Pedido | `SELECT * FROM orders_with_payments WHERE id = $1` |
| Historial | `SELECT * FROM order_status_history WHERE order_id = $1` |
| Pagos | `SELECT * FROM payments WHERE order_id = $1` |

---

## Checklist de Verificación

### RLS Funciona Correctamente

- [ ] Cliente María solo ve sus pedidos (no los de otros)
- [ ] Cliente no puede ver gastos
- [ ] Admin ve todos los pedidos
- [ ] Admin puede editar todo

### Índices en Uso

```sql
-- Verificar que los índices se usan
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'CONFECCION';
EXPLAIN ANALYZE SELECT * FROM orders WHERE client_id = 'c1000000-0000-0000-0000-000000000001';
EXPLAIN ANALYZE SELECT * FROM expenses WHERE date >= '2026-01-01';
```

### Dashboard Carga Rápido

- [ ] Métricas principales < 100ms
- [ ] Gráfico de pedidos por mes < 200ms
- [ ] Lista de pedidos recientes < 150ms

---

## Optimización y Riesgos

### Donde Podría Subir el Costo

1. **Listados sin paginación**: Implementar `LIMIT/OFFSET` o cursor-based pagination
2. **Búsquedas full-text**: Considerar índices GIN si se necesita búsqueda avanzada
3. **Agregaciones repetidas**: Considerar materializar si el dashboard es muy usado

### Métricas que Conviene Pre-agregar (Futuro)

Si el volumen crece significativamente (>10k pedidos):

- Crear tabla `daily_stats` con totales diarios
- Actualizar via trigger o cron job
- Reducirá queries de agregación en dashboard

### TODOs por Ambigüedad

1. **Imágenes**: El código muestra URLs de ejemplo (unsplash). Definir si se usa Supabase Storage o servicio externo.
2. **Notificaciones**: No hay sistema de notificaciones en el código actual.
3. **Auditoría**: Solo se loguean cambios de estado, no otras modificaciones.
4. **Multi-tenancy**: El sistema actual es single-tenant. Si se necesita multi-tenant, requiere cambios.

---

## Datos de Prueba Incluidos

| Entidad | Cantidad |
|---------|----------|
| Tipos de Gasto | 5 |
| Clientes | 20 |
| Pedidos | 80 (8 recibidos, 12 confección, 4 retiro, 3 parcial, 50 entregados, 3 cancelados) |
| Historial de Estados | ~15 registros |
| Pagos | ~15 registros |
| Gastos | 28 registros (últimos 90 días) |

### Validar Seed

```sql
-- Verificar conteos
SELECT 'clients' as tabla, COUNT(*) FROM clients
UNION ALL SELECT 'orders', COUNT(*) FROM orders
UNION ALL SELECT 'expenses', COUNT(*) FROM expenses
UNION ALL SELECT 'payments', COUNT(*) FROM payments;

-- Verificar pedidos por estado
SELECT status, COUNT(*) FROM orders GROUP BY status ORDER BY status;

-- Verificar gastos del mes
SELECT SUM(amount) FROM expenses WHERE date >= date_trunc('month', CURRENT_DATE);
```
