"use client";

import { useEffect, useState } from "react";
import { crowdCurve, todaysClasses } from "@/data/site";
import { useInView } from "@/lib/useInView";
import { SplitHeading } from "@/components/ui/SplitHeading";

const HOURS = Object.keys(crowdCurve).map(Number);

function label(p: number) {
  if (p < 30) return "Quiet";
  if (p < 55) return "Moderate";
  if (p < 80) return "Busy";
  return "Packed";
}
const fmt = (h: number) => `${h % 12 || 12}${h < 12 ? "a" : "p"}`;

/** Demo data for now. Later this connects to real check-ins from the backend. */
export function LiveStatus() {
  const [hour, setHour] = useState<number | null>(null);
  const { ref, seen } = useInView<HTMLDivElement>("0px");

  useEffect(() => {
    const update = () => setHour(new Date().getHours());
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  const open = hour !== null && crowdCurve[hour] !== undefined;
  const busy = open ? crowdCurve[hour!] : 0;
  const quiet = HOURS.filter((h) => h >= 10 && h <= 16).reduce((a, h) => (crowdCurve[h] < crowdCurve[a] ? h : a), 14);
  const arc = 283; // half-circle length (r = 90)

  return (
    <section className="section live">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">
            <i className="live-dot" /> Live Gym Status
          </p>
          <SplitHeading lines={["Know before", { text: "you go", className: "gold-text" }]} />
        </div>

        <div ref={ref} className={`live__grid ${seen ? "is-seen" : ""}`}>
          <div className="live__gauge glass">
            <svg viewBox="0 0 200 120">
              <defs>
                <linearGradient id="gaugeg" x1="0" x2="1">
                  <stop offset="0" stopColor="#3ee07a" />
                  <stop offset="0.55" stopColor="var(--gold)" />
                  <stop offset="1" stopColor="var(--ember)" />
                </linearGradient>
              </defs>
              <path d="M10 110 A90 90 0 0 1 190 110" className="gauge__bg" />
              <path
                d="M10 110 A90 90 0 0 1 190 110"
                className="gauge__fg"
                style={{ strokeDasharray: arc, strokeDashoffset: seen ? arc * (1 - busy / 100) : arc }}
              />
            </svg>
            <div className="live__reading">
              <b>{open ? `${busy}%` : "Closed"}</b>
              <span>{open ? `${label(busy)} right now` : "Opens at 5 AM"}</span>
            </div>
          </div>

          <div className="live__chart glass">
            <div className="live__chart-head">
              <h3>Today&apos;s crowd</h3>
              <span className="live__best">Best time: {fmt(quiet)}m</span>
            </div>
            <div className="live__bars">
              {HOURS.map((h, i) => (
                <div
                  key={h}
                  className={`live__bar ${h === hour ? "is-now" : ""}`}
                  style={{ "--v": crowdCurve[h], "--i": i } as React.CSSProperties}
                  title={`${fmt(h)}: ${crowdCurve[h]}%`}
                >
                  <i />
                  <small>{i % 3 === 0 ? fmt(h) : ""}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="live__classes glass">
            <h3>Today&apos;s classes</h3>
            <ul>
              {todaysClasses.map((c) => (
                <li key={c.time}>
                  <time>{c.time}</time>
                  <div>
                    <strong>{c.name}</strong>
                    <small>with {c.coach}</small>
                  </div>
                  <span className={`spots ${c.spots === 0 ? "is-full" : c.spots <= 4 ? "is-low" : ""}`}>
                    {c.spots === 0 ? "Full" : `${c.spots} spots`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="live__note">Demo data · connects to live check-ins when the backend is added.</p>
      </div>
    </section>
  );
}
