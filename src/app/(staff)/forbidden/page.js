import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="max-w-xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent">Access denied</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">You don&apos;t have access to this page</h1>
      <p className="mt-2 text-sm text-white/60">
        Your role doesn&apos;t include permission for this area. Ask an administrator if you need access.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-accent-hover"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
