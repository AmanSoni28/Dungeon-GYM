"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import Image from "next/image";
import { backgrounds, manifesto, stats } from "@/data/site";

const HIGHLIGHT = new Set(["weakness", "die,", "iron", "will,", "strength."]);

export function Manifesto() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // words light up one by one as you scroll
      gsap.fromTo(
        ".mword",
        { opacity: 0.1 },
        {
          opacity: 1,
          stagger: 0.08,
          ease: "none",
          scrollTrigger: { trigger: ".manifesto__text", start: "top 80%", end: "bottom 45%", scrub: true },
        }
      );
      gsap.utils.toArray<HTMLElement>(".stat__num").forEach((el) => {
        const end = Number(el.dataset.value);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: end,
          duration: 2.2,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 90%" },
          onUpdate: () => (el.textContent = Math.round(obj.v).toLocaleString("en-IN")),
        });
      });
      gsap.from(".stat", {
        y: 60,
        opacity: 0,
        stagger: 0.12,
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: { trigger: ".stats", start: "top 88%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="about" className="section manifesto">
      <div className="manifesto__bg" aria-hidden>
        <Image src={backgrounds.creed} alt="" fill sizes="100vw" quality={75} />
      </div>
      <div className="container">
        <p className="eyebrow">The Creed</p>
        <p className="manifesto__text">
          {manifesto.split(" ").map((w, i) => (
            <span key={i} className={`mword ${HIGHLIGHT.has(w.toLowerCase()) ? "is-gold" : ""}`}>
              {w}{" "}
            </span>
          ))}
        </p>

        <div className="stats">
          {stats.map((s) => (
            <div key={s.label} className="stat">
              <div className="stat__value">
                <span className="stat__num" data-value={s.value}>
                  0
                </span>
                <span className="stat__suffix">{s.suffix}</span>
              </div>
              <span className="stat__label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
