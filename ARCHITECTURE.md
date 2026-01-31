# Arquitectura del Proyecto - Bordados Perrino

## Descripción General

Este proyecto implementa una **Clean Architecture adaptada a Next.js** para el negocio de bordados Perrino. La arquitectura está diseñada para ser escalable, mantenible y seguir estándares enterprise.

## Stack Tecnológico

- **Frontend + Backend**: Next.js 14+ (App Router)
- **Base de datos + Auth + Storage**: Supabase
- **Emails transaccionales**: Resend
- **UI**: Tailwind CSS + shadcn/ui
- **Validación**: Zod
- **Deploy**: Vercel

## Estructura de Carpetas

```
src/
├── app/                    # Next.js App Router (SOLO routing y páginas)
│   ├── (admin)/           # Grupo de rutas admin
│   ├── (client)/          # Grupo de rutas cliente
│   ├── (public)/          # Rutas públicas (login, register)
│   └── api/               # Route Handlers (API endpoints)
│
├── components/
│   ├── ui/                # Componentes shadcn/ui (genéricos)
│   ├── layout/            # Shells y layouts (AdminShell, ClientShell)
│   ├── dashboard/         # Componentes del dashboard
│   ├── orders/            # Componentes de pedidos
│   └── clients/           # Componentes de clientes
│
├── config/
│   └── env.ts             # Validación de variables de entorno con Zod
│
└── lib/
    ├── db/                # Repositorios (acceso a base de datos)
    │   └── *.repo.ts
    ├── services/          # Lógica de negocio y orquestación
    │   └── *.service.ts
    ├── validators/        # Esquemas Zod
    │   └── *.schema.ts
    ├── supabase/          # Clientes de Supabase
    │   ├── server.ts
    │   ├── browser.ts
    │   └── middleware.ts
    ├── email/             # Integración con Resend
    │   └── resend.ts
    └── utils/             # Utilidades generales
        ├── errors.ts
        └── status.ts
```

## Reglas de Arquitectura (OBLIGATORIAS)

### 1. Separación de Responsabilidades

| Capa | Ubicación | Responsabilidad |
|------|-----------|-----------------|
| **Routing** | `src/app/**` | Solo routing, layouts, pages, route handlers |
| **UI** | `src/components/**` | Componentes React (presentación) |
| **Validación** | `src/lib/validators/**` | Esquemas Zod para validar inputs |
| **Servicios** | `src/lib/services/**` | Lógica de negocio, orquestación, side effects |
| **Repositorios** | `src/lib/db/**` | Acceso a base de datos |
| **Infraestructura** | `src/lib/supabase/**, src/lib/email/**` | Clientes externos |

### 2. Reglas de Acceso a Supabase

```
❌ PROHIBIDO: Llamar a Supabase desde components, pages, o API routes directamente

✅ CORRECTO: 
   - API Route → Service → Repository → Supabase Client
   - Server Component → Repository → Supabase Client (solo lectura)
```

### 3. Flujo de una API Route

```typescript
// src/app/api/orders/route.ts
export async function POST(request: Request) {
  try {
    // 1. Parse body
    const body = await request.json();
    
    // 2. Validate with Zod
    const data = createOrderSchema.parse(body);
    
    // 3. Call service (business logic)
    const order = await ordersService.create(data);
    
    // 4. Return response
    return successResponse(order, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 4. Server Components vs Client Components

```
✅ Server Components (default):
   - Fetch de datos
   - Acceso a repositorios
   - Sin hooks ni interactividad

✅ Client Components ("use client"):
   - Hooks (useState, useEffect)
   - Event handlers
   - Formularios interactivos
   - Animaciones
```

## Convenciones de Naming

### Archivos

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Repositorio | `*.repo.ts` | `orders.repo.ts` |
| Servicio | `*.service.ts` | `orders.service.ts` |
| Validador | `*.schema.ts` | `orders.schema.ts` |
| Componente | `PascalCase.tsx` | `OrderCard.tsx` |
| Utilidad | `camelCase.ts` | `formatDate.ts` |

### Carpetas

- Dominios en inglés: `orders`, `clients`, `dashboard`, `auth`, `notifications`
- Minúsculas con guiones para multi-palabra: `order-details`

### Funciones y Variables

```typescript
// Funciones: camelCase
function createOrder() {}
async function getClientById() {}

// Constantes: SCREAMING_SNAKE_CASE
const ORDER_STATUSES = ['RECIBIDO', 'CONFECCION', 'RETIRO'];

// Tipos/Interfaces: PascalCase
interface OrderCreateInput {}
type OrderStatus = 'RECIBIDO' | 'CONFECCION';
```

## Endpoints REST

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/orders` | Listar pedidos |
| POST | `/api/orders` | Crear pedido |
| GET | `/api/orders/[id]` | Obtener pedido |
| PATCH | `/api/orders/[id]` | Actualizar pedido |
| PATCH | `/api/orders/[id]/status` | Cambiar estado |
| DELETE | `/api/orders/[id]` | Eliminar pedido |

## Estados de Pedido

```typescript
const OrderStatus = {
  RECIBIDO: 'RECIBIDO',      // Pedido recibido
  CONFECCION: 'CONFECCION',  // En producción
  RETIRO: 'RETIRO',          // Listo para retirar
  ENTREGADO: 'ENTREGADO',    // Entregado al cliente
  CANCELADO: 'CANCELADO',    // Cancelado
} as const;
```

## Manejo de Errores

Usar las utilidades de `src/lib/utils/errors.ts`:

```typescript
import { successResponse, handleApiError, Errors } from '@/lib/utils/errors';

// En API Routes
try {
  // ...lógica
  return successResponse(data);
} catch (error) {
  return handleApiError(error);
}

// Lanzar errores específicos
throw Errors.notFound('Pedido');
throw Errors.unauthorized();
throw Errors.badRequest('El email es inválido');
```

## Checklist por Módulo

Al implementar un nuevo módulo (ej: `orders`), seguir este orden:

1. [ ] **Definición**: Definir entidad y casos de uso
2. [ ] **Database**: Crear tabla en Supabase, tipos en TypeScript
3. [ ] **Validators**: Crear esquemas Zod en `lib/validators/orders.schema.ts`
4. [ ] **Repository**: Crear `lib/db/orders.repo.ts` con CRUD
5. [ ] **Service**: Crear `lib/services/orders.service.ts` con lógica
6. [ ] **API Routes**: Crear endpoints en `app/api/orders/`
7. [ ] **UI Components**: Crear componentes en `components/orders/`
8. [ ] **Pages**: Conectar todo en las páginas
9. [ ] **Permisos**: Implementar RLS en Supabase
10. [ ] **Tests**: Tests básicos de la funcionalidad

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

## Comandos Útiles

```bash
# Desarrollo
pnpm dev

# Build
pnpm build

# Linting
pnpm lint

# Formatear código
pnpm format

# Type checking
pnpm type-check
```

## Recursos Adicionales

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase Docs](https://supabase.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Zod Documentation](https://zod.dev)

