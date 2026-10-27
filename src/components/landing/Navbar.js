"use client";

import Link from "next/link";
import { useState } from "react";
import { SITE } from "@/lib/site";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-10">
      <Link href="/" className="text-lg font-semibold tracking-tight text-white">
        {SITE.name}
      </Link>

      <nav className="hidden items-center gap-8 md:flex">
        {SITE.nav.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="text-[13px] text-white/70 transition-colors hover:text-white"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="hidden rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-medium text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:inline-block"
        >
          Staff login
        </Link>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle menu"
          className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-md md:hidden"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-4 top-full space-y-1 rounded-2xl border border-white/10 bg-black/75 p-3 backdrop-blur-xl md:hidden">
          {SITE.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/login"
            className="mt-2 block rounded-full bg-white/10 px-3 py-2 text-center text-sm font-medium text-white"
          >
            Staff login
          </Link>
        </div>
      )}
    </header>
  );
}
