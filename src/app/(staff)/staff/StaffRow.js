"use client";

import { useActionState } from "react";
import { updateStaffRole, toggleStaffActive, resetStaffPassword } from "./actions";
import { formatRole } from "@/lib/nav";
import TempPassword from "@/components/staff/TempPassword";

const dateFormat = new Intl.DateTimeFormat("en-NG", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

const smallButton =
  "rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/80 transition-colors hover:bg-white/10 disabled:opacity-60";

export default function StaffRow({ staff, roles, isSelf }) {
  const [roleState, roleAction, rolePending] = useActionState(updateStaffRole, {});
  const [activeState, activeAction, activePending] = useActionState(toggleStaffActive, {});
  const [resetState, resetAction, resetPending] = useActionState(resetStaffPassword, {});
  const error = roleState?.error || activeState?.error || resetState?.error;

  return (
    <>
      <tr className={staff.isActive ? "" : "opacity-50"}>
        <td className="px-4 py-3">
          <p className="font-medium text-white">
            {staff.firstName} {staff.lastName}
            {isSelf && (
              <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">You</span>
            )}
          </p>
          <p className="text-xs text-white/50">{staff.email}</p>
        </td>

        <td className="px-4 py-3">
          <form action={roleAction} className="flex items-center gap-2">
            <input type="hidden" name="userId" value={staff.id} />
            <select
              name="roleId"
              defaultValue={staff.role.id}
              disabled={isSelf || rolePending}
              className="rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-xs text-white disabled:opacity-60"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id} className="bg-neutral-900">
                  {formatRole(r.name)}
                </option>
              ))}
            </select>
            {!isSelf && (
              <button disabled={rolePending} className={smallButton}>
                {rolePending ? "Saving…" : "Save"}
              </button>
            )}
          </form>
        </td>

        <td className="px-4 py-3">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              staff.isActive ? "bg-white/10 text-white" : "bg-accent/15 text-red-200"
            }`}
          >
            {staff.isActive ? "Active" : "Deactivated"}
          </span>
        </td>

        <td className="px-4 py-3 text-xs text-white/60">
          {staff.lastLoginAt ? dateFormat.format(new Date(staff.lastLoginAt)) : "Never"}
        </td>

        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <form action={resetAction}>
              <input type="hidden" name="userId" value={staff.id} />
              <button disabled={resetPending} className={smallButton}>
                {resetPending ? "Resetting…" : "Reset password"}
              </button>
            </form>
            {!isSelf && (
              <form action={activeAction}>
                <input type="hidden" name="userId" value={staff.id} />
                <button
                  disabled={activePending}
                  onClick={(e) => {
                    if (staff.isActive && !confirm(`Deactivate ${staff.firstName}? They will be logged out immediately.`)) {
                      e.preventDefault();
                    }
                  }}
                  className={
                    staff.isActive
                      ? "rounded-lg border border-accent/40 px-2.5 py-1.5 text-xs text-red-200 transition-colors hover:bg-accent/15 disabled:opacity-60"
                      : smallButton
                  }
                >
                  {activePending ? "…" : staff.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </form>
            )}
          </div>
        </td>
      </tr>

      {(error || resetState?.tempPassword) && (
        <tr>
          <td colSpan={5} className="px-4 pb-4">
            {error && (
              <p role="alert" className="rounded-xl border border-accent/40 bg-accent/15 px-4 py-2.5 text-sm text-red-100">
                {error}
              </p>
            )}
            {resetState?.tempPassword && (
              <TempPassword message={`Password reset for ${staff.firstName}.`} password={resetState.tempPassword} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}
