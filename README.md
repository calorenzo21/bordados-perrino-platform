# Bordados Perrino Platform

Plataforma de gestión de pedidos para negocio de bordados con panel administrativo, panel de cliente, seguimiento de pedidos y notificaciones por email.

## 🚀 Stack Tecnológico

- **Framework**: Next.js 14+ (App Router)
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Storage**: Supabase Storage
- **Emails**: Resend
- **UI**: Tailwind CSS + shadcn/ui
- **Validación**: Zod
- **Deploy**: Vercel

## 📁 Estructura del Proyecto

```
src/
├── app/                    # Next.js App Router
│   ├── (admin)/           # Rutas del panel admin
│   ├── (client)/          # Rutas del panel cliente
│   ├── (public)/          # Rutas públicas (login, register)
│   └── api/               # API Routes
├── components/
│   ├── ui/                # Componentes shadcn/ui
│   ├── layout/            # Layouts (AdminShell, ClientShell)
│   └── [domain]/          # Componentes por dominio
├── config/
│   └── env.ts             # Validación de env vars
└── lib/
    ├── db/                # Repositorios
    ├── services/          # Lógica de negocio
    ├── validators/        # Esquemas Zod
    ├── supabase/          # Clientes Supabase
    ├── email/             # Integración Resend
    └── utils/             # Utilidades
```

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd bordados-perrino-platform

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Iniciar servidor de desarrollo
pnpm dev
```

## 🔧 Variables de Entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Resend
RESEND_API_KEY=re_xxx

# App
APP_URL=http://localhost:3000
```

## 📜 Scripts Disponibles

```bash
pnpm dev          # Servidor de desarrollo
pnpm build        # Build de producción
pnpm start        # Servidor de producción
pnpm lint         # Linting con ESLint
pnpm format       # Formatear con Prettier
pnpm type-check   # Verificar tipos TypeScript
```

## 🎯 Características

- [x] **Panel Admin**: Dashboard con métricas, gestión de pedidos y clientes
- [x] **Panel Cliente**: Ver pedidos, historial y perfil
- [x] **Estados de pedido**: RECIBIDO → CONFECCIÓN → RETIRO → ENTREGADO
- [ ] **Autenticación**: Login/Register con Supabase Auth
- [ ] **Notificaciones**: Emails automáticos con Resend
- [ ] **Storage**: Subida de fotos/diseños con Supabase Storage
- [ ] **Dashboard de métricas**: Gráficos y reportes

## 📚 Documentación

Ver [ARCHITECTURE.md](./ARCHITECTURE.md) para detalles sobre:
- Reglas de arquitectura
- Convenciones de código
- Checklist por módulo
- Flujo de desarrollo

## 🔗 URLs de Desarrollo

- **Home**: http://localhost:3000
- **Login**: http://localhost:3000/login
- **Register**: http://localhost:3000/register
- **Admin Dashboard**: http://localhost:3000/admin/dashboard
- **Admin Orders**: http://localhost:3000/admin/orders
- **Client Panel**: http://localhost:3000/client/panel
- **API Health**: http://localhost:3000/api/health

## 📄 Licencia

Privado - Bordados Perrino © 2024
