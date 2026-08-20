export default function AppLoading() {
  return (
    <div className="space-y-7">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
          <div className="h-8 w-64 animate-pulse rounded-lg bg-white/10" />
          <div className="h-3 w-48 animate-pulse rounded-full bg-white/5" />
        </div>
        <div className="h-11 w-40 animate-pulse rounded-xl bg-white/10" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.04]" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.04]" />
        <div className="h-72 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.04]" />
      </div>
    </div>
  );
}
