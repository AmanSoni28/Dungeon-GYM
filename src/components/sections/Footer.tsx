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

        <a
          className="footer__map"
          href={brand.mapsUrl}
          target="_blank"
          rel="noreferrer"
          data-cursor="Map"
          aria-label={`Open ${brand.full} in Google Maps: ${brand.address}`}
        >
          <svg className="fmap__svg" viewBox="0 0 400 260" aria-hidden>
            <defs>
              <radialGradient id="fmap-glow" cx="62%" cy="40%" r="60%">
                <stop offset="0" stopColor="oklch(0.76 0.12 82)" stopOpacity=".22" />
                <stop offset="1" stopColor="oklch(0.76 0.12 82)" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="fmap-route" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="oklch(0.55 0.1 70)" />
                <stop offset="1" stopColor="oklch(0.88 0.12 90)" />
              </linearGradient>
              <linearGradient id="fmap-sweep" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="oklch(0.76 0.12 82)" stopOpacity="0" />
                <stop offset="1" stopColor="oklch(0.76 0.12 82)" stopOpacity=".28" />
              </linearGradient>
            </defs>

            <rect width="400" height="260" fill="url(#fmap-glow)" />

            {/* City blocks */}
            <g className="fmap__blocks">
              <rect x="18" y="16" width="86" height="52" rx="6" />
              <rect x="120" y="16" width="70" height="52" rx="6" />
              <rect x="206" y="16" width="92" height="52" rx="6" />
              <rect x="314" y="16" width="70" height="52" rx="6" />
              <rect x="18" y="84" width="58" height="66" rx="6" />
              <rect x="92" y="84" width="98" height="66" rx="6" />
              <rect x="206" y="84" width="34" height="66" rx="6" />
              <rect x="276" y="84" width="108" height="66" rx="6" />
              <rect x="18" y="166" width="120" height="78" rx="6" />
              <rect x="154" y="166" width="86" height="78" rx="6" />
              <rect x="256" y="166" width="128" height="78" rx="6" />
            </g>
            {/* Park */}
            <rect className="fmap__park" x="96" y="88" width="56" height="34" rx="10" />

            {/* Streets */}
            <g className="fmap__streets">
              <path d="M0 76 H400 M0 158 H400 M112 0 V260 M198 0 V260 M306 0 V260" />
              <path d="M84 76 V158 M248 0 V158" strokeOpacity=".5" />
            </g>
            {/* Main road with flowing traffic */}
            <path className="fmap__main" d="M-10 238 C 90 210, 150 200, 220 168 S 340 92, 410 70" />
            <path className="fmap__traffic" d="M-10 238 C 90 210, 150 200, 220 168 S 340 92, 410 70" />

            {/* Route drawn to the door */}
            <path className="fmap__route" d="M20 236 C 80 216, 160 198, 198 172 L 198 158 L 262 158 L 262 118" />

            <text className="fmap__label" x="270" y="72">BALBIR RD</text>
            <text className="fmap__label fmap__label--dim" x="24" y="152">DALANWALA</text>

            {/* Radar sweep + pin */}
            <g transform="translate(262 112)">
              <g className="fmap__sweep">
                <path d="M0 0 L 70 0 A 70 70 0 0 0 49.5 -49.5 Z" fill="url(#fmap-sweep)" />
              </g>
              <circle className="fmap__ring" r="10" />
              <circle className="fmap__ring fmap__ring--2" r="10" />
              <circle r="46" className="fmap__halo" />
              <g className="fmap__pin">
                <path d="M0 0 C -4 -8 -13 -14 -13 -24 A 13 13 0 1 1 13 -24 C 13 -14 4 -8 0 0 Z" />
                <circle cy="-24" r="5" className="fmap__pin-dot" />
              </g>
              <ellipse className="fmap__shadow" rx="7" ry="2.4" cy="2" />
            </g>
          </svg>

          <span className="fmap__chip">
            <i /> Find the Dungeon
          </span>
          <span className="fmap__compass" aria-hidden>
            N
          </span>

          <span className="fmap__card">
            <span className="fmap__addr">
              {brand.addressLines.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </span>
            <span className="fmap__cta">
              Directions <b>↗</b>
            </span>
          </span>
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
