import { describe, expect, it, vi } from "vitest";
import { createAudioController } from "../impactSound";

const param = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
const node = () => {
  const n: Record<string, unknown> = {};
  n.connect = vi.fn(() => n);
  return n;
};

function makeFakeCtor(initialState: AudioContextState = "suspended") {
  const instances: FakeCtx[] = [];
  class FakeCtx {
    state = initialState;
    currentTime = 0;
    sampleRate = 8000;
    destination = {};
    resume = vi.fn(async () => {
      this.state = "running";
    });
    close = vi.fn(async () => {});
    createGain = vi.fn(() => ({ ...node(), gain: param() }));
    createOscillator = vi.fn(() => ({ ...node(), type: "", frequency: param(), start: vi.fn(), stop: vi.fn() }));
    createBiquadFilter = vi.fn(() => ({ ...node(), type: "", frequency: param() }));
    createBuffer = vi.fn((_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) }));
    createBufferSource = vi.fn(() => ({ ...node(), buffer: null, start: vi.fn() }));
    constructor() {
      instances.push(this);
    }
  }
  return { Ctor: FakeCtx as unknown as new () => AudioContext, instances };
}

describe("impact sound (Web Audio)", () => {
  it("is silent until explicitly enabled (no autoplay)", () => {
    const { Ctor, instances } = makeFakeCtor();
    const audio = createAudioController(() => Ctor);
    expect(audio.enabled).toBe(false);
    expect(audio.playImpact()).toBe(false);
    expect(instances).toHaveLength(0); // no AudioContext created before a user gesture
  });

  it("creates and resumes the context on enable, then synthesises the boom", async () => {
    const { Ctor, instances } = makeFakeCtor("suspended");
    const audio = createAudioController(() => Ctor);
    await expect(audio.enable()).resolves.toBe(true);
    const ctx = instances[0];
    expect(ctx.resume).toHaveBeenCalled();
    expect(audio.playImpact(1)).toBe(true);
    expect(ctx.createOscillator).toHaveBeenCalledTimes(4); // sub-bass + 3 metal partials
    expect(ctx.createBufferSource).toHaveBeenCalledTimes(1); // noise thud
  });

  it("reuses one AudioContext across enable calls", async () => {
    const { Ctor, instances } = makeFakeCtor("running");
    const audio = createAudioController(() => Ctor);
    await audio.enable();
    await audio.enable();
    expect(instances).toHaveLength(1);
    expect(instances[0].resume).not.toHaveBeenCalled();
  });

  it("can be muted again", async () => {
    const { Ctor } = makeFakeCtor();
    const audio = createAudioController(() => Ctor);
    await audio.enable();
    audio.disable();
    expect(audio.playImpact()).toBe(false);
  });

  it("reports failure gracefully when Web Audio is unsupported", async () => {
    const audio = createAudioController(() => undefined);
    await expect(audio.enable()).resolves.toBe(false);
    expect(audio.playImpact()).toBe(false);
  });

  it("closes the context on dispose", async () => {
    const { Ctor, instances } = makeFakeCtor();
    const audio = createAudioController(() => Ctor);
    await audio.enable();
    audio.dispose();
    expect(instances[0].close).toHaveBeenCalled();
    expect(audio.enabled).toBe(false);
  });
});
