"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { equipment } from "@/data/site";
import { useInView } from "@/lib/useInView";

const EquipmentScene = dynamic(() => import("@/components/three/EquipmentScene"), { ssr: false });

export function Equipment() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const [idx, setIdx] = useState(0);
  const { ref, inView, seen } = useInView<HTMLDivElement>("600px");

  useEffect(() => {
    const el = section.current!;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: `+=${equipment.length * 80}%`,
        pin: true,
        scrub: true,
        onUpdate: (s) => {
          progress.current = s.progress;
          el.style.setProperty("--p", s.progress.toFixed(4));
          setIdx(Math.round(s.progress * (equipment.length - 1)));
        },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  const item = equipment[idx];

  return (
    <section ref={section} className="equip">
      <div className="equip__bgword" aria-hidden>
        IRON
      </div>
      <div ref={ref} className="equip__canvas">
        {seen && <EquipmentScene progress={progress} running={inView} />}
      </div>

      <div className="equip__ui container">
        <div className="equip__left">
          <p className="eyebrow">The Arsenal</p>
          <div className="equip__count">
            <span key={idx} className="equip__count-now">
              0{idx + 1}
            </span>
            <span>/ 0{equipment.length}</span>
          </div>
          <ul className="equip__list">
            {equipment.map((e, i) => (
              <li key={e.id} className={i === idx ? "is-active" : ""}>
                {e.name}
              </li>
            ))}
          </ul>
        </div>

        <div className="equip__right" key={item.id}>
          <span className="equip__spec">{item.spec}</span>
          <h3 className="h-md">{item.name}</h3>
          <p>{item.desc}</p>
          <div className="equip__tags">
            {item.muscles.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="equip__progress" aria-hidden>
        <i />
      </div>
    </section>
  );
}
