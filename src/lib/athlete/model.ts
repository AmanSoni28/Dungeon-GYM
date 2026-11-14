import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

/** Microsoft Rocketbox "Sports_Male_04" (MIT): a real, photo-textured skinned human. */
export const ATHLETE_MODEL = "/models/athlete/athlete.fbx";
const TEXTURES = "/models/athlete/";

/**
 * Textures are re-graded for an Indian athlete (warm brown skin, black hair, trimmed beard, brown eyes, black/gold
 * trainers) and served as web-sized WebP. Gloss masks per colour texture: white = full specular, dark = matte (hair,
 * beard, trainers, kit; the same values in the alpha channel feed specularIntensityMap), so black stays black under
 * the gold key light instead of turning ashy.
 */
const COLOR = /(head|body)_color/i;
const GLOSS: Record<string, string> = {
  head: `${TEXTURES}m026_head_gloss.webp`,
  body: `${TEXTURES}m026_body_gloss.webp`,
};

/**
 * The FBX points at its original .tga files: serve the web-sized WebPs next to it instead. It also references a
 * "specular" map per part, which these models don't ship: it is served from the normal map's image.
 */
const roleOf = (tga: string) => tga.match(/([^\/\\]+?)\.tga$/i)?.[1].toLowerCase() ?? null;
const urlFor = (role: string) => `${TEXTURES}${role.replace(/specular/, "normal")}.webp`;

/**
 * One Texture per role (e.g. "m026_body_color") for every copy of the athlete: the Group Classes and Transformations
 * scenes each parse their own model (they reshape its geometry differently) but share the downloaded, decoded
 * textures. Keyed by role, not URL: FBXLoader marks specular maps as sRGB colour, so the "specular" texture must not be
 * the same object as the normal map that shares its image (the browser still fetches that image once).
 */
const textures = new Map<string, THREE.Texture<HTMLImageElement>>();
const plainLoader = new THREE.TextureLoader();
function sharedTexture(role: string, url = urlFor(role)) {
  let t = textures.get(role);
  if (!t) {
    t = plainLoader.load(url);
    textures.set(role, t);
  }
  return t;
}
const glossTexture = (part: string) => sharedTexture(`gloss:${part}`, GLOSS[part]);

/** FBXLoader's handler for the model's .tga references (it only uses the returned Texture, never callbacks) */
class SharedTextureLoader extends THREE.TextureLoader {
  override load(url: string) {
    const role = roleOf(url);
    return role ? sharedTexture(role) : plainLoader.load(url);
  }
}

export const athleteManager = new THREE.LoadingManager();
athleteManager.addHandler(/\.tga$/i, new SharedTextureLoader(athleteManager));

/** The gloss mask for one of the athlete's colour maps (null for normal maps / anything else). */
export function athleteGloss(map: THREE.Texture | null | undefined): THREE.Texture | null {
  if (!map) return null;
  for (const [role, t] of textures) {
    if (t !== map) continue;
    const m = role.match(COLOR);
    return m ? glossTexture(m[1]) : null;
  }
  return null;
}

let buffer: Promise<ArrayBuffer> | null = null;
/** the FBX bytes, downloaded once */
function athleteBuffer() {
  buffer ??= fetch(ATHLETE_MODEL).then((r) => {
    if (!r.ok) throw new Error(`athlete model: HTTP ${r.status}`);
    return r.arrayBuffer();
  });
  buffer.catch(() => (buffer = null)); // let a later call retry
  return buffer;
}

/** A fresh, private copy of the athlete (its own geometry and skeleton; textures shared). */
export async function loadAthleteScene(): Promise<THREE.Group> {
  const buf = await athleteBuffer();
  return new FBXLoader(athleteManager).parse(buf, TEXTURES);
}

/**
 * Start downloading the model and every texture now (call when the page is idle), so the athlete is ready by the time
 * either section scrolls into view. Safe to call any number of times.
 */
export function preloadAthlete() {
  athleteBuffer().catch(() => {});
  ["m026_body_color", "m026_body_normal", "m026_head_color", "m026_head_normal"].forEach((r) => sharedTexture(r));
  Object.keys(GLOSS).forEach(glossTexture);
}

const FINGERS = ["Thumb", "Index", "Middle", "Ring", "Pinky"] as const;

/**
 * One naming for every rig: "mixamorig:Hips" / "mixamorigHips" / "Armature|Hips" → "Hips";
 * 3ds Max Biped ("Bip01 L UpperArm", "Bip01_R_Finger21") → Mixamo names ("LeftArm", "RightHandMiddle2").
 */
const BIPED: Record<string, string> = {
  Pelvis: "Hips", Spine: "Spine", Spine1: "Spine1", Spine2: "Spine2", Neck: "Neck", Head: "Head",
  Clavicle: "Shoulder", UpperArm: "Arm", Forearm: "ForeArm", Hand: "Hand",
  Thigh: "UpLeg", Calf: "Leg", Foot: "Foot", Toe0: "ToeBase",
};
export function canonicalBone(raw: string) {
  const n = raw.replace(/^.*[:|]/, "").replace(/^mixamorig/i, "");
  const bip = n.match(/^Bip0?1[ _]+(.+)$/i);
  if (!bip) return n;
  const t = bip[1].replace(/_/g, " ");
  if (BIPED[t] && !/ /.test(t)) return BIPED[t];
  const limb = t.match(/^([LR]) (\w+)$/);
  if (!limb) return n;
  const side = limb[1] === "L" ? "Left" : "Right";
  if (BIPED[limb[2]]) return side + BIPED[limb[2]];
  const f = limb[2].match(/^Finger(\d)(\d?)$/);
  if (!f) return n;
  return `${side}Hand${FINGERS[+f[1]]}${f[2] === "" ? 1 : +f[2] + 1}`;
}
