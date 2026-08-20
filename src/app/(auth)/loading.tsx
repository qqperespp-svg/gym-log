export default function AuthLoading() {
  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
      <div className="h-9 w-56 animate-pulse rounded-lg bg-white/10" />
      <div className="h-64 animate-pulse rounded-2xl border border-white/[.06] bg-white/[.04]" />
    </div>
  );
}
