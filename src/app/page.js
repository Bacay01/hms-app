import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import HeroSlider from "@/components/landing/HeroSlider";
import RotatingBadge from "@/components/landing/RotatingBadge";
import AvatarStack from "@/components/landing/AvatarStack";
import { SITE } from "@/lib/site";

export default function Home() {
  return (
    <main className="min-h-dvh bg-black">
      <section className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-black">
        {/* Background */}
        <Image
          src="/images/hero.jpg"
          alt="Surgeons working under operating theatre lights"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[65%_center]"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/20 to-black/80" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/75 via-black/25 to-transparent" />

        <Navbar />

        {/* Middle */}
        <div className="flex flex-1 flex-col justify-center gap-10 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[56px]">
              Better Care Starts
              <br />
              With Better Systems
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
              {SITE.tagline}
            </p>

            <div id="book" className="mt-8 flex items-center gap-2">
              <Link
                href="/book"
                className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
              >
                Book an appointment
              </Link>
              <Link
                href="/book"
                aria-label="Book an appointment"
                className="group grid size-11 place-items-center rounded-full bg-accent text-lg text-white transition-colors hover:bg-accent-hover"
              >
                <span className="inline-block transition-transform group-hover:rotate-45">↗</span>
              </Link>
            </div>
          </div>

          <div className="hidden sm:block">
            <HeroSlider />
          </div>
        </div>

        {/* Bottom bar */}
        <div className="grid grid-cols-1 items-end gap-5 px-6 pb-6 sm:grid-cols-2 sm:px-10 md:grid-cols-3">
          <AvatarStack />

          <div className="hidden justify-center md:flex">
            <RotatingBadge />
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex items-center gap-3 text-xs text-white/75">
              <span>Follow us</span>
              {SITE.socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  className="font-semibold text-white/80 transition-colors hover:text-white"
                >
                  {s.short}
                </a>
              ))}
            </div>
            <a
              href={SITE.heroCredit.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-white/50 hover:text-white/80"
            >
              {SITE.heroCredit.text}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
