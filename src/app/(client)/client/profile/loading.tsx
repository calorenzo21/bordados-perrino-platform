export default function ProfileLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-slate-200" />
          <div className="h-6 w-24 rounded bg-slate-200" />
        </div>
        <div className="h-9 w-20 rounded-xl bg-slate-200" />
      </div>

      {/* Profile Card skeleton */}
      <div className="rounded-2xl bg-white/80 border border-slate-200/50 overflow-hidden">
        {/* Header gradient */}
        <div className="relative bg-slate-200 px-6 pb-16 pt-8">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <div className="h-24 w-24 rounded-full bg-slate-300 border-4 border-white" />
          </div>
        </div>

        {/* Info */}
        <div className="px-6 pt-16 pb-6">
          <div className="h-7 w-40 rounded bg-slate-200 mx-auto mb-6" />

          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 rounded-xl bg-slate-100 p-4">
                <div className="h-10 w-10 rounded-full bg-slate-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-20 rounded bg-slate-200" />
                  <div className="h-5 w-32 rounded bg-slate-200" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="h-10 w-full rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
