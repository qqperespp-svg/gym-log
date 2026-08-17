export default function Loading() {
  return <div className="animate-pulse space-y-7"><div className="space-y-3"><div className="h-4 w-28 rounded bg-white/5" /><div className="h-10 w-72 max-w-full rounded-xl bg-white/5" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-32 rounded-2xl bg-white/[.04]" />)}</div><div className="grid gap-5 xl:grid-cols-3"><div className="h-80 rounded-2xl bg-white/[.04] xl:col-span-2" /><div className="h-80 rounded-2xl bg-white/[.04]" /></div></div>;
}
