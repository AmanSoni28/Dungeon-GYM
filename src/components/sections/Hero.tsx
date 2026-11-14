"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { brand } from "@/data/site";
import { readEnvironment } from "@/lib/intro/capabilities";

const GateScene = dynamic(() => import("@/components/three/GateScene"), { ssr: false });

/** scroll progress over which the landing wordmark gives way as the gate opens */
const TITLE_OUT = 0.14;

function Letters({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((ch, i) => (
        <span key={i} className="hero__char" style={{ "--i": i } as React.CSSProperties} aria-hidden>
          {ch}
        </span>
      ))}
    </>
  );
}

/**
 * Landing: the closed gate behind the DUNGEON wordmark. Scrolling swings the heavy iron doors open
 * and walks the visitor through them, into the real gym glimpsed behind them. Scrolling back closes them.
 */
export function Hero() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const { loaded } = useApp();
  const [active, setActive] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [lite, setLite] = useState(false);

  // Pin the hero and map scroll → 0..1 progress for the 3D camera + gate
  useEffect(() => {
    const el = section.current!;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "+=230%",
        pin: true,
        scrub: true,
        onUpdate: (s) => {
          const p = s.progress;
          progress.current = p;
          el.style.setProperty("--p", p.toFixed(4));
          el.style.setProperty("--pi", Math.min(1, p / TITLE_OUT).toFixed(4));
        },
        onToggle: (s) => setActive(s.isActive || s.progress < 1),
      });
    }, el);
    return () => ctx.revert();
  }, []);

  // lighter 3D on phones / low-power devices
  useEffect(() => {
    const env = readEnvironment();
    setLite(env.mobile || env.lowPower);
  }, []);

  // Landing reveal: the wordmark materialises out of the dark, letter by letter
  useEffect(() => {
    if (!loaded) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".hero__rule", { scaleX: 0, duration: 1.6, ease: "power3.inOut" })
        .from(".hero__char", { opacity: 0, y: 24, filter: "blur(14px)", duration: 1.8, stagger: { each: 0.07, from: "center" } }, 0.2)
        .from(".hero__word", { letterSpacing: "0.6em", duration: 2.4 }, 0.2)
        .from(".hero__kicker", { opacity: 0, y: 10, duration: 1.2 }, 1)
        .from(".hero__cta", { opacity: 0, y: 16, duration: 1.2 }, 1.2)
        .from(".hero__frame, .hero__scroll, .hero__hint", { opacity: 0, duration: 1.6 }, 1.3);
    }, section);
    return () => ctx.revert();
  }, [loaded]);

  return (
    <section ref={section} id="top" className="hero" aria-label={brand.full} data-reveal={loaded ? "true" : "false"}>
      <div className="hero__canvas">
        {/* paused behind the cinematic intro, starts when the homepage is revealed */}
        <GateScene progress={progress} active={active && loaded} lite={lite} onReady={() => setSceneReady(true)} />
      </div>
      <div className="hero__vignette" />
      <div className="hero__frame" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>

      <div className="hero__content">
        <span className="hero__rule" aria-hidden />
        <h1 className="hero__word" aria-label={brand.name}>
          <Letters text="DUNGEON" />
        </h1>
        <p className="hero__kicker">
          <span>Gym</span>
          <i aria-hidden />
          <span>Spa</span>
        </p>
        <div className="hero__cta">
          <Button label="Step Inside" href="#inside" variant="ghost" />
        </div>
      </div>

      <p className="hero__hint" aria-hidden>
        Scroll to open the gate
      </p>
      <div className="hero__scroll" aria-hidden>
        <i />
      </div>

      {loaded && !sceneReady && (
        <div className="hero__loading" role="status">
          <span className="hero__spinner" aria-hidden />
          <span className="sr-only">Loading the Dungeon</span>
        </div>
      )}

    </section>
  );
}
