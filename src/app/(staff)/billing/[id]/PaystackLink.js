"use client";

import { startTransition, useActionState, useState } from "react";
import { checkPaystackStatus, createPaystackLink } from "../paystack-actions";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";
const STATUS_STYLE = { PENDING: "text-white/60", SUCCESS: "text-white", FAILED: "text-red-200" };

function LinkRow({ link }) {
  const [state, action, pending] = useActionState(checkPaystackStatus, {});
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
      <div>
        <p className="font-mono text-xs">{link.reference}</p>
        <p className="text-xs text-white/50">
          {link.amountText} · {link.createdAt} · <span className={STATUS_STYLE[link.status]}>{link.status.toLowerCase()}</span>
          {link.channel ? ` · ${link.channel}` : ""}
        </p>
        {state?.message && <p className="text-xs text-white/70">{state.message}</p>}
      </div>
      {link.status === "PENDING" && (
        <form action={action}>
          <input type="hidden" name="reference" value={link.reference} />
          <button disabled={pending} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10 disabled:opacity-60">
            {pending ? "Checking…" : "Check status"}
          </button>
        </form>
      )}
    </li>
  );
}

export default function PaystackLink({ billId, balanceKobo, configured, links }) {
  const [state, formAction, pending] = useActionState(createPaystackLink.bind(null, billId), {});
  const [copied, setCopied] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const whatsapp = state?.link
    ? `https://wa.me/?text=${encodeURIComponent(`Please pay ${state.amountText} for your hospital visit here: ${state.link}`)}`
    : null;

  return (
    <div className="space-y-4">
      {!configured ? (
        <p className="text-sm text-white/55">Set PAYMENT_GATEWAY and APP_URL in .env, then restart, to take online payments.</p>
      ) : balanceKobo > 0 ? (
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-2">
          <input name="email" type="email" placeholder="Patient email (optional, for the gateway's receipt)" className={`${input} flex-1`} />
          <button disabled={pending} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold hover:bg-accent-hover disabled:opacity-60">
            {pending ? "Creating…" : "Create payment link"}
          </button>
        </form>
      ) : null}

      {state?.error && <p className="text-sm text-red-200">{state.error}</p>}

      {state?.link && (
        <div className="space-y-2 rounded-xl border border-white/15 bg-black/20 p-3 text-sm">
          <p className="text-white/70">Link for {state.amountText}:</p>
          <p className="break-all font-mono text-xs">{state.link}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(state.link).then(() => setCopied(true))}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <a href={state.link} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10">
              Open checkout
            </a>
            <a href={whatsapp} target="_blank" rel="noreferrer" className="rounded-lg border border-white/15 px-3 py-1.5 text-xs hover:bg-white/10">
              Send on WhatsApp
            </a>
          </div>
        </div>
      )}

      {links.length > 0 && (
        <ul className="divide-y divide-white/5">
          {links.map((l) => (
            <LinkRow key={l.reference} link={l} />
          ))}
        </ul>
      )}
    </div>
  );
}
