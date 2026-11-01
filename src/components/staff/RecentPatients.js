import { Suspense } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getRecentlyViewedPatients } from "@/lib/recentlyViewed";
import { formatDateTime, fullName } from "@/lib/patients";

// Self-contained: drop <RecentPatients /> on any staff page
export default function RecentPatients() {
  return (
    <Suspense fallback={null}>
      <RecentList />
    </Suspense>
  );
}

async function RecentList() {
  const session = await requireSession();
  const recent = await getRecentlyViewedPatients(session.userId);
  if (recent.length === 0) return null;

  return (
    <section className="mt-6">
      <p className="text-xs font-medium uppercase tracking-wider text-white/45">Recently viewed</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {recent.map((p) => (
          <Link
            key={p.id}
            href={`/patients/${p.id}`}
            title={`Viewed ${formatDateTime(p.viewedAt)}`}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm hover:bg-white/10"
          >
            <span className="font-medium">{fullName(p)}</span>{" "}
            <span className="font-mono text-xs text-white/45">{p.hospitalNumber}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
