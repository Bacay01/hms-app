import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import ComingSoon from "@/components/staff/ComingSoon";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Guarded />
    </Suspense>
  );
}

async function Guarded() {
  await requirePermission("reports.read");
  return <ComingSoon title="Reports" phase="Phase 8" />;
}
