"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion, rand } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProvider";
import { readGateDebug } from "@/lib/gate/debug";

const STATUS = ["Heating the forge", "Loading the iron", "Lighting the torches", "Opening the gate"];

/** "The Forge": logo fills with molten gold 0→100, a crack of light splits the screen open. */
export function Preloader() {
  const { setPreloaded } = useApp();
  const root = useRef<HTMLDivElement>(null);
  const [count, setCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (readGateDebug() !== null) {
      setDone(true);
      return;
    }
    const reduce = prefersReducedMotion();
    const ctx = gsap.context(() => {
      const obj = { v: 0 };
      const tl = gsap.timeline();
      tl.to(obj, {
        v: 100,
        duration: reduce ? 0.2 : 2.2,
        ease: "power2.inOut",
        onUpdate: () => setCount(Math.round(obj.v)),
      })
        .to(".pl__content", { opacity: 0, scale: 0.96, filter: "blur(8px)", duration: 0.45, ease: "power2.in" })
        .to(".pl__crack", { scaleX: 1, duration: 0.45, ease: "power4.inOut" }, "<0.1")
        .to(".pl__crack", { scaleY: 6, opacity: 0, duration: 0.6, ease: "power2.out" })
        .to(".pl__half--top", { yPercent: -101, duration: 1.2, ease: "power4.inOut" }, "<")
        .to(".pl__half--bottom", { yPercent: 101, duration: 1.2, ease: "power4.inOut" }, "<")
        .add(() => setPreloaded(true), "<0.25") // hands over to the cinematic intro
        .add(() => setDone(true));
    }, root);
    return () => ctx.revert();
  }, [setPreloaded]);

  if (done) return null;
  const status = STATUS[Math.min(STATUS.length - 1, Math.floor(count / 26))];

  return (
    <div ref={root} className="pl" aria-label="Loading" role="status">
      <div className="pl__half pl__half--top" />
      <div className="pl__half pl__half--bottom" />
      <div className="pl__crack" />

      <div className="pl__content">
        <div className="pl__embers" aria-hidden>
          {Array.from({ length: 28 }, (_, i) => (
            <span
              key={i}
              style={
                {
                  "--x": `${rand(i) * 100}%`,
                  "--d": `${2.5 + rand(i + 40) * 3}s`,
                  "--delay": `${rand(i + 80) * -5}s`,
                  "--s": `${2 + rand(i + 120) * 4}px`,
                  "--drift": `${(rand(i + 7) - 0.5) * 120}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>

        <div className="pl__logo" style={{ "--p": `${count}%` } as React.CSSProperties}>
          <span className="pl__word">DUNGEON</span>
          <span className="pl__sub">Gym &amp; Spa</span>
        </div>

        <div className="pl__foot">
          <span className="pl__status">{status}…</span>
          <span className="pl__count">{String(count).padStart(3, "0")}</span>
        </div>
        <div className="pl__bar" style={{ transform: `scaleX(${count / 100})` }} />
      </div>
    </div>
  );
}
