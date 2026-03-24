import { Card, CardContent } from '@/components/ui/card';

export default function OrderDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700/60" />
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700/60" />
          <div className="h-4 w-32 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700/60" />
        </div>
      </div>

      {/* Timeline skeleton */}
      <Card className="rounded-2xl border-0 bg-white dark:bg-slate-800 shadow-sm">
        <CardContent className="p-6">
          <div className="flex justify-between">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <div className="h-14 w-14 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700/60" />
                <div className="h-3 w-16 animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Content skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-2xl border-0 bg-white dark:bg-slate-800 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="h-20 w-20 mx-auto animate-pulse rounded-full bg-slate-200 dark:bg-slate-700/60" />
            <div className="h-5 w-32 mx-auto animate-pulse rounded bg-slate-200 dark:bg-slate-700/60" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/40"
              />
            ))}
          </CardContent>
        </Card>
        <div className="space-y-4 lg:col-span-2">
          <div className="h-10 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700/60" />
          <Card className="rounded-2xl border-0 bg-white dark:bg-slate-800 shadow-sm">
            <CardContent className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/40"
                />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
