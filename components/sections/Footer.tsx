"use client";

import { brand, nav } from "@/data/site";
import { scrollToTarget } from "@/lib/utils";
import { Logo } from "@/components/chrome/Navbar";

export function Footer() {
  return (
    <footer id="contact" className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Logo />
          <p>{brand.tagline}</p>
          <a className="footer__phone" href={`tel:${brand.phone.replace(/\s/g, "")}`} data-cursor="">
            {brand.phone}
          </a>
          <a href={`mailto:${brand.email}`} data-cursor="">
            {brand.email}
          </a>
        </div>

        <div>
          <h4>Explore</h4>
          <ul>
            {nav.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  data-cursor=""
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToTarget(l.href);
                  }}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4>Hours</h4>
          <ul>
            {brand.hours.map((h) => (
              <li key={h.day}>
                <span>{h.day}</span>
                <small>{h.time}</small>
              </li>
            ))}
          </ul>
        </div>

        <a className="footer__map" href={brand.mapsUrl} target="_blank" rel="noreferrer" data-cursor="Map">
          <svg viewBox="0 0 300 180" aria-hidden>
            <g stroke="currentColor" strokeOpacity=".18" fill="none">
              <path d="M0 40 H300 M0 95 H300 M0 140 H300 M60 0 V180 M150 0 V180 M230 0 V180" />
              <path d="M0 160 C 80 120, 120 150, 300 70" strokeOpacity=".35" strokeWidth="6" />
            </g>
          </svg>
          <span className="footer__pin" />
          <span className="footer__addr">{brand.address}</span>
        </a>
      </div>

      <div className="footer__word" aria-hidden>
        {"DUNGEON".split("").map((c, i) => (
          <span key={i} style={{ "--i": i } as React.CSSProperties}>
            {c}
          </span>
        ))}
      </div>

      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} {brand.full}. All rights reserved.</span>
        <a href={brand.instagram} target="_blank" rel="noreferrer" data-cursor="">
          Instagram ↗
        </a>
        <a
          href="#top"
          data-cursor=""
          onClick={(e) => {
            e.preventDefault();
            scrollToTarget("#top");
          }}
        >
          Back to the gate ↑
        </a>
      </div>
    </footer>
  );
}
