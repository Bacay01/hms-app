"use client";

import { useEffect } from "react";
import { IDLE_MINUTES } from "@/lib/config";

const EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"];

// Logs the user out after IDLE_MINUTES with no mouse, keyboard, scroll or touch
export default function IdleWatcher() {
  useEffect(() => {
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        window.location.href = "/logout?reason=idle";
      }, IDLE_MINUTES * 60 * 1000);
    };

    EVENTS.forEach((e) => window.addEventListener(e, reset, { passive: true, capture: true }));
    reset();

    return () => {
      clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, reset, { capture: true }));
    };
  }, []);

  return null;
}
