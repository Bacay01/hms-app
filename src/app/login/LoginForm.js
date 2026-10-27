"use client";

import { useActionState, useState } from "react";
import { login } from "./actions";

const DEMO_PASSWORD = "Password123!";
const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@hms.test" },
  { role: "Receptionist", email: "reception@hms.test" },
  { role: "Doctor", email: "doctor@hms.test" },
  { role: "Nurse", email: "nurse@hms.test" },
  { role: "Lab scientist", email: "lab@hms.test" },
  { role: "Pharmacist", email: "pharmacy@hms.test" },
  { role: "Cashier", email: "cashier@hms.test" },
  { role: "HMO officer", email: "hmo@hms.test" },
];

const inputClass =
  "w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-white/40 transition-colors focus:border-white/40 focus:outline-none";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function fillDemo(account) {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
  }

  return (
    <div className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl sm:p-8">
      <h1 className="text-2xl font-semibold text-white">Staff login</h1>
      <p className="mt-1 text-sm text-white/70">
        Sign in to access the hospital system.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-white/80">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@hospital.com"
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-white/80">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={`${inputClass} pr-16`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 right-3 my-auto h-fit rounded-md px-2 py-1 text-xs text-white/70 hover:text-white"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {state?.error && (
          <p
            role="alert"
            className="rounded-xl border border-accent/40 bg-accent/15 px-4 py-2.5 text-sm text-red-100"
          >
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <details className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
        <summary className="cursor-pointer text-xs font-medium text-white/80">
          Demo accounts — click a role to fill the form
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => fillDemo(a)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            >
              {a.role}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
