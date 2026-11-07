import { describe, expect, it } from "vitest";
import {
  clampLook,
  createExploreTracker,
  damp,
  DEG,
  fitCameraFov,
  horizontalFov,
  lookLimits,
  photoVerticalCoverage,
  viewPosition,
  type GymView,
} from "../look";
import { gymViews } from "@/data/site";

const photo: GymView = { id: "p", label: "Floor", src: "/x.jpg", kind: "photo", hfov: 104, aspect: 686 / 502 };
const pano: GymView = { ...photo, id: "q", kind: "equirect", aspect: 2 };

describe("real-gym look limits (never show beyond the real photo)", () => {
  it.each([
    ["desktop 16:9", 16 / 9],
    ["ultrawide 21:9", 21 / 9],
    ["laptop 16:10", 16 / 10],
    ["phone portrait", 9 / 19.5],
    ["tablet portrait", 3 / 4],
  ])("on %s the visible frame always stays inside the photo", (_, aspect) => {
    const vfov = fitCameraFov(photo, aspect);
    const l = lookLimits(photo, vfov, aspect);
    const halfPhotoH = (photo.hfov * DEG) / 2;
    const halfPhotoV = photoVerticalCoverage(photo) / 2;
    // worst case: looking all the way to a corner
    expect(l.yawMax + horizontalFov(vfov, aspect) / 2).toBeLessThanOrEqual(halfPhotoH + 1e-9);
    expect(l.pitchMax + vfov / 2).toBeLessThanOrEqual(halfPhotoV + 1e-9);
    expect(l.wrap).toBe(false);
  });

  it("still leaves room to look around on a normal desktop", () => {
    const aspect = 16 / 9;
    const l = lookLimits(photo, fitCameraFov(photo, aspect), aspect);
    expect(l.yawMax / DEG).toBeGreaterThan(5);
    expect(l.pitchMax / DEG).toBeGreaterThan(3);
  });

  it("gives phones more horizontal freedom than desktops", () => {
    const desk = lookLimits(photo, fitCameraFov(photo, 16 / 9), 16 / 9);
    const phone = lookLimits(photo, fitCameraFov(photo, 9 / 19.5), 9 / 19.5);
    expect(phone.yawMax).toBeGreaterThan(desk.yawMax * 2);
  });

  it("only allows full 360° rotation for a real panorama", () => {
    const l = lookLimits(pano, 55 * DEG, 16 / 9);
    expect(l.wrap).toBe(true);
    expect(clampLook(10, 0, l).yaw).toBe(10);
    expect(l.pitchMax).toBeLessThan(Math.PI / 2);
  });

  it("a resting tilt toward the floor is honoured but never looks past the photo's bottom edge", () => {
    const aspect = 16 / 9;
    const l = lookLimits(photo, fitCameraFov(photo, aspect), aspect);
    const tilted = clampLook(0, -10 * DEG, l);
    expect(tilted.pitch).toBeLessThan(0);
    expect(tilted.pitch).toBeGreaterThanOrEqual(l.pitchMin);
  });

  it("clamps yaw and pitch to the limits", () => {
    const l = { wrap: false, yawMin: -0.2, yawMax: 0.2, pitchMin: -0.1, pitchMax: 0.1 };
    expect(clampLook(1, -1, l)).toEqual({ yaw: 0.2, pitch: -0.1 });
    expect(clampLook(0.05, 0.02, l)).toEqual({ yaw: 0.05, pitch: 0.02 });
  });

  it("the configured gym photo is a single wide photo, not mislabelled as 360°", () => {
    expect(gymViews.length).toBeGreaterThan(0);
    gymViews.forEach((v) => {
      if (v.kind === "photo") expect(v.hfov).toBeLessThan(180);
      if (v.kind === "equirect") expect(v.aspect).toBeCloseTo(2, 1);
    });
  });
});

describe("view helpers", () => {
  it("damp converges to the target, frame-rate independently", () => {
    let a = 0;
    for (let i = 0; i < 60; i++) a = damp(a, 1, 5, 1 / 60);
    let b = 0;
    for (let i = 0; i < 30; i++) b = damp(b, 1, 5, 1 / 30);
    expect(a).toBeCloseTo(b, 6);
    expect(a).toBeGreaterThan(0.99);
  });

  it("view position runs 0 (left) → 1 (right) across the photo", () => {
    const l = { wrap: false, yawMin: -0.3, yawMax: 0.3, pitchMin: 0, pitchMax: 0 };
    expect(viewPosition(0.3, l)).toBe(0); // positive yaw = looking left
    expect(viewPosition(-0.3, l)).toBe(1);
    expect(viewPosition(0, l)).toBeCloseTo(0.5);
    expect(viewPosition(0, { ...l, yawMin: 0, yawMax: 0 })).toBe(0.5);
  });

  it("view position wraps around for panoramas", () => {
    const l = { wrap: true, yawMin: -Infinity, yawMax: Infinity, pitchMin: -1, pitchMax: 1 };
    expect(viewPosition(-Math.PI, l)).toBeCloseTo(0.5);
    expect(viewPosition(-Math.PI * 2.5, l)).toBeCloseTo(0.25);
    expect(viewPosition(Math.PI / 2, l)).toBeCloseTo(0.75);
  });

  it("explore tracker counts each part of the view once", () => {
    const t = createExploreTracker(10);
    expect(t.visit(0.05)).toBeCloseTo(0.1);
    expect(t.visit(0.06)).toBeCloseTo(0.1); // same bucket
    expect(t.visit(1)).toBeCloseTo(0.2);
    for (let i = 0; i < 10; i++) t.visit(i / 10);
    expect(t.explored).toBe(1);
  });
});
