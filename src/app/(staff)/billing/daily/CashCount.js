"use client";

import { useState } from "react";
import { formatNaira, nairaToKobo } from "@/lib/money";

// Count the drawer, type the total, see if it balances. Nothing is saved.
export default function CashCount({ expectedKobo }) {
  const [counted, setCounted] = useState("");
  const countedKobo = nairaToKobo(counted);
  const diff = countedKobo === null ? null : countedKobo - expectedKobo;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 print:hidden">
      <input
        value={counted}
        onChange={(e) => setCounted(e.target.value)}
        inputMode="decimal"
        placeholder="Cash you counted ₦"
        className="w-48 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none"
      />
      {diff !== null && (
        <span className={`text-sm font-semibold ${diff === 0 ? "text-white" : "text-red-200"}`}>
          {diff === 0 ? "Balanced ✓" : diff > 0 ? `Over by ${formatNaira(diff)}` : `Short by ${formatNaira(-diff)}`}
        </span>
      )}
    </div>
  );
}
