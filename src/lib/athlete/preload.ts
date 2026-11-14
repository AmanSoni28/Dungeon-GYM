import { useEffect } from "react";

// Kept free of three.js imports: the sections that use this stay in the main bundle, the 3D code does not.

type AthleteModule = { preloadAthlete: () => void };

/**
 * Once the page has finished loading and the browser is idle, fetch the 3D athlete's code chunk, model and textures in
 * the background, so he is ready by the time his section scrolls into view. Skipped when the visitor asked to save
 * data. `load` must be a stable (module-level) function, e.g. `() => import("./RopePuller")`.
 */
export function usePreloadAthleteWhenIdle(load: () => Promise<AthleteModule>) {
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;
    let cancelled = false;
    let idle = 0;
    let timer = 0;
    const go = () => {
      if (!cancelled) load().then((m) => m.preloadAthlete()).catch(() => {});
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(go, { timeout: 3000 });
      else timer = window.setTimeout(go, 1200);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", schedule);
      if (idle) window.cancelIdleCallback?.(idle);
      window.clearTimeout(timer);
    };
  }, [load]);
}
