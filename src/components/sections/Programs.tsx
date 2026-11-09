"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { muscles, type MuscleId } from "@/data/site";
import { useInView } from "@/lib/useInView";
import { SplitHeading } from "@/components/ui/SplitHeading";
import { GroupClasses } from "./classes/GroupClasses";

const MuscleScene = dynamic(() => import("@/components/three/MuscleScene"), { ssr: false });

export function Programs() {
  const [active, setActive] = useState<MuscleId>("chest");
  const [hover, setHover] = useState<MuscleId | null>(null);
  const { ref, inView, seen } = useInView<HTMLDivElement>();
  const m = muscles[active];

  return (
    <section id="programs" className="section programs">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Programs · Muscle Map</p>
          <SplitHeading lines={["Choose what", { text: "you forge", className: "gold-text" }]} />
          <p className="lead">Tap any muscle on the figure (drag to rotate it) and we&apos;ll show you the program, the moves and your coach.</p>
        </div>

        <div className="mmap">
          <div ref={ref} className="mmap__stage" data-cursor="Rotate">
            {seen && <MuscleScene active={active} hover={hover} onHover={setHover} onSelect={setActive} running={inView} />}
            <div className="mmap__hovertag">{hover ? muscles[hover].name : "Drag · Tap a muscle"}</div>
          </div>

          <div className="mmap__panel">
            <div className="mmap__tabs" role="tablist">
              {(Object.keys(muscles) as MuscleId[]).map((id) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={id === active}
                  className={`chip ${id === active ? "is-active" : ""}`}
                  onClick={() => setActive(id)}
                  onMouseEnter={() => setHover(id)}
                  onMouseLeave={() => setHover(null)}
                  data-cursor=""
                >
                  {muscles[id].name}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                className="mmap__card glass"
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="mmap__label">{m.name} Program</span>
                <h3>{m.program}</h3>
                <p>{m.desc}</p>
                <ul className="mmap__list">
                  {m.exercises.map((e, i) => (
                    <motion.li
                      key={e}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.07 }}
                    >
                      <span>0{i + 1}</span>
                      {e}
                    </motion.li>
                  ))}
                </ul>
                <div className="mmap__meta">
                  <div>
                    <small>Coach</small>
                    <strong>{m.trainer}</strong>
                  </div>
                  <div className="mmap__intensity">
                    <small>Intensity · {m.intensity}%</small>
                    <div className="bar">
                      <motion.i initial={{ width: 0 }} animate={{ width: `${m.intensity}%` }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Group classes: hauled into the rail on a battle rope */}
      <GroupClasses />
    </section>
  );
}
