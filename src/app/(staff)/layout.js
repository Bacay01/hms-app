import { Suspense } from "react";
import StaffShell from "@/components/staff/StaffShell";
import IdleWatcher from "@/components/staff/IdleWatcher";
import { requireSession } from "@/lib/auth";

export default function StaffLayout({ children }) {
  return (
    <Suspense fallback={<div className="h-dvh bg-[#0a0a0a]" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

async function Shell({ children }) {
  const session = await requireSession();
  const user = {
    name: session.name,
    role: session.role,
    permissions: session.permissions ?? [],
  };
  return (
    <>
      <IdleWatcher />
      <StaffShell user={user}>{children}</StaffShell>
    </>
  );
}
