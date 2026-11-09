// Virtual gym tour: data types + pure navigation logic (unit tested).
//
// Each stop is one real photo of the gym shown on a curved screen (see lib/gym/look.ts), or a true
// 360° panorama when one is supplied (kind "equirect"). Stops are connected by hotspots placed on
// things that are visible in the photo, so the visitor "walks" between zones.

import { DEG, SCREEN_RADIUS, type GymView } from "@/lib/gym/look";
import type { GymLookState } from "@/lib/gym/state";

export type TourHotspot = {
  /** id of the stop this hotspot leads to */
  to: string;
  /** position in the photo: 0..1 from the left edge / top edge */
  u: number;
  v: number;
};

export type TourStop = GymView & {
  /** "01", "02" … shown as ZONE 01 */
  zone: string;
  title: string;
  description: string;
  /** smaller image for phones / low-power devices */
  srcSmall?: string;
  thumb?: string;
  hotspots: TourHotspot[];
};

/**
 * Mutable look state shared by the controls and the 3D view (no React re-renders).
 * Compatible with the entrance's photo fallback; progress 0.42 = "mid exploration" (no scroll sweep).
 */
export type TourLook = GymLookState & { zoom: number };
export const createTourLook = (): TourLook => ({ progress: 0.42, dragYaw: 0, dragPitch: 0, lastInteraction: 0, zoom: 1 });

/* ── zones ── */

export const wrapIndex = (i: number, n: number) => ((i % n) + n) % n;
export const stopIndex = (stops: TourStop[], id: string) => stops.findIndex((s) => s.id === id);

/** Every stop that can be reached from `start` by following hotspots. */
export function reachableFrom(stops: TourStop[], start: string) {
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length) {
    const s = stops[stopIndex(stops, queue.shift()!)];
    s?.hotspots.forEach((h) => {
      if (!seen.has(h.to)) {
        seen.add(h.to);
        queue.push(h.to);
      }
    });
  }
  return seen;
}

/* ── hotspot geometry ── */

/** Direction (yaw, pitch in radians) of a point in the photo, as seen from the camera. */
export function hotspotAngles(h: Pick<TourHotspot, "u" | "v">, view: GymView) {
  if (view.kind === "equirect") {
    return { yaw: (0.5 - h.u) * Math.PI * 2, pitch: (0.5 - h.v) * Math.PI };
  }
  const yaw = (0.5 - h.u) * view.hfov * DEG; // positive yaw = left (three.js)
  const height = (SCREEN_RADIUS * view.hfov * DEG) / view.aspect;
  const y = (0.5 - h.v) * height;
  return { yaw, pitch: Math.atan2(y, SCREEN_RADIUS) };
}

/** 3D point on the photo screen for a hotspot (matches the screen geometry in PhotoScreen). */
export function hotspotPoint(h: Pick<TourHotspot, "u" | "v">, view: GymView, radius = SCREEN_RADIUS * 0.96): [number, number, number] {
  const { yaw, pitch } = hotspotAngles(h, view);
  if (view.kind === "equirect") {
    const c = Math.cos(pitch);
    return [-Math.sin(yaw) * c * radius, Math.sin(pitch) * radius, -Math.cos(yaw) * c * radius];
  }
  const height = (SCREEN_RADIUS * view.hfov * DEG) / view.aspect;
  const s = radius / SCREEN_RADIUS;
  return [-Math.sin(yaw) * radius, (0.5 - h.v) * height * s, -Math.cos(yaw) * radius];
}

/** Share of a full circle this stop really covers (for the 360° indicator). */
export function coverageDegrees(view: GymView) {
  return view.kind === "equirect" ? 360 : Math.round(view.hfov);
}

/* ── zoom ── */

export const ZOOM = { min: 1, max: 2.5, step: 0.25 } as const;
export const clampZoom = (z: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, Math.round(z * 1000) / 1000));

/* ── transitions ── */

export type TourPhase = "idle" | "out" | "in";

export type TourState = {
  index: number;
  /** stop we are travelling to while phase === "out" */
  target: number | null;
  phase: TourPhase;
  zoom: number;
  /** the current stop's image has loaded */
  ready: boolean;
};

export type TourAction =
  | { type: "go"; to: number; count: number }
  | { type: "swap" }
  | { type: "ready" }
  | { type: "settled" }
  | { type: "zoom"; by: number }
  | { type: "setZoom"; zoom: number }
  | { type: "reset" };

/** Phase timings (ms). "out": push toward the destination + fade to black; "in": reveal the new zone. */
export const TIMING = { out: 520, in: 700, reducedOut: 120, reducedIn: 150 } as const;

export const initialTourState = (index = 0): TourState => ({ index, target: null, phase: "in", zoom: 1, ready: false });

export function tourReducer(s: TourState, a: TourAction): TourState {
  switch (a.type) {
    case "go": {
      const to = wrapIndex(a.to, a.count);
      if (s.phase === "out" || to === s.index) return s; // one move at a time
      return { ...s, target: to, phase: "out" };
    }
    case "swap":
      if (s.phase !== "out" || s.target === null) return s;
      return { index: s.target, target: null, phase: "in", zoom: 1, ready: false };
    case "ready":
      return s.ready ? s : { ...s, ready: true };
    case "settled":
      return s.phase === "in" && s.ready ? { ...s, phase: "idle" } : s;
    case "zoom":
      return { ...s, zoom: clampZoom(s.zoom + a.by) };
    case "setZoom":
      return { ...s, zoom: clampZoom(a.zoom) };
    case "reset":
      return { ...s, zoom: 1 };
  }
}

/* ── keyboard ── */

export type TourKeyAction =
  | "left"
  | "right"
  | "up"
  | "down"
  | "zoomIn"
  | "zoomOut"
  | "next"
  | "prev"
  | "reset"
  | "fullscreen"
  | "exit";

const KEYS: Record<string, TourKeyAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  "+": "zoomIn",
  "=": "zoomIn",
  "-": "zoomOut",
  _: "zoomOut",
  PageDown: "next",
  n: "next",
  N: "next",
  PageUp: "prev",
  p: "prev",
  P: "prev",
  r: "reset",
  R: "reset",
  f: "fullscreen",
  F: "fullscreen",
  Escape: "exit",
};

export const keyToAction = (key: string): TourKeyAction | null => KEYS[key] ?? null;
