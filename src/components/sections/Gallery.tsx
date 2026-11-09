"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { gsap } from "@/lib/gsap";
import { gallery } from "@/data/site";
import { SplitHeading } from "@/components/ui/SplitHeading";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Gallery as a bento grid: every photo on show at once.
 * - scroll in: tiles unmask in a stagger (clip wipe + slow zoom-out), captions rise after
 * - scroll through: each photo drifts inside its frame (parallax)
 * - hover: 3D tilt, gold spotlight following the cursor, sheen sweep
 * - click: fullscreen lightbox with keyboard / arrow navigation
 */
export function Gallery() {
  const grid = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [dir, setDir] = useState(1);
  const n = gallery.length;

  // ── scroll reveal + parallax ──
  useEffect(() => {
    const gr = grid.current;
    if (!gr) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const ctx = gsap.context(() => {
      const tiles = gsap.utils.toArray<HTMLElement>(".bento__tile");
      const tl = gsap.timeline({ scrollTrigger: { trigger: gr, start: "top 78%" } });
      tl.fromTo(
        tiles,
        { clipPath: "inset(100% 0% 0% 0% round 18px)" },
        { clipPath: "inset(0% 0% 0% 0% round 18px)", duration: 1.4, ease: "expo.out", stagger: { each: 0.09, from: "start" } }
      )
        .from(gr.querySelectorAll(".bento__img"), { scale: 1.45, duration: 2, ease: "expo.out", stagger: 0.09 }, 0)
        .from(gr.querySelectorAll(".bento__line"), { scaleX: 0, duration: 1.1, ease: "power3.inOut", stagger: 0.09 }, 0.5)
        .from(gr.querySelectorAll(".bento__cap > *"), { yPercent: 120, opacity: 0, duration: 1, ease: "power4.out", stagger: 0.05 }, 0.6);

      tiles.forEach((t) => {
        gsap.fromTo(
          t.querySelector(".bento__parallax"),
          { yPercent: -7 },
          { yPercent: 7, ease: "none", scrollTrigger: { trigger: t, start: "top bottom", end: "bottom top", scrub: true } }
        );
      });
    }, gr);
    return () => ctx.revert();
  }, []);

  // ── hover tilt + spotlight (CSS vars only, no re-renders) ──
  const onMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
    el.style.setProperty("--rx", `${((0.5 - y) * 7).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((x - 0.5) * 9).toFixed(2)}deg`);
  };
  const onLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  // ── lightbox ──
  const step = useCallback(
    (d: number) => {
      setDir(d);
      setOpen((i) => (i === null ? i : (i + d + n) % n));
    },
    [n]
  );

  useEffect(() => {
    if (open === null) return;
    window.__lenis?.stop();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.__lenis?.start();
    };
  }, [open, step]);

  return (
    <section className="section gallery">
      <div className="container">
        <div className="section-head gallery__head">
          <p className="eyebrow">Inside the Dungeon</p>
          <SplitHeading lines={["Built for", { text: "the obsessed", className: "gold-text" }]} />
          <p className="lead">12,000 sq ft of iron, turf and shadow. Every corner is designed to make you train harder than you thought you could.</p>
        </div>

        <div ref={grid} className="bento">
          {gallery.map((g, i) => (
            <button
              key={g.src}
              type="button"
              className={`bento__tile is-${i + 1}`}
              onPointerMove={onMove}
              onPointerLeave={onLeave}
              onClick={() => {
                setDir(1);
                setOpen(i);
              }}
              data-cursor="View"
              aria-label={`Open photo: ${g.label}`}
            >
              <span className="bento__parallax">
                <span className="bento__img">
                  <Image src={g.src} alt={g.alt} fill sizes={i === 0 ? "(max-width: 760px) 92vw, 50vw" : "(max-width: 760px) 92vw, 25vw"} quality={85} />
                </span>
              </span>
              <span className="bento__shade" aria-hidden />
              <span className="bento__spot" aria-hidden />
              <span className="bento__sheen" aria-hidden />
              <span className="bento__cap">
                <span className="bento__num">{String(i + 1).padStart(2, "0")}</span>
                <span className="bento__label">{g.label}</span>
              </span>
              <span className="bento__line" aria-hidden />
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {open !== null && (
          <motion.div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={gallery[open].label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
            transition={{ duration: 0.5, ease: EASE }}
            onClick={() => setOpen(null)}
          >
            <motion.div
              className="lightbox__stage"
              initial={{ scale: 0.92, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.7, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
            >
              <AnimatePresence initial={false} custom={dir} mode="popLayout">
                <motion.figure
                  key={open}
                  className="lightbox__photo"
                  custom={dir}
                  variants={{
                    enter: (d: number) => ({ clipPath: d > 0 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)", scale: 1.08 }),
                    center: { clipPath: "inset(0 0% 0 0%)", scale: 1 },
                    exit: (d: number) => ({ opacity: 0.2, x: d > 0 ? "-12%" : "12%", scale: 0.96 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.9, ease: EASE }}
                >
                  <Image src={gallery[open].src} alt={gallery[open].alt} fill sizes="92vw" quality={90} />
                  <figcaption>
                    <span>{String(open + 1).padStart(2, "0")}</span>
                    {gallery[open].label}
                  </figcaption>
                </motion.figure>
              </AnimatePresence>
            </motion.div>

            <div className="lightbox__bar" onClick={(e) => e.stopPropagation()}>
              <button type="button" onClick={() => step(-1)} aria-label="Previous photo" data-cursor="">
                ←
              </button>
              <span className="lightbox__count">
                <b>{String(open + 1).padStart(2, "0")}</b> / {String(n).padStart(2, "0")}
              </span>
              <button type="button" onClick={() => step(1)} aria-label="Next photo" data-cursor="">
                →
              </button>
            </div>
            <button type="button" className="lightbox__close" onClick={() => setOpen(null)} aria-label="Close" data-cursor="">
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
