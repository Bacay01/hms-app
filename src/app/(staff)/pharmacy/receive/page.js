import { Suspense } from "react";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { localDate } from "@/lib/time";
import ReceiveForm from "./ReceiveForm";

export default function ReceivePage({ searchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading…</p>}>
      <Receive searchParams={searchParams} />
    </Suspense>
  );
}

async function Receive({ searchParams }) {
  await requirePermission("inventory.manage");
  const { drug = "" } = await searchParams;

  return (
    <div className="max-w-2xl">
      <Link href="/pharmacy/stock" className="text-sm text-white/60 hover:text-white">← Stock</Link>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Receive stock</h1>
      <p className="mt-1 text-sm text-white/60">Record a delivery, one batch at a time. Expired batches can&apos;t be received.</p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
        <ReceiveForm defaultDrugId={String(drug) || null} today={localDate()} />
      </div>
    </div>
  );
}
