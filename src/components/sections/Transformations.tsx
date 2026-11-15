"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, type AnimationPlaybackControls } from "framer-motion";
import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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

const CW = 320;
const CH = 130;
const CN = 48;
/** y on the chart for metric k at time t */
const chartY = (st: Story, k: Key, t: number) => {
  const a = st.before[k];
  const b = st.after[k];
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const v = metricAt(a, b, t);
  return 12 + (1 - (v - lo) / (hi - lo || 1)) * (CH - 24);
};

/** Moves the chart's playhead without a React render. */
type ChartApi = { set: (p: number) => void };

/**
 * Three curves over the months; solid up to now, ghosted after; a playhead with live dots.
 * The curves are built once per story; only the playhead moves, imperatively, every frame.
 */
const ProgressChart = memo(function ProgressChart({ st, month, api }: { st: Story; month: number; api: React.RefObject<ChartApi | null> }) {
  const clip = useRef<SVGRectElement>(null);
  const head = useRef<SVGLineElement>(null);
  const dots = useRef<(SVGCircleElement | null)[]>([]);

  const paths = useMemo(
    () =>
      METRICS.map((m) =>
        Array.from({ length: CN + 1 }, (_, i) => `${i ? "L" : "M"}${((i / CN) * CW).toFixed(1)},${chartY(st, m.key, i / CN).toFixed(1)}`).join("")
      ),
    [st]
  );

  useLayoutEffect(() => {
    api.current = {
      set: (p) => {
        const px = (p * CW).toFixed(2);
        clip.current?.setAttribute("width", px);
        head.current?.setAttribute("x1", px);
        head.current?.setAttribute("x2", px);
        METRICS.forEach((m, i) => {
          const d = dots.current[i];
          if (!d) return;
          d.setAttribute("cx", px);
          d.setAttribute("cy", chartY(st, m.key, p).toFixed(2));
        });
      },
    };
  }, [api, st]);

  return (
    <svg className="tfx__chart" viewBox={`0 0 ${CW} ${CH + 18}`} role="img" aria-label={`Progress over ${st.months} months`}>
      <defs>
        <clipPath id="tfx-done">
          <rect ref={clip} width={0} height={CH} />
        </clipPath>
      </defs>
      {Array.from({ length: st.months + 1 }, (_, m) => (
        <g key={m} className={m <= month ? "is-reached" : undefined}>
          <line x1={(m / st.months) * CW} x2={(m / st.months) * CW} y1={0} y2={CH} className="tfx__chart-grid" />
          <text x={(m / st.months) * CW} y={CH + 14} textAnchor={m === 0 ? "start" : m === st.months ? "end" : "middle"}>
            {m === 0 ? "Day 1" : `M${m}`}
          </text>
        </g>
      ))}
      {METRICS.map((m, i) => (
        <g key={m.key}>
          <path d={paths[i]} stroke={m.color} className="tfx__chart-ghost" />
          <g clipPath="url(#tfx-done)">
            <path d={paths[i]} stroke={m.color} className="tfx__chart-glow" />
            <path d={paths[i]} stroke={m.color} className="tfx__chart-line" />
          </g>
        </g>
      ))}
      <line ref={head} x1={0} x2={0} y1={0} y2={CH} className="tfx__chart-head" />
      {METRICS.map((m, i) => (
        <circle key={m.key} ref={(el) => void (dots.current[i] = el)} cx={0} cy={chartY(st, m.key, 0)} r={4} fill={m.color} className="tfx__chart-dot" />
      ))}
    </svg>
  );
});

/** The member's quote, word by word; only re-renders when the story changes. */
const Quote = memo(function Quote({ text }: { text: string }) {
  return (
    <>
      {`“${text}”`.split(" ").map((w, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.5, delay: i * 0.03, ease: EASE }}
        >
          {w}{" "}
        </motion.span>
      ))}
    </>
  );
});

export function Transformations() {
  const [story, setStory] = useState(0);
  const [p, setP] = useState(0); // the time-lapse position as React last rendered it (see `apply`)
  const st = transformations[story];
  const reduce = useReducedMotion();
  const { ref, inView, seen } = useInView<HTMLDivElement>("-15% 0px");
  // mount the 3D athlete a full screen early, so he is parsed and his shaders compiled before he is on screen
  const { ref: nearRef, seen: near } = useInView<HTMLElement>("100% 0px");
  const warm = usePreloadAthleteWhenIdle(loadAthlete);

  // ── playback. `pv` is the continuous time-lapse position (0 → 1) and moves every frame; React only hears about
  // it (`p`) when something it renders visibly changes (a week, a rounded number), so the section isn't re-rendered
  // 60 times a second. Everything continuous (body, rail, thumb, chart playhead, colour grade) is written straight
  // to the DOM / the 3D input in `apply`.
  const pv = useMotionValue(0);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const [playing, setPlaying] = useState(false);

  const body = useRef<BodyInput>({ fat: 0, muscle: 0, posture: 0, yaw: 0, sway: true });
  body.current.sway = !reduce;

  const sectionRef = useRef<HTMLElement | null>(null);
  const railRef = useRef<HTMLElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const chart = useRef<ChartApi | null>(null);
  const lastKey = useRef("");
  const lastT = useRef(-1);

  const apply = (v: number) => {
    const m = metricsAt(st.before, st.after, v);
    const shape = shapeFor(m);
    const b = body.current;
    b.fat = shape.fat;
    b.muscle = shape.muscle;
    b.posture = v;

    if (railRef.current) railRef.current.style.transform = `scaleX(${v})`;
    if (thumbRef.current) thumbRef.current.style.left = `${v * 100}%`;
    const r = rangeRef.current;
    if (r && document.activeElement !== r) r.value = String(Math.round(v * 1000));
    chart.current?.set(v);
    // the colour grade restyles the whole section (filters, blurs): step it in 1% increments, which is invisible
    const t = Math.round(v * 100) / 100;
    if (t !== lastT.current) {
      lastT.current = t;
      sectionRef.current?.style.setProperty("--t", String(t));
    }

    const key = `${story}|${Math.round(v * st.months * 4.33)}|${round(m.weight)}|${round(m.fat)}|${round(m.strength)}|${v >= 0.999 ? 1 : 0}`;
    if (key !== lastKey.current) {
      lastKey.current = key;
      setP(v);
    }
  };
  const applyRef = useRef(apply);
  applyRef.current = apply;
  useEffect(() => pv.on("change", (v) => applyRef.current(v)), [pv]);
  // paint the current position on mount and whenever the story (and so every curve) changes
  useLayoutEffect(() => {
    lastKey.current = "";
    applyRef.current(pv.get());
  }, [story, pv]);

  const seek = (v: number) => {
    pv.set(v);
    applyRef.current(v);
  };
  const forward = (from: number) => {
    anim.current = animate(pv, 1, {
      duration: PLAY_S * (1 - from),
      ease: [0.45, 0, 0.25, 1],
      onComplete: () => {
        anim.current = null;
        setPlaying(false);
      },
    });
  };
  const play = (restart = false) => {
    anim.current?.stop();
    setPlaying(true);
    const from = pv.get();
    if (restart) {
      seek(0);
      forward(0);
    } else if (from >= 0.999) {
      // run it again: rewind smoothly to day one instead of snapping, then play
      anim.current = animate(pv, 0, { duration: 0.9, ease: [0.65, 0, 0.35, 1], onComplete: () => forward(0) });
    } else forward(from);
  };
  const stop = () => {
    anim.current?.stop();
    anim.current = null;
    setPlaying(false);
  };

  // the time-lapse plays itself the first time the section comes into view, and for each new story
  useEffect(() => {
    if (!seen) return;
    if (reduce) seek(1);
    else play(true);
    return () => {
      anim.current?.stop();
      anim.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, story, reduce]);

  // what React renders: weeks, months and rounded numbers
  const now = metricsAt(st.before, st.after, p);

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
    <section
      ref={(el) => {
        nearRef.current = el;
        sectionRef.current = el;
      }}
      className="section tfx"
    >
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
            <div className="tfx__canvas">{(near || warm) && <MorphAthlete input={body.current} marks={marks.current} running={inView} />}</div>
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
              <button type="button" className="tfx__play" onClick={() => (playing ? stop() : play())} aria-label={playing ? "Pause the time-lapse" : "Play the time-lapse"} data-cursor="">
                {playing ? "❚❚" : p >= 0.999 ? "↺" : "▶"}
              </button>
              <div className="tfx__track">
                <div className="tfx__rail">
                  <i ref={railRef} />
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
                <span ref={thumbRef} className="tfx__thumb" aria-hidden />
                <label className="sr-only" htmlFor="tfx-range">
                  Transformation progress
                </label>
                <input
                  id="tfx-range"
                  type="range"
                  min={0}
                  max={1000}
                  ref={rangeRef}
                  defaultValue={0}
                  aria-valuetext={`Month ${month} of ${st.months}`}
                  onPointerDown={stop}
                  onKeyDown={stop}
                  onChange={(e) => {
                    if (anim.current) stop();
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
                <Quote text={st.quote} />
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
              <ProgressChart st={st} month={month} api={chart} />
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
