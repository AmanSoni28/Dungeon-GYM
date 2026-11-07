"use client";

import Lenis from "lenis";
import { createContext, useContext, useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/utils";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

type AppState = { loaded: boolean; setLoaded: (v: boolean) => void };
const AppContext = createContext<AppState>({ loaded: false, setLoaded: () => {} });
export const useApp = () => useContext(AppContext);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);

  // Smooth scrolling (Lenis) driven by the GSAP ticker so ScrollTrigger stays perfectly in sync
  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    if (prefersReducedMotion()) return;
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
    window.__lenis = lenis;
    lenis.stop(); // locked until the preloader finishes
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.classList.add("is-loaded");
    window.__lenis?.start();
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [loaded]);

  return <AppContext.Provider value={{ loaded, setLoaded }}>{children}</AppContext.Provider>;
}
