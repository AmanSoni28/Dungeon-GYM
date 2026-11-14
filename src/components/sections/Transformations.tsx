"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, type AnimationPlaybackControls } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { transformations } from "@/data/site";
import { metricAt, metricsAt, milestoneAt, monthAt, shapeFor, type Metrics } from "@/lib/transform/curves";
import { useInView } from "@/lib/useInView";
import { usePreloadAthleteWhenIdle } from "@/lib/athlete/preload";
import { SplitHeading } from "@/components/ui/SplitHeading";
import type { BodyInput, BodyMarks } from "./transform/MorphAthlete";

const loadAthlete = () => import("./transform/MorphAthlete");
const MorphAthlete = dynamic(loadAthlete, { ssr: false });

const EASE = [0.22, 1, 0.36, 1] as const;
const PLAY_S = 7; // the time-lapse, start to today

type Story = (typeof transformations)[number];
type Key = keyof Metrics;
const METRICS: { key: Key; label: string; unit: string; color: string; anchor: keyof Omit<BodyMarks, "ready">; side: "l" | "r" }[] = [
  { key: "weight", label: "Weight", unit: "kg", color: "#d4af37", anchor: "chest", side: "l" },
  { key: "fat", label: "Body fat", unit: "%", color: "#e8743b", anchor: "belly", side: "l" },
  { key: "strength", label: "Strength", unit: "%", color: "#f5f2eb", anchor: "arm", side: "r" },
];

const round = (n: number) => Math.round(n);
const initials = (name: string) => name.split(" ").map((w) => w[0]).join("").replace(".", "");

/** "−20 kg" style change between two values. */
function Delta({ from, to, unit }: { from: number; to: number; unit: string }) {
  const d = round(to - from);
  return (
    <span className={`tfx__delta ${d < 0 ? "is-down" : d > 0 ? "is-up" : ""}`}>
      {d < 0 ? "▼" : d > 0 ? "▲" : "•"} {Math.abs(d)}
      {unit}
    </span>
  );
}

/** Three curves over the months; solid up to now, ghosted after; a playhead with live dots. */
function ProgressChart({ st, p }: { st: Story; p: number }) {
  const W = 320;
  const H = 130;
  const N = 48;
  const y = (k: Key, t: number) => {
    const a = st.before[k];
    const b = st.after[k];
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    const v = metricAt(a, b, t);
    return 12 + (1 - (v - lo) / (hi - lo || 1)) * (H - 24);
  };
  const path = (k: Key) => Array.from({ length: N + 1 }, (_, i) => `${i ? "L" : "M"}${((i / N) * W).toFixed(1)},${y(k, i / N).toFixed(1)}`).join("");
  const px = p * W;

  return (
    <svg className="tfx__chart" viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`Progress over ${st.months} months`}>
      <defs>
        <clipPath id="tfx-done">
          <rect width={px} height={H} />
        </clipPath>
      </defs>
      {Array.from({ length: st.months + 1 }, (_, m) => (
        <g key={m} className={m <= monthAt(p, st.months) ? "is-reached" : undefined}>
          <line x1={(m / st.months) * W} x2={(m / st.months) * W} y1={0} y2={H} className="tfx__chart-grid" />
          <text x={(m / st.months) * W} y={H + 14} textAnchor={m === 0 ? "start" : m === st.months ? "end" : "middle"}>
            {m === 0 ? "Day 1" : `M${m}`}
          </text>
        </g>
      ))}
      {METRICS.map((m) => (
        <g key={m.key}>
          <path d={path(m.key)} stroke={m.color} className="tfx__chart-ghost" />
          <path d={path(m.key)} stroke={m.color} className="tfx__chart-line" clipPath="url(#tfx-done)" />
        </g>
      ))}
      <line x1={px} x2={px} y1={0} y2={H} className="tfx__chart-head" />
      {METRICS.map((m) => (
        <circle key={m.key} cx={px} cy={y(m.key, p)} r={4} fill={m.color} className="tfx__chart-dot" />
      ))}
    </svg>
  );
}

export function Transformations() {
  const [story, setStory] = useState(0);
  const [p, setP] = useState(0);
  const st = transformations[story];
  const reduce = useReducedMotion();
  const { ref, inView, seen } = useInView<HTMLDivElement>("-15% 0px");
  // mount the 3D athlete a full screen early, so he is parsed and his shaders compiled before he is on screen
  const { ref: nearRef, seen: near } = useInView<HTMLElement>("100% 0px");
  usePreloadAthleteWhenIdle(loadAthlete);

  const pv = useMotionValue(0);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const [playing, setPlaying] = useState(false);
  useMotionValueEvent(pv, "change", setP);

  const play = (from = 0) => {
    anim.current?.stop();
    pv.set(from);
    setPlaying(true);
    anim.current = animate(pv, 1, {
      duration: PLAY_S * (1 - from),
      ease: [0.45, 0, 0.25, 1],
      onComplete: () => setPlaying(false),
    });
  };
  const stop = () => {
    anim.current?.stop();
    setPlaying(false);
  };

  // the time-lapse plays itself the first time the section comes into view, and for each new story
  useEffect(() => {
    if (!seen) return;
    if (reduce) pv.set(1);
    else play(0);
    return () => anim.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, story, reduce]);

  // ── what the 3D body is asked to become right now
  const now = metricsAt(st.before, st.after, p);
  const shape = shapeFor(now);
  const body = useRef<BodyInput>({ fat: 0, muscle: 0, posture: 0, yaw: 0, sway: true });
  body.current.fat = shape.fat;
  body.current.muscle = shape.muscle;
  body.current.posture = p;
  body.current.sway = !reduce;

  // ── drag to turn him
  const drag = useRef<{ x: number; yaw: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, yaw: body.current.yaw };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    body.current.yaw = drag.current.yaw + (e.clientX - drag.current.x) * 0.012;
  };
  const onUp = () => {
    drag.current = null;
  };

  // ── callouts pinned to his body (positions come from the 3D scene every frame)
  const marks = useRef<BodyMarks>({ ready: false, chest: { x: 0, y: 0 }, belly: { x: 0, y: 0 }, arm: { x: 0, y: 0 } });
  const stageRef = useRef<HTMLDivElement>(null);
  const pins = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const tick = () => {
      const m = marks.current;
      if (m.ready) {
        stageRef.current?.classList.add("is-ready");
        METRICS.forEach((c, i) => {
          const el = pins.current[i];
          const pt = m[c.anchor];
          if (el) el.style.transform = `translate3d(${pt.x.toFixed(1)}px, ${pt.y.toFixed(1)}px, 0)`;
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView]);

  const month = monthAt(p, st.months);
  const week = Math.round(p * st.months * 4.33);
  const milestone = milestoneAt(st.milestones, month);

  return (
    <section ref={nearRef} className="section tfx" style={{ "--t": p } as React.CSSProperties}>
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Transformations</p>
          <SplitHeading lines={["Drag through", { text: "time", className: "gold-text" }]} />
          <p className="lead">Real members, real numbers. Watch the months play out on his body, then drag the timeline yourself to see every change.</p>
        </div>

        <div ref={ref} className={`tfx__grid${seen ? " is-in" : ""}`}>
          {/* ── the stage ── */}
          <div
            ref={stageRef}
            className="tfx__stage"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onPointerLeave={onUp}
            data-cursor="Rotate"
          >
            <div className="tfx__glow" aria-hidden />
            <div className="tfx__scanlines" aria-hidden />
            <div className="tfx__canvas">{near && <MorphAthlete input={body.current} marks={marks.current} running={inView} />}</div>
            <div className="tfx__loading" aria-hidden>
              <span>Loading athlete</span>
            </div>

            {/* month odometer */}
            <div className="tfx__month" aria-live="polite">
              <small>Month</small>
              <div className="tfx__month-num">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.b
                    key={month}
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: "0%", opacity: 1 }}
                    exit={{ y: "-100%", opacity: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  >
                    {String(month).padStart(2, "0")}
                  </motion.b>
                </AnimatePresence>
                <span>/ {String(st.months).padStart(2, "0")}</span>
              </div>
              <em>Week {week}</em>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${story}-${milestone.title}`}
                className="tfx__phase"
                initial={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 10, filter: "blur(6px)" }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <i /> {milestone.title}
              </motion.div>
            </AnimatePresence>

            {/* live numbers pinned to his body */}
            {METRICS.map((c, i) => (
              <div key={c.key} ref={(el) => void (pins.current[i] = el)} className={`tfx__pin tfx__pin--${c.side}`} aria-hidden>
                <span className="tfx__pin-dot" style={{ background: c.color, boxShadow: `0 0 12px ${c.color}` }} />
                <span className="tfx__pin-line" />
                <span className="tfx__pin-card">
                  <small>{c.label}</small>
                  <b>
                    {round(now[c.key])}
                    <em>{c.unit}</em>
                  </b>
                  <Delta from={st.before[c.key]} to={now[c.key]} unit={c.unit} />
                </span>
              </div>
            ))}

            {/* timeline scrubber */}
            <div className="tfx__scrub" onPointerDown={(e) => e.stopPropagation()}>
              <button type="button" className="tfx__play" onClick={() => (playing ? stop() : play(p >= 0.999 ? 0 : p))} aria-label={playing ? "Pause the time-lapse" : "Play the time-lapse"} data-cursor="">
                {playing ? "❚❚" : p >= 0.999 ? "↺" : "▶"}
              </button>
              <div className="tfx__track">
                <div className="tfx__rail">
                  <i style={{ transform: `scaleX(${p})` }} />
                </div>
                {st.milestones.map((m) => (
                  <span
                    key={m.month}
                    className={`tfx__ms${m.month <= month ? " is-reached" : ""}${m === milestone ? " is-current" : ""}`}
                    style={{ left: `${(m.month / st.months) * 100}%` }}
                  >
                    <em>{m.title}</em>
                  </span>
                ))}
                <span className="tfx__thumb" style={{ left: `${p * 100}%` }} aria-hidden />
                <label className="sr-only" htmlFor="tfx-range">
                  Transformation progress
                </label>
                <input
                  id="tfx-range"
                  type="range"
                  min={0}
                  max={1000}
                  value={Math.round(p * 1000)}
                  aria-valuetext={`Month ${month} of ${st.months}`}
                  onPointerDown={stop}
                  onKeyDown={stop}
                  onChange={(e) => {
                    stop();
                    pv.set(Number(e.target.value) / 1000);
                  }}
                  data-cursor="Drag"
                />
              </div>
            </div>
          </div>

          {/* ── the story ── */}
          <div className="tfx__story">
            <div className="tfx__members" role="tablist" aria-label="Member">
              {transformations.map((s, i) => (
                <button
                  key={s.name}
                  type="button"
                  role="tab"
                  aria-selected={i === story}
                  className={`tfx__member${i === story ? " is-active" : ""}`}
                  onClick={() => i !== story && setStory(i)}
                  data-cursor=""
                >
                  {i === story && <motion.span layoutId="tfx-member" className="tfx__member-bg" transition={{ type: "spring", stiffness: 320, damping: 30 }} />}
                  <span className="tfx__avatar">{initials(s.name)}</span>
                  <span className="tfx__member-txt">
                    <b>{s.name}</b>
                    <small>{s.headline}</small>
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.blockquote key={story} className="tfx__quote" exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                {`“${st.quote}”`.split(" ").map((w, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.5, delay: i * 0.03, ease: EASE }}
                  >
                    {w}{" "}
                  </motion.span>
                ))}
              </motion.blockquote>
            </AnimatePresence>

            <div className="tfx__milestone">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${story}-${milestone.month}`}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <span className="tfx__milestone-tag">{milestone.month === 0 ? "Day 1" : `Month ${milestone.month}`}</span>
                  <h4>{milestone.title}</h4>
                  <p>{milestone.text}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="tfx__progress">
              <ProgressChart st={st} p={p} />
              <div className="tfx__legend">
                {METRICS.map((c) => (
                  <div key={c.key}>
                    <i style={{ background: c.color }} />
                    <small>{c.label}</small>
                    <b>
                      {round(now[c.key])}
                      <em>{c.unit}</em>
                    </b>
                    <Delta from={st.before[c.key]} to={now[c.key]} unit={c.unit} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
