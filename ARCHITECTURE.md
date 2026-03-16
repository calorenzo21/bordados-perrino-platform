# Arquitectura del Proyecto - Bordados Perrino

## Descripción General

Plataforma web para gestión de pedidos de bordados con panel de administración y portal de clientes. Implementa una **arquitectura híbrida Server/Client optimizada para Next.js App Router**, con Supabase como backend completo (base de datos, autenticación, almacenamiento de archivos).

## Stack Tecnológico

- **Framework**: Next.js 15+ (App Router)
- **Base de datos + Auth + Storage**: Supabase (PostgreSQL + RLS + Auth + Storage)
- **Caché client-side**: SWR (stale-while-revalidate)
- **Emails transaccionales**: Resend
- **UI**: Tailwind CSS + shadcn/ui
- **Validación de env**: Zod + @t3-oss/env-nextjs
- **Deploy**: Vercel

## Estructura de Carpetas

```
src/
├── app/                        # Next.js App Router
│   ├── (admin)/               # Rutas admin (protegidas por middleware)
│   ├── (client)/              # Rutas cliente (protegidas por middleware)
│   ├── (public)/              # Rutas públicas (login, register)
│   │   └── actions.ts         # Server Actions de autenticación
│   └── api/                   # Route Handlers (API endpoints)
│       ├── admin/             # APIs admin (gestión de usuarios)
│       ├── client/            # APIs cliente (panel, pedidos)
│       └── clients/           # API CRUD de clientes
│
├── components/
│   ├── ui/                    # Componentes shadcn/ui
│   ├── layout/                # AdminShell, ClientShell
│   ├── dashboard/             # MetricCard, etc.
│   ├── orders/                # OrderStatusBadge, etc.
│   └── client/                # PanelContent, OrderDetailContent, ImageGallery
│
├── config/
│   └── env.ts                 # Validación de env vars con Zod (@t3-oss/env-nextjs)
│
├── context/
│   └── auth-context.tsx       # AuthProvider (sesión, perfil, signOut)
│
├── hooks/
│   ├── use-auth.ts            # Re-export de useAuth del context
│   ├── use-orders.ts          # useOrder (SWR, detalle admin), adminOrderFetcher
│   ├── use-clients.ts         # useClients (lista), useClient (SWR, detalle)
│   ├── use-service-types.ts   # useServiceTypes (tipos de servicio)
│   ├── useClientPanel.ts      # SWR hook para panel cliente
│   └── useClientOrder.ts      # SWR hook para detalle pedido cliente
│
└── lib/
    ├── actions/               # Server Actions (revalidación de caché)
    │   └── revalidate.ts      # revalidateOrders, revalidateClients, etc.
    ├── repositories/          # Acceso a base de datos (patrón Repository)
    │   ├── orders.repository.ts
    │   ├── clients.repository.ts
    │   └── expenses.repository.ts
    ├── services/              # Lógica de negocio y data fetching
    │   ├── dashboard.server.ts    # getDashboardData (Server Component)
    │   ├── dashboard.service.ts   # DashboardService (compartido)
    │   ├── orders.server.ts       # getOrdersData (Server Component)
    │   ├── clients.server.ts      # getClientsData (Server Component)
    │   ├── expenses.server.ts     # getExpensesData (Server Component)
    │   ├── client-portal.server.ts # getClientPanelData, getClientOrderDetail
    │   └── auth.service.ts        # AuthService
    ├── supabase/
    │   ├── server.ts          # createClient (cookies), createAdminClient (service role)
    │   ├── browser.ts         # createClient (browser, singleton por llamada)
    │   └── middleware.ts      # updateSession (refresco de sesión + rol)
    ├── utils/
    │   ├── errors.ts          # Helpers de respuesta HTTP
    │   ├── status.ts          # OrderStatus, OrderStatusLabels
    │   └── image-upload.ts    # Compresión + upload a Supabase Storage
    └── types/
        └── database.ts        # Tipos de base de datos
```

## Patrones de Acceso a Datos

### Patrón 1: Server Component + ISR (Admin - Listas)

Las páginas de listas en admin usan Server Components con revalidación ISR:

```
page.tsx (Server Component, revalidate=300)
  → *.server.ts (cache() de React para deduplicar)
    → Supabase server client (cookies)
      → Pasa datos como props a Client Component
```

**Archivos**: dashboard, orders, clients, expenses (pages).

**Revalidación**: `revalidatePath()` tras mutaciones + `revalidate=300` como fallback.

### Patrón 2: SWR + Supabase Browser (Admin - Detalle)

Páginas de detalle (pedido individual, cliente individual):

```
Client Component
  → useSWR(key, fetcher)
    → fetcher usa Supabase browser client
      → Queries directas (orders_with_payments, payments, status_history)
```

**Archivos**: `use-orders.ts` (useOrder), `use-clients.ts` (useClient).

### Patrón 3: API Route + SWR (Portal Cliente)

El portal de clientes usa API routes como intermediario:

```
Client Component
  → useSWR('/api/client/panel')
    → API Route (GET)
      → *.server.ts (getClientPanelData / getClientOrderDetail)
        → Supabase server client (auth + filtro por client_id)
```

**Archivos**: `useClientPanel.ts`, `useClientOrder.ts`, `api/client/`.

### Patrón 4: Mutaciones desde Client Components

Operaciones de escritura (crear pedido, agregar pago, cambiar estado):

```
Client Component (evento del usuario)
  → Supabase browser client (insert/update)
    → revalidatePath() via Server Action
    → SWR mutate() para actualización optimista local
```

**Nota**: Este patrón es pragmático para formularios complejos con uploads y lógica condicional.
Para nuevas funcionalidades, se recomienda usar Server Actions cuando sea viable.

## Seguridad

### Capas de Protección

1. **Middleware** (`middleware.ts`): Refresco de sesión en cada request, protección de rutas por rol (ADMIN/CLIENT), redirección de usuarios no autenticados.
2. **RLS** (Row Level Security): Políticas en todas las tablas para ADMIN (full access) y CLIENT (solo sus datos).
3. **API Routes**: Verifican `getUser()` + rol en el handler antes de procesar.
4. **Service Role**: Solo en servidor (`createAdminClient()`), para operaciones como crear usuarios en Auth. Nunca se expone al cliente.
5. **Variables de Entorno**: Validadas con Zod. `SUPABASE_SERVICE_ROLE_KEY` solo disponible en servidor.

### Autenticación

- **Login**: Server Action (`signIn`) establece la sesión en cookies del servidor. Después se hace hard navigation (`window.location.href`) para que el middleware refresque la sesión y el browser client la detecte via `onAuthStateChange`.
- **Session Refresh**: El middleware de Supabase refresca la sesión en cada request.
- **AuthProvider**: Escucha `onAuthStateChange` para mantener el estado de usuario/perfil sincronizado en el cliente.

## Caché y Revalidación

| Zona | Estrategia | Herramienta |
|------|-----------|-------------|
| Admin - Listas | ISR (revalidate=300) + revalidatePath on mutation | Next.js ISR |
| Admin - Detalle | SWR (dedupingInterval=20s, revalidateOnFocus) | SWR |
| Cliente - Panel | SWR (dedupingInterval=30s) + Cache-Control headers | SWR + HTTP |
| Cliente - Detalle | SWR (dedupingInterval=15s) + keepPreviousData | SWR |

**Server-side deduplication**: `React.cache()` en servicios `*.server.ts` para evitar queries duplicadas dentro de la misma request.

**Revalidación centralizada**: `src/lib/actions/revalidate.ts` contiene funciones por dominio (`revalidateOrders`, `revalidateClients`, etc.) que invalidan las rutas correctas tras mutaciones.

## Convenciones

### Naming

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Servicio servidor | `*.server.ts` | `dashboard.server.ts` |
| Servicio compartido | `*.service.ts` | `dashboard.service.ts` |
| Repositorio | `*.repository.ts` | `orders.repository.ts` |
| Hook | `use-*.ts` o `use*.ts` | `use-orders.ts` |
| Componente | `PascalCase.tsx` | `OrderStatusBadge.tsx` |
| Server Action | `actions.ts` | `revalidate.ts` |

### Código

- Funciones: `camelCase`
- Constantes: `SCREAMING_SNAKE_CASE`
- Tipos/Interfaces: `PascalCase`
- Supabase browser client: siempre con `useMemo(() => createClient(), [])` en hooks

## Estados de Pedido

```typescript
const OrderStatus = {
  RECIBIDO: 'RECIBIDO',
  CONFECCION: 'CONFECCION',
  RETIRO: 'RETIRO',
  PARCIALMENTE_ENTREGADO: 'PARCIALMENTE_ENTREGADO',
  ENTREGADO: 'ENTREGADO',
  CANCELADO: 'CANCELADO',
} as const;
```

## Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Resend
RESEND_API_KEY=re_xxx

# App
APP_URL=https://bordadosperrino.com
```

## Deuda Técnica Documentada

### Archivos excesivamente grandes (pendiente de refactor)

Los siguientes archivos superan las 700 líneas y combinan demasiadas responsabilidades.
Se recomienda extraer subcomponentes en una sesión dedicada de refactor para no introducir
regresiones:

| Archivo | Líneas aprox. | Plan de extracción |
|---|---|---|
| `src/app/(admin)/admin/orders/[id]/page.tsx` | ~1900+ | Extraer modales (estado, pago, edición), timeline, sección de pagos |
| `src/app/(admin)/admin/dashboard/_components/DashboardContent.tsx` | ~750 | Extraer chart cards, recent-orders table, top-clients |
| `src/app/(admin)/admin/expenses/_components/ExpensesContent.tsx` | ~750 | Extraer dialogs (crear/editar gasto, tipos de gasto), tabla |
| `src/components/client/OrderDetailContent.tsx` | ~770 | Extraer timeline, payment history, order-info sections |

## Comandos

```bash
pnpm dev          # Desarrollo
pnpm build        # Build de producción
pnpm lint         # Linting (ESLint)
pnpm format       # Formateo (Prettier)
pnpm type-check   # Verificación de tipos
```
