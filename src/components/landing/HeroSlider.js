"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SLIDES = [
  {
    title: "Consultation",
    text: "See the right specialist faster with smart queueing.",
    image: "/images/dept-consultation.jpg",
  },
  {
    title: "Laboratory",
    text: "Test results sent straight to your doctor, no paper chase.",
    image: "/images/dept-lab.jpg",
  },
  {
    title: "Pharmacy",
    text: "Prescriptions ready the moment your consultation ends.",
    image: "/images/dept-pharmacy.jpg",
  },
  {
    title: "Emergency",
    text: "Round-the-clock care with instant access to records.",
    image: "/images/dept-emergency.jpg",
  },
];

const pad = (n) => String(n).padStart(2, "0");

export default function HeroSlider() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  useEffect(() => {
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <div className="w-full max-w-[290px]">
      <div className="rounded-2xl border border-white/15 bg-white/10 p-2 backdrop-blur-xl">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-white/5">
          {SLIDES.map((s, i) => (
            <Image
              key={s.image}
              src={s.image}
              alt={s.title}
              fill
              sizes="290px"
              className={`object-cover brightness-90 transition-opacity duration-700 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between px-1 pb-1 pt-3">
          <span className="text-xs tabular-nums text-white/80">
            {pad(index + 1)}/{pad(SLIDES.length)}
          </span>
          <div className="flex w-28 gap-1">
            {SLIDES.map((s, i) => (
              <button
                key={s.title}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show ${s.title}`}
                className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/25"
              >
                {i < index && <span className="absolute inset-0 bg-white" />}
                {i === index && (
                  <span key={index} className="absolute inset-y-0 left-0 animate-fill bg-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-4">
        <h3 className="text-2xl font-semibold text-white">{slide.title}</h3>
        <p className="max-w-[170px] text-xs leading-relaxed text-white/75">{slide.text}</p>
      </div>
    </div>
  );
}
