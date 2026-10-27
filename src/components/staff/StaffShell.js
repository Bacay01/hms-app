"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/login/actions";
import { navForPermissions, formatRole } from "@/lib/nav";
import { SITE } from "@/lib/site";

export default function StaffShell({ user, children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const groups = navForPermissions(user.permissions);
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-dvh bg-[#0a0a0a] text-white">
      {open && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-[#0f0f0f] transition-transform lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center px-6">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            {SITE.name}
          </Link>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-accent/15 text-white ring-1 ring-inset ring-accent/30"
                          : "text-white/65 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      {item.label}
                      {active && <span className="size-1.5 rounded-full bg-accent" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4 text-[11px] text-white/40">
          Demo system · Portfolio project
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 bg-[#0a0a0a]/80 px-4 backdrop-blur-xl lg:px-8">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm lg:hidden"
          >
            Menu
          </button>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-white/50">{formatRole(user.role)}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-accent text-xs font-semibold">
              {initials}
            </span>
            <form action={logout}>
              <button className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                Log out
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
