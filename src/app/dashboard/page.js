import { Suspense } from "react";
import { getSession } from "@/lib/session";
import { logout } from "@/app/login/actions";

// Temporary dashboard — replaced with the real layout once the design is set
export default function DashboardPage() {
  return (
    <main className="min-h-dvh bg-black p-6 text-white sm:p-10">
      <Suspense fallback={<p className="text-white/60">Loading…</p>}>
        <Welcome />
      </Suspense>
    </main>
  );
}

async function Welcome() {
  const session = await getSession();

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold tracking-tight">Welcome, {session?.name}</h1>
      <p className="mt-1 text-sm text-white/70">
        Role: <span className="font-semibold text-white">{session?.role?.replace("_", " ")}</span>
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-medium text-white/80">
          Permissions ({session?.permissions?.length})
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {session?.permissions?.map((p) => (
            <span key={p} className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-white/80">
              {p}
            </span>
          ))}
        </div>
      </div>

      <form action={logout} className="mt-6">
        <button className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm hover:bg-white/20">
          Log out
        </button>
      </form>
    </div>
  );
}
