"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { brand, plans } from "@/data/site";
import { formatPrice } from "@/lib/utils";
import { useTilt } from "@/lib/useTilt";
import { SplitHeading } from "@/components/ui/SplitHeading";
import { Button } from "@/components/ui/Button";

function AnimatedPrice({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const cur = useRef(value);
  useEffect(() => {
    const obj = { v: cur.current };
    const tw = gsap.to(obj, {
      v: value,
      duration: 0.9,
      ease: "power3.out",
      onUpdate: () => {
        cur.current = obj.v;
        if (ref.current) ref.current.textContent = formatPrice(obj.v);
      },
    });
    return () => {
      tw.kill();
    };
  }, [value]);
  return <span ref={ref}>{formatPrice(value)}</span>;
}

function Countdown() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      setLeft(Math.max(0, end.getTime() - now.getTime()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const parts = left === null ? [0, 0, 0, 0] : [left / 864e5, (left / 36e5) % 24, (left / 6e4) % 60, (left / 1e3) % 60].map(Math.floor);
  return (
    <div className="countdown" aria-label="Offer ends in">
      <span className="countdown__label">Launch offer ends in</span>
      {["Days", "Hrs", "Min", "Sec"].map((l, i) => (
        <div key={l} className="countdown__cell">
          <b>{String(parts[i]).padStart(2, "0")}</b>
          <small>{l}</small>
        </div>
      ))}
    </div>
  );
}

function PlanCard({ plan, yearly, index }: { plan: (typeof plans)[number]; yearly: boolean; index: number }) {
  const tilt = useTilt(8);
  const price = yearly ? plan.yearly : plan.monthly;
  return (
    <article className={`plan ${plan.featured ? "is-featured" : ""}`} {...tilt} style={{ "--i": index } as React.CSSProperties}>
      <div className="plan__inner">
        <span className="plan__shine" />
        {plan.featured && <span className="plan__badge">Most Popular</span>}
        <h3>{plan.name}</h3>
        <p className="plan__blurb">{plan.blurb}</p>
        <div className="plan__price">
          <span className="plan__cur">{brand.currency}</span>
          <AnimatedPrice value={price} />
          <span className="plan__per">/{yearly ? "year" : "month"}</span>
        </div>
        {yearly && <span className="plan__save">2 months free</span>}
        <ul>
          {plan.features.map((f) => (
            <li key={f}>
              <svg viewBox="0 0 20 20" aria-hidden>
                <path d="M4 10l4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              {f}
            </li>
          ))}
        </ul>
        <Button label={`Become a ${plan.name}`} href="#pass" variant={plan.featured ? "gold" : "ghost"} magnetic={false} />
      </div>
    </article>
  );
}

export function Membership() {
  const [yearly, setYearly] = useState(false);
  return (
    <section id="plans" className="section plans">
      <div className="container">
        <div className="section-head is-center">
          <p className="eyebrow">Membership</p>
          <SplitHeading lines={["Claim your", { text: "throne", className: "gold-text" }]} />
          <div className="billing" role="group" aria-label="Billing period">
            <button className={!yearly ? "is-on" : ""} onClick={() => setYearly(false)} data-cursor="">
              Monthly
            </button>
            <button className={yearly ? "is-on" : ""} onClick={() => setYearly(true)} data-cursor="">
              Yearly <em>-17%</em>
            </button>
            <span className="billing__knob" style={{ translate: yearly ? "100% 0" : "0 0" }} />
          </div>
          <Countdown />
        </div>

        <div className="plans__grid">
          {plans.map((p, i) => (
            <PlanCard key={p.id} plan={p} yearly={yearly} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
