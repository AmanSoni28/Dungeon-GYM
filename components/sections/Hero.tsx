"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { brand } from "@/data/site";
import { readEnvironment } from "@/lib/intro/capabilities";
import { createGateSound, type GateSound } from "@/lib/gate/gateSound";
import { createSmashClock, SCRUB, scrollToSmashTime, SMASH_T, type SmashBeat } from "@/lib/gate/smash";
import { scrollToTarget } from "@/lib/utils";
import { SmashControls } from "./SmashControls";
import { readGateDebug } from "@/lib/gate/debug";

const GateScene = dynamic(() => import("@/components/three/GateScene"), { ssr: false });

/** scroll progress over which the landing wordmark gives way to the shot */
const TITLE_OUT = 0.09;

function Letters({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((ch, i) => (
        <span key={i} className="hero__char" style={{ "--i": i } as React.CSSProperties} aria-hidden>
          {ch}
        </span>
      ))}
    </>
  );
}

/**
 * Landing: the closed gate behind the DUNGEON wordmark. Scrolling drives the shot:
 * the camera creeps in, a dumbbell is hurled at the gate, it smashes the crest and the doors swing open,
 * then further scrolling walks the visitor through into the gym. Scrolling back rewinds it.
 */
export function Hero() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const { loaded } = useApp();
  const [active, setActive] = useState(true);

  const smash = useRef(createSmashClock());
  const [sceneReady, setSceneReady] = useState(false);
  const [lite, setLite] = useState(false);
  /** reduced motion: no smash, scroll simply swings the gate open */
  const [classic, setClassic] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const sound = useRef<GateSound | null>(null);
  const rumbling = useRef(false);
  const flash = useRef<HTMLDivElement>(null);

  // low rumble bed while the shot is in progress (silent unless the visitor turned sound on)
  const syncRumble = useCallback((p: number) => {
    const s = sound.current;
    if (!s || !smash.current.scrub) return;
    const inShot = p > 0.004 && p < SCRUB.share;
    if (inShot && !rumbling.current) rumbling.current = s.startRumble();
    else if (!inShot && rumbling.current) {
      s.stopRumble();
      rumbling.current = false;
    }
  }, []);

  // Pin the hero and map scroll → the smash timeline, then the walk through the gate
  useEffect(() => {
    const el = section.current!;
    el.dataset.smash = "idle";
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "+=360%",
        pin: true,
        scrub: true,
        onUpdate: (s) => {
          const p = s.progress;
          progress.current = p;
          el.style.setProperty("--p", p.toFixed(4));
          el.style.setProperty("--pi", Math.min(1, p / TITLE_OUT).toFixed(4));
          // golden light floods in as the camera passes through the gate, and stays:
          // the real-gym scene that follows starts from the same light (one continuous shot)
          const t = Math.min(1, Math.max(0, (p - 0.8) / 0.17));
          el.style.setProperty("--flash", (t * t * (3 - 2 * t)).toFixed(3));

          const c = smash.current;
          if (c.scrub) {
            c.goal = scrollToSmashTime(p);
            el.dataset.smash = p < 0.004 ? "idle" : p < SCRUB.share ? "playing" : "done";
          }
          syncRumble(p);
        },
        onToggle: (s) => setActive(s.isActive || s.progress < 1),
      });
    }, el);
    return () => ctx.revert();
  }, [syncRumble]);

  // device + preference checks
  useEffect(() => {
    const env = readEnvironment();
    setLite(env.mobile || env.lowPower);
    const c = smash.current;
    const dbg = readGateDebug();
    if (typeof dbg === "number") {
      // dev: hold a single frame of the sequence
      Object.assign(c, { t: dbg, scrub: false, frozen: true, run: 1 });
      return;
    }
    if (env.reducedMotion) {
      setClassic(true);
      return;
    }
    Object.assign(c, { t: 0, goal: scrollToSmashTime(progress.current), scrub: true, run: 1 });
  }, []);

  // audio (silent until the visitor turns it on)
  useEffect(() => {
    const s = createGateSound();
    sound.current = s;
    return () => s.dispose();
  }, []);

  // beats from the 3D timeline (fired when scrolling forward through them) → sound + flash
  useEffect(() => {
    smash.current.onBeat = (beat: SmashBeat) => {
      const s = sound.current;
      if (beat === "throw") s?.whoosh(SMASH_T.impact - SMASH_T.throw);
      if (beat === "impact") {
        s?.crash(1);
        if (flash.current) gsap.fromTo(flash.current, { opacity: 0.85 }, { opacity: 0, duration: 0.55, ease: "power2.out" });
      }
      if (beat === "open") s?.creak(SMASH_T.openEnd - SMASH_T.openStart);
      if (beat === "end") s?.reveal();
    };
  }, []);

  const skip = useCallback(() => scrollToTarget("#inside"), []);

  const toggleSound = useCallback(async () => {
    const s = sound.current;
    if (!s) return;
    if (soundOn) {
      s.disable();
      rumbling.current = false;
      setSoundOn(false);
    } else if (await s.enable()) {
      setSoundOn(true);
      syncRumble(progress.current);
    }
  }, [soundOn, syncRumble]);

  // Landing reveal: the wordmark materialises out of the dark, letter by letter
  useEffect(() => {
    if (!loaded) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".hero__rule", { scaleX: 0, duration: 1.6, ease: "power3.inOut" })
        .from(".hero__char", { opacity: 0, y: 24, filter: "blur(14px)", duration: 1.8, stagger: { each: 0.07, from: "center" } }, 0.2)
        .from(".hero__word", { letterSpacing: "0.6em", duration: 2.4 }, 0.2)
        .from(".hero__kicker", { opacity: 0, y: 10, duration: 1.2 }, 1)
        .from(".hero__cta", { opacity: 0, y: 16, duration: 1.2 }, 1.2)
        .from(".hero__frame, .hero__scroll, .hero__hint", { opacity: 0, duration: 1.6 }, 1.3);
    }, section);
    return () => ctx.revert();
  }, [loaded]);

  return (
    <section ref={section} id="top" className="hero" aria-label={brand.full} data-reveal={loaded ? "true" : "false"}>
      <div className="hero__canvas">
        {/* paused behind the cinematic intro, starts when the homepage is revealed */}
        <GateScene progress={progress} active={active && loaded} smash={smash} lite={lite} onReady={() => setSceneReady(true)} />
      </div>
      <div className="hero__vignette" />
      <div className="hero__bars" aria-hidden>
        <i />
        <i />
      </div>
      <div ref={flash} className="hero__impact" aria-hidden />
      <div className="hero__frame" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>

      <div className="hero__content">
        <span className="hero__rule" aria-hidden />
        <h1 className="hero__word" aria-label={brand.name}>
          <Letters text="DUNGEON" />
        </h1>
        <p className="hero__kicker">
          <span>Gym</span>
          <i aria-hidden />
          <span>Spa</span>
        </p>
        <div className="hero__cta">
          <Button label="Step Inside" href="#inside" variant="ghost" />
        </div>
      </div>

      <p className="hero__hint" aria-hidden>
        {classic ? "Scroll to open the gate" : "Scroll to break the gate"}
      </p>
      <div className="hero__scroll" aria-hidden>
        <i />
      </div>

      {loaded && !sceneReady && (
        <div className="hero__loading" role="status">
          <span className="hero__spinner" aria-hidden />
          <span className="sr-only">Loading the Dungeon</span>
        </div>
      )}

      {loaded && !classic && <SmashControls soundOn={soundOn} onSkip={skip} onToggleSound={toggleSound} />}

      <div className="hero__flash" aria-hidden />
    </section>
  );
}
