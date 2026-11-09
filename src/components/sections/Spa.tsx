"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { rituals, spaServices } from "@/data/site";
import { rand } from "@/lib/utils";
import { SplitHeading } from "@/components/ui/SplitHeading";
import { Button } from "@/components/ui/Button";

export function Spa() {
  const root = useRef<HTMLElement>(null);
  const [ritual, setRitual] = useState<keyof typeof rituals>("legs");
  const r = rituals[ritual];

  // keep the site in "spa mode" while this section is on screen
  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom 40%",
        onEnterBack: () => (document.documentElement.dataset.mode = "spa"),
        onLeave: () => (document.documentElement.dataset.mode = "gym"),
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="spa" className="section spa">
      {/* SVG water-ripple filter used on hovered panels */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
        <filter id="ripple">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="3">
            <animate attributeName="baseFrequency" dur="10s" values="0.008 0.02;0.012 0.03;0.008 0.02" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="40" />
        </filter>
      </svg>

      <div className="spa__steam" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            style={
              {
                "--x": `${rand(i + 50) * 100}%`,
                "--d": `${12 + rand(i + 60) * 10}s`,
                "--delay": `${-rand(i + 70) * 20}s`,
                "--s": `${200 + rand(i + 80) * 260}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="container">
        <div className="section-head">
          <p className="eyebrow">The Sanctum · Spa &amp; Recovery</p>
          <SplitHeading className="h-lg spa__title" lines={["Recover like", { text: "royalty", className: "spa__italic" }]} />
          <p className="lead">
            Strength is built in recovery. Steam, sauna, ice and expert hands under the same roof as the iron.
          </p>
        </div>

        <div className="spa__panels">
          {spaServices.map((s, i) => (
            <article key={s.name} className="spa-panel" style={{ "--h": s.hue, "--i": i } as React.CSSProperties} data-cursor="" tabIndex={0}>
              <div className="spa-panel__visual" aria-hidden>
                <Image src={s.image} alt="" fill sizes="(max-width: 820px) 100vw, 60vw" className="spa-panel__img" />
                <span className="spa-panel__tint" />
                <span className="spa-panel__blob" />
                <span className="spa-panel__blob is-2" />
                <span className="spa-panel__caustic" />
              </div>
              <span className="spa-panel__num">0{i + 1}</span>
              <h3 className="spa-panel__vtitle">{s.name}</h3>
              <div className="spa-panel__content">
                <span className="spa-panel__time">{s.time}</span>
                <h3>{s.name}</h3>
                <p>{s.desc}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Recovery Planner */}
        <div className="planner glass">
          <div className="planner__head">
            <span className="eyebrow">Recovery Planner</span>
            <h3>What did you train today?</h3>
            <div className="planner__chips">
              {(Object.keys(rituals) as (keyof typeof rituals)[]).map((k) => (
                <button key={k} className={`chip ${k === ritual ? "is-active" : ""}`} onClick={() => setRitual(k)} data-cursor="">
                  {rituals[k].label}
                </button>
              ))}
            </div>
          </div>

          <div className="planner__result">
            <AnimatePresence mode="wait">
              <motion.ol
                key={ritual}
                className="planner__steps"
                initial="hidden"
                animate="show"
                exit="hidden"
                variants={{ show: { transition: { staggerChildren: 0.12 } }, hidden: {} }}
              >
                {r.steps.map((st, i) => (
                  <motion.li
                    key={st.name}
                    variants={{
                      hidden: { opacity: 0, y: 24, filter: "blur(6px)" },
                      show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
                    }}
                  >
                    <span className="planner__dot">{i + 1}</span>
                    <div>
                      <strong>{st.name}</strong>
                      <small>{st.time}</small>
                    </div>
                  </motion.li>
                ))}
              </motion.ol>
            </AnimatePresence>
            <div className="planner__cta">
              <span>
                Your ritual: <b>{r.steps.reduce((a, s) => a + parseInt(s.time), 0)} min</b> of recovery
              </span>
              <Button label="Book this Ritual" href="#pass" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
