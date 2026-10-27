import { Suspense } from "react";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import AddStaffForm from "./AddStaffForm";
import StaffRow from "./StaffRow";

export default function StaffPage() {
  return (
    <Suspense fallback={<p className="text-sm text-white/50">Loading staff…</p>}>
      <StaffManager />
    </Suspense>
  );
}

async function StaffManager() {
  const admin = await requirePermission("staff.manage");

  const [staff, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ isActive: "desc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        role: { select: { id: true, name: true } },
      },
    }),
    prisma.role.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const rows = staff.map((s) => ({ ...s, lastLoginAt: s.lastLoginAt?.toISOString() ?? null }));
  const active = staff.filter((s) => s.isActive).length;

  return (
    <div className="max-w-6xl">
      <h1 className="text-3xl font-bold tracking-tight">Staff</h1>
      <p className="mt-1 text-sm text-white/60">
        {active} active · {staff.length - active} deactivated
      </p>

      <AddStaffForm roles={roles} />

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wider text-white/45">
            <tr>
              <th className="px-4 py-3 font-medium">Staff member</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last login</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((s) => (
              <StaffRow key={s.id} staff={s} roles={roles} isSelf={s.id === admin.userId} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
