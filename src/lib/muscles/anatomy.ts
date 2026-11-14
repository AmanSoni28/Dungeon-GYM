import type { MuscleId } from "@/data/site";

/**
 * Anatomical figure data for the Programs muscle map.
 *
 * Coordinate space: viewBox 0 0 400 1000, figure centred on x = 200, ~8.5 heads tall.
 * Every path describes the figure's LEFT half of the image (x ≤ 200); the renderer mirrors
 * it across x = 200 for the other side, so both sides are always symmetric.
 * Muscles are separate shapes; the gaps between them reveal the darker body underneath,
 * which is what draws the muscle separation lines.
 */

export type View = "front" | "back";

export type MusclePart = {
  id: string;
  /** Training group this muscle belongs to (null = anatomical detail, not selectable). */
  group: MuscleId | null;
  d: string;
};

export const VIEWBOX = { w: 400, h: 1000 } as const;

/** Half-silhouette (closed along the centre line). Shared by both views so rotation stays coherent. */
export const SILHOUETTE =
  "M200,22 C180,22 163,36 162,62 C161,80 162,94 164,104 C159,103 157,110 159,117 C161,123 164,124 167,121 " +
  "C170,130 175,136 178,140 C177,152 176,160 174,168 C160,176 128,184 104,192 " +
  "C88,196 78,210 76,230 C74,248 78,262 82,272 " +
  "C76,296 70,322 70,346 C70,356 72,362 74,366 " +
  "C64,384 56,408 58,432 C60,452 64,466 66,478 " +
  "C58,496 54,520 56,544 C58,560 62,574 70,578 C78,580 82,572 82,560 C84,540 84,508 82,484 " +
  "C88,456 100,420 104,396 C106,384 106,376 104,370 " +
  "C110,346 116,312 118,290 C120,276 122,266 126,258 " +
  "C126,280 128,310 132,340 C134,358 136,372 134,384 C132,400 128,414 124,428 " +
  "C114,450 108,486 108,520 C108,570 116,624 128,672 C132,688 136,700 138,712 " +
  "C130,736 126,766 130,796 C136,840 148,880 155,912 " +
  "C152,930 146,952 148,970 C150,980 166,984 180,982 C188,980 190,972 186,960 C182,946 180,930 180,914 " +
  "C182,880 192,840 193,800 C194,768 190,742 182,724 C181,712 182,700 184,690 " +
  "C190,640 196,580 198,540 C199,520 200,508 200,500 L200,22 Z";

const FRONT: MusclePart[] = [
  // ── neck / traps
  { id: "sternocleidomastoid", group: null, d: "M181,128 C185,146 191,166 196,186 L189,186 C185,166 179,148 177,132 Z" },
  { id: "upper-trapezius", group: "back", d: "M175,152 C169,164 152,174 130,184 C144,187 162,185 177,179 C180,170 179,160 175,152 Z" },
  // ── shoulders
  {
    id: "deltoid-front",
    group: "shoulders",
    d: "M128,193 C114,187 96,190 86,200 C76,214 76,240 80,262 C84,272 90,278 96,276 C100,262 106,246 114,232 C120,220 126,206 128,193 Z",
  },
  // ── chest
  {
    id: "pectoralis-major",
    group: "chest",
    d: "M197,191 C178,184 150,186 132,195 C124,206 120,222 121,236 C126,258 139,279 158,289 C174,295 188,295 197,292 Z",
  },
  // ── arms
  {
    id: "biceps",
    group: "arms",
    d: "M110,266 C98,272 89,294 89,320 C89,340 93,354 99,362 C106,356 112,338 114,316 C116,294 116,278 110,266 Z",
  },
  { id: "triceps-lateral-front", group: "arms", d: "M84,278 C76,298 72,320 72,342 C74,354 78,360 83,362 C85,338 85,312 89,288 Z" },
  {
    id: "brachioradialis",
    group: "arms",
    d: "M79,367 C67,381 61,402 61,426 C63,448 66,463 68,473 C72,452 78,428 84,406 C88,390 88,376 79,367 Z",
  },
  {
    id: "forearm-flexors",
    group: "arms",
    d: "M98,371 C104,383 103,400 99,420 C95,440 86,461 77,476 C77,456 82,432 88,411 C92,395 94,381 98,371 Z",
  },
  // ── core
  {
    id: "external-oblique",
    group: "core",
    d: "M160,298 C149,316 142,346 138,376 C135,398 135,414 139,426 C151,442 166,458 181,469 C177,441 171,410 169,380 C167,350 166,322 166,302 Z",
  },
  { id: "serratus-1", group: "core", d: "M129,268 C127,276 127,284 129,290 L146,284 C142,278 136,272 129,268 Z" },
  { id: "serratus-2", group: "core", d: "M131,295 C129,303 129,310 131,316 L150,306 C146,300 140,296 131,295 Z" },
  { id: "serratus-3", group: "core", d: "M133,321 C131,329 133,336 135,340 L153,328 C149,324 143,321 133,321 Z" },
  {
    id: "rectus-abdominis-1",
    group: "core",
    d: "M197,300 L197,332 C188,334 179,333 173,330 C171,318 172,308 175,302 C182,298 190,298 197,300 Z",
  },
  {
    id: "rectus-abdominis-2",
    group: "core",
    d: "M197,338 L197,370 C188,372 179,371 172,368 C171,356 171,346 173,340 C181,336 189,336 197,338 Z",
  },
  {
    id: "rectus-abdominis-3",
    group: "core",
    d: "M197,376 L197,406 C188,408 180,407 173,404 C172,394 172,384 173,378 C181,374 189,374 197,376 Z",
  },
  {
    id: "rectus-abdominis-lower",
    group: "core",
    d: "M197,412 L197,476 C192,474 186,466 182,456 C177,442 174,426 173,412 C181,410 189,410 197,412 Z",
  },
  // ── legs
  { id: "tensor-fasciae-latae", group: "legs", d: "M126,434 C119,450 117,466 119,484 L132,472 C134,458 134,446 130,434 Z" },
  {
    id: "vastus-lateralis",
    group: "legs",
    d: "M117,486 C108,522 108,570 114,620 C118,650 127,676 141,692 C145,660 145,620 145,580 C145,540 142,508 136,480 Z",
  },
  {
    id: "rectus-femoris",
    group: "legs",
    d: "M147,479 C155,520 157,570 157,620 C157,650 159,672 163,684 C171,666 176,640 176,610 C176,580 172,550 166,520 C160,500 154,487 147,479 Z",
  },
  {
    id: "adductors",
    group: "legs",
    d: "M190,500 C197,530 196,566 187,598 C180,574 176,544 175,518 C179,507 184,501 190,500 Z",
  },
  {
    id: "sartorius",
    group: "legs",
    d: "M131,452 C147,486 165,526 177,570 C183,600 187,640 187,688 L181,688 C181,644 177,606 171,581 C161,541 145,501 128,462 Z",
  },
  {
    id: "vastus-medialis",
    group: "legs",
    d: "M177,612 C186,630 189,652 185,676 C181,690 172,697 163,693 C167,676 171,650 177,612 Z",
  },
  {
    id: "patella",
    group: null,
    d: "M160,699 C167,699 173,704 173,712 C173,720 167,724 160,724 C153,724 148,718 148,711 C148,704 153,699 160,699 Z",
  },
  {
    id: "tibialis-anterior",
    group: "legs",
    d: "M144,728 C138,760 140,800 147,840 C151,866 155,890 159,906 C163,880 164,840 162,800 C160,770 156,744 151,729 Z",
  },
  { id: "peroneus", group: "legs", d: "M137,734 C129,762 128,798 135,830 L142,822 C138,792 138,762 141,740 Z" },
  {
    id: "gastrocnemius-medial-front",
    group: "legs",
    d: "M175,727 C188,749 193,782 189,818 C186,838 181,852 176,860 C171,828 168,792 168,760 C168,746 170,734 175,727 Z",
  },
];

const BACK: MusclePart[] = [
  // ── back
  {
    id: "trapezius",
    group: "back",
    d: "M198,122 C190,140 183,157 173,168 C152,179 124,186 102,195 C122,205 146,212 163,228 C176,262 186,320 198,372 Z",
  },
  {
    id: "infraspinatus",
    group: "back",
    d: "M160,234 C146,228 129,228 118,238 C112,251 115,266 125,275 C138,281 151,279 158,269 C162,258 162,245 160,234 Z",
  },
  { id: "teres-major", group: "back", d: "M119,279 C113,286 113,296 119,302 C131,300 143,292 151,283 C139,285 127,284 119,279 Z" },
  {
    id: "latissimus-dorsi",
    group: "back",
    d: "M124,288 C120,308 122,334 129,358 C134,376 142,392 154,404 C168,412 182,416 196,419 C194,400 192,385 190,372 C182,340 173,302 163,282 C151,290 137,294 124,288 Z",
  },
  {
    id: "erector-spinae",
    group: "back",
    d: "M196,334 C187,352 181,380 181,408 C181,428 184,444 190,456 L197,456 L197,334 Z",
  },
  // ── shoulders
  {
    id: "deltoid-rear",
    group: "shoulders",
    d: "M101,193 C87,198 78,214 78,236 C78,254 82,266 88,276 C98,268 108,252 117,237 C123,225 124,212 120,204 Z",
  },
  // ── core
  { id: "oblique-back", group: "core", d: "M134,388 C132,402 133,416 139,428 C149,421 152,410 151,399 C146,394 140,390 134,388 Z" },
  // ── arms
  {
    id: "triceps-lateral",
    group: "arms",
    d: "M90,278 C80,294 74,318 74,340 C76,352 80,358 85,360 C87,336 91,306 99,286 Z",
  },
  {
    id: "triceps-long",
    group: "arms",
    d: "M103,272 C95,292 89,320 88,348 C90,360 97,364 104,356 C112,334 117,306 117,284 C113,276 108,272 103,272 Z",
  },
  {
    id: "forearm-extensors",
    group: "arms",
    d: "M79,368 C67,382 61,404 62,428 C64,450 67,464 69,474 C73,452 79,428 85,406 C89,390 89,376 79,368 Z",
  },
  {
    id: "anconeus-flexors-back",
    group: "arms",
    d: "M97,372 C103,384 102,401 98,421 C94,441 86,461 78,476 C78,456 83,432 89,411 C93,395 94,382 97,372 Z",
  },
  // ── legs
  {
    id: "gluteus-medius",
    group: "legs",
    d: "M137,431 C129,440 125,452 127,463 C135,450 148,442 164,437 C156,429 145,427 137,431 Z",
  },
  {
    id: "gluteus-maximus",
    group: "legs",
    d: "M197,442 C177,434 152,437 136,452 C126,467 124,489 131,506 C143,520 164,524 183,520 C191,516 196,508 197,498 Z",
  },
  { id: "iliotibial-band", group: "legs", d: "M119,522 C112,562 114,620 125,668 L131,662 C123,620 121,570 125,532 Z" },
  {
    id: "biceps-femoris",
    group: "legs",
    d: "M128,528 C121,570 123,620 132,660 C137,676 142,688 149,696 C154,660 156,620 156,580 C156,556 152,538 146,526 Z",
  },
  {
    id: "semitendinosus",
    group: "legs",
    d: "M160,528 C158,570 160,620 164,660 C168,680 173,692 179,698 C188,670 193,630 193,590 C193,560 190,540 185,526 Z",
  },
  {
    id: "gastrocnemius-lateral",
    group: "legs",
    d: "M141,713 C131,736 128,766 133,792 C138,808 147,818 156,822 C158,790 158,750 156,717 Z",
  },
  {
    id: "gastrocnemius-medial",
    group: "legs",
    d: "M162,715 C162,750 164,790 168,824 C180,820 190,802 192,776 C193,750 186,726 176,713 Z",
  },
  {
    id: "soleus",
    group: "legs",
    d: "M138,808 C144,844 152,872 158,892 L177,892 C183,864 189,834 190,808 C183,826 173,836 162,836 C151,836 143,826 138,808 Z",
  },
];

export const PARTS: Record<View, MusclePart[]> = { front: FRONT, back: BACK };

/** Where the floating label points, per view (left half; label sits on the figure's side). */
export const ANCHORS: Record<View, Partial<Record<MuscleId, [number, number]>>> = {
  front: {
    chest: [158, 240],
    shoulders: [96, 226],
    arms: [100, 318],
    core: [184, 356],
    legs: [146, 580],
    back: [160, 172],
  },
  back: {
    back: [150, 330],
    shoulders: [96, 226],
    arms: [100, 318],
    core: [142, 408],
    legs: [158, 600],
  },
};

/** The view that best shows each group; selecting a group turns the figure if needed. */
export const PREFERRED_VIEW: Record<MuscleId, View | null> = {
  chest: "front",
  core: "front",
  back: "back",
  shoulders: null, // visible from both sides
  arms: null,
  legs: null,
};

/** Mirror an x coordinate across the figure's centre line. */
export const mirrorX = (x: number) => VIEWBOX.w - x;

/** The view the figure should show after selecting `group` while currently showing `current`. */
export function viewFor(group: MuscleId, current: View): View {
  return PREFERRED_VIEW[group] ?? current;
}

/** Snap a free rotation angle (degrees) to the nearest face and report which view that is. */
export function snapRotation(deg: number): { deg: number; view: View } {
  const snapped = Math.round(deg / 180) * 180;
  const turns = Math.round(snapped / 180);
  return { deg: snapped, view: Math.abs(turns) % 2 === 0 ? "front" : "back" };
}

/** Which face is visible for a free rotation angle. */
export function faceAt(deg: number): View {
  return snapRotation(deg).view;
}

/** Nearest angle to `from` that shows `view` (so the figure turns the short way). */
export function angleForView(view: View, from: number): number {
  const base = view === "front" ? 0 : 180;
  const k = Math.round((from - base) / 360);
  return base + k * 360;
}

/**
 * Head/hand detail shapes (not selectable). Kept subtle: the head sits in shadow under the
 * key light, like a studio portrait, so it reads as a human head rather than a mannequin.
 * `tone` picks the fill: "hair" (darkest), "shadow" (recess) or "plane" (lit facial plane).
 */
export type Detail = { id: string; tone: "hair" | "shadow" | "plane"; d: string };

export const DETAILS: Record<View, Detail[]> = {
  front: [
    { id: "hair", tone: "hair", d: "M200,22 C180,22 164,34 162,58 C162,64 163,70 164,76 C168,60 182,50 200,49 Z" },
    { id: "brow", tone: "plane", d: "M169,74 C178,70 190,71 199,76 L199,80 C190,77 179,77 170,80 Z" },
    { id: "eye-socket", tone: "shadow", d: "M171,84 C176,80 186,80 192,85 C188,91 178,92 172,89 Z" },
    { id: "cheekbone", tone: "plane", d: "M166,96 C172,93 181,97 186,106 C179,109 171,107 166,103 Z" },
    { id: "nose", tone: "plane", d: "M196,84 L200,84 L200,114 C196,115 192,113 190,110 C193,103 195,94 196,84 Z" },
    { id: "nose-shadow", tone: "shadow", d: "M190,111 C193,115 197,117 200,117 L200,120 C195,120 191,117 189,113 Z" },
    { id: "mouth", tone: "shadow", d: "M187,126 C192,128 196,128 200,128 L200,131 C195,131 191,130 187,128 Z" },
    { id: "jaw-shadow", tone: "shadow", d: "M167,120 C172,131 182,140 196,144 L200,144 L200,152 C185,151 172,143 165,128 Z" },
    { id: "thumb", tone: "shadow", d: "M81,492 C86,506 87,522 84,536 L80,536 C82,522 81,506 78,494 Z" },
  ],
  back: [
    { id: "hair", tone: "hair", d: "M200,22 C180,22 164,34 162,58 C161,78 163,96 166,110 C176,118 188,122 200,122 Z" },
    { id: "nape", tone: "shadow", d: "M184,124 C189,134 195,142 200,146 L200,150 C193,146 186,138 182,128 Z" },
    { id: "spine", tone: "shadow", d: "M198,140 L202,140 L202,460 L198,460 Z" },
    { id: "thumb", tone: "shadow", d: "M66,492 C61,506 60,522 62,536 L66,536 C64,522 65,506 69,494 Z" },
  ],
};

/** What the floating label lists under each group name. */
export const GROUP_MUSCLES: Record<MuscleId, string> = {
  chest: "Pectoralis major",
  shoulders: "Deltoids · front · side · rear",
  arms: "Biceps · Triceps · Forearms",
  core: "Abs · Obliques · Serratus",
  legs: "Quads · Hamstrings · Glutes · Calves",
  back: "Lats · Traps · Erectors",
};
