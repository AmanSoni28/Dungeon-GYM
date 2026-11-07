"use client";

import { useEffect, useState } from "react";
import { brand, nav } from "@/data/site";
import { scrollToTarget } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export function Logo() {
  return (
    <span className="logo">
      <svg viewBox="0 0 40 40" className="logo__mark" aria-hidden>
        <path d="M6 36V16a14 14 0 0 1 28 0v20" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <path d="M13 36V18M20 36V12M27 36V18" stroke="currentColor" strokeWidth="2.5" />
        <path d="M4 36h32" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      <span className="logo__text">
        {brand.name}
        <small>Gym &amp; Spa</small>
      </span>
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
