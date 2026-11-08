"use client";

import "@/styles/tour.css";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Move, RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DEG } from "@/lib/gym/look";
import { readEnvironment } from "@/lib/intro/capabilities";
import {
  coverageDegrees,
  createTourLook,
  hotspotAngles,
  initialTourState,
  keyToAction,
  stopIndex,
  TIMING,
  tourReducer,
  ZOOM,
  type TourHotspot,
  type TourStop,
} from "@/lib/tour/tour";
import { GymPhotoFallback } from "@/components/gym/GymPhotoFallback";
import { ViewerBoundary } from "@/components/gym/ViewerBoundary";

const TourViewer = dynamic(() => import("./TourViewer"), { ssr: false, loading: () => null });

export type TourMode = "full" | "lite" | "fallback";

export type VirtualTourProps = {
  stops: TourStop[];
  open: boolean;
  /** zone to open on */
  startIndex?: number;
  onClose: () => void;
  /** testing / previews: skip capability detection */
  forceMode?: TourMode;
};

const DRAG_X = 0.0032; // radians per pixel
const DRAG_Y = 0.0026;
const KEY_STEP = 0.07;
const pad2 = (n: number) => String(n).padStart(2, "0");
const noop = () => {};

/**
 * Full-screen virtual tour of the real gym: zones connected by hotspots, drag / touch / keyboard
 * look-around, zoom, fullscreen and cinematic transitions. Reusable: give it any list of stops.
 */
export function VirtualTour(props: VirtualTourProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<AnimatePresence>{props.open && <TourOverlay key="vt" {...props} />}</AnimatePresence>, document.body);
}

function TourOverlay({ stops, startIndex = 0, onClose, forceMode }: VirtualTourProps) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const compass = useRef<HTMLDivElement>(null);
  const look = useRef(createTourLook());
  const push = useRef(1);
  const hotspotEls = useRef<(HTMLElement | null)[]>([]);
  const [mode, setMode] = useState<TourMode | null>(forceMode ?? null);
  const [reduced, setReduced] = useState(false);
  const [state, dispatch] = useReducer(tourReducer, startIndex, initialTourState);
  const [interacted, setInteracted] = useState(false);
  const [isFs, setIsFs] = useState(false);
  const [fsSupported, setFsSupported] = useState(false);
  const count = stops.length;
  const stop = stops[state.index];
  const cov = coverageDegrees(stop);

  // capability detection (client only)
  useEffect(() => {
    const env = readEnvironment();
    setReduced(env.reducedMotion);
    setFsSupported(!!document.fullscreenEnabled && typeof root.current?.requestFullscreen === "function");
    if (!forceMode) setMode(!env.webgl ? "fallback" : env.mobile || env.lowPower ? "lite" : "full");
  }, [forceMode]);

  // modal behaviour: lock page scroll, focus the viewer, restore everything on exit
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    document.documentElement.classList.add("vt-open");
    window.__lenis?.stop();
    stage.current?.focus({ preventScroll: true });
    return () => {
      document.documentElement.classList.remove("vt-open");
      window.__lenis?.start();
      if (document.fullscreenElement) document.exitFullscreen?.().catch(noop);
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    const onFs = () => setIsFs(!!root.current && document.fullscreenElement === root.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // transition choreography: out (push + fade) → swap zone → in (reveal once the photo is loaded)
  const timing = reduced ? { out: TIMING.reducedOut, in: TIMING.reducedIn } : { out: TIMING.out, in: TIMING.in };
  useEffect(() => {
    push.current = state.phase === "out" || !state.ready ? 1 : 0;
    if (state.phase === "out") {
      const id = setTimeout(() => dispatch({ type: "swap" }), timing.out);
      return () => clearTimeout(id);
    }
    if (state.phase === "in" && state.ready) {
      const id = setTimeout(() => dispatch({ type: "settled" }), timing.in);
      return () => clearTimeout(id);
    }
  }, [state.phase, state.ready, timing.out, timing.in]);

  // arriving in a zone: look straight ahead
  useEffect(() => {
    look.current.dragYaw = 0;
    look.current.dragPitch = 0;
  }, [state.index]);
  useEffect(() => {
    look.current.zoom = state.zoom;
  }, [state.zoom]);
  // the photo fallback has no texture to wait for
  useEffect(() => {
    if (mode === "fallback") dispatch({ type: "ready" });
  }, [mode, state.index]);

  const onReady = useCallback(() => dispatch({ type: "ready" }), []);
  const toFallback = useCallback(() => setMode("fallback"), []);
  const onLook = useCallback((yaw: number, viewHFov: number) => {
    const el = compass.current;
    if (!el) return;
    el.style.setProperty("--yaw", `${(-yaw / DEG).toFixed(2)}deg`);
    el.style.setProperty("--view", (viewHFov / DEG).toFixed(1));
  }, []);

  /* ── actions ── */
  const touch = () => {
    look.current.lastInteraction = performance.now();
    if (!interacted) setInteracted(true);
  };
  const go = (to: number) => dispatch({ type: "go", to, count });
  const next = () => go(state.index + 1);
  const prev = () => go(state.index - 1);
  const zoomBy = (by: number) => dispatch({ type: "zoom", by });
  const reset = () => {
    look.current.dragYaw = 0;
    look.current.dragPitch = 0;
    dispatch({ type: "reset" });
  };
  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(noop);
    else Promise.resolve(root.current?.requestFullscreen?.()).catch(noop);
  };
  const goHotspot = (h: TourHotspot) => {
    const i = stopIndex(stops, h.to);
    if (i < 0) return;
    // turn toward the hotspot while pushing in: you walk the way you clicked
    const a = hotspotAngles(h, stop);
    look.current.dragYaw = a.yaw;
    look.current.dragPitch = a.pitch - (stop.pitch ?? 0) * DEG;
    touch();
    go(i);
  };

  /* ── drag, pinch, wheel ── */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d0: number; z0: number } | null>(null);
  const spread = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y) || 1;
  };
  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) pinch.current = { d0: spread(), z0: look.current.zoom };
    touch();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = pointers.current.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (pinch.current && pointers.current.size >= 2) {
      dispatch({ type: "setZoom", zoom: (pinch.current.z0 * spread()) / pinch.current.d0 });
      return;
    }
    const z = look.current.zoom;
    look.current.dragYaw += (dx * DRAG_X) / z;
    look.current.dragPitch += (dy * DRAG_Y) / z;
    look.current.lastInteraction = performance.now();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    if (e.deltaY === 0) return;
    zoomBy(e.deltaY < 0 ? ZOOM.step / 2 : -ZOOM.step / 2);
  };

  /* ── keyboard ── */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const action = keyToAction(e.key);
    if (!action) return;
    e.preventDefault();
    const z = look.current.zoom;
    switch (action) {
      case "left":
        look.current.dragYaw += KEY_STEP / z;
        return touch();
      case "right":
        look.current.dragYaw -= KEY_STEP / z;
        return touch();
      case "up":
        look.current.dragPitch += KEY_STEP / z;
        return touch();
      case "down":
        look.current.dragPitch -= KEY_STEP / z;
        return touch();
      case "zoomIn":
        return zoomBy(ZOOM.step);
      case "zoomOut":
        return zoomBy(-ZOOM.step);
      case "next":
        return next();
      case "prev":
        return prev();
      case "reset":
        return reset();
      case "fullscreen":
        return toggleFullscreen();
      case "exit":
        if (document.fullscreenElement) return toggleFullscreen();
        return onClose();
    }
  };

  const nearby = stop.hotspots
    .map((h) => ({ h, dest: stops[stopIndex(stops, h.to)] }))
    .filter((n): n is { h: TourHotspot; dest: TourStop } => !!n.dest);
  const fadeIn = reduced ? 0.15 : 0.6;
  const dark = state.phase === "out" || !state.ready;

  return (
    <motion.div
      ref={root}
      className={`vt ${state.phase !== "idle" ? "is-moving" : ""} ${reduced ? "is-reduced" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Dungeon Gym virtual tour"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: fadeIn, ease: [0.22, 1, 0.36, 1] }}
      onKeyDown={onKeyDown}
    >
      <div
        ref={stage}
        className="vt__stage"
        tabIndex={0}
        role="application"
        aria-roledescription="virtual tour viewer"
        aria-label={`Zone ${stop.zone}, ${stop.title}. Drag or use the arrow keys to look around, plus and minus to zoom.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        data-cursor="Drag"
      >
        {(mode === "full" || mode === "lite") && (
          <ViewerBoundary onError={toFallback}>
            <TourViewer
              stop={stop}
              look={look}
              push={push}
              hotspots={hotspotEls}
              lite={mode === "lite"}
              onReady={onReady}
              onLook={onLook}
              onLost={toFallback}
            />
          </ViewerBoundary>
        )}
        {mode === "fallback" && (
          <div className="vt__fallback" style={{ transform: `scale(${state.zoom})` }}>
            <GymPhotoFallback key={stop.id} view={{ ...stop, src: stop.srcSmall ?? stop.src }} look={look} onLook={noop} />
          </div>
        )}
      </div>

      {/* hotspots: real DOM buttons (focusable), positioned by the 3D view over their spot in the photo */}
      {mode !== "fallback" && (
        <div className="vt__hotspots">
          {stop.hotspots.map((h, i) => {
            const dest = stops[stopIndex(stops, h.to)];
            if (!dest) return null;
            return (
              <button
                key={`${stop.id}-${h.to}-${i}`}
                ref={(el) => {
                  hotspotEls.current[i] = el;
                }}
                type="button"
                className="vt-hotspot"
                onClick={() => goHotspot(h)}
                aria-label={`Go to Zone ${dest.zone}: ${dest.title}`}
                data-cursor=""
              >
                <span className="vt-hotspot__dot" aria-hidden />
                <span className="vt-hotspot__label" aria-hidden>
                  <b>Zone {dest.zone}</b> {dest.title}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="vt__vignette" aria-hidden />
      <div className="vt__grain" aria-hidden />
      <div className={`vt__fade ${dark ? "is-dark" : ""}`} aria-hidden />
      <div className={`vt__loader ${state.ready ? "" : "is-on"}`} role="status">
        <span className="vt__ring" aria-hidden />
        <span className="vt__loader-text">{state.ready ? "" : `Entering Zone ${stop.zone}`}</span>
      </div>

      <header className="vt__top">
        <p className="vt__brand">
          <span className="gold-text">Dungeon</span> Virtual Tour
        </p>
        <div className="vt__top-right">
          <div
            ref={compass}
            className="vt__compass glass"
            style={{ "--cov": cov } as React.CSSProperties}
            title={cov === 360 ? "Full 360° panorama" : `This photo covers ${cov}° of the full 360° circle`}
          >
            <span className="vt__dial" aria-hidden>
              <i className="vt__dial-cone" />
            </span>
            <span className="vt__compass-text">
              <b>{cov === 360 ? "360°" : `${cov}°`}</b>
              {cov === 360 ? "Full panorama" : "of 360° captured"}
            </span>
          </div>
          <button type="button" className="vt__exit glass" onClick={onClose} aria-label="Exit tour" data-cursor="">
            <X aria-hidden />
            <span>Exit</span>
          </button>
        </div>
      </header>

      <p className="sr-only" aria-live="polite">
        Zone {stop.zone} of {pad2(count)}: {stop.title}. {stop.description}
      </p>

      <AnimatePresence mode="wait" initial={false}>
        <motion.section
          key={stop.id}
          className="vt__info glass"
          aria-label="Current zone"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: reduced ? 0.1 : 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="vt__zone">
            Zone {stop.zone} <span>/ {pad2(count)}</span>
          </p>
          <h2 className="vt__title">{stop.title}</h2>
          <p className="vt__desc">{stop.description}</p>
          {nearby.length > 0 && (
            <div className="vt__nearby">
              {nearby.map(({ h, dest }, i) => (
                <button key={`${h.to}-${i}`} type="button" className="vt__chip" onClick={() => goHotspot(h)} data-cursor="">
                  Walk to <b>Zone {dest.zone}</b> {dest.title}
                </button>
              ))}
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      <div className={`vt__hint ${interacted ? "is-done" : ""}`} aria-hidden>
        <Move aria-hidden /> Drag to explore
      </div>

      <div className="vt__bottom">
        <div className="vt__dots" aria-label="Zones">
          {stops.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`vt__dot ${i === state.index ? "is-active" : ""}`}
              aria-current={i === state.index ? "step" : undefined}
              aria-label={`Zone ${s.zone}: ${s.title}`}
              onClick={() => go(i)}
              data-cursor=""
            >
              {s.zone}
            </button>
          ))}
        </div>

        <nav className="vt__controls glass" aria-label="Tour controls">
          <button type="button" onClick={prev} aria-label="Previous zone" title="Previous zone (P)" data-cursor="">
            <ChevronLeft aria-hidden />
          </button>
          <span className="vt__sep" aria-hidden />
          <button type="button" onClick={() => zoomBy(-ZOOM.step)} disabled={state.zoom <= ZOOM.min} aria-label="Zoom out" title="Zoom out (−)" data-cursor="">
            <ZoomOut aria-hidden />
          </button>
          <output className="vt__zoom" aria-label="Zoom level">
            {Math.round(state.zoom * 100)}%
          </output>
          <button type="button" onClick={() => zoomBy(ZOOM.step)} disabled={state.zoom >= ZOOM.max} aria-label="Zoom in" title="Zoom in (+)" data-cursor="">
            <ZoomIn aria-hidden />
          </button>
          <button type="button" onClick={reset} aria-label="Reset camera" title="Reset camera (R)" data-cursor="">
            <RotateCcw aria-hidden />
          </button>
          {fsSupported && (
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFs ? "Exit fullscreen" : "Fullscreen"}
              aria-pressed={isFs}
              title="Fullscreen (F)"
              data-cursor=""
            >
              {isFs ? <Minimize2 aria-hidden /> : <Maximize2 aria-hidden />}
            </button>
          )}
          <span className="vt__sep" aria-hidden />
          <button type="button" onClick={next} aria-label="Next zone" title="Next zone (N)" data-cursor="">
            <ChevronRight aria-hidden />
          </button>
        </nav>

        <p className="vt__keys" aria-hidden>
          Drag to look · ← → ↑ ↓ · + − zoom · N / P zones · Esc exit
        </p>
      </div>
    </motion.div>
  );
}
