import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import LoginForm from "./LoginForm";
import IdleNotice from "./IdleNotice";
import { SITE } from "@/lib/site";

export const metadata = {
  title: `Staff login — ${SITE.name}`,
};

export default function LoginPage() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col bg-black">
      <Image
        src="/images/hero.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[65%_center]"
      />
      <div className="absolute inset-0 -z-10 bg-black/70" />

      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          {SITE.name}
        </Link>
        <Link href="/" className="text-sm text-white/70 transition-colors hover:text-white">
          ← Back to home
        </Link>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10 lg:justify-between lg:px-10">
        <div className="hidden max-w-md lg:block">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Staff portal</p>
          <h2 className="mt-3 text-4xl font-bold leading-[1.1] tracking-tight text-white">
            Every department,
            <br />
            one secure login.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/75">
            Reception, doctors, nurses, lab, pharmacy and billing — each role sees only what it needs.
          </p>
        </div>

        <div className="w-full max-w-md">
          <Suspense fallback={null}>
            <IdleNotice />
          </Suspense>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
