"use client";

import { AnimatePresence, motion, useMotionValue, useMotionValueEvent, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { muscles, type MuscleId } from "@/data/site";
import { ANCHORS, GROUP_MUSCLES, VIEWBOX, angleForView, faceAt, mirrorX, snapRotation, viewFor, type View } from "@/lib/muscles/anatomy";
import { useInView } from "@/lib/useInView";
import { AnatomyFigure } from "./AnatomyFigure";

type Props = {
  active: MuscleId;
  hover: MuscleId | null;
  onHover: (m: MuscleId | null) => void;
  onSelect: (m: MuscleId) => void;
};

const GROUP_IDS = Object.keys(muscles) as MuscleId[];

/** Tick marks for the HUD ring behind the athlete (viewBox 0..200). */
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const a = (i / 72) * Math.PI * 2;
  const r2 = i % 6 === 0 ? 87 : 92;
  const q = (v: number) => Math.round(v * 100) / 100;
  return { x1: q(100 + Math.cos(a) * 97), y1: q(100 + Math.sin(a) * 97), x2: q(100 + Math.cos(a) * r2), y2: q(100 + Math.sin(a) * r2), major: i % 6 === 0 };
});

const DRAG_THRESHOLD = 6; // px before a press becomes a rotation instead of a tap
const DEG_PER_PX = 0.55;

/** Deterministic dust motes. Values are rounded so server and client serialise them identically. */
const MOTES = Array.from({ length: 22 }, (_, i) => {
  const r = (n: number) => Math.round((((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1 * 1000) / 1000;
  const q = (v: number) => Math.round(v * 100) / 100;
  return { x: q(6 + r(1) * 88), s: q(1 + r(2) * 2.4), d: q(9 + r(3) * 10), delay: q(-r(4) * 18), drift: q((r(5) - 0.5) * 60), o: q(0.25 + r(6) * 0.55) };
});

export function MuscleStage({ active, hover, onHover, onSelect }: Props) {
  const { ref, seen } = useInView<HTMLDivElement>("0px");
  const [view, setView] = useState<View>("front");
  const [face, setFace] = useState<View>("front");
  const [settled, setSettled] = useState(true);
  const viewRef = useRef<View>("front");

  // ── rotation (spring-smoothed) + pointer parallax
  const angle = useMotionValue(0);
  const spin = useSpring(angle, { stiffness: 70, damping: 16, mass: 1 });
  const spinT = useTransform(spin, (a) => `rotateY(${a}deg)`);
  const mx = useSpring(0, { stiffness: 60, damping: 18 });
  const my = useSpring(0, { stiffness: 60, damping: 18 });
  const tiltT = useTransform([mx, my], ([x, y]: number[]) => `rotateX(${y * -3}deg) rotateY(${x * 5}deg)`);
  const lightX = useTransform(mx, (x) => `${x * -26}px`);
  const lightY = useTransform(my, (y) => `${y * -10}px`);
  const floorX = useTransform(mx, (x) => `${x * 10}px`);

  useMotionValueEvent(spin, "change", (a) => {
    const f = faceAt(a);
    setFace((cur) => (cur === f ? cur : f));
    const rest = Math.abs(a - angle.get()) < 3 && Math.abs(angle.get() % 180) < 0.01;
    setSettled((cur) => (cur === rest ? cur : rest));
  });

  const turnTo = (v: View) => {
    viewRef.current = v;
    setView(v);
    angle.set(angleForView(v, angle.get()));
  };

  // Selecting a group turns the athlete to the side that shows it best.
  useEffect(() => {
    const v = viewFor(active, viewRef.current);
    if (v !== viewRef.current) turnTo(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // ── drag / tap handling (one pointer)
  const press = useRef<{ x: number; a0: number; group: MuscleId | null; moved: boolean; id: number } | null>(null);
  const groupAt = (t: EventTarget | null) =>
    ((t as Element | null)?.closest?.("[data-group]")?.getAttribute("data-group") as MuscleId | null) ?? null;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("button")) return;
    press.current = { x: e.clientX, a0: angle.get(), group: groupAt(e.target), moved: false, id: e.pointerId };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.pointerType === "mouse") {
      mx.set(((e.clientX - rect.left) / rect.width) * 2 - 1);
      my.set(((e.clientY - rect.top) / rect.height) * 2 - 1);
    }
    const p = press.current;
    if (p && p.id === e.pointerId) {
      const dx = e.clientX - p.x;
      if (!p.moved && Math.abs(dx) > DRAG_THRESHOLD) {
        p.moved = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        onHover(null);
      }
      if (p.moved) angle.set(p.a0 + dx * DEG_PER_PX);
      return;
    }
    if (e.pointerType === "mouse") {
      const g = groupAt(e.target);
      if (g !== hover) onHover(g);
    }
  };

  const endPress = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    if (p.moved) {
      const s = snapRotation(angle.get());
      angle.set(s.deg);
      viewRef.current = s.view;
      setView(s.view);
    } else if (p.group && e.type === "pointerup") {
      onSelect(p.group);
    }
  };

  const onLeave = () => {
    mx.set(0);
    my.set(0);
    if (!press.current) onHover(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      turnTo(view === "front" ? "back" : "front");
    }
  };

  // ── label / pulse position for the active group on the visible face
  const anchor = ANCHORS[face][active];
  const showLabel = settled && !!anchor && face === view;
  const ax = anchor ? mirrorX(anchor[0]) : 0; // label lives on the right, towards the panel
  const ay = anchor ? anchor[1] : 0;
  const pct = (x: number, y: number) => ({ left: `${(x / VIEWBOX.w) * 100}%`, top: `${(y / VIEWBOX.h) * 100}%` });

  return (
    <div
      ref={ref}
      className={`mstage${seen ? " is-in" : ""}`}
      data-cursor="Rotate"
      tabIndex={0}
      aria-label="Athlete muscle map. Use left and right arrow keys to turn the athlete."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onPointerLeave={onLeave}
      onKeyDown={onKeyDown}
    >
      {/* atmosphere */}
      <motion.div className="mstage__spot" style={{ x: lightX, y: lightY }} aria-hidden />
      <div className="mstage__beam" aria-hidden />
      <div className="mstage__motes" aria-hidden>
        {MOTES.map((m, i) => (
          <i
            key={i}
            style={
              {
                left: `${m.x}%`,
                width: m.s,
                height: m.s,
                opacity: m.o,
                animationDuration: `${m.d}s`,
                animationDelay: `${m.delay}s`,
                "--drift": `${m.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      <motion.div className="mstage__floor" style={{ x: floorX }} aria-hidden />

      {/* HUD rings: the outer one turns a sixth for every muscle group */}
      <div className="mstage__hud" aria-hidden>
        <motion.svg
          className="mstage__ring mstage__ring--ticks"
          viewBox="0 0 200 200"
          animate={{ rotate: GROUP_IDS.indexOf(active) * -60 }}
          transition={{ type: "spring", stiffness: 40, damping: 14 }}
        >
          {TICKS.map(({ major, ...t }, i) => (
            <line key={i} {...t} className={major ? "is-major" : undefined} />
          ))}
          <circle cx="100" cy="3" r="2.6" className="mstage__ring-pip" />
        </motion.svg>
        <svg className="mstage__ring mstage__ring--dash" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="80" />
        </svg>
        <svg className="mstage__ring mstage__ring--arcs" viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="68" />
        </svg>
      </div>

      {/* view switch */}
      <div className="mstage__views" role="group" aria-label="Athlete view">
        {(["front", "back"] as View[]).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} className={view === v ? "is-active" : ""} onClick={() => turnTo(v)} data-cursor="">
            {view === v && <motion.span layoutId="mstage-view" className="mstage__viewpill" transition={{ type: "spring", stiffness: 400, damping: 34 }} />}
            <span>{v}</span>
          </button>
        ))}
      </div>

      {/* the athlete */}
      <div className="mstage__rig">
        <motion.div className="mstage__tilt" style={{ transform: tiltT }}>
          <motion.div className="mstage__spin" style={{ transform: spinT }}>
            <div className="mstage__figure">
              {(["front", "back"] as View[]).map((v) => (
                <div key={v} className={`mstage__face mstage__face--${v}`} style={{ pointerEvents: face === v ? "auto" : "none" }} aria-hidden={face !== v}>
                  <div className="mstage__breath">
                    <AnatomyFigure view={v} active={active} hover={hover} />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* scan sweep, replayed every time the group changes */}
        {seen && (
          <div key={active} className="mstage__scan" aria-hidden>
            <i />
          </div>
        )}

        {/* label + light pulse sit outside the 3D turn so they never mirror */}
        <div className="mstage__overlay">
          <AnimatePresence>
            {showLabel && (
              <motion.div
                key={`${active}-${face}`}
                className="mstage__marker"
                style={pct(ax, ay)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4 }}
              >
                <span className="mstage__pulse" />
                <span className="mstage__dot" />
                <motion.span
                  className="mstage__lead"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.span
                  className="mstage__tag"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.45, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  <b>{muscles[active].name}</b>
                  <small>{GROUP_MUSCLES[active]}</small>
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mstage__hint" aria-live="polite">
        {hover ? muscles[hover].name : "Drag to rotate · Tap a muscle"}
      </div>
    </div>
  );
}
