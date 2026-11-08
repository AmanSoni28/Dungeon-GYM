"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { classes } from "@/data/site";
import { useInView } from "@/lib/useInView";
import {
  cardLook,
  carouselPos,
  chase,
  createRopeRig,
  focusX,
  haulTotal,
  HOLD_END,
  PULL,
  pullDuration,
  rigState,
  ropePath,
  scrollToHaul,
  SPRING,
  springStep,
  swingStep,
  vibration,
  type RopePoint,
} from "@/lib/classes/ropePull";

const RopeAthlete = dynamic(() => import("./RopeAthlete"), { ssr: false });

/** scroll length of the pinned haul: about half a screen per class */
const PIN_LENGTH = () => `+=${classes.length * 55}%`;

type Car = { x: number; v: number; th: number; w: number };

/** scroll progress (0..1 of the pin) at which card k has just been hauled into the centre */
const progressFor = (k: number) => {
  const t = PULL.prelude + k * PULL.stroke + PULL.drive * PULL.stroke + 0.06;
  return Math.min(1, t / (pullDuration() + HOLD_END));
};

/**
 * Group Classes: the section pins and, as the visitor scrolls, an athlete hauls a battle rope one
 * stroke per class. The cards are threaded on the rope through gold eyelets; each stroke brings the next
 * card into the centre spotlight, while the ones already shown are hauled on and fade behind him.
 * Scrolling back lets the rope run out again. Everything per-frame is written straight to the DOM.
 */
export function GroupClasses() {
  const pin = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const athlete = useRef<HTMLDivElement>(null);
  const meter = useRef<HTMLDivElement>(null);
  const paths = useRef<SVGPathElement[]>([]);
  const rig = useRef(createRopeRig());
  const trigger = useRef<ScrollTrigger | null>(null);
  const { ref: viewRef, inView, seen } = useInView<HTMLDivElement>("300px");

  useEffect(() => {
    const pn = pin.current;
    const st = stage.current;
    const rl = rail.current;
    const ath = athlete.current;
    if (!pn || !st || !rl || !ath) return;
    const slots = Array.from(rl.querySelectorAll<HTMLElement>(".class-slot"));
    const n = slots.length;
    const R = rig.current;
    // reduced motion: same scroll steps, but each card simply snaps into the spotlight (no springs, no swing)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── layout cache (re-measured on resize only) ──
    const L = { cardW: 300, pitch: 340, railX: 0, railY: 0, slotY: 0, athX: 0, athY: 0, athW: 1, athH: 1, w: 1, fx: 0 };
    const cars: Car[] = slots.map(() => ({ x: 0, v: 0, th: 0, w: 0 }));
    let placed = false;
    const targetX = (i: number, pos: number) => L.fx + (i - pos) * L.pitch - L.cardW / 2;
    const measure = () => {
      L.cardW = slots[0]?.offsetWidth || 300;
      L.pitch = L.cardW + (parseFloat(getComputedStyle(rl).columnGap) || 40);
      L.railX = rl.offsetLeft;
      L.railY = rl.offsetTop;
      L.slotY = slots[0]?.offsetTop ?? 0;
      L.athX = ath.offsetLeft;
      L.athY = ath.offsetTop;
      L.athW = ath.offsetWidth || 1;
      L.athH = ath.offsetHeight || 1;
      L.w = st.clientWidth;
      L.fx = focusX(L.w, L.athX + L.athW * 0.86, L.cardW) - L.railX;
      st.style.setProperty("--fx", `${(L.fx + L.railX).toFixed(1)}px`);
      R.total = haulTotal(n, L.pitch);
      if (!placed) {
        placed = true;
        cars.forEach((c, i) => (c.x = targetX(i, -1)));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(st);

    /** the hands: from the 3D projection, or a sensible spot until the 3D has loaded */
    const handPoint = (): RopePoint =>
      R.hand.ready ? { x: L.athX + R.hand.x, y: L.athY + R.hand.y } : { x: L.athX + L.athW * 0.78, y: L.athY + L.athH * 0.45 };
    const ropeY = () => (R.hand.ready && R.hand.restY > 0 ? L.athY + R.hand.restY : L.athY + L.athH * 0.45);

    let vib = 0;
    let last = 0;
    let raf = 0;
    let centred = -2;

    const render = (now: number) => {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0);
      last = now;
      R.t = reduce ? R.goal : chase(R.t, R.goal, dt);
      const s = rigState(R);
      const raw = carouselPos(s.hauled, L.pitch);
      const pos = reduce ? Math.round(raw) : raw;
      const y = ropeY();
      rl.style.setProperty("--eye-y", `${(y - L.railY - L.slotY).toFixed(1)}px`);

      // a card has just been hauled into the spotlight: the rope jolts
      const near = Math.round(pos);
      if (Math.abs(pos - near) < 0.02 && near !== centred) {
        if (near > centred && centred > -2) vib = Math.min(1.6, vib + 1);
        centred = near;
      }

      const pts: RopePoint[] = [handPoint()];
      const rigidAfter = new Set<number>();
      let shown = 0;
      for (let i = 0; i < n; i++) {
        const c = cars[i];
        const d = i - pos;
        const look = cardLook(d);
        const target = targetX(i, pos);
        if (reduce) {
          c.x = target;
        } else {
          // cards further down the rope lag a touch behind the hands (rope stretch)
          const k = SPRING.k / (1 + 0.16 * Math.max(0, d));
          const b = springStep(c, target, dt, k);
          const sw = swingStep(c, b.a, dt);
          c.x = b.x;
          c.v = b.v;
          c.th = sw.th;
          c.w = sw.w;
        }
        if (d < 0.5) shown++;
        const lean = Math.max(-6, Math.min(6, -c.v * 0.005)); // speed lean: reads as motion blur
        const el = slots[i];
        el.style.transform = `translate3d(${c.x.toFixed(2)}px,0,0) rotate(${c.th.toFixed(4)}rad) skewX(${lean.toFixed(2)}deg) scale(${look.scale.toFixed(4)})`;
        el.style.opacity = look.opacity.toFixed(3);
        el.style.setProperty("--focus", look.focus.toFixed(3));
        el.style.zIndex = String(Math.round(look.focus * 10));
        el.classList.toggle("is-focus", look.focus > 0.92);
        el.style.visibility = look.opacity < 0.01 ? "hidden" : "visible";

        // rope through this card's eyelets (only where the card is actually there)
        if (look.opacity < 0.03) continue;
        const half = (L.cardW * look.scale) / 2;
        const cx = L.railX + c.x + L.cardW / 2;
        if (cx + half < pts[0].x + 12) continue;
        pts.push({ x: Math.max(cx - half, pts[pts.length - 1].x + 8), y });
        rigidAfter.add(pts.length - 1);
        pts.push({ x: cx + half, y });
      }
      pts.push({ x: Math.max(L.w, pts[pts.length - 1].x) + 260, y: y + 4 });

      vib *= Math.exp(-dt * 4.2);
      const t = now / 1000;
      const d = ropePath(pts, s.tension, (i) => vibration(vib, t, i * 1.7) * (i === 0 ? 1.4 : 0.8), (i) => rigidAfter.has(i));
      const travel = s.hauled.toFixed(1); // twist bands travel with the hauled rope
      for (const p of paths.current) {
        p.setAttribute("d", d);
        if (p.dataset.strand !== undefined) p.style.strokeDashoffset = travel;
      }
      if (meter.current) {
        meter.current.style.setProperty("--haul", (s.hauled / (R.total || 1)).toFixed(4));
        const label = String(Math.min(n, shown)).padStart(2, "0");
        const el = meter.current.querySelector<HTMLElement>("[data-count]");
        if (el && el.textContent !== label) el.textContent = label;
      }
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      render(now);
    };

    // run the loop only while the section is near the screen
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !raf) {
          last = 0;
          raf = requestAnimationFrame(frame);
        } else if (!e.isIntersecting && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { rootMargin: "200px 0px" }
    );
    io.observe(st);

    // scroll drives the haul: the block pins while the rope brings each class to the centre
    const ctx = gsap.context(() => {
      trigger.current = ScrollTrigger.create({
        trigger: pn,
        start: "center center",
        end: PIN_LENGTH(),
        pin: true,
        scrub: true,
        onUpdate: (self) => (R.goal = scrollToHaul(self.progress)),
      });
    }, pn);
    render(performance.now());

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      ctx.revert();
      trigger.current = null;
    };
  }, []);

  /** clicking a card that isn't centred hauls it in (scrolls to its stroke) */
  const bringIn = (k: number) => {
    const tr = trigger.current;
    if (!tr) return;
    const y = tr.start + (tr.end - tr.start) * progressFor(k);
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const setPath = (i: number) => (el: SVGPathElement | null) => {
    if (el) paths.current[i] = el;
  };

  return (
    // React-owned wrapper: ScrollTrigger inserts its pin-spacer between this div and the pinned block
    <div className="classes">
      <div ref={pin} className="classes__pin">
        <div className="container classes__head">
          <h3 className="classes__title">Group Classes</h3>
          <div ref={meter} className="classes__meter" aria-hidden>
            <span>
              <b data-count>00</b> / {String(classes.length).padStart(2, "0")}
            </span>
            <i />
            <em>Scroll to haul them in</em>
          </div>
        </div>

        <div ref={stage} className="classes__stage">
          <svg className="classes__rope" aria-hidden>
            <defs>
              <filter id="rope-shadow-blur" x="-5%" y="-50%" width="110%" height="200%">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>
            <path ref={setPath(0)} className="rope rope--shadow" filter="url(#rope-shadow-blur)" />
            <path ref={setPath(1)} className="rope rope--core" />
            <path ref={setPath(2)} className="rope rope--strand" data-strand="" />
            <path ref={setPath(3)} className="rope rope--sheen" />
          </svg>

          {/* the spotlight the centred card is hauled into */}
          <div className="classes__spot" aria-hidden />

          <div
            ref={(el) => {
              athlete.current = el;
              viewRef.current = el;
            }}
            className="classes__athlete"
            aria-hidden
          >
            {seen && <RopeAthlete rig={rig.current} running={inView} />}
          </div>

          <div ref={rail} className="classes__rail">
            {classes.map((c, i) => (
              <div key={c.name} className="class-slot" onClick={() => bringIn(i)} data-cursor="">
                <i className="class-slot__eye is-left" aria-hidden />
                <article className="class-card" style={{ "--i": i } as React.CSSProperties}>
                  <div className="class-card__img" aria-hidden>
                    <Image src={c.image} alt="" fill sizes="(max-width: 600px) 70vw, 340px" />
                  </div>
                  <span className="class-card__tag">{c.tag}</span>
                  <h4>{c.name}</h4>
                  <p>{c.desc}</p>
                  <span className="class-card__num">0{i + 1}</span>
                </article>
                <i className="class-slot__eye is-right" aria-hidden />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
