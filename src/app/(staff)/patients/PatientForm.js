"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { BLOOD_GROUPS, GENOTYPES, SEX_OPTIONS } from "@/lib/patients";

const input =
  "w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-white/40 focus:outline-none";

function Section({ title, children }) {
  return (
    <fieldset className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <legend className="px-1 text-sm font-semibold text-white">{title}</legend>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

function Field({ label, required, wide, children }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-white/75">
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      {children}
    </label>
  );
}

export default function PatientForm({ action, defaults = {}, submitLabel, cancelHref, today, isEdit = false }) {
  const [state, formAction, pending] = useActionState(action, {});
  const d = defaults;

  // Submit manually so React doesn't auto-reset the form on validation errors
  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Section title="Personal details">
        <Field label="First name" required>
          <input name="firstName" required defaultValue={d.firstName ?? ""} className={input} />
        </Field>
        <Field label="Last name" required>
          <input name="lastName" required defaultValue={d.lastName ?? ""} className={input} />
        </Field>
        <Field label="Other names">
          <input name="otherNames" defaultValue={d.otherNames ?? ""} className={input} />
        </Field>
        <Field label="Date of birth" required>
          <input
            name="dateOfBirth"
            type="date"
            required
            max={today}
            defaultValue={d.dateOfBirth ?? ""}
            className={`${input} [color-scheme:dark]`}
          />
        </Field>
        <Field label="Sex" required>
          <select name="sex" required defaultValue={d.sex ?? ""} className={input}>
            <option value="" disabled className="bg-neutral-900">Select</option>
            {SEX_OPTIONS.map((s) => (
              <option key={s.value} value={s.value} className="bg-neutral-900">{s.label}</option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Contact">
        <Field label="Phone" required>
          <input name="phone" type="tel" required placeholder="0803 123 4567" defaultValue={d.phone ?? ""} className={input} />
        </Field>
        <Field label="Email">
          <input name="email" type="email" defaultValue={d.email ?? ""} className={input} />
        </Field>
        <Field label="Address" wide>
          <input name="address" defaultValue={d.address ?? ""} className={input} />
        </Field>
      </Section>

      <Section title="Next of kin">
        <Field label="Name">
          <input name="nextOfKinName" defaultValue={d.nextOfKinName ?? ""} className={input} />
        </Field>
        <Field label="Phone">
          <input name="nextOfKinPhone" type="tel" defaultValue={d.nextOfKinPhone ?? ""} className={input} />
        </Field>
        <Field label="Relationship">
          <input name="nextOfKinRelation" placeholder="e.g. Spouse, Parent" defaultValue={d.nextOfKinRelation ?? ""} className={input} />
        </Field>
      </Section>

      <Section title="Medical basics">
        <Field label="Blood group">
          <select name="bloodGroup" defaultValue={d.bloodGroup ?? ""} className={input}>
            <option value="" className="bg-neutral-900">Unknown</option>
            {BLOOD_GROUPS.map((g) => (
              <option key={g} value={g} className="bg-neutral-900">{g}</option>
            ))}
          </select>
        </Field>
        <Field label="Genotype">
          <select name="genotype" defaultValue={d.genotype ?? ""} className={input}>
            <option value="" className="bg-neutral-900">Unknown</option>
            {GENOTYPES.map((g) => (
              <option key={g} value={g} className="bg-neutral-900">{g}</option>
            ))}
          </select>
        </Field>
        <Field label="Allergies" wide>
          <textarea
            name="allergies"
            rows={2}
            placeholder="e.g. Penicillin, peanuts — leave blank if none known"
            defaultValue={d.allergies ?? ""}
            className={input}
          />
        </Field>
      </Section>

      {!isEdit && (
        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/80">
          <input name="consent" type="checkbox" required className="mt-0.5 size-4 accent-[#e5262a]" />
          <span>
            The patient (or their guardian) consents to {""}
            <span className="font-medium text-white">their personal and medical information being stored</span> and
            used for their care, in line with the Nigeria Data Protection Act 2023.
          </span>
        </label>
      )}

      {state?.error && (
        <p role="alert" className="rounded-xl border border-accent/40 bg-accent/15 px-4 py-3 text-sm text-red-100">
          {state.error}{" "}
          {state.duplicateId && (
            <Link href={`/patients/${state.duplicateId}`} className="font-semibold underline">
              View existing record
            </Link>
          )}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/10"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
