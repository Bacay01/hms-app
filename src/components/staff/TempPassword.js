"use client";

import { useState } from "react";

export default function TempPassword({ message, password }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-3 rounded-xl border border-white/15 bg-white/5 p-4 text-sm">
      {message && <p className="font-medium text-white">{message}</p>}
      <p className="mt-1 text-white/65">
        Temporary password — shown once only. Share it with them securely.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <code className="rounded-lg bg-black/40 px-3 py-1.5 font-mono text-white">{password}</code>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
