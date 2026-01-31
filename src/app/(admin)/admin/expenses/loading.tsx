import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ExpensesLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-10 w-28 animate-pulse rounded-xl bg-slate-200" />
          <div className="h-10 w-32 animate-pulse rounded-full bg-slate-200" />
        </div>
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="h-10 flex-1 animate-pulse rounded-xl bg-slate-100" />
        <div className="h-10 w-[500px] animate-pulse rounded-xl bg-slate-100" />
      </div>

      {/* Table skeleton */}
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardHeader className="border-b border-slate-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="h-5 w-36 animate-pulse rounded bg-slate-200" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-slate-100" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Table header */}
          <div className="flex items-center gap-4 border-b border-slate-100 px-6 py-3">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-8 animate-pulse rounded bg-slate-100" />
          </div>

          {/* Table rows */}
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-slate-50 px-6 py-4">
              <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
              <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
              <div className="h-5 w-20 animate-pulse rounded bg-slate-200" />
              <div className="h-8 w-8 animate-pulse rounded-lg bg-slate-100" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Loading indicator */}
      <div className="fixed bottom-4 right-4 flex items-center gap-2 rounded-full bg-blue-500 px-4 py-2 text-white shadow-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Cargando gastos...</span>
      </div>
    </div>
  );
}
