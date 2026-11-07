"use client";

import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import Image from "next/image";
import { trainers, type Trainer } from "@/data/site";
import { useTilt } from "@/lib/useTilt";
import { SplitHeading } from "@/components/ui/SplitHeading";
import { Button } from "@/components/ui/Button";

/** Runs a DOM update inside the View Transitions API when supported (card morphs into the modal). */
function withTransition(update: () => void) {
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition) doc.startViewTransition(() => flushSync(update));
  else update();
}

function Portrait({ t, vt }: { t: Trainer; vt: boolean }) {
  const initials = t.name
    .split(" ")
    .map((w) => w[0])
    .join("");
  return (
    <div
      className="portrait"
      style={{ "--h": t.hue, viewTransitionName: vt ? `trainer-${t.id}` : undefined } as React.CSSProperties}
    >
      {t.image ? (
        <>
          <Image
            className="portrait__img"
            src={t.image}
            alt={`${t.name}, ${t.role}`}
            fill
            sizes="(max-width: 520px) 100vw, (max-width: 1000px) 50vw, 40vw"
            style={{ objectPosition: t.imagePos ?? "50% 50%" }}
          />
          <span className="portrait__grade" />
        </>
      ) : (
        <>
          <span className="portrait__aura" />
          <span className="portrait__initials">{initials}</span>
          <svg className="portrait__sil" viewBox="0 0 200 240" aria-hidden>
            <circle cx="100" cy="70" r="34" />
            <path d="M30 240c0-60 30-100 70-100s70 40 70 100z" />
          </svg>
        </>
      )}
    </div>
  );
}

function Card({ t, index, onOpen, hidden }: { t: Trainer; index: number; onOpen: () => void; hidden: boolean }) {
  const tilt = useTilt(14);
  return (
    <button className="tcard" onClick={onOpen} {...tilt} data-cursor="Select" style={{ "--i": index } as React.CSSProperties}>
      <div className="tcard__inner">
        <Portrait t={t} vt={!hidden} />
        <span className="tcard__shine" />
        <div className="tcard__body">
          <span className="tcard__title">{t.title}</span>
          <h3>{t.name}</h3>
          <span className="tcard__role">{t.role}</span>
          <div className="tcard__stats">
            {t.stats.map((s) => (
              <div key={s.label} className="tstat">
                <span>{s.label}</span>
                <div className="bar">
                  <i style={{ "--v": `${s.value}%` } as React.CSSProperties} />
                </div>
                <b>{s.value}</b>
              </div>
            ))}
          </div>
        </div>
        <span className="tcard__select">Select ▸</span>
      </div>
    </button>
  );
}

export function Trainers() {
  const [open, setOpen] = useState<Trainer | null>(null);

  useEffect(() => {
    if (open) window.__lenis?.stop();
    else window.__lenis?.start();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && withTransition(() => setOpen(null));
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <section id="trainers" className="section trainers">
      <div className="container">
        <div className="section-head is-center">
          <p className="eyebrow">The Coaches</p>
          <SplitHeading lines={[{ text: "Choose your", className: "" }, { text: "warrior", className: "gold-text" }]} />
          <p className="lead">Every legend needs a guide. Select a coach to see their stats, specialties and story.</p>
        </div>

        <div className="tgrid">
          {trainers.map((t, i) => (
            <Card key={t.id} t={t} index={i} hidden={open?.id === t.id} onOpen={() => withTransition(() => setOpen(t))} />
          ))}
        </div>
      </div>

      {open && (
        <div className="tmodal" role="dialog" aria-modal="true" aria-label={open.name} onClick={() => withTransition(() => setOpen(null))}>
          <div className="tmodal__panel" onClick={(e) => e.stopPropagation()}>
            <Portrait t={open} vt />
            <div className="tmodal__body">
              <span className="tcard__title">{open.title}</span>
              <h3 className="h-md">{open.name}</h3>
              <span className="tcard__role">
                {open.role} · {open.years} years experience
              </span>
              <p>{open.bio}</p>
              <div className="tcard__stats is-lg">
                {open.stats.map((s) => (
                  <div key={s.label} className="tstat">
                    <span>{s.label}</span>
                    <div className="bar">
                      <i style={{ "--v": `${s.value}%` } as React.CSSProperties} />
                    </div>
                    <b>{s.value}</b>
                  </div>
                ))}
              </div>
              <div className="tmodal__tags">
                {open.specialties.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              <Button label={`Train with ${open.name.split(" ")[0]}`} href="#pass" onClick={() => setOpen(null)} />
            </div>
            <button className="tmodal__close" onClick={() => withTransition(() => setOpen(null))} aria-label="Close" data-cursor="">
              ✕
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
