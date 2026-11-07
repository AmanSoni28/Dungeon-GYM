"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { rand } from "@/lib/utils";

type Props = { playing: boolean; onImpact: (speed: number) => void; onSettled: () => void };

/**
 * Non-WebGL version of the same story: a dark photo of a heavy lift, slow push-in,
 * then a CSS "drop": punch-zoom, shake, dust burst, then hand off to the overlay.
 */
export function IntroFallback({ playing, onImpact, onSettled }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const cb = useRef({ onImpact, onSettled });
  cb.current = { onImpact, onSettled };

  useEffect(() => {
    if (!playing) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(".ifb__img", { scale: 1.2, opacity: 0, filter: "brightness(0.3)" }, { scale: 1.05, opacity: 1, filter: "brightness(0.85)", duration: 2.6, ease: "power2.out" })
        .to(".ifb__img", { scale: 1.12, y: -18, duration: 0.25, ease: "power3.in" })
        .add(() => cb.current.onImpact(5.5))
        .to(".ifb__img", { scale: 1.02, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" })
        .to(".ifb__shake", { keyframes: { x: [-16, 13, -9, 6, -3, 0], y: [9, -7, 5, -3, 1, 0] }, duration: 0.6, ease: "none" }, "<")
        .fromTo(
          ".ifb__dust span",
          { x: 0, y: 0, opacity: 0.9, scale: 0.4 },
          {
            x: (i) => (rand(i) - 0.5) * 900,
            y: (i) => -rand(i + 50) * 160,
            opacity: 0,
            scale: (i) => 2 + rand(i + 9) * 3,
            duration: 2,
            ease: "power3.out",
          },
          "<"
        )
        .add(() => cb.current.onSettled(), "+=0.2");
    }, root);
    return () => ctx.revert();
  }, [playing]);

  return (
    <div ref={root} className="ifb">
      <div className="ifb__shake">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ifb__img" src="/images/gallery/shadow-lift.webp" alt="" />
      </div>
      <div className="ifb__dust" aria-hidden>
        {Array.from({ length: 28 }, (_, i) => (
          <span key={i} />
        ))}
      </div>
    </div>
  );
}
