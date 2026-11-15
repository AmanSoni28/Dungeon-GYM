import { useEffect, useState } from "react";

// Kept free of three.js imports: the sections that use this stay in the main bundle, the 3D code does not.

type AthleteModule = { preloadAthlete: () => void };

/**
 * Once the page has finished loading and the browser is idle, fetch the 3D athlete's code chunk, model and textures in
 * the background, so he is ready by the time his section scrolls into view. Skipped when the visitor asked to save
 * data. `load` must be a stable (module-level) function, e.g. `() => import("./RopePuller")`.
 *
 * Returns `warm`: true one more idle slot after the preload, so the section can mount its (paused) canvas then.
 * Creating a WebGL context and building its environment takes a few ms on a quiet GPU, but stalls for
 * hundreds of ms when done mid-scroll while the other effects keep the GPU busy.
 */
export function usePreloadAthleteWhenIdle(load: () => Promise<AthleteModule>) {
  const [warm, setWarm] = useState(false);
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;
    let cancelled = false;
    let idle = 0;
    let timer = 0;
    const go = () => {
      if (cancelled) return;
      load()
        .then((m) => {
          m.preloadAthlete();
          if (cancelled) return;
          if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(() => !cancelled && setWarm(true), { timeout: 4000 });
          else timer = window.setTimeout(() => !cancelled && setWarm(true), 1500);
        })
        .catch(() => {});
    };
    const schedule = () => {
      if (cancelled) return;
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(go, { timeout: 2500 });
      else timer = window.setTimeout(go, 300);
    };
    // Don't compete with the opening: the FBX parse and the WebGL context are long main-thread tasks, and landing
    // them under the preloader or the landing reveal made both stutter. Wait until the homepage is revealed
    // (html.is-loaded) and its entrance has played; the long pinned gate + 360° gym come first, so there is still
    // plenty of time before these sections are reached (and a section reached early mounts on its own anyway).
    const ENTRANCE_MS = 2800;
    let mo: MutationObserver | null = null;
    const afterReveal = () => {
      timer = window.setTimeout(schedule, ENTRANCE_MS);
    };
    const waitForReveal = () => {
      if (document.documentElement.classList.contains("is-loaded")) return afterReveal();
      mo = new MutationObserver(() => {
        if (!document.documentElement.classList.contains("is-loaded")) return;
        mo?.disconnect();
        mo = null;
        afterReveal();
      });
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    };
    if (document.readyState === "complete") waitForReveal();
    else window.addEventListener("load", waitForReveal, { once: true });
    return () => {
      cancelled = true;
      mo?.disconnect();
      window.removeEventListener("load", waitForReveal);
      if (idle) window.cancelIdleCallback?.(idle);
      window.clearTimeout(timer);
    };
  }, [load]);
  return warm;
}
