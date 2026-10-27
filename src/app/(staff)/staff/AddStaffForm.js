"use client";

import { useActionState, useState } from "react";
import { createStaff } from "./actions";
import { formatRole } from "@/lib/nav";
import TempPassword from "@/components/staff/TempPassword";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";

export default function AddStaffForm({ roles }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createStaff, {});
  const v = state?.values ?? {};

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-accent-hover"
      >
        Add staff
      </button>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Add staff member</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-white/60 hover:text-white"
        >
          Close
        </button>
      </div>

      <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input name="firstName" placeholder="First name" required defaultValue={v.firstName} className={input} />
        <input name="lastName" placeholder="Last name" required defaultValue={v.lastName} className={input} />
        <input name="email" type="email" placeholder="Email" required defaultValue={v.email} className={input} />
        <input name="phone" type="tel" placeholder="Phone (optional)" defaultValue={v.phone} className={input} />
        <select name="roleId" required defaultValue="" className={input}>
          <option value="" disabled className="bg-neutral-900">
            Select role
          </option>
          {roles.map((r) => (
            <option key={r.id} value={r.id} className="bg-neutral-900">
              {formatRole(r.name)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add staff member"}
        </button>
      </form>

      {state?.error && (
        <p role="alert" className="mt-3 rounded-xl border border-accent/40 bg-accent/15 px-4 py-2.5 text-sm text-red-100">
          {state.error}
        </p>
      )}
      {state?.tempPassword && <TempPassword message={state.success} password={state.tempPassword} />}
    </div>
  );
}
