import { Preloader } from "@/components/chrome/Preloader";
import { Cursor } from "@/components/chrome/Cursor";
import { Navbar } from "@/components/chrome/Navbar";
import { Marquee, ScrollProgress, WhatsAppButton } from "@/components/chrome/Extras";
import { Hero } from "@/components/sections/Hero";
import { Manifesto } from "@/components/sections/Manifesto";
import { Gallery } from "@/components/sections/Gallery";
import { Tour } from "@/components/sections/Tour";
import { Programs } from "@/components/sections/Programs";
import { Equipment } from "@/components/sections/Equipment";
import { Trainers } from "@/components/sections/Trainers";
import { Ranks } from "@/components/sections/Ranks";
import { Transformations } from "@/components/sections/Transformations";
import { FireToWater } from "@/components/sections/FireToWater";
import { Spa } from "@/components/sections/Spa";
import { Membership } from "@/components/sections/Membership";
import { LiveStatus } from "@/components/sections/LiveStatus";
import { Testimonials } from "@/components/sections/Testimonials";
import { FreePass } from "@/components/sections/FreePass";
import { Footer } from "@/components/sections/Footer";

// Story: Forge → Gate → Creed → Tour → Train → Arsenal → Coaches → Ranks → Results
//        → 🔥 Fire to Water 💧 → Spa → Plans → Live → Reviews → Free Pass → Footer
export default function Home() {
  return (
    <>
      <Preloader />
      <Cursor />
      <ScrollProgress />
      <Navbar />
      <WhatsAppButton />

      <main>
        <Hero />
        <Manifesto />
        <Gallery />
        <Marquee items={["Strength", "Discipline", "Iron", "Sweat", "Glory", "Recovery"]} />
        <Tour />
        <Programs />
        <Equipment />
        <Trainers />
        <Ranks />
        <Transformations />
        <FireToWater />
        <Spa />
        <Marquee items={["Train Hard", "Recover Harder", "Dungeon", "Gym & Spa"]} reverse />
        <Membership />
        <LiveStatus />
        <Testimonials />
        <FreePass />
      </main>

      <Footer />
    </>
  );
}
