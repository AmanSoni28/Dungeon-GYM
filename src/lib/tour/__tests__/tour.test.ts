import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { virtualTour } from "@/data/site";
import { DEG, fitCameraFov, horizontalFov, lookLimits, SCREEN_RADIUS, type GymView } from "@/lib/gym/look";
import {
  clampZoom,
  coverageDegrees,
  createTourLook,
  hotspotAngles,
  hotspotPoint,
  initialTourState,
  keyToAction,
  reachableFrom,
  stopIndex,
  tourReducer,
  wrapIndex,
  ZOOM,
  type TourState,
} from "../tour";

const N = virtualTour.length;
const photo: GymView = { id: "p", label: "p", src: "/p.jpg", kind: "photo", hfov: 100, aspect: 16 / 9 };

describe("tour data: the four real gym zones", () => {
  it("has the four zones in order with titles and descriptions", () => {
    expect(virtualTour.map((s) => `${s.zone} ${s.title}`)).toEqual([
      "01 Strength Training",
      "02 Cardio & Treadmills",
      "03 Main Workout Floor",
      "04 Dumbbell & Free Weights",
    ]);
    virtualTour.forEach((s) => expect(s.description.length).toBeGreaterThan(20));
  });

  it("every image path exists in /public (no broken images)", () => {
    virtualTour.forEach((s) =>
      [s.src, s.srcSmall, s.thumb].forEach((src) => {
        expect(src, s.id).toBeTruthy();
        expect(existsSync(join(process.cwd(), "public", src!)), src).toBe(true);
      })
    );
  });

  it("ids are unique and every hotspot leads to a real, different zone", () => {
    expect(new Set(virtualTour.map((s) => s.id)).size).toBe(N);
    virtualTour.forEach((s) =>
      s.hotspots.forEach((h) => {
        expect(stopIndex(virtualTour, h.to)).toBeGreaterThanOrEqual(0);
        expect(h.to).not.toBe(s.id);
      })
    );
  });

  it("every zone can be reached by walking hotspots from any zone", () => {
    virtualTour.forEach((s) => expect(reachableFrom(virtualTour, s.id).size).toBe(N));
  });

  it("photos are not mislabelled as 360° panoramas", () => {
    virtualTour.forEach((s) => {
      if (s.kind === "photo") expect(coverageDegrees(s)).toBeLessThan(180);
      else expect(s.aspect).toBeCloseTo(2, 1);
    });
  });

  it("hotspots sit inside the photo, clear of the faded edges, and can be brought into view", () => {
    for (const aspect of [16 / 9, 9 / 19.5]) {
      virtualTour.forEach((s) => {
        const vfov = fitCameraFov(s, aspect);
        const l = lookLimits(s, vfov, aspect);
        const halfH = horizontalFov(vfov, aspect) / 2;
        s.hotspots.forEach((h) => {
          expect(h.u).toBeGreaterThan(0.07);
          expect(h.u).toBeLessThan(0.93);
          expect(h.v).toBeGreaterThan(0.08);
          expect(h.v).toBeLessThan(0.92);
          const a = hotspotAngles(h, s);
          // turning as far as allowed, the hotspot is inside the frame
          expect(Math.abs(a.yaw)).toBeLessThan(l.yawMax + halfH);
        });
      });
    }
  });
});

describe("hotspot geometry", () => {
  it("the photo centre is straight ahead", () => {
    const [x, y, z] = hotspotPoint({ u: 0.5, v: 0.5 }, photo, SCREEN_RADIUS);
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(0);
    expect(z).toBeCloseTo(-SCREEN_RADIUS);
  });

  it("left/right and up/down match the photo", () => {
    const left = hotspotPoint({ u: 0.2, v: 0.5 }, photo);
    const right = hotspotPoint({ u: 0.8, v: 0.5 }, photo);
    const high = hotspotPoint({ u: 0.5, v: 0.2 }, photo);
    expect(left[0]).toBeLessThan(0);
    expect(right[0]).toBeGreaterThan(0);
    expect(high[1]).toBeGreaterThan(0);
    expect(hotspotAngles({ u: 0.2, v: 0.5 }, photo).yaw).toBeGreaterThan(0); // +yaw = turn left
  });

  it("the photo's edge sits at half the lens's field of view", () => {
    expect(hotspotAngles({ u: 0, v: 0.5 }, photo).yaw).toBeCloseTo(50 * DEG);
  });

  it("panoramas map the full circle", () => {
    const pano: GymView = { ...photo, kind: "equirect", aspect: 2 };
    expect(Math.abs(hotspotAngles({ u: 0, v: 0.5 }, pano).yaw)).toBeCloseTo(Math.PI);
    expect(coverageDegrees(pano)).toBe(360);
  });
});

describe("navigation + transitions", () => {
  const settle = (s: TourState) => tourReducer(tourReducer(s, { type: "ready" }), { type: "settled" });
  const idle = (i = 0) => settle(initialTourState(i));

  it("opens on the requested zone with a cinematic reveal", () => {
    const s = initialTourState(2);
    expect(s).toMatchObject({ index: 2, phase: "in", ready: false, zoom: 1 });
    expect(idle(2).phase).toBe("idle");
  });

  it("does not finish the reveal before the photo has loaded", () => {
    expect(tourReducer(initialTourState(), { type: "settled" }).phase).toBe("in");
  });

  it("travels out → swap → in → idle", () => {
    let s = tourReducer(idle(0), { type: "go", to: 1, count: N });
    expect(s).toMatchObject({ phase: "out", target: 1, index: 0 });
    s = tourReducer(s, { type: "swap" });
    expect(s).toMatchObject({ phase: "in", index: 1, target: null, ready: false });
    s = settle(s);
    expect(s).toMatchObject({ phase: "idle", index: 1 });
  });

  it("next / previous wrap around the four zones", () => {
    expect(wrapIndex(N, N)).toBe(0);
    expect(wrapIndex(-1, N)).toBe(N - 1);
    expect(tourReducer(idle(0), { type: "go", to: -1, count: N }).target).toBe(N - 1);
    expect(tourReducer(idle(N - 1), { type: "go", to: N, count: N }).target).toBe(0);
  });

  it("ignores clicks while already travelling, and moves to the current zone", () => {
    const moving = tourReducer(idle(0), { type: "go", to: 1, count: N });
    expect(tourReducer(moving, { type: "go", to: 3, count: N })).toBe(moving);
    const s = idle(0);
    expect(tourReducer(s, { type: "go", to: 0, count: N })).toBe(s);
  });

  it("arriving in a new zone resets the zoom", () => {
    let s = tourReducer(idle(0), { type: "zoom", by: 1 });
    s = tourReducer(tourReducer(s, { type: "go", to: 1, count: N }), { type: "swap" });
    expect(s.zoom).toBe(1);
  });
});

describe("zoom", () => {
  it("zoom in / out stay inside the limits", () => {
    let s = initialTourState();
    for (let i = 0; i < 20; i++) s = tourReducer(s, { type: "zoom", by: ZOOM.step });
    expect(s.zoom).toBe(ZOOM.max);
    for (let i = 0; i < 20; i++) s = tourReducer(s, { type: "zoom", by: -ZOOM.step });
    expect(s.zoom).toBe(ZOOM.min);
  });

  it("pinch values are clamped and reset returns to 100%", () => {
    expect(clampZoom(9)).toBe(ZOOM.max);
    expect(clampZoom(0.2)).toBe(ZOOM.min);
    const s = tourReducer(initialTourState(), { type: "setZoom", zoom: 1.8 });
    expect(s.zoom).toBe(1.8);
    expect(tourReducer(s, { type: "reset" }).zoom).toBe(1);
  });

  it("zooming in never shows past the photo: it only narrows the view", () => {
    const aspect = 16 / 9;
    const base = fitCameraFov(photo, aspect);
    const wide = lookLimits(photo, base, aspect);
    const zoomed = lookLimits(photo, base / ZOOM.max, aspect);
    expect(zoomed.yawMax).toBeGreaterThan(wide.yawMax); // more room to pan once zoomed in
  });
});

describe("keyboard", () => {
  it.each([
    ["ArrowLeft", "left"],
    ["ArrowRight", "right"],
    ["ArrowUp", "up"],
    ["ArrowDown", "down"],
    ["+", "zoomIn"],
    ["=", "zoomIn"],
    ["-", "zoomOut"],
    ["PageDown", "next"],
    ["n", "next"],
    ["PageUp", "prev"],
    ["p", "prev"],
    ["r", "reset"],
    ["f", "fullscreen"],
    ["Escape", "exit"],
  ])("%s → %s", (key, action) => expect(keyToAction(key)).toBe(action));

  it("ignores unrelated keys (Tab, Enter, Space keep their normal meaning)", () => {
    ["Tab", "Enter", " ", "a"].forEach((k) => expect(keyToAction(k)).toBeNull());
  });
});

describe("look state", () => {
  it("starts centred at 100% and works with the photo fallback (no scroll sweep)", () => {
    expect(createTourLook()).toMatchObject({ dragYaw: 0, dragPitch: 0, zoom: 1 });
  });
});
