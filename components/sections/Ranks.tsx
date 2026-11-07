"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { ranks } from "@/data/site";
import { SplitHeading } from "@/components/ui/SplitHeading";

export function Ranks() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // the path between badges draws itself as you scroll
      const path = root.current!.querySelector<SVGPathElement>(".ranks__path-line");
      if (path) {
        const len = path.getTotalLength();
        gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(path, {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: { trigger: ".ranks__row", start: "top 75%", end: "bottom 45%", scrub: true },
        });
      }
      gsap.from(".rank", {
        y: 140,
        opacity: 0,
        rotateX: -50,
        stagger: 0.18,
        duration: 1.4,
        ease: "power4.out",
        scrollTrigger: { trigger: ".ranks__row", start: "top 80%" },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="section ranks">
      <div className="container">
        <div className="section-head is-center">
          <p className="eyebrow">Dungeon Rank System</p>
          <SplitHeading lines={["Rise through", { text: "the ranks", className: "gold-text" }]} />
          <p className="lead">Every check-in earns XP. Level up from Prisoner to Dungeon Lord and unlock real rewards along the way.</p>
        </div>

        <div className="ranks__row">
          <svg className="ranks__path" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden>
            <path className="ranks__path-bg" d="M40 90 C 200 90, 220 30, 375 30 S 560 90, 625 90 S 800 30, 960 30" />
            <path className="ranks__path-line" d="M40 90 C 200 90, 220 30, 375 30 S 560 90, 625 90 S 800 30, 960 30" />
          </svg>
          {ranks.map((r, i) => (
            <div key={r.name} className="rank" style={{ "--i": i } as React.CSSProperties}>
              <div className="rank__badge" data-cursor="">
                <div className="rank__face">
                  <span className="rank__level">{r.level}</span>
                </div>
              </div>
              <h3>{r.name}</h3>
              <span className="rank__req">{r.req}</span>
              <p>{r.perk}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
