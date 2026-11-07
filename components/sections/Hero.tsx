"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { brand } from "@/data/site";

const GateScene = dynamic(() => import("@/components/three/GateScene"), { ssr: false });

function Letters({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((ch, i) => (
        <span key={i} className="hero__char">
          {ch === " " ? " " : ch}
        </span>
      ))}
    </>
  );
}

export function Hero() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const { loaded } = useApp();
  const [active, setActive] = useState(true);

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
          // golden light floods in as the camera passes through the gate, and stays:
          // the real-gym scene that follows starts from the same light (one continuous shot)
          const t = Math.min(1, Math.max(0, (p - 0.8) / 0.17));
          el.style.setProperty("--flash", (t * t * (3 - 2 * t)).toFixed(3));
        },
        onToggle: (s) => setActive(s.isActive || s.progress < 1),
      });
    }, el);
    return () => ctx.revert();
  }, []);

  // Intro once the preloader opens
  useEffect(() => {
    if (!loaded) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
      tl.from(".hero__char", { yPercent: 120, rotateX: -90, opacity: 0, duration: 1.4, stagger: 0.045 })
        .from(".hero .eyebrow", { opacity: 0, y: 20, duration: 1 }, "<0.3")
        .from(".hero__sub", { opacity: 0, y: 30, filter: "blur(10px)", duration: 1.2 }, "<0.4")
        .from(".hero__ctas > *", { opacity: 0, y: 30, stagger: 0.1, duration: 1 }, "<0.2")
        .from(".hero__meta > *, .hero__scroll", { opacity: 0, duration: 1.2, stagger: 0.1 }, "<0.3");
    }, section);
    return () => ctx.revert();
  }, [loaded]);

  return (
    <section ref={section} id="top" className="hero">
      <div className="hero__canvas">
        {/* paused behind the cinematic intro, starts when the homepage is revealed */}
        <GateScene progress={progress} active={active && loaded} />
      </div>
      <div className="hero__vignette" />

      <div className="hero__content">
        <p className="eyebrow">{brand.full} · Est. 2016</p>
        <h1 className="hero__title">
          <span className="hero__line">
            <Letters text="WELCOME TO" />
          </span>
          <span className="hero__line hero__line--gold">
            <Letters text="DUNGEON" />
          </span>
        </h1>
        <p className="hero__sub">{brand.tagline}</p>
        <div className="hero__ctas">
          <Button label="Join the Dungeon" href="#plans" />
          <Button label="360° Tour" href="#tour" variant="ghost" arrow={false} />
        </div>
      </div>

      <div className="hero__meta">
        <span>
          <i className="live-dot" /> Open now · 5 AM – 11 PM
        </span>
        <span>Strength · Combat · Recovery</span>
      </div>

      <div className="hero__scroll" aria-hidden>
        <span>Scroll to enter</span>
        <i />
      </div>

      <div className="hero__flash" aria-hidden />
    </section>
  );
}
