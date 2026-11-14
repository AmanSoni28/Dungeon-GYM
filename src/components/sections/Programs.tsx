"use client";

import Image from "next/image";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { muscles, trainers, type MuscleId } from "@/data/site";
import { GROUP_MUSCLES } from "@/lib/muscles/anatomy";
import { useInView } from "@/lib/useInView";
import { SplitHeading } from "@/components/ui/SplitHeading";
import { MuscleStage } from "./muscles/MuscleStage";
import { GroupClasses } from "./classes/GroupClasses";

const IDS = Object.keys(muscles) as MuscleId[];
const EASE = [0.22, 1, 0.36, 1] as const;
const TOUR_MS = 6500; // how long the auto tour rests on each group

const pad = (n: number) => n.toString().padStart(2, "0");
const levelFor = (v: number) => (v >= 90 ? "Brutal" : v >= 80 ? "Heavy" : v >= 70 ? "Hard" : "Steady");

/** Ghost name behind the athlete: letters rise in, fall out. */
function GhostWord({ word }: { word: string }) {
  return (
    <div className="matlas__ghost" aria-hidden>
      <AnimatePresence initial={false}>
        <motion.span key={word} className="matlas__ghost-word">
          {word.split("").map((ch, i) => (
            <motion.span
              key={i}
              initial={{ y: "70%", opacity: 0, filter: "blur(10px)" }}
              animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
              exit={{ y: "-40%", opacity: 0, filter: "blur(10px)", transition: { duration: 0.35, delay: i * 0.02 } }}
              transition={{ duration: 0.9, delay: 0.1 + i * 0.05, ease: EASE }}
            >
              {ch}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

/** Odometer-style "01 / 06". */
function Counter({ index }: { index: number }) {
  return (
    <span className="matlas__count" aria-label={`Program ${index} of ${IDS.length}`}>
      <span className="matlas__odo" aria-hidden>
        <motion.span animate={{ y: `${-(index - 1)}em` }} transition={{ type: "spring", stiffness: 120, damping: 18 }}>
          {IDS.map((_, i) => (
            <b key={i}>{pad(i + 1)}</b>
          ))}
        </motion.span>
      </span>
      <i aria-hidden>/</i>
      <span aria-hidden>{pad(IDS.length)}</span>
    </span>
  );
}

/** Radial intensity gauge: arc sweeps, number counts up. */
function Gauge({ value }: { value: number }) {
  const v = useMotionValue(0);
  const text = useTransform(v, (n) => Math.round(n).toString());
  useEffect(() => {
    const c = animate(v, value, { duration: 1.4, ease: EASE });
    return () => c.stop();
  }, [v, value]);

  return (
    <div className="mgauge" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-label="Training intensity">
      <svg viewBox="0 0 120 120" aria-hidden>
        <defs>
          <linearGradient id="mgauge-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f1d98a" />
            <stop offset="0.55" stopColor="#d4af37" />
            <stop offset="1" stopColor="#a98235" />
          </linearGradient>
        </defs>
        {Array.from({ length: 40 }, (_, i) => (
          <line
            key={i}
            x1="60"
            y1="6"
            x2="60"
            y2={i % 5 === 0 ? 13 : 10}
            transform={`rotate(${i * 9} 60 60)`}
            className={i / 40 < value / 100 ? "is-lit" : undefined}
            style={{ transitionDelay: `${i * 25}ms` }}
          />
        ))}
        <circle cx="60" cy="60" r="44" className="mgauge__track" transform="rotate(-90 60 60)" />
        <motion.circle
          cx="60"
          cy="60"
          r="44"
          className="mgauge__arc"
          transform="rotate(-90 60 60)"
          stroke="url(#mgauge-grad)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: value / 100 }}
          transition={{ duration: 1.4, ease: EASE }}
        />
      </svg>
      <div className="mgauge__read">
        <motion.b>{text}</motion.b>
        <small>{levelFor(value)}</small>
      </div>
    </div>
  );
}

export function Programs() {
  const [active, setActive] = useState<MuscleId>("chest");
  const [hover, setHover] = useState<MuscleId | null>(null);
  const reduce = useReducedMotion();
  const [touring, setTouring] = useState(true);
  const [paused, setPaused] = useState(false);
  const { ref, inView } = useInView<HTMLDivElement>("-20% 0px");
  const railRef = useRef<HTMLDivElement>(null);

  const m = muscles[active];
  const coach = trainers.find((t) => t.name === m.trainer);
  const index = IDS.indexOf(active) + 1;
  const tour = touring && !reduce;
  const running = tour && !paused && inView;

  /** Any direct choice by the visitor ends the auto tour. */
  const choose = (id: MuscleId) => {
    setTouring(false);
    setActive(id);
  };
  const next = () => setActive(IDS[index % IDS.length]);

  // keep the active rail item visible on narrow screens (horizontal scroll only)
  useEffect(() => {
    const rail = railRef.current;
    const el = rail?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (!rail || !el || rail.scrollWidth <= rail.clientWidth) return;
    rail.scrollTo({ left: el.offsetLeft - (rail.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [active]);

  const onRailKey = (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const id = IDS[(IDS.indexOf(active) + d + IDS.length) % IDS.length];
    choose(id);
    railRef.current?.querySelector<HTMLElement>(`[data-id="${id}"]`)?.focus();
  };

  return (
    <section id="programs" className="section programs">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Programs · Muscle Atlas</p>
          <SplitHeading lines={["Choose what", { text: "you forge", className: "gold-text" }]} />
          <p className="lead">Watch the atlas scan every muscle group, or take control: tap a muscle, drag to turn the athlete, and see the program, the moves and your coach.</p>
        </div>

        <div
          ref={ref}
          className={`matlas${inView ? " is-in" : ""}`}
          onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
          onPointerLeave={() => setPaused(false)}
        >
          {/* frame chrome */}
          <span className="matlas__corner matlas__corner--tl" aria-hidden />
          <span className="matlas__corner matlas__corner--tr" aria-hidden />
          <span className="matlas__corner matlas__corner--bl" aria-hidden />
          <span className="matlas__corner matlas__corner--br" aria-hidden />
          <div className="matlas__grid-bg" aria-hidden />
          <GhostWord word={m.name} />

          <div className="matlas__hudline matlas__hudline--top" aria-hidden>
            <span>Dungeon · Muscle Atlas</span>
            <span className="matlas__live">
              <i /> {tour ? (running ? "Auto scan" : "Scan paused") : "Manual"} · {m.name}
            </span>
          </div>

          {/* ── left: the program ── */}
          <div className="matlas__dossier">
            <AnimatePresence mode="wait">
              <motion.div key={active} className="matlas__dossier-in" exit={{ opacity: 0, x: -24, filter: "blur(8px)", transition: { duration: 0.3 } }}>
                <motion.div
                  className="matlas__top"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <span className="matlas__label">{m.name} program</span>
                </motion.div>

                <h3 className="matlas__title">
                  {m.program.split(" ").map((w, i) => (
                    <span key={i} className="matlas__word">
                      <motion.span
                        initial={{ y: "110%", rotate: 4 }}
                        animate={{ y: "0%", rotate: 0 }}
                        transition={{ duration: 0.8, delay: 0.08 + i * 0.08, ease: EASE }}
                      >
                        {w}
                      </motion.span>
                    </span>
                  ))}
                </h3>

                <motion.p
                  className="matlas__desc"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
                >
                  {m.desc}
                </motion.p>

                <div className="matlas__targets">
                  <small>Targets</small>
                  <ul>
                    {GROUP_MUSCLES[active].split("·").map((t, i) => (
                      <motion.li
                        key={t}
                        initial={{ opacity: 0, scale: 0.7, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 380, damping: 22, delay: 0.4 + i * 0.07 }}
                      >
                        {t.trim()}
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <motion.div
                  className="matlas__intensity"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.45, ease: EASE }}
                >
                  <Gauge value={m.intensity} />
                  <div>
                    <small>Intensity</small>
                    <p>
                      Rated <b>{m.intensity}/100</b>. Expect {levelFor(m.intensity).toLowerCase()} sessions built on progressive overload.
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── centre: the athlete ── */}
          <div className="matlas__stage">
            <MuscleStage active={active} hover={hover} onHover={setHover} onSelect={choose} />
          </div>

          {/* ── right: moves + coach ── */}
          <div className="matlas__moves">
            <div className="matlas__moves-head">
              <small>The moves</small>
              <Counter index={index} />
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={active} className="matlas__moves-in" exit={{ opacity: 0, x: 24, filter: "blur(8px)", transition: { duration: 0.3 } }}>
                <ol className="matlas__list">
                  {m.exercises.map((e, i) => (
                    <motion.li
                      key={e}
                      initial={{ opacity: 0, x: 40, clipPath: "inset(0 0 0 100%)" }}
                      animate={{ opacity: 1, x: 0, clipPath: "inset(0 0 0 0%)" }}
                      transition={{ duration: 0.7, delay: 0.12 + i * 0.09, ease: EASE }}
                    >
                      <span className="matlas__num">{pad(i + 1)}</span>
                      <span className="matlas__move">{e}</span>
                      <motion.i
                        className="matlas__bar"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.9, delay: 0.35 + i * 0.09, ease: EASE }}
                      />
                    </motion.li>
                  ))}
                </ol>

                <motion.div
                  className="matlas__coach"
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.55, ease: EASE }}
                >
                  <div className="matlas__avatar">
                    <span className="matlas__avatar-ring" aria-hidden />
                    {coach?.image ? (
                      <Image src={coach.image} alt="" width={46} height={46} style={{ objectPosition: coach.imagePos }} />
                    ) : (
                      <span className="matlas__avatar-initial">{m.trainer[0]}</span>
                    )}
                  </div>
                  <div>
                    <small>Your coach</small>
                    <strong>{m.trainer}</strong>
                    {coach && <em>{coach.role}</em>}
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── bottom: the group rail with tour progress ── */}
          <div className="matlas__railwrap">
            <div ref={railRef} className="matlas__rail" role="tablist" aria-label="Muscle group" onKeyDown={onRailKey}>
              {IDS.map((id, i) => {
                const on = id === active;
                return (
                  <button
                    key={id}
                    data-id={id}
                    type="button"
                    role="tab"
                    tabIndex={on ? 0 : -1}
                    aria-selected={on}
                    className={`matlas__tab${on ? " is-active" : ""}${id === hover && !on ? " is-hover" : ""}`}
                    onClick={() => choose(id)}
                    onMouseEnter={() => setHover(id)}
                    onMouseLeave={() => setHover(null)}
                    data-cursor=""
                  >
                    {on && <motion.span layoutId="matlas-glow" className="matlas__tab-glow" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                    <span className="matlas__track" aria-hidden>
                      {on && tour ? (
                        <i
                          key={`${id}-tour`}
                          className="is-tour"
                          style={{ animationDuration: `${TOUR_MS}ms`, animationPlayState: running ? "running" : "paused" }}
                          onAnimationEnd={next}
                        />
                      ) : (
                        <i className={on ? "is-full" : undefined} />
                      )}
                    </span>
                    <small>{pad(i + 1)}</small>
                    <b>{muscles[id].name}</b>
                    <em>{GROUP_MUSCLES[id].split("·")[0].trim()}</em>
                  </button>
                );
              })}
            </div>
            {!reduce && (
              <button
                type="button"
                className={`matlas__play${tour ? " is-on" : ""}`}
                onClick={() => setTouring((t) => !t)}
                aria-label={tour ? "Stop the auto tour" : "Start the auto tour"}
                data-cursor=""
              >
                <span aria-hidden>{tour ? "❚❚" : "▶"}</span>
                <small>{tour ? "Tour" : "Auto tour"}</small>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Group classes: hauled into the rail on a battle rope */}
      <GroupClasses />
    </section>
  );
}
