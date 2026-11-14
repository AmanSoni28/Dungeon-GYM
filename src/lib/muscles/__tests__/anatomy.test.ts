import { describe, expect, it } from "vitest";
import { muscles, type MuscleId } from "@/data/site";
import { ANCHORS, GROUP_MUSCLES, PARTS, PREFERRED_VIEW, angleForView, faceAt, snapRotation, viewFor, type View } from "../anatomy";

const GROUPS = Object.keys(muscles) as MuscleId[];
const VIEWS: View[] = ["front", "back"];

/** All numeric coordinates in a path string. */
const coords = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);

describe("anatomy data", () => {
  it("covers every training group with real muscle shapes", () => {
    for (const g of GROUPS) {
      const count = VIEWS.flatMap((v) => PARTS[v]).filter((p) => p.group === g).length;
      expect(count, g).toBeGreaterThan(0);
      expect(GROUP_MUSCLES[g]).toBeTruthy();
    }
  });

  it("shows each group in its preferred view, with a label anchor there", () => {
    for (const g of GROUPS) {
      const views = PREFERRED_VIEW[g] ? [PREFERRED_VIEW[g]!] : VIEWS;
      for (const v of views) {
        expect(PARTS[v].some((p) => p.group === g), `${g} in ${v}`).toBe(true);
        expect(ANCHORS[v][g], `${g} anchor in ${v}`).toBeDefined();
      }
    }
  });

  it("maps arms to biceps on the front and triceps on the back, legs to quads/hamstrings/calves", () => {
    const ids = (v: View, g: MuscleId) => PARTS[v].filter((p) => p.group === g).map((p) => p.id);
    expect(ids("front", "arms")).toContain("biceps");
    expect(ids("back", "arms")).toEqual(expect.arrayContaining(["triceps-long", "triceps-lateral"]));
    expect(ids("front", "legs")).toEqual(expect.arrayContaining(["rectus-femoris", "vastus-lateralis", "vastus-medialis"]));
    expect(ids("back", "legs")).toEqual(expect.arrayContaining(["biceps-femoris", "semitendinosus", "gastrocnemius-medial"]));
    expect(ids("front", "chest")).toEqual(["pectoralis-major"]);
    expect(ids("back", "back")).toEqual(expect.arrayContaining(["latissimus-dorsi", "trapezius"]));
  });

  it("keeps ids unique and every shape on the left half of the canvas", () => {
    for (const v of VIEWS) {
      const ids = PARTS[v].map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const p of PARTS[v]) {
        const xs = coords(p.d).filter((_, i) => i % 2 === 0);
        expect(Math.max(...xs), p.id).toBeLessThanOrEqual(200);
        expect(Math.min(...xs), p.id).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe("rotation helpers", () => {
  it("snaps a free angle to the nearest face", () => {
    expect(snapRotation(20)).toEqual({ deg: 0, view: "front" });
    expect(snapRotation(100)).toEqual({ deg: 180, view: "back" });
    expect(snapRotation(-170)).toEqual({ deg: -180, view: "back" });
    expect(snapRotation(350)).toEqual({ deg: 360, view: "front" });
    expect(faceAt(-95)).toBe("back");
  });

  it("turns the short way to a requested view", () => {
    expect(angleForView("back", 0)).toBe(180);
    expect(Math.abs(angleForView("front", 180) - 180)).toBe(180); // either way is a half turn
    expect(angleForView("front", 540)).toBe(720);
    expect(angleForView("back", -360)).toBe(-180);
  });

  it("picks the view for a selected group", () => {
    expect(viewFor("back", "front")).toBe("back");
    expect(viewFor("chest", "back")).toBe("front");
    expect(viewFor("arms", "back")).toBe("back");
    expect(viewFor("legs", "front")).toBe("front");
  });
});
