import { Card, CardContent } from '@/components/ui/card';

export default function ClientDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700/60" />
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700/60" />
          <div className="space-y-2">
            <div className="h-7 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700/60" />
            <div className="h-4 w-28 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700/60" />
          </div>
        </div>
      </div>

      {/* Metric cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
            <CardContent className="p-5 space-y-3">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
              <div className="h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
              <div className="h-3 w-32 animate-pulse rounded bg-slate-200 dark:bg-slate-700/40" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact info skeleton */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-24">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`h-14 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700/60 ${i === 0 ? 'sm:col-span-6' : i === 3 ? 'sm:col-span-11' : 'sm:col-span-3'}`}
          />
        ))}
      </div>

      {/* Orders table skeleton */}
      <Card className="rounded-2xl border-0 shadow-sm dark:bg-slate-800">
        <CardContent className="p-0">
          <div className="p-6 pb-4 space-y-3">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
          </div>
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-16 mx-6 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/40"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
