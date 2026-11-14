"use client";

import "@/styles/realgym.css";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { gymViews } from "@/data/site";
import { readEnvironment } from "@/lib/intro/capabilities";
import { journeyVisuals } from "@/lib/gym/journey";
import type { GymView } from "@/lib/gym/look";
import { useInView } from "@/lib/useInView";
import { scrollToTarget } from "@/lib/utils";
import { createLookState, type GymLookState } from "@/lib/gym/state";
import { GymPhotoFallback } from "@/components/gym/GymPhotoFallback";
import { ViewerBoundary } from "@/components/gym/ViewerBoundary";

const GymViewer = dynamic(() => import("@/components/gym/GymViewer"), { ssr: false, loading: () => null });

type Mode = "full" | "lite" | "fallback";

const DRAG_X = 0.0034; // radians per pixel
const DRAG_Y = 0.0026;
const KEY_STEP = 0.08;

/**
 * Scene 2 of the entrance: step through the gate into the REAL Dungeon Gym, turn through the 360°,
 * then ease forward and fade into the rest of the homepage.
 */
export function RealGym({ views = gymViews, forceMode }: { views?: GymView[]; forceMode?: Mode }) {
  const section = useRef<HTMLElement>(null);
  const meter = useRef<HTMLDivElement>(null);
  const look = useRef<GymLookState>(createLookState());
  const [mode, setMode] = useState<Mode | null>(forceMode ?? null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [viewIndex, setViewIndex] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const [ready, setReady] = useState(false);
  const { ref: stageRef, inView, seen } = useInView<HTMLDivElement>("150% 0px");
  const view = views[viewIndex];
  const has360 = view.kind === "equirect";

  // capability detection (client only)
  useEffect(() => {
    const env = readEnvironment();
    setAutoRotate(!env.reducedMotion);
    if (!forceMode) setMode(!env.webgl ? "fallback" : env.mobile || env.lowPower ? "lite" : "full");
  }, [forceMode]);

  // pinned scroll journey → progress + CSS variables for the overlays
  useEffect(() => {
    const el = section.current!;
    const apply = (p: number) => {
      look.current.progress = p;
      const v = journeyVisuals(p);
      el.style.setProperty("--light", v.light.toFixed(3));
      el.style.setProperty("--ui", v.ui.toFixed(3));
      el.style.setProperty("--prompt", v.prompt.toFixed(3));
      // only filter the WebGL canvas while it is actually blurred: a no-op blur(0) still forces an
      // extra compositing pass every frame (and can freeze the canvas on some GPUs)
      el.style.setProperty("--stage-filter", v.blur > 0.05 ? `blur(${v.blur.toFixed(2)}px)` : "none");
      el.style.setProperty("--fade", v.fade.toFixed(3));
      el.classList.toggle("is-prompt", v.prompt > 0.05);
    };
    apply(0);
    // The section overlaps the gate's final screen (see .realgym-wrap) and stays hidden until the
    // gate finishes, so the golden light hands over instantly: one continuous shot.
    const show = (v: boolean) => el.classList.toggle("is-entered", v);
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "+=260%",
        pin: true,
        scrub: true,
        onUpdate: (s) => apply(s.progress),
        onEnter: () => show(true),
        onLeaveBack: () => show(false),
        onRefresh: (s) => show(s.progress > 0 || s.isActive),
      });
    }, el);
    return () => ctx.revert();
  }, []);

  // explore meter: updated straight on the DOM every frame (no React re-render)
  const onLook = useCallback((position: number, explored: number) => {
    const m = meter.current;
    if (!m) return;
    m.style.setProperty("--pos", position.toFixed(4));
    m.style.setProperty("--explored", explored.toFixed(4));
    const label = m.querySelector<HTMLElement>("[data-explored]");
    const pct = `${Math.round(explored * 100)}%`;
    if (label && label.textContent !== pct) label.textContent = pct;
  }, []);

  // drag (mouse + touch) to look around. Vertical touch swipes keep scrolling the page.
  const drag = useRef<{ id: number; x: number; y: number; mouse: boolean } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, mouse: e.pointerType === "mouse" };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    look.current.lastInteraction = performance.now();
    if (!interacted) setInteracted(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    look.current.dragYaw += (e.clientX - d.x) * DRAG_X;
    if (d.mouse) look.current.dragPitch += (e.clientY - d.y) * DRAG_Y;
    look.current.lastInteraction = performance.now();
    d.x = e.clientX;
    d.y = e.clientY;
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    const k = { ArrowLeft: [KEY_STEP, 0], ArrowRight: [-KEY_STEP, 0], ArrowUp: [0, KEY_STEP], ArrowDown: [0, -KEY_STEP] }[e.key];
    if (!k) return;
    e.preventDefault();
    look.current.dragYaw += k[0];
    look.current.dragPitch += k[1];
    look.current.lastInteraction = performance.now();
    if (!interacted) setInteracted(true);
  };

  return (
    // React-owned wrapper: ScrollTrigger inserts its pin-spacer between this div and the section,
    // so unmounting never tries to remove a node React no longer parents.
    <div className="realgym-wrap">
    <section ref={section} id="inside" className="realgym" aria-label="Inside Dungeon Gym">
      <div
        ref={stageRef}
        className="realgym__stage"
        tabIndex={0}
        role="application"
        aria-roledescription="gym viewer"
        aria-label={`${view.label} at Dungeon Gym. Drag or use the arrow keys to look around.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        data-cursor="Drag"
      >
        {seen && (mode === "full" || mode === "lite") && (
          <ViewerBoundary onError={() => setMode("fallback")}>
            <GymViewer
              key={view.id}
              view={view}
              look={look}
              running={inView}
              lite={mode === "lite"}
              autoRotate={autoRotate}
              onLook={onLook}
              onReady={() => setReady(true)}
            />
          </ViewerBoundary>
        )}
        {seen && mode === "fallback" && <GymPhotoFallback view={view} look={look} onLook={onLook} />}
        <div className={`realgym__loading ${ready || mode === "fallback" ? "is-hidden" : ""}`} aria-hidden />
      </div>

      <div className="realgym__vignette" aria-hidden />
      <div className="realgym__light" aria-hidden />

      <div className="realgym__ui">
        <header className="realgym__head">
          <p className="eyebrow">Inside Dungeon Gym</p>
          <h2 className="realgym__title">
            You&apos;re <span className="gold-text">in.</span>
          </h2>
          <p className="realgym__label">
            {view.label} · {has360 ? "360° panorama" : "real photo"}
          </p>
        </header>

        <div className={`realgym__hint ${interacted ? "is-done" : ""}`} aria-hidden>
          <span className="realgym__hand" />
          Drag to explore
        </div>

        <div ref={meter} className="realgym__meter" aria-hidden>
          <div className="realgym__track">
            <i className="realgym__window" />
          </div>
          <span>
            Explored <b data-explored>0%</b>
          </span>
        </div>

        {views.length > 1 && (
          <div className="realgym__views">
            {views.map((v, i) => (
              <button key={v.id} className={`chip ${i === viewIndex ? "is-active" : ""}`} onClick={() => setViewIndex(i)} data-cursor="">
                {v.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* outside .realgym__ui on purpose: it has its own fade and must stay up while the camera starts moving */}
      <div className="realgym__prompt">
        <button type="button" className="realgym__enter" onClick={() => scrollToTarget("#tour")} data-cursor="">
          Enter Dungeon
        </button>
        <span>Scroll to continue</span>
      </div>

      <div className="realgym__fade" aria-hidden />
    </section>
    </div>
  );
}
