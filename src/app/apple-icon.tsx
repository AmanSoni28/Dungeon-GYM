import { ImageResponse } from "next/og";

// iPhone / iPad home-screen icon (iOS does not use SVG favicons): same mark as app/icon.svg, as a PNG
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0b0a08" }}>
        <svg width="180" height="180" viewBox="0 0 64 64">
          <defs>
            <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f6e27a" />
              <stop offset=".45" stopColor="#d4af37" />
              <stop offset=".7" stopColor="#fff1b8" />
              <stop offset="1" stopColor="#a8801f" />
            </linearGradient>
            <radialGradient id="glow" cx=".5" cy=".38" r=".7">
              <stop offset="0" stopColor="#2a2114" />
              <stop offset="1" stopColor="#0b0a08" />
            </radialGradient>
          </defs>
          {/* full-bleed tile: iOS rounds the corners itself */}
          <rect width="64" height="64" fill="url(#glow)" />
          <rect x="9" y="30.75" width="46" height="2.5" rx="1.25" fill="url(#gold)" />
          <rect x="8" y="24" width="4" height="16" rx="1.5" fill="url(#gold)" />
          <rect x="52" y="24" width="4" height="16" rx="1.5" fill="url(#gold)" />
          <path fill="url(#gold)" fillRule="evenodd" d="M19 13h13a19 19 0 0 1 0 38H19Zm7 7v24h6a12 12 0 0 0 0-24Z" />
        </svg>
      </div>
    ),
    size
  );
}
