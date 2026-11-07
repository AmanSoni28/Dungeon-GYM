"use client";

import { useState } from "react";
import { transformations } from "@/data/site";
import { lerp } from "@/lib/utils";
import { SplitHeading } from "@/components/ui/SplitHeading";

/** Stylised body that gets leaner and more defined as `t` goes 0 → 1 */
function Silhouette({ t }: { t: number }) {
  const s = lerp(40, 56, t); // shoulder half-width
  const w = lerp(46, 30, t); // waist half-width
  const h = lerp(44, 36, t); // hip half-width
  const arm = lerp(13, 17, t);
  const torso = `M ${100 - s} 74 Q ${100 - s - 3} 110 ${100 - w} 150 Q ${100 - h - 2} 180 ${100 - h} 200 L ${100 + h} 200 Q ${100 + h + 2} 180 ${100 + w} 150 Q ${100 + s + 3} 110 ${100 + s} 74 Q 100 60 ${100 - s} 74 Z`;
  return (
    <svg className="sil" viewBox="0 0 200 320" aria-hidden>
      <defs>
        <linearGradient id="silg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gold-bright)" />
          <stop offset="1" stopColor="var(--ember)" />
        </linearGradient>
      </defs>
      <g fill="url(#silg)" fillOpacity={0.12 + t * 0.2} stroke="url(#silg)" strokeWidth="1.5">
        <circle cx="100" cy="38" r="22" />
        <path d={torso} />
        <path d={`M ${100 - s + 4} 80 L ${100 - s - 14} 180`} strokeWidth={arm} strokeLinecap="round" strokeOpacity={0.5} />
        <path d={`M ${100 + s - 4} 80 L ${100 + s + 14} 180`} strokeWidth={arm} strokeLinecap="round" strokeOpacity={0.5} />
        <path d={`M ${100 - h / 2} 200 L ${100 - h / 2 - 4} 310`} strokeWidth={lerp(26, 24, t)} strokeLinecap="round" strokeOpacity={0.5} />
        <path d={`M ${100 + h / 2} 200 L ${100 + h / 2 + 4} 310`} strokeWidth={lerp(26, 24, t)} strokeLinecap="round" strokeOpacity={0.5} />
      </g>
      {/* definition lines fade in */}
      <g stroke="var(--gold-bright)" strokeWidth="1.2" fill="none" opacity={Math.max(0, t * 1.4 - 0.4)}>
        <path d="M100 96 V 190" />
        <path d="M86 128 H 114 M88 146 H 112 M90 164 H 110" />
        <path d={`M ${100 - s + 8} 92 Q 100 112 ${100 + s - 8} 92`} />
      </g>
    </svg>
  );
}

export function Transformations() {
  const [story, setStory] = useState(0);
  const [v, setV] = useState(15);
  const st = transformations[story];
  const t = v / 100;

  const metric = (label: string, a: number, b: number, unit: string) => {
    const val = lerp(a, b, t);
    return (
      <div className="tf__metric">
        <small>{label}</small>
        <strong>
          {Math.round(val)}
          <em>{unit}</em>
        </strong>
        <span className={b < a ? "is-down" : "is-up"}>
          {b < a ? "▼" : "▲"} {Math.abs(Math.round(val - a))}
          {unit}
        </span>
      </div>
    );
  };

  return (
    <section className="section tf" style={{ "--t": t } as React.CSSProperties}>
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Transformations</p>
          <SplitHeading lines={["Drag through", { text: "time", className: "gold-text" }]} />
          <p className="lead">Real members, real numbers. Drag the slider to watch a transformation happen month by month.</p>
        </div>

        <div className="tf__grid">
          <div className="tf__visual glass">
            <span className="tf__month">
              Month <b>{Math.round(t * st.months)}</b> / {st.months}
            </span>
            <Silhouette t={t} />
            <label className="tf__slider" data-cursor="Drag">
              <span className="sr-only">Transformation progress</span>
              <input type="range" min={0} max={100} value={v} onChange={(e) => setV(Number(e.target.value))} />
              <span className="tf__labels">
                <span>Day 1</span>
                <span>Today</span>
              </span>
            </label>
          </div>

          <div className="tf__info">
            <div className="tf__tabs">
              {transformations.map((s, i) => (
                <button
                  key={s.name}
                  className={`chip ${i === story ? "is-active" : ""}`}
                  onClick={() => {
                    setStory(i);
                    setV(15);
                  }}
                  data-cursor=""
                >
                  {s.name}
                </button>
              ))}
            </div>
            <blockquote>“{st.quote}”</blockquote>
            <div className="tf__metrics">
              {metric("Weight", st.before.weight, st.after.weight, "kg")}
              {metric("Body Fat", st.before.fat, st.after.fat, "%")}
              {metric("Strength", st.before.strength, st.after.strength, "%")}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
