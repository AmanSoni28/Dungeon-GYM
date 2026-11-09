import { describe, expect, it, vi } from "vitest";
import { createGateSound } from "../gateSound";

const param = () => ({ value: 0.3, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
const node = () => {
  const n: Record<string, unknown> = {};
  n.connect = vi.fn(() => n);
  return n;
};

function fakeCtor() {
  const instances: FakeCtx[] = [];
  class FakeCtx {
    state: AudioContextState = "suspended";
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
    createBufferSource = vi.fn(() => ({ ...node(), buffer: null, loop: false, start: vi.fn(), stop: vi.fn() }));
    constructor() {
      instances.push(this);
    }
  }
  return { Ctor: FakeCtx as unknown as new () => AudioContext, instances };
}

describe("gate smash sound", () => {
  it("is silent and creates no AudioContext until enabled by the visitor", () => {
    const { Ctor, instances } = fakeCtor();
    const s = createGateSound(() => Ctor);
    expect(s.enabled).toBe(false);
    expect(s.whoosh()).toBe(false);
    expect(s.crash()).toBe(false);
    expect(s.creak()).toBe(false);
    expect(s.reveal()).toBe(false);
    expect(s.startRumble()).toBe(false);
    expect(instances).toHaveLength(0);
  });

  it("plays every cue once enabled", async () => {
    const { Ctor, instances } = fakeCtor();
    const s = createGateSound(() => Ctor);
    await expect(s.enable()).resolves.toBe(true);
    expect(instances[0].resume).toHaveBeenCalled();
    expect(s.startRumble()).toBe(true);
    expect(s.startRumble()).toBe(false); // only one rumble bed at a time
    expect(s.whoosh(0.6)).toBe(true);
    expect(s.crash(1)).toBe(true);
    expect(s.creak(2)).toBe(true);
    expect(s.reveal()).toBe(true);
  });

  it("mute stops the rumble and silences further cues", async () => {
    const { Ctor, instances } = fakeCtor();
    const s = createGateSound(() => Ctor);
    await s.enable();
    s.startRumble();
    const src = instances[0].createBufferSource.mock.results[0].value as { stop: ReturnType<typeof vi.fn> };
    s.disable();
    expect(src.stop).toHaveBeenCalled();
    expect(s.crash()).toBe(false);
  });

  it("returns false when Web Audio is unavailable", async () => {
    const s = createGateSound(() => undefined);
    await expect(s.enable()).resolves.toBe(false);
  });

  it("closes the context on dispose", async () => {
    const { Ctor, instances } = fakeCtor();
    const s = createGateSound(() => Ctor);
    await s.enable();
    s.dispose();
    expect(instances[0].close).toHaveBeenCalled();
    expect(s.enabled).toBe(false);
  });
});
