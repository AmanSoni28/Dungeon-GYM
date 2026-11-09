"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { lerp, rand } from "@/lib/utils";

// Flame and droplet share the same path structure → they can be morphed number by number
const FLAME = [50, 0, 60, 25, 92, 40, 84, 70, 80, 90, 64, 100, 50, 100, 36, 100, 20, 90, 16, 70, 10, 42, 40, 30, 50, 0];
const DROP = [50, 4, 50, 4, 84, 48, 84, 70, 84, 90, 68, 100, 50, 100, 32, 100, 16, 90, 16, 70, 16, 48, 50, 4, 50, 4];

function shape(t: number) {
  const n = FLAME.map((f, i) => lerp(f, DROP[i], t).toFixed(2));
  return `M${n[0]} ${n[1]} C${n[2]} ${n[3]},${n[4]} ${n[5]},${n[6]} ${n[7]} C${n[8]} ${n[9]},${n[10]} ${n[11]},${n[12]} ${n[13]} C${n[14]} ${n[15]},${n[16]} ${n[17]},${n[18]} ${n[19]} C${n[20]} ${n[21]},${n[22]} ${n[23]},${n[24]} ${n[25]} Z`;
}

function makeSprite(color: string, elongate = 1) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64 * elongate;
  const g = c.getContext("2d")!;
  g.scale(1, elongate); // stretch the round glow into a droplet
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.25, color);
  grad.addColorStop(1, "transparent");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/** Pinned section: embers rising turn into droplets falling; flame morphs into a water drop. */
export function FireToWater() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const path = useRef<SVGPathElement>(null);
  const prog = useRef(0);

  useEffect(() => {
    const el = section.current!;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "+=180%",
        pin: true,
        scrub: true,
        onUpdate: (s) => {
          prog.current = s.progress;
          el.style.setProperty("--p", s.progress.toFixed(4));
          path.current?.setAttribute("d", shape(gsap.parseEase("power2.inOut")(s.progress)));
          document.documentElement.dataset.mode = s.progress > 0.5 ? "spa" : "gym";
        },
        onLeaveBack: () => (document.documentElement.dataset.mode = "gym"),
      });
    }, el);
    return () => ctx.revert();
  }, []);

  // particle field (2D canvas: light and fast)
  useEffect(() => {
    const cv = canvas.current!;
    const g = cv.getContext("2d")!;
    const ember = makeSprite("rgba(255,120,40,0.9)");
    const drop = makeSprite("rgba(120,220,230,0.9)", 2);
    const N = 160;
    const parts = Array.from({ length: N }, (_, i) => ({
      x: rand(i),
      y: rand(i + 300),
      s: 0.4 + rand(i + 600) * 1.2,
      v: 0.3 + rand(i + 900) * 0.8,
      w: rand(i + 1200) * Math.PI * 2,
    }));
    let raf = 0;
    let visible = false;
    let last = performance.now();
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(cv);

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio);
      cv.width = cv.clientWidth * dpr;
      cv.height = cv.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      const p = prog.current;
      const W = cv.width;
      const H = cv.height;
      g.clearRect(0, 0, W, H);
      g.globalCompositeOperation = "lighter";
      const dir = lerp(-1, 1.6, p); // rise → fall
      for (const pt of parts) {
        pt.y += (dir * pt.v * dt) / 4;
        pt.x += Math.sin(now / 900 + pt.w) * dt * 0.01 * (1 - p);
        if (pt.y < -0.05) pt.y = 1.05;
        if (pt.y > 1.05) pt.y = -0.05;
        const size = pt.s * 22 * (W / 1400 + 0.5);
        const flick = 0.6 + Math.sin(now / 120 + pt.w * 10) * 0.4;
        if (p < 0.98) {
          g.globalAlpha = (1 - p) * flick * 0.9;
          g.drawImage(ember, pt.x * W - size / 2, pt.y * H - size / 2, size, size);
        }
        if (p > 0.02) {
          g.globalAlpha = p * 0.7;
          g.drawImage(drop, pt.x * W - size / 4, pt.y * H - size / 2, size / 2, size);
        }
      }
      g.globalAlpha = 1;
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <section ref={section} className="f2w" aria-label="From the battle to the healing">
      <canvas ref={canvas} className="f2w__canvas" />
      <div className="f2w__content">
        <svg className="f2w__shape" viewBox="0 0 100 100" aria-hidden>
          <defs>
            <linearGradient id="f2wg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" className="f2w__stop1" />
              <stop offset="1" className="f2w__stop2" />
            </linearGradient>
          </defs>
          <path ref={path} d={shape(0)} fill="url(#f2wg)" />
        </svg>
        <h2 className="f2w__line f2w__line--a h-lg">After the battle…</h2>
        <h2 className="f2w__line f2w__line--b h-lg">…comes the healing.</h2>
      </div>
    </section>
  );
}
