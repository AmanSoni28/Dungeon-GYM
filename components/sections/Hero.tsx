"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { brand } from "@/data/site";
import { readEnvironment } from "@/lib/intro/capabilities";
import { createGateSound, type GateSound } from "@/lib/gate/gateSound";
import {
  createSmashClock,
  hasSeenSmash,
  initialSmashState,
  markSmashSeen,
  SMASH_T,
  smashReducer,
  type SmashBeat,
} from "@/lib/gate/smash";
import { scrollToTarget } from "@/lib/utils";
import { SmashControls } from "./SmashControls";
import { readGateDebug } from "@/lib/gate/debug";

const GateScene = dynamic(() => import("@/components/three/GateScene"), { ssr: false });

/** pause after the doors settle before the camera carries the visitor into the gym (ms) */
const AUTO_ENTER_DELAY = 2200;

function Letters({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((ch, i) => (
        <span key={i} className="hero__char" aria-hidden>
          {ch}
        </span>
      ))}
    </>
  );
}

export function Hero() {
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const { loaded } = useApp();
  const [active, setActive] = useState(true);

  // ── dumbbell gate smash ──
  const smash = useRef(createSmashClock());
  const [st, dispatch] = useReducer(smashReducer, initialSmashState);
  const [sceneReady, setSceneReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [lite, setLite] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const sound = useRef<GateSound | null>(null);
  const flash = useRef<HTMLDivElement>(null);
  const tookOver = useRef(false);

  // Pin the hero and map scroll → 0..1 progress for the 3D camera + gate
  useEffect(() => {
    const el = section.current!;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "+=230%",
        pin: true,
        scrub: true,
        onUpdate: (s) => {
          const p = s.progress;
          progress.current = p;
          el.style.setProperty("--p", p.toFixed(4));
          // golden light floods in as the camera passes through the gate, and stays:
          // the real-gym scene that follows starts from the same light (one continuous shot)
          const t = Math.min(1, Math.max(0, (p - 0.8) / 0.17));
          el.style.setProperty("--flash", (t * t * (3 - 2 * t)).toFixed(3));
        },
        onToggle: (s) => setActive(s.isActive || s.progress < 1),
      });
    }, el);
    return () => ctx.revert();
  }, []);

  // device + preference checks; play once per visit
  useEffect(() => {
    const env = readEnvironment();
    setLite(env.mobile || env.lowPower);
    setReduced(env.reducedMotion);
    if (readGateDebug() !== null) return; // dev: always play / freeze
    if (env.reducedMotion || hasSeenSmash()) dispatch({ type: "BYPASS" });
  }, []);

  // audio (silent until the visitor turns it on)
  useEffect(() => {
    const s = createGateSound();
    sound.current = s;
    return () => s.dispose();
  }, []);

  // beats from the 3D timeline → sound, flash, overlay
  useEffect(() => {
    smash.current.onBeat = (beat: SmashBeat) => {
      const s = sound.current;
      if (beat === "throw") s?.whoosh(SMASH_T.impact - SMASH_T.throw);
      if (beat === "impact") {
        s?.crash(1);
        if (flash.current) gsap.fromTo(flash.current, { opacity: 0.85 }, { opacity: 0, duration: 0.55, ease: "power2.out" });
      }
      if (beat === "open") {
        s?.creak(SMASH_T.openEnd - SMASH_T.openStart);
        setRevealed(true);
      }
      if (beat === "end") {
        s?.reveal();
        s?.stopRumble();
        dispatch({ type: "FINISH" });
      }
    };
  }, []);

  // start once the homepage is revealed and the 3D scene exists
  useEffect(() => {
    if (!loaded || !sceneReady || st.status !== "pending") return;
    const id = setTimeout(() => dispatch({ type: "START" }), 400);
    return () => clearTimeout(id);
  }, [loaded, sceneReady, st.status]);

  // (re)play: reset the shared clock, lock scrolling for the few seconds of the shot
  useEffect(() => {
    if (st.status !== "playing") return;
    const c = smash.current;
    Object.assign(c, { t: 0, running: true, run: st.run, trauma: 0, frozen: false });
    const dbg = readGateDebug();
    if (typeof dbg === "number") {
      // dev: hold a single frame of the sequence
      Object.assign(c, { t: dbg, running: false, frozen: true });
      setRevealed(dbg >= SMASH_T.openStart);
      return;
    }
    tookOver.current = false;
    markSmashSeen();
    window.__lenis?.stop();
    sound.current?.startRumble();
  }, [st.status, st.run]);

  // finished or skipped: unlock, then carry the visitor through the open gate into the gym
  useEffect(() => {
    if (st.status !== "done") return;
    if (loaded) setRevealed(true);
    if (st.run === 0) return; // bypassed: classic scroll-driven gate
    window.__lenis?.start();
    if (st.skipped) {
      scrollToTarget("#inside");
      return;
    }
    const take = () => (tookOver.current = true);
    const evs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    evs.forEach((e) => window.addEventListener(e, take, { passive: true }));
    const id = setTimeout(() => {
      if (!tookOver.current && window.scrollY < 40) scrollToTarget("#inside");
    }, AUTO_ENTER_DELAY);
    return () => {
      clearTimeout(id);
      evs.forEach((e) => window.removeEventListener(e, take));
    };
  }, [st.status, st.skipped, st.run, loaded]);

  const skip = useCallback(() => {
    const c = smash.current;
    c.t = SMASH_T.end;
    c.running = false;
    c.trauma = 0;
    sound.current?.stopRumble();
    setRevealed(true);
    dispatch({ type: "SKIP" });
  }, []);

  const replay = useCallback(() => {
    window.__lenis?.scrollTo(0, { immediate: true, force: true });
    window.scrollTo(0, 0);
    setRevealed(false);
    dispatch({ type: "REPLAY" });
  }, []);

  const toggleSound = useCallback(async () => {
    const s = sound.current;
    if (!s) return;
    if (soundOn) {
      s.disable();
      setSoundOn(false);
    } else if (await s.enable()) {
      setSoundOn(true);
      if (smash.current.running) s.startRumble();
    }
  }, [soundOn]);

  // Esc skips the sequence
  useEffect(() => {
    if (st.status !== "playing") return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skip();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [st.status, skip]);

  // Wordmark reveal (after the doors give way, or right away when the smash is bypassed)
  useEffect(() => {
    if (!revealed) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      tl.from(".hero__rule", { scaleX: 0, duration: 1.6, ease: "power3.inOut" })
        .from(".hero__char", { opacity: 0, y: 24, filter: "blur(14px)", duration: 1.8, stagger: { each: 0.07, from: "center" } }, 0.2)
        .from(".hero__word", { letterSpacing: "0.6em", duration: 2.4 }, 0.2)
        .from(".hero__kicker", { opacity: 0, y: 10, duration: 1.2 }, 1)
        .from(".hero__cta", { opacity: 0, y: 16, duration: 1.2 }, 1.2)
        .from(".hero__frame, .hero__scroll", { opacity: 0, duration: 1.6 }, 1.3);
    }, section);
    return () => ctx.revert();
  }, [revealed]);

  return (
    <section
      ref={section}
      id="top"
      className="hero"
      aria-label={brand.full}
      data-reveal={revealed ? "true" : "false"}
      data-smash={st.status}
    >
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

      <div className="hero__scroll" aria-hidden>
        <i />
      </div>

      {loaded && !sceneReady && (
        <div className="hero__loading" role="status">
          <span className="hero__spinner" aria-hidden />
          <span className="sr-only">Loading the Dungeon</span>
        </div>
      )}

      {loaded && (
        <SmashControls
          status={st.status}
          soundOn={soundOn}
          canReplay={st.status === "done" && !reduced}
          onSkip={skip}
          onReplay={replay}
          onToggleSound={toggleSound}
        />
      )}

      <div className="hero__flash" aria-hidden />
    </section>
  );
}
