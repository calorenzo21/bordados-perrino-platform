'use client';

import { useEffect, useState } from 'react';

import { useTheme } from 'next-themes';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { Loader2, LogOut, Menu, Moon, Package, Sun, User, X } from 'lucide-react';

import { cn } from '@/lib/utils';

import { PerrinoLogo } from '@/components/PerrinoLogo';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { title: 'Mis Pedidos', href: '/client/panel', icon: Package },
  { title: 'Mi Perfil', href: '/client/profile', icon: User },
];

interface ClientShellProps {
  children: React.ReactNode;
}

export function ClientShell({ children }: ClientShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { user, profile, isLoading, signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  // Restaurar tema del cliente al montar (independiente del panel admin)
  useEffect(() => {
    const stored = localStorage.getItem('client-theme');
    if (stored === 'dark' || stored === 'light') setTheme(stored);
  }, [setTheme]);

  const toggleTheme = () => {
    const next = resolvedTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('client-theme', next);
    setTheme(next);
  };

  // Client-side fallback guard: the middleware already enforces role-based access.
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  // Get user initials for avatar
  const getInitials = () => {
    if (profile) {
      const first = profile.first_name?.[0] || '';
      const last = profile.last_name?.[0] || '';
      return (first + last).toUpperCase() || 'CL';
    }
    return 'CL';
  };

  // Get display name
  const getDisplayName = () => {
    if (profile) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Cliente';
    }
    return 'Cliente';
  };

  const handleSignOut = () => {
    setIsSigningOut(true);
    signOut(); // navigates immediately via hard nav — no await needed
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
          {/* Logo */}
          <Link href="/client/panel" className="flex items-center gap-2.5">
            <PerrinoLogo size="md" />
            <div className="hidden sm:block">
              <span className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Bordados Perrino
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              onClick={toggleTheme}
              title="Cambiar tema"
            >
              <Sun className="h-4 w-4 dark:hidden" />
              <Moon className="hidden h-4 w-4 dark:block" />
            </Button>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl md:hidden dark:text-slate-400 dark:hover:bg-slate-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 rounded-xl px-2 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Avatar className="h-8 w-8 border-2 border-slate-100 dark:border-slate-600">
                    <AvatarFallback className="bg-linear-to-br from-blue-500 to-blue-600 text-xs font-semibold text-white">
                      {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium text-slate-700 md:inline dark:text-slate-200">
                    {getDisplayName()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl dark:bg-slate-800 dark:border-slate-700"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium dark:text-slate-100">{getDisplayName()}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {user?.email || 'cliente@email.com'}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer rounded-lg text-red-500 focus:bg-red-50 focus:text-red-500 dark:text-red-400 dark:focus:bg-red-950/50 dark:focus:text-red-400"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden dark:border-slate-700 dark:bg-slate-800">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                      isActive
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
