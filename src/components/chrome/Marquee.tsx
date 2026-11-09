"use client";

import { useEffect, useRef } from "react";

/** idle drift (px/s) and how strongly scrolling pushes the ribbon */
const DRIFT = 46;
const SCROLL_PUSH = 0.9;
const MAX_SPEED = 2400;
/** share of the ribbon's width (each side of centre) over which a word lights up */
const SPOT = 0.3;

/**
 * Premium "spotlight" ribbon. Words glide as gold outlines and ignite into molten gold as they pass the
 * centre. The ribbon drifts on its own, follows the visitor's scroll (speed, direction and a slight
 * lean), eases down on hover, and only animates while on screen. All motion is written to the DOM
 * directly (no React renders).
 */
export function Marquee({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const tr = track.current;
    if (!el || !tr) return;
    const words = Array.from(tr.querySelectorAll<HTMLElement>(".marquee__word"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // layout cache (measured on resize only: nothing is read from the DOM per frame)
    let rowW = 1;
    let half = 1;
    let centres: number[] = [];
    const measure = () => {
      const row = tr.firstElementChild as HTMLElement | null;
      rowW = row?.offsetWidth || 1;
      half = el.clientWidth / 2 || 1;
      // .marquee__track is the offsetParent of every word (position: relative)
      centres = words.map((w) => w.offsetLeft + w.offsetWidth / 2);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    document.fonts?.ready.then(measure).catch(() => {});

    const paint = (x: number) => {
      tr.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
      for (let i = 0; i < words.length; i++) {
        const d = Math.abs(centres[i] + x - half) / (half * 2 * SPOT);
        const f = d >= 1 ? 0 : 1 - d * d * (3 - 2 * d);
        words[i].style.setProperty("--f", f.toFixed(3));
      }
    };

    if (reduce) {
      // still and calm: centre the first row, light what sits in the middle
      paint(-rowW / 2);
      el.classList.add("is-in");
      return () => ro.disconnect();
    }

    const dir = reverse ? 1 : -1;
    let x = -rowW / 2;
    let speed = DRIFT;
    let lean = 0;
    let hoverK = 1;
    let hovering = false;
    let lastY = window.scrollY;
    let flow = dir; // follows the scroll direction, then keeps going that way
    let raf = 0;
    let last = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
      last = now;

      const y = window.scrollY;
      const vy = dt > 0 ? (y - lastY) / dt : 0;
      lastY = y;
      if (Math.abs(vy) > 30) flow = Math.sign(vy) * dir;

      const target = Math.min(MAX_SPEED, DRIFT + Math.abs(vy) * SCROLL_PUSH);
      // fast attack, slow glide back to the drift
      speed += (target - speed) * (1 - Math.exp(-dt * (target > speed ? 9 : 2.2)));
      hoverK += ((hovering ? 0.18 : 1) - hoverK) * (1 - Math.exp(-dt * 4));

      x += flow * speed * hoverK * dt;
      if (x <= -rowW) x += rowW;
      if (x > 0) x -= rowW;

      // lean into the motion (inertia), settling upright at drift speed
      const wantLean = Math.max(-9, Math.min(9, -flow * (speed - DRIFT) * 0.006));
      lean += (wantLean - lean) * (1 - Math.exp(-dt * 6));
      tr.style.setProperty("--lean", `${lean.toFixed(2)}deg`);
      paint(x);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("is-in");
          if (!raf) {
            last = 0;
            lastY = window.scrollY;
            raf = requestAnimationFrame(frame);
          }
        } else if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "80px 0px" }
    );
    io.observe(el);
    const enter = () => (hovering = true);
    const leave = () => (hovering = false);
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointerleave", leave);
    paint(x);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, [reverse, items]);

  const row = (key: string) => (
    <div className="marquee__row" key={key}>
      {items.map((t, i) => (
        <span className="marquee__item" key={i}>
          <span className="marquee__word" data-text={t}>
            {t}
          </span>
          <i className="marquee__star" aria-hidden>
            <svg viewBox="0 0 24 24">
              <path d="M12 0c.9 6.6 4.8 10.6 12 12-7.2 1.4-11.1 5.4-12 12-.9-6.6-4.8-10.6-12-12C7.2 10.6 11.1 6.6 12 0z" />
            </svg>
          </i>
        </span>
      ))}
    </div>
  );

  return (
    <div ref={root} className={`marquee ${reverse ? "is-reverse" : ""}`} aria-hidden>
      <div className="marquee__ribbon">
        <div ref={track} className="marquee__track">
          {row("a")}
          {row("b")}
          {row("c")}
        </div>
      </div>
    </div>
  );
}
