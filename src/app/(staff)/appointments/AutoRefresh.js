"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Keeps the queue in sync across every screen in the hospital
export default function AutoRefresh({ seconds = 20 }) {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);

  return null;
}
