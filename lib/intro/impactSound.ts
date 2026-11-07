// Cinematic bass impact, synthesised with the Web Audio API (no audio files to download).
// Audio is OFF by default and only enabled from an explicit user click (autoplay-policy safe).

type Ctor = new () => AudioContext;

export type AudioController = {
  readonly enabled: boolean;
  enable: () => Promise<boolean>;
  disable: () => void;
  playImpact: (intensity?: number) => boolean;
  dispose: () => void;
};

function defaultCtor(): Ctor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return w.AudioContext ?? w.webkitAudioContext;
}

export function createAudioController(getCtor: () => Ctor | undefined = defaultCtor): AudioController {
  let ctx: AudioContext | null = null;
  let enabled = false;

  return {
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
      enabled = false;
    },

    playImpact(intensity = 1) {
      if (!enabled || !ctx) return false;
      const k = Math.min(1, Math.max(0.1, intensity));
      const t = ctx.currentTime;

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.9 * k, t);
      master.connect(ctx.destination);

      // 1) sub-bass drop
      const sub = ctx.createOscillator();
      const subGain = ctx.createGain();
      sub.type = "sine";
      sub.frequency.setValueAtTime(95, t);
      sub.frequency.exponentialRampToValueAtTime(30, t + 0.9);
      subGain.gain.setValueAtTime(0.0001, t);
      subGain.gain.exponentialRampToValueAtTime(1, t + 0.008);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      sub.connect(subGain).connect(master);
      sub.start(t);
      sub.stop(t + 1.6);

      // 2) filtered noise thud (rubber on floor)
      const len = Math.floor(ctx.sampleRate * 0.5);
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(700, t);
      lp.frequency.exponentialRampToValueAtTime(120, t + 0.35);
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.7, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      noise.connect(lp).connect(noiseGain).connect(master);
      noise.start(t);

      // 3) metallic ring of the bar + plates
      [412, 618, 1240].forEach((f, i) => {
        const o = ctx!.createOscillator();
        const g = ctx!.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.06 / (i + 1), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9 - i * 0.2);
        o.connect(g).connect(master);
        o.start(t);
        o.stop(t + 1);
      });
      return true;
    },

    dispose() {
      enabled = false;
      ctx?.close().catch(() => {});
      ctx = null;
    },
  };
}
