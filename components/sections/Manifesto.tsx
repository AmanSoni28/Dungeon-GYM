"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import Image from "next/image";
import { backgrounds, manifesto, stats } from "@/data/site";

const HIGHLIGHT = new Set(["weakness", "die,", "iron", "will,", "strength."]);

export function Manifesto() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = root.current;
    if (!section) return;

    const mm = gsap.matchMedia(section);

    mm.add(
      { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
      (ctx) => {
        const { reduce } = ctx.conditions as { reduce: boolean };

        // ── count-up numbers (instant for reduced motion) ──
        gsap.utils.toArray<HTMLElement>(".stat__num").forEach((el) => {
          const end = Number(el.dataset.value);
          if (reduce) {
            el.textContent = end.toLocaleString("en-IN");
            return;
          }
          const obj = { v: 0 };
          gsap.to(obj, {
            v: end,
            duration: 2.4,
            ease: "expo.out",
            scrollTrigger: { trigger: el, start: "top 92%" },
            onUpdate: () => (el.textContent = Math.round(obj.v).toLocaleString("en-IN")),
          });
        });

        if (reduce) return;

        // ── eyebrow: line draws, letters track in ──
        gsap.from(".manifesto .eyebrow", {
          "--eb-line": 0,
          letterSpacing: "0.8em",
          opacity: 0,
          duration: 1.4,
          ease: "power4.out",
          scrollTrigger: { trigger: ".manifesto__text", start: "top 88%" },
        });

        // ── words: rise and flip up out of the forge, focusing from blur ──
        gsap.fromTo(
          ".mword__inner",
          { yPercent: 70, rotateX: -85, opacity: 0, filter: "blur(14px)" },
          {
            yPercent: 0,
            rotateX: 0,
            opacity: 1,
            filter: "blur(0px)",
            ease: "power2.out",
            stagger: { each: 0.06 },
            scrollTrigger: {
              trigger: ".manifesto__text",
              start: "top 82%",
              end: "bottom 55%",
              scrub: 0.8,
            },
          }
        );

        // ── gold words: ignite with a molten sheen as they land, then shimmer occasionally ──
        gsap.utils.toArray<HTMLElement>(".mword.is-gold").forEach((el) => {
          const tl = gsap.timeline({
            scrollTrigger: { trigger: el, start: "top 62%", toggleActions: "play none none reverse" },
          });
          tl.fromTo(el, { "--sheen": "160%", "--glow": 0 }, { "--sheen": "-60%", "--glow": 1, duration: 1.6, ease: "power2.inOut" });
          tl.to(el, {
            keyframes: [{ "--sheen": "160%", duration: 0 }, { "--sheen": "-60%", duration: 1.8, ease: "sine.inOut" }],
            repeat: -1,
            repeatDelay: 4.5,
          });
        });

        // ── stats: rule draws across, dividers grow down, blocks rise ──
        const statsTl = gsap.timeline({ scrollTrigger: { trigger: ".stats", start: "top 88%" } });
        statsTl
          .from(".stats__rule", { scaleX: 0, duration: 1.4, ease: "expo.inOut" })
          .from(".stat", { "--divider": 0, duration: 1, stagger: 0.1, ease: "expo.out" }, 0.5)
          .from(
            ".stat__value, .stat__label",
            { yPercent: 100, opacity: 0, duration: 1.2, stagger: 0.07, ease: "expo.out" },
            0.55
          )
          .from(".stat__suffix", { scale: 0, opacity: 0, transformOrigin: "0% 100%", duration: 0.8, stagger: 0.12, ease: "back.out(3)" }, 1.4);

        // ── ember spotlight follows the cursor ──
        const xTo = gsap.quickTo(section, "--mx", { duration: 0.9, ease: "power3.out" });
        const yTo = gsap.quickTo(section, "--my", { duration: 0.9, ease: "power3.out" });
        const onMove = (e: PointerEvent) => {
          const r = section.getBoundingClientRect();
          xTo(((e.clientX - r.left) / r.width) * 100);
          yTo(((e.clientY - r.top) / r.height) * 100);
        };
        section.addEventListener("pointermove", onMove);
        return () => section.removeEventListener("pointermove", onMove);
      }
    );

    return () => mm.revert();
  }, []);

  return (
    <section ref={root} id="about" className="section manifesto">
      <div className="manifesto__bg" aria-hidden>
        <Image src={backgrounds.creed} alt="" fill sizes="100vw" quality={75} />
      </div>
      <div className="manifesto__glow" aria-hidden />
      <div className="container">
        <p className="eyebrow">The Creed</p>
        <p className="manifesto__text" aria-label={manifesto}>
          {manifesto.split(" ").flatMap((w, i) => [
            <span key={i} aria-hidden className={`mword ${HIGHLIGHT.has(w.toLowerCase()) ? "is-gold" : ""}`}>
              <span className="mword__inner">{w}</span>
            </span>,
            " ",
          ])}
        </p>

        <div className="stats">
          <span className="stats__rule" aria-hidden />
          {stats.map((s) => (
            <div key={s.label} className="stat">
              <div className="stat__clip">
                <div className="stat__value">
                  <span className="stat__num" data-value={s.value}>
                    0
                  </span>
                  <span className="stat__suffix">{s.suffix}</span>
                </div>
              </div>
              <div className="stat__clip">
                <span className="stat__label">{s.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
