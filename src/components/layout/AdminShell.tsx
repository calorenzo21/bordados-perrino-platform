'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import {
  Bell,
  ChevronLeft,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Receipt,
  Settings,
  ShoppingCart,
  Users,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import { PerrinoLogo } from '@/components/PerrinoLogo';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

// Navegación simplificada
const mainNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'Pedidos', href: '/admin/orders', icon: ShoppingCart },
  { title: 'Clientes', href: '/admin/clients', icon: Users },
  { title: 'Gastos', href: '/admin/expenses', icon: Receipt },
];

const bottomNavItems: NavItem[] = [
  { title: 'Configuración', href: '/admin/settings', icon: Settings },
];

interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isLoading, isAdmin, signOut } = useAuth();

  // Protección de ruta del lado del cliente como respaldo
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // No hay usuario autenticado - redirigir a login
        router.replace('/login');
      } else if (profile && !isAdmin) {
        // Usuario autenticado pero no es admin - redirigir a panel de cliente
        router.replace('/client/panel');
      }
    }
  }, [isLoading, user, profile, isAdmin, router]);

  // Mostrar loading mientras verifica autenticación
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <PerrinoLogo size="md" />
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario o no es admin, no renderizar (el useEffect redirigirá)
  if (!user || (profile && !isAdmin)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          <p className="text-sm text-slate-500">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Get user initials for avatar
  const getInitials = () => {
    if (profile) {
      const first = profile.first_name?.[0] || '';
      const last = profile.last_name?.[0] || '';
      return (first + last).toUpperCase() || 'AD';
    }
    return 'AD';
  };

  // Get display name
  const getDisplayName = () => {
    if (profile) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Admin';
    }
    return 'Admin';
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-blue-50 text-blue-600'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
          sidebarCollapsed && 'justify-center px-2'
        )}
        onClick={() => setSidebarOpen(false)}
      >
        <item.icon
          className={cn('h-5 w-5 shrink-0', isActive ? 'text-blue-600' : 'text-slate-400')}
        />
        {!sidebarCollapsed && (
          <>
            <span className="flex-1">{item.title}</span>
            {item.badge && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-semibold text-white">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.title}
            {item.badge && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs font-semibold text-white">
                {item.badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-slate-50">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex h-screen flex-col bg-white transition-all duration-300 lg:sticky lg:top-0 lg:translate-x-0',
            sidebarCollapsed ? 'w-[72px]' : 'w-64',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {/* Logo */}
          <div
            className={cn(
              'flex h-16 items-center border-b border-slate-100',
              sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-4'
            )}
          >
            <Link
              href="/admin/dashboard"
              className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'gap-2.5')}
            >
              <PerrinoLogo size="sm" />
            </Link>

            {/* Collapse button - Desktop */}
            {!sidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden h-8 w-8 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 lg:flex"
                onClick={() => setSidebarCollapsed(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            {/* Close button - Mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Expand button when collapsed */}
          {sidebarCollapsed && (
            <div className="hidden border-b border-slate-100 p-2 lg:block">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-full rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                onClick={() => setSidebarCollapsed(false)}
              >
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide">
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </nav>

          {/* Bottom section - Fixed at bottom */}
          <div className="mt-auto shrink-0 border-t border-slate-100 px-3 py-4">
            <div className="space-y-1">
              {bottomNavItems.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col">
          {/* Topbar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <Button
                variant="ghost"
                size="icon"
                className="relative h-10 w-10 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
              </Button>

              {/* User menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 rounded-xl px-2 hover:bg-slate-50"
                  >
                    <Avatar className="h-8 w-8 border-2 border-slate-100">
                      <AvatarImage src="/avatar.png" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-xs font-semibold text-white">
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : getInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{getDisplayName()}</p>
                      <p className="text-xs text-slate-500">
                        {user?.email || 'admin@bordados.com'}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg"
                    onClick={() => router.push('/admin/settings')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Configuración
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-600"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
