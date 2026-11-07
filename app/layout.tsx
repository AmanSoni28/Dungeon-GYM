import type { Metadata, Viewport } from "next";
import { Anton, Inter, Cormorant_Garamond } from "next/font/google";
import "lenis/dist/lenis.css";
import "@/styles/globals.css";
import "@/styles/chrome.css";
import "@/styles/sections-gym.css";
import "@/styles/sections-spa.css";
import "@/styles/sections-end.css";
import { AppProvider } from "@/components/providers/AppProvider";

const display = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dungeon Gym & Spa | Forge Your Body. Restore Your Soul.",
  description:
    "Premium strength gym and luxury recovery spa. Elite trainers, a 360° virtual tour, group classes, steam, sauna, massage and ice plunge.",
};

export const viewport: Viewport = {
  themeColor: "#0a0908",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="gym" className={`${display.variable} ${body.variable} ${serif.variable}`}>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
