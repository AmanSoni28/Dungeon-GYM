"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { tourZones, type TourZone } from "@/data/site";
import { useInView } from "@/lib/useInView";
import { SplitHeading } from "@/components/ui/SplitHeading";
import { Button } from "@/components/ui/Button";

const TourScene = dynamic(() => import("@/components/three/TourScene"), { ssr: false });

// hall is 40 x 36 → mini-map 120 x 108
const toMap = (p: [number, number, number]) => ({ x: (p[0] + 20) * 3, y: (p[2] + 18) * 3 });

export function Tour() {
  const [zone, setZone] = useState<TourZone>(tourZones[0]);
  const { ref, inView, seen } = useInView<HTMLDivElement>("400px");
  const stage = useRef<HTMLDivElement>(null);

  const fullscreen = () => {
    const el = stage.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <section id="tour" className="section tour">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">360° Virtual Tour</p>
          <SplitHeading lines={["Walk the", { text: "Dungeon", className: "gold-text" }]} />
          <p className="lead">
            Drag to look around. Tap a glowing marker to walk between zones, from the Iron Pit to the Spa Sanctum.
          </p>
        </div>
      </div>

      <div ref={ref} className="tour__wrap container reveal-scale">
        <div ref={stage} className="tour__stage" data-cursor="Drag">
          {seen ? (
            <TourScene zone={zone} zones={tourZones} onSelect={setZone} active={inView} />
          ) : (
            <div className="tour__placeholder" />
          )}

          <div className="tour__info glass" key={zone.id}>
            <span className="tour__idx">
              0{tourZones.findIndex((z) => z.id === zone.id) + 1} / 0{tourZones.length}
            </span>
            <h3>{zone.name}</h3>
            <p>{zone.blurb}</p>
          </div>

          <svg className="tour__map glass" viewBox="0 0 120 108" aria-label="Mini map">
            <rect x="1" y="1" width="118" height="106" rx="8" fill="none" stroke="currentColor" strokeOpacity=".25" />
            {tourZones.map((z) => {
              const m = toMap(z.position);
              const on = z.id === zone.id;
              return (
                <g key={z.id} onClick={() => setZone(z)} style={{ cursor: "pointer" }}>
                  {on && <circle cx={m.x} cy={m.y} r="9" className="tour__map-pulse" />}
                  <circle cx={m.x} cy={m.y} r={on ? 4.5 : 3} className={on ? "is-on" : ""} />
                </g>
              );
            })}
          </svg>

          <button className="tour__fs glass" onClick={fullscreen} aria-label="Fullscreen" data-cursor="">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
            </svg>
          </button>

          <div className="tour__hint">
            <span className="tour__hand" /> Drag to explore
          </div>
        </div>

        <div className="tour__chips">
          {tourZones.map((z) => (
            <button
              key={z.id}
              className={`chip ${z.id === zone.id ? "is-active" : ""}`}
              onClick={() => setZone(z)}
              data-cursor=""
            >
              {z.name}
            </button>
          ))}
          <div className="tour__cta">
            <Button label="Book a Visit" href="#pass" />
          </div>
        </div>
      </div>
    </section>
  );
}
