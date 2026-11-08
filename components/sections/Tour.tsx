"use client";

import "@/styles/tour.css";
import { useEffect, useState } from "react";
import { virtualTour } from "@/data/site";
import { readEnvironment } from "@/lib/intro/capabilities";
import { preloadImage } from "@/lib/tour/preload";
import type { TourStop } from "@/lib/tour/tour";
import { useInView } from "@/lib/useInView";
import { SplitHeading } from "@/components/ui/SplitHeading";
import { Button } from "@/components/ui/Button";
import { VirtualTour } from "@/components/tour/VirtualTour";

/**
 * Virtual tour section: a cinematic "doorway" (branding, golden loader, ENTER THE GYM) that opens the
 * full-screen tour of the real gym's four zones. The first zone is preloaded while the visitor scrolls here.
 */
export function Tour({ stops = virtualTour }: { stops?: TourStop[] }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(0);
  const [progress, setProgress] = useState(0);
  const { ref, seen } = useInView<HTMLDivElement>("600px");
  const first = stops[0];
  const pct = Math.round(progress * 100);

  // preload zone 01 (the size the viewer will actually use on this device)
  useEffect(() => {
    if (!seen) return;
    const env = readEnvironment();
    const src = (env.mobile || env.lowPower) && first.srcSmall ? first.srcSmall : first.src;
    const ctrl = new AbortController();
    preloadImage(src, (p) => setProgress((prev) => (p === 1 || p - prev >= 0.02 ? p : prev)), ctrl.signal);
    return () => ctrl.abort();
  }, [seen, first]);

  const launch = (i: number) => {
    setStart(i);
    setOpen(true);
  };

  return (
    <section id="tour" className="section tour">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Virtual Tour</p>
          <SplitHeading lines={["Walk the", { text: "Dungeon", className: "gold-text" }]} />
          <p className="lead">
            Four zones of the Dungeon floor. Look around, zoom in, and walk from the iron to the treadmills.
          </p>
        </div>
      </div>

      <div ref={ref} className="container reveal-scale">
        <div className="tour-door">
          {seen && (
            <div className="tour-door__bg" style={{ backgroundImage: `url(${first.srcSmall ?? first.src})` }} aria-hidden />
          )}
          <div className="tour-door__veil" aria-hidden />
          <div className="tour-door__beam" aria-hidden />

          <div className="tour-door__content">
            <p className="tour-door__brand">
              <span className="gold-text">Dungeon</span>
              <small>Gym &amp; Spa</small>
            </p>

            <div
              className="tour-door__loader"
              role="progressbar"
              aria-label="Loading the virtual tour"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <i style={{ transform: `scaleX(${progress})` }} />
            </div>
            <p className="tour-door__status">{progress >= 1 ? "Zone 01 ready" : `Preparing Zone 01 · ${pct}%`}</p>

            <h3 className="tour-door__tagline">
              Your fitness world. <span className="gold-text">Your rules.</span>
            </h3>

            <button type="button" className="tour-door__enter" onClick={() => launch(0)} data-cursor="">
              Enter the Gym
            </button>
          </div>
        </div>

        <div className="tour-zones">
          {stops.map((s, i) => (
            <button key={s.id} type="button" className="tour-zone" onClick={() => launch(i)} data-cursor="">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.thumb ?? s.srcSmall ?? s.src} alt="" width={480} height={270} loading="lazy" decoding="async" />
              <span className="tour-zone__n">Zone {s.zone}</span>{" "}
              <span className="tour-zone__t">{s.title}</span>
            </button>
          ))}
        </div>

        <div className="tour-door__cta">
          <Button label="Book a Visit" href="#pass" />
        </div>
      </div>

      <VirtualTour stops={stops} open={open} startIndex={start} onClose={() => setOpen(false)} />
    </section>
  );
}
