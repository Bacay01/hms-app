import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { SITE } from "@/lib/site";
import { summariseSchedule, initials } from "@/lib/landing";

const SERVICES = [
  {
    title: "Consultations",
    text: "Book ahead or walk in. Your vitals, history and allergies are on the doctor's screen before you sit down.",
    image: "/images/dept-consultation.jpg",
  },
  {
    title: "Laboratory",
    text: "Samples are labelled at collection, results are checked by a second scientist, and go straight to your doctor.",
    image: "/images/dept-lab.jpg",
  },
  {
    title: "Pharmacy",
    text: "Your prescription reaches the pharmacy as your visit ends, checked for allergies and drug interactions.",
    image: "/images/dept-pharmacy.jpg",
  },
  {
    title: "Emergency & admission",
    text: "Emergency patients go to the front of the queue. Ward care, nursing notes and bed charges are tracked daily.",
    image: "/images/dept-emergency.jpg",
  },
];

const VISIT_STEPS = [
  ["Book or walk in", "Request a time online, or come in. Reception checks you in and gives you a queue number."],
  ["See the nurse", "Your blood pressure, temperature and weight are recorded and flagged if anything is off."],
  ["See the doctor", "One record follows you — past visits, results and prescriptions in one place."],
  ["Pay once, clearly", "Every test and drug is itemised on one bill. Pay by cash, POS, transfer or online. HMO and NHIA cover is applied for you."],
  ["Collect and go", "The lab and pharmacy see your payment instantly, so there's no running back and forth with paper."],
];

const eyebrow = "text-xs font-semibold uppercase tracking-widest text-accent";
const heading = "mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl";
const section = "scroll-mt-4 border-t border-white/10 px-6 py-20 sm:px-10";

export default function HomeSections() {
  return (
    <>
      <Services />
      <Suspense fallback={<CareTeamSkeleton />}>
        <CareTeam />
      </Suspense>
      <About />
      <Contact />
      <Footer />
    </>
  );
}

function Services() {
  return (
    <section id="services" className={section}>
      <div className="mx-auto max-w-6xl">
        <p className={eyebrow}>Services</p>
        <h2 className={heading}>Care that moves at your pace</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
          Every department works from the same record, so you tell your story once.
        </p>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <li key={s.title} className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
              <div className="relative aspect-[4/3]">
                <Image src={s.image} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
              </div>
              <div className="p-5">
                <h3 className="text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">{s.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Departments and doctors come from the same tables the staff app uses
async function CareTeam() {
  const [departments, doctors] = await Promise.all([
    prisma.department.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    }),
    prisma.user.findMany({
      where: { isActive: true, role: { name: "DOCTOR" } },
      orderBy: [{ lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        departmentId: true,
        department: { select: { name: true } },
        schedules: { select: { dayOfWeek: true, startTime: true, endTime: true }, orderBy: { dayOfWeek: "asc" } },
      },
    }),
  ]);

  const doctorCount = new Map();
  for (const d of doctors) if (d.departmentId) doctorCount.set(d.departmentId, (doctorCount.get(d.departmentId) ?? 0) + 1);

  return (
    <>
      <section id="departments" className={section}>
        <div className="mx-auto max-w-6xl">
          <p className={eyebrow}>Departments</p>
          <h2 className={heading}>Find the right clinic</h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {departments.map((d) => {
              const n = doctorCount.get(d.id) ?? 0;
              return (
                <li key={d.id} className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                  <h3 className="text-xl font-semibold text-white">{d.name}</h3>
                  {d.description && <p className="mt-2 flex-1 text-sm leading-relaxed text-white/65">{d.description}</p>}
                  <p className="mt-4 text-xs text-white/45">{n === 1 ? "1 doctor" : `${n} doctors`}</p>
                  <Link
                    href={`/book?department=${d.id}`}
                    className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
                  >
                    Book with {d.name.split(" ")[0]} <span aria-hidden="true">↗</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section id="doctors" className={section}>
        <div className="mx-auto max-w-6xl">
          <p className={eyebrow}>Doctors</p>
          <h2 className={heading}>When our doctors are in</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
            Clinic days are live from the hospital&apos;s own schedule — the same one reception books against.
          </p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((d) => {
              const lines = summariseSchedule(d.schedules);
              return (
                <li key={d.id} className="flex gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-semibold text-red-200">
                    {initials(d.firstName, d.lastName)}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">Dr {d.firstName} {d.lastName}</h3>
                    <p className="text-sm text-white/55">{d.department?.name ?? "General practice"}</p>
                    <ul className="mt-2 space-y-0.5 text-sm text-white/80">
                      {lines.length ? lines.map((l) => <li key={l}>{l}</li>) : <li className="text-white/45">Clinic days to be announced</li>}
                    </ul>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </>
  );
}

function CareTeamSkeleton() {
  return (
    <section id="departments" className={section} aria-busy="true">
      <div className="mx-auto max-w-6xl">
        <p className={eyebrow}>Departments</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-3xl border border-white/10 bg-white/[0.04]" />
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className={section}>
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className={eyebrow}>About</p>
          <h2 className={heading}>How a visit works</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/65 sm:text-base">
            {SITE.name} runs on one connected system: reception, nurses, doctors, the lab, the pharmacy, billing and
            the wards all see the same record, and each only sees what their role needs. Your details are kept under
            the Nigeria Data Protection Act 2023, and every look at your record is logged.
          </p>
        </div>
        <ol className="space-y-4">
          {VISIT_STEPS.map(([title, text], i) => (
            <li key={title} className="flex gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-sm font-bold text-black">{i + 1}</span>
              <div>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/65">{text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Contact() {
  const c = SITE.contact;
  return (
    <section id="contact" className={section}>
      <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 sm:p-12">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <p className={eyebrow}>Contact</p>
            <h2 className={heading}>Visit or get in touch</h2>
            {c.isDemo && (
              <p className="mt-3 inline-block rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                Demo hospital — these contact details are placeholders
              </p>
            )}
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-white/45">Address</dt>
                <dd className="mt-0.5 text-white">{c.address.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-white/45">Phone</dt>
                <dd className="mt-0.5 text-white">{c.phone}</dd>
              </div>
              <div>
                <dt className="text-white/45">Email</dt>
                <dd className="mt-0.5 text-white">{c.email}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Opening hours</h3>
            <dl className="mt-4 divide-y divide-white/10 text-sm">
              {c.hours.map(([what, when]) => (
                <div key={what} className="flex flex-wrap justify-between gap-2 py-3">
                  <dt className="text-white/65">{what}</dt>
                  <dd className="text-white">{when}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/book" className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover">
                Book an appointment
              </Link>
              <Link href="/login" className="rounded-full border border-white/20 px-6 py-3 text-sm text-white transition-colors hover:bg-white/10">
                Staff login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-8 text-xs text-white/45 sm:px-10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p>© {SITE.name} · Hospital management system portfolio project</p>
        <div className="flex gap-4">
          {SITE.nav.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-white">{item.label}</a>
          ))}
        </div>
      </div>
    </footer>
  );
}
