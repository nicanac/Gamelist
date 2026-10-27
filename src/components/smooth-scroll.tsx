"use client";

import Lenis from "lenis";
import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/hooks/use-media-query";

const LenisContext = createContext<RefObject<Lenis | null>>({ current: null });

/** Ref to the page's Lenis instance (`null` when smooth scrolling is off). Read it in handlers. */
export function useLenisRef(): RefObject<Lenis | null> {
  return useContext(LenisContext);
}

/** Scrolls to an element or offset, smoothly when Lenis is running. */
export function scrollToTarget(lenis: Lenis | null, target: string | HTMLElement | number, offset = 0) {
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.4 });
    return;
  }
  const element = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  const top =
    typeof element === "number" ? element : element ? element.getBoundingClientRect().top + window.scrollY : 0;
  window.scrollTo({ top: top + offset, behavior: "smooth" });
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (reducedMotion) return;
    const lenis = new Lenis({ autoRaf: false, lerp: 0.11, wheelMultiplier: 0.9 });
    const tick = (time: number) => lenis.raf(time * 1000);
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    lenisRef.current = lenis;
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [reducedMotion]);

  return <LenisContext.Provider value={lenisRef}>{children}</LenisContext.Provider>;
}
