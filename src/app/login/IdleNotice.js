"use client";

import { useSearchParams } from "next/navigation";
import { IDLE_MINUTES } from "@/lib/config";

export default function IdleNotice() {
  const reason = useSearchParams().get("reason");
  if (reason !== "idle") return null;

  return (
    <p className="mb-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white/85 backdrop-blur-xl">
      You were logged out after {IDLE_MINUTES} minutes of inactivity. Please sign in again.
    </p>
  );
}
