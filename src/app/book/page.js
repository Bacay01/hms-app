import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";
import { localDate, shiftDate } from "@/lib/time";
import { MAX_DAYS_AHEAD } from "@/lib/bookingRequest";
import BookingForm from "./BookingForm";

export const metadata = {
  title: `Book an appointment — ${SITE.name}`,
  description: "Request an appointment and our front desk will call you to confirm a time.",
};

export default function BookPage() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col bg-black">
      <Image src="/images/hero.jpg" alt="" fill priority sizes="100vw" className="-z-20 object-cover object-[65%_center]" />
      <div className="absolute inset-0 -z-10 bg-black/75" />

      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          {SITE.name}
        </Link>
        <Link href="/" className="text-sm text-white/70 transition-colors hover:text-white">
          ← Back to home
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10 lg:justify-between lg:gap-16 lg:px-10">
        <div className="hidden max-w-md lg:block">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Appointments</p>
          <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight text-white">
            Tell us when suits you.
            <br />
            We&apos;ll call to confirm.
          </h2>
          <ol className="mt-6 space-y-3 text-sm text-white/75">
            <li><span className="font-semibold text-white">1.</span> Send your request — it takes a minute.</li>
            <li><span className="font-semibold text-white">2.</span> Our front desk calls you, usually within one working day.</li>
            <li><span className="font-semibold text-white">3.</span> You get an SMS reminder the day before your visit.</li>
          </ol>
          <p className="mt-6 text-sm text-white/60">
            For an emergency, don&apos;t wait for a call back — come straight to the hospital.
          </p>
        </div>

        <div className="w-full max-w-md">
          <Suspense fallback={<div className="h-[640px] rounded-3xl border border-white/15 bg-white/10" />}>
            <Form />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function Form() {
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const today = localDate();
  return <BookingForm departments={departments} minDate={today} maxDate={shiftDate(today, MAX_DAYS_AHEAD)} />;
}
