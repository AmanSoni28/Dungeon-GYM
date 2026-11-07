"use client";

import { useEffect, useState } from "react";
import { brand, nav } from "@/data/site";
import { scrollToTarget } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const RING = { cx: 160, cy: 60, r1: 50, r2: 37, from: -90, to: 158, segments: 6, gap: 5 };

function ringSegments() {
  const { cx, cy, r1, r2, from, to, segments, gap } = RING;
  const step = (to - from) / segments;
  const pt = (r: number, a: number) => {
    const rad = (a * Math.PI) / 180;
    return `${(cx + r * Math.cos(rad)).toFixed(2)} ${(cy + r * Math.sin(rad)).toFixed(2)}`;
  };
  return Array.from({ length: segments }, (_, i) => {
    const a0 = from + i * step + gap / 2;
    const a1 = from + (i + 1) * step - gap / 2;
    return `M${pt(r1, a0)}A${r1} ${r1} 0 0 1 ${pt(r1, a1)}L${pt(r2, a1)}A${r2} ${r2} 0 0 0 ${pt(r2, a0)}Z`;
  });
}

const SEGMENTS = ringSegments();

/** Running figure facing right, head at (0,0). */
function Runner({ x, y, s, back = false }: { x: number; y: number; s: number; back?: boolean }) {
  const limbs = back
    ? "M-3 10L-11 17L-15 25M-3 10L5 15L11 9M-7 28L-1 37L-9 47M-7 28L3 35L8 45"
    : "M-3 10L5 16L11 10M-3 10L-12 16L-16 24M-7 28L4 34L1 46M-7 28L-14 40L-26 42";
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className={back ? "logo__runner logo__runner--back" : "logo__runner"}>
      <path d={`M-1 6L-7 28${limbs}`} />
      <circle cx="0" cy="0" r="5" />
    </g>
  );
}

export function Logo({ badge = false }: { badge?: boolean }) {
  return (
    <span className={badge ? "logo logo--badge" : "logo"}>
      <svg viewBox={badge ? "-6 -86 296 292" : "0 0 285 120"} className="logo__svg" role="img" aria-label={brand.full}>
        <defs>
          <linearGradient id="logo-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6e27a" />
            <stop offset="0.45" stopColor="#d4af37" />
            <stop offset="0.7" stopColor="#fff1b8" />
            <stop offset="1" stopColor="#a8801f" />
          </linearGradient>
          <linearGradient id="logo-gold-text" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff4c2" />
            <stop offset="0.5" stopColor="#e8c560" />
            <stop offset="0.52" stopColor="#c9a032" />
            <stop offset="1" stopColor="#f0d47a" />
          </linearGradient>
        </defs>

        {badge && <circle cx="142" cy="60" r="142" fill="#0b0a08" stroke="url(#logo-gold)" strokeWidth="3" />}

        <g fill="url(#logo-gold)">
          {SEGMENTS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        <Runner x={226} y={34} s={1.3} back />
        <Runner x={250} y={30} s={1.45} />

        <text x="4" y="72" textLength="176" lengthAdjust="spacingAndGlyphs" className="logo__word">
          DUNGEON
        </text>
        <text x="180" y="92" textAnchor="end" className="logo__sub">
          GYM &amp; SPA
        </text>
      </svg>
    </span>
  );
}

export function Navbar() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > last && y > 300);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (open) window.__lenis?.stop();
    else window.__lenis?.start();
  }, [open]);

  const go = (href: string) => {
    setOpen(false);
    setTimeout(() => scrollToTarget(href), open ? 350 : 0);
  };

  return (
    <>
      <header className={`nav ${hidden && !open ? "is-hidden" : ""} ${scrolled ? "is-scrolled" : ""}`}>
        <a
          href="#top"
          className="nav__logo"
          data-cursor=""
          onClick={(e) => {
            e.preventDefault();
            go("#top");
          }}
        >
          <Logo />
        </a>

        <nav className="nav__links" aria-label="Main">
          {nav.map((l) => (
            <a
              key={l.href}
              href={l.href}
              data-cursor=""
              onClick={(e) => {
                e.preventDefault();
                go(l.href);
              }}
            >
              {l.label}
            </a>
          ))}
          {/* Positioned with CSS Anchor Positioning: follows whichever link is hovered */}
          <span className="nav__indicator" aria-hidden />
        </nav>

        <div className="nav__cta">
          <Button label="Free Pass" href="#pass" arrow={false} />
        </div>

        <button
          className={`nav__burger ${open ? "is-open" : ""}`}
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu"
          aria-expanded={open}
          data-cursor=""
        >
          <span />
          <span />
        </button>
      </header>

      <div className={`menu ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <nav className="menu__links">
          {nav.map((l, i) => (
            <a
              key={l.href}
              href={l.href}
              style={{ "--i": i } as React.CSSProperties}
              onClick={(e) => {
                e.preventDefault();
                go(l.href);
              }}
            >
              <small>0{i + 1}</small>
              {l.label}
            </a>
          ))}
        </nav>
        <div className="menu__foot">
          <span>{brand.phone}</span>
          <span>{brand.email}</span>
        </div>
      </div>
    </>
  );
}
