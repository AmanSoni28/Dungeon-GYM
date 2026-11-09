// Deterministic pseudo-random (same on server + client → no hydration mismatch)
// Integer-only hash: Math.sin can differ slightly between Node and browsers, which broke hydration.
export function rand(i: number) {
  let h = (Math.floor(i) + 0x9e3779b9) | 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  return Math.round(((h >>> 0) / 4294967296) * 10000) / 10000; // 4 decimals → identical strings everywhere
}

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const isTouch = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

export function scrollToTarget(href: string) {
  const el = document.querySelector(href) as HTMLElement | null;
  if (!el) return;
  if (window.__lenis) window.__lenis.scrollTo(el, { duration: 1.8 });
  else el.scrollIntoView({ behavior: "smooth" });
}

export function formatPrice(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}
