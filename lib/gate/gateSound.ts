// Sound design for the gate smash, synthesised with the Web Audio API (no files to download).
// OFF by default; an AudioContext is only created from an explicit user click (autoplay-policy safe).

type Ctor = new () => AudioContext;

export type GateSound = {
  readonly enabled: boolean;
  enable: () => Promise<boolean>;
  disable: () => void;
  /** low cinematic rumble bed (loops until stopRumble) */
  startRumble: () => boolean;
  stopRumble: () => void;
  whoosh: (duration?: number) => boolean;
  crash: (intensity?: number) => boolean;
  creak: (duration?: number) => boolean;
  reveal: () => boolean;
  dispose: () => void;
};

function defaultCtor(): Ctor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return w.AudioContext ?? w.webkitAudioContext;
}

function noiseBuffer(ctx: AudioContext, seconds: number, decay = true) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (decay ? 1 - i / len : 1);
  return buf;
}

export function createGateSound(getCtor: () => Ctor | undefined = defaultCtor): GateSound {
  let ctx: AudioContext | null = null;
  let enabled = false;
  let rumble: { src: AudioBufferSourceNode; gain: GainNode } | null = null;

  const ready = () => (enabled && ctx ? ctx : null);

  const api: GateSound = {
    get enabled() {
      return enabled;
    },

    async enable() {
      const C = getCtor();
      if (!C) return false;
      if (!ctx) ctx = new C();
      if (ctx.state === "suspended") await ctx.resume();
      enabled = true;
      return true;
    },

    disable() {
      api.stopRumble();
      enabled = false;
    },

    startRumble() {
      const c = ready();
      if (!c || rumble) return false;
      const t = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(c, 2, false);
      src.loop = true;
      const lp = c.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(90, t);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 1.2);
      src.connect(lp).connect(gain).connect(c.destination);
      src.start(t);
      rumble = { src, gain };
      return true;
    },

    stopRumble() {
      if (!rumble || !ctx) {
        rumble = null;
        return;
      }
      const t = ctx.currentTime;
      rumble.gain.gain.setValueAtTime(rumble.gain.gain.value || 0.35, t);
      rumble.gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      rumble.src.stop(t + 1.3);
      rumble = null;
    },

    whoosh(duration = 0.6) {
      const c = ready();
      if (!c) return false;
      const t = c.currentTime;
      const src = c.createBufferSource();
      src.buffer = noiseBuffer(c, duration + 0.1, false);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(300, t);
      bp.frequency.exponentialRampToValueAtTime(2200, t + duration * 0.8);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.55, t + duration * 0.85);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration + 0.08);
      src.connect(bp).connect(g).connect(c.destination);
      src.start(t);
      return true;
    },

    crash(intensity = 1) {
      const c = ready();
      if (!c) return false;
      const k = Math.min(1, Math.max(0.1, intensity));
      const t = c.currentTime;
      const master = c.createGain();
      master.gain.setValueAtTime(0.95 * k, t);
      master.connect(c.destination);

      // sub-bass hit
      const sub = c.createOscillator();
      const sg = c.createGain();
      sub.type = "sine";
      sub.frequency.setValueAtTime(70, t);
      sub.frequency.exponentialRampToValueAtTime(28, t + 1.2);
      sg.gain.setValueAtTime(0.0001, t);
      sg.gain.exponentialRampToValueAtTime(1, t + 0.006);
      sg.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
      sub.connect(sg).connect(master);
      sub.start(t);
      sub.stop(t + 1.9);

      // broadband crack
      const n = c.createBufferSource();
      n.buffer = noiseBuffer(c, 0.6);
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.setValueAtTime(900, t);
      const ng = c.createGain();
      ng.gain.setValueAtTime(0.8, t);
      ng.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      n.connect(hp).connect(ng).connect(master);
      n.start(t);

      // inharmonic iron ring (gate bars + plates)
      [187, 283, 431, 652, 1013].forEach((f, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = i % 2 ? "triangle" : "sine";
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.12 / (i + 1), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4 - i * 0.3);
        o.connect(g).connect(master);
        o.start(t);
        o.stop(t + 2.5);
      });
      return true;
    },

    creak(duration = 2) {
      const c = ready();
      if (!c) return false;
      const t = c.currentTime;
      // a slowly bending, rough sawtooth through a resonant band = old iron hinge
      const o = c.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(52, t);
      o.frequency.linearRampToValueAtTime(78, t + duration * 0.4);
      o.frequency.linearRampToValueAtTime(44, t + duration);
      const bp = c.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(620, t);
      bp.frequency.linearRampToValueAtTime(380, t + duration);
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      o.connect(bp).connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + duration + 0.05);
      return true;
    },

    reveal() {
      const c = ready();
      if (!c) return false;
      const t = c.currentTime;
      // warm swelling chord (open fifths)
      [73.4, 110, 146.8, 220].forEach((f, i) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09 / (1 + i * 0.4), t + 1.4);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
        o.connect(g).connect(c.destination);
        o.start(t);
        o.stop(t + 3.7);
      });
      return true;
    },

    dispose() {
      api.stopRumble();
      enabled = false;
      ctx?.close().catch(() => {});
      ctx = null;
    },
  };
  return api;
}
