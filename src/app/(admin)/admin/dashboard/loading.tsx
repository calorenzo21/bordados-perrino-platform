import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

function SkeletonCard() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-3 w-32 animate-pulse rounded bg-slate-100" />
      </CardContent>
    </Card>
  );
}

function SkeletonTable() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-3 w-56 animate-pulse rounded bg-slate-100" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
            </div>
            <div className="h-6 w-20 animate-pulse rounded bg-slate-200" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-48 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-10 w-28 animate-pulse rounded-full bg-slate-200" />
      </div>

      {/* Métricas principales skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>

      {/* Estado de pedidos skeleton */}
      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="rounded-2xl border-0 shadow-sm lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          </CardContent>
        </Card>
        <SkeletonCard />
      </div>

      {/* Gráficos y tablas skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SkeletonCard />
        <div className="space-y-6 lg:col-span-2">
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            </CardHeader>
            <CardContent>
              <div className="h-[200px] animate-pulse rounded-xl bg-slate-100" />
            </CardContent>
          </Card>
          <SkeletonTable />
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-white shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Cargando dashboard...</span>
      </div>
    </div>
  );
}
