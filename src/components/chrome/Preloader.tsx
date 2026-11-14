"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion, rand } from "@/lib/utils";
import { useApp } from "@/components/providers/AppProvider";
import { readGateDebug } from "@/lib/gate/debug";

const STATUS = ["Heating the forge", "Loading the iron", "Lighting the torches", "Opening the gate"];

/** "The Forge": logo rises and fills with molten gold 0→100, collapses into a crack of light that splits the screen open. */
export function Preloader() {
  const { setPreloaded } = useApp();
  const root = useRef<HTMLDivElement>(null);
  const logo = useRef<HTMLDivElement>(null);
  const countEl = useRef<HTMLSpanElement>(null);
  const statusEl = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (readGateDebug() !== null) {
      setDone(true);
      return;
    }
    const reduce = prefersReducedMotion();
    const k = reduce ? 0.1 : 1; // time scale
    const ctx = gsap.context(() => {
      const obj = { v: 0 };
      let shown = -1;
      let statusIdx = 0;
      // per-frame updates go straight to the DOM: re-rendering React 60×/s was the main source of jank
      const paint = () => {
        const v = Math.round(obj.v);
        if (v === shown) return;
        shown = v;
        logo.current?.style.setProperty("--p", `${v}%`);
        if (countEl.current) countEl.current.textContent = String(v).padStart(3, "0");
        if (bar.current) bar.current.style.transform = `scaleX(${v / 100})`;
        const i = Math.min(STATUS.length - 1, Math.floor(v / 26));
        if (i !== statusIdx && statusEl.current) {
          statusIdx = i;
          statusEl.current.textContent = `${STATUS[i]}…`;
          gsap.fromTo(statusEl.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" });
        }
      };
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      // ── entrance
      tl.fromTo(".pl__glow", { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.6 * k }, 0)
        .fromTo(
          ".pl__word",
          // transform-only stand-ins for the old blur + letter-spacing tween (those repainted/re-laid-out every frame)
          { clipPath: "inset(100% 0 0 0)", scaleX: 1.25, opacity: 0, yPercent: 18 },
          { clipPath: "inset(0% 0 0 0)", scaleX: 1, opacity: 1, yPercent: 0, duration: 1.4 * k },
          0.1 * k
        )
        .fromTo(".pl__rule", { scaleX: 0 }, { scaleX: 1, duration: 1.1 * k, ease: "power3.inOut" }, 0.5 * k)
        .fromTo(".pl__sub", { opacity: 0, scaleX: 1.5 }, { opacity: 1, scaleX: 1, duration: 1.3 * k }, 0.6 * k)
        .fromTo(".pl__foot, .pl__track", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.9 * k }, 0.7 * k)

        // ── molten fill (counter drives the gradient)
        .to(obj, { v: 100, duration: 2.4 * k, ease: "power2.inOut", onUpdate: paint }, 0.4 * k)

        // ── exit: flare, squash into the crack, split open
        .addLabel("exit")
        .to(".pl__word", { filter: "brightness(2.2)", duration: 0.25 * k, ease: "power2.out" }, "exit")
        .to(".pl__foot, .pl__track", { opacity: 0, y: 12, duration: 0.4 * k, ease: "power2.in" }, "exit")
        .to(".pl__logo", { scaleY: 0.015, scaleX: 1.15, opacity: 0, duration: 0.55 * k, ease: "power4.in" }, "exit+=0.15")
        .to(".pl__glow", { scaleX: 2.4, scaleY: 0.12, opacity: 0.9, duration: 0.55 * k, ease: "power4.in" }, "exit+=0.15")
        .to(".pl__crack", { scaleX: 1, duration: 0.6 * k, ease: "expo.inOut" }, "exit+=0.25")
        .addLabel("split", "exit+=0.75")
        .fromTo(".pl__flash", { opacity: 0.55 }, { opacity: 0, duration: 0.9 * k, ease: "power2.out" }, "split")
        .to(".pl__crack", { scaleY: 30, opacity: 0, duration: 0.8 * k, ease: "power3.out" }, "split")
        .to(".pl__glow", { opacity: 0, duration: 0.6 * k, ease: "power2.out" }, "split")
        .to(".pl__half--top", { yPercent: -101, duration: 1.3 * k, ease: "power4.inOut" }, "split")
        .to(".pl__half--bottom", { yPercent: 101, duration: 1.3 * k, ease: "power4.inOut" }, "split")
        .set(".pl__half", { "--rim": 1 }, "split")
        .to(".pl__half", { "--rim": 0, duration: 1.1 * k, ease: "power2.in" }, "split+=0.05")
        .add(() => setPreloaded(true), "split") // hands over to the cinematic intro
        .add(() => setDone(true));
    }, root);
    return () => ctx.revert();
  }, [setPreloaded]);

  if (done) return null;

  return (
    <div ref={root} className="pl" aria-label="Loading" role="status">
      <div className="pl__half pl__half--top" />
      <div className="pl__half pl__half--bottom" />
      <div className="pl__flash" aria-hidden />

      <div className="pl__content">
        <div className="pl__glow" aria-hidden />
        <div className="pl__embers" aria-hidden>
          {Array.from({ length: 24 }, (_, i) => (
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

        <div ref={logo} className="pl__logo" style={{ "--p": "0%" } as React.CSSProperties}>
          <span className="pl__wordwrap">
            <span className="pl__word">DUNGEON</span>
            <span className="pl__word pl__word--shine" aria-hidden>
              DUNGEON
            </span>
          </span>
          <span className="pl__subrow">
            <i className="pl__rule" />
            <span className="pl__sub">Gym &amp; Spa</span>
            <i className="pl__rule" />
          </span>
        </div>

        <div className="pl__foot">
          <span ref={statusEl} className="pl__status">
            {STATUS[0]}…
          </span>
          <span ref={countEl} className="pl__count">
            000
          </span>
        </div>
        <div className="pl__track">
          <div ref={bar} className="pl__bar" style={{ transform: "scaleX(0)" }} />
        </div>
      </div>
      <div className="pl__crack" />
    </div>
  );
}
