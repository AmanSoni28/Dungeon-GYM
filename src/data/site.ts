// ─────────────────────────────────────────────────────────────
//  All editable website content lives here.
//  Replace placeholder text, prices, trainers etc. with real data.
// ─────────────────────────────────────────────────────────────

export const brand = {
  name: "Dungeon",
  full: "Dungeon Gym & Spa",
  tagline: "Forge Your Body. Restore Your Soul.",
  currency: "₹",
  phone: "+91 81718 88777",
  whatsapp: "918171888777", // digits only, used for wa.me link
  email: "hello@dungeongym.in",
  address: "14, Balbir Rd, Dalanwala, Dehradun, Uttarakhand 248001",
  addressLines: ["14, Balbir Rd, Dalanwala", "Dehradun, Uttarakhand 248001"],
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Dungeon+Gym+%26+Spa%2C+14+Balbir+Rd%2C+Dalanwala%2C+Dehradun%2C+Uttarakhand+248001",
  instagram: "https://instagram.com/",
  hours: [
    { day: "Mon – Sat", time: "5:00 AM – 11:00 PM" },
    { day: "Sunday", time: "7:00 AM – 2:00 PM" },
    { day: "Spa", time: "10:00 AM – 9:00 PM" },
  ],
};

export const nav = [
  { label: "Tour", href: "#tour" },
  { label: "Programs", href: "#programs" },
  { label: "Trainers", href: "#trainers" },
  { label: "Spa", href: "#spa" },
  { label: "Plans", href: "#plans" },
  { label: "Contact", href: "#contact" },
];

// ── 360 tour zones (procedural 3D hall). Add `image` (equirectangular jpg in /public) to use a real 360 photo instead.
export type TourZone = {
  id: string;
  name: string;
  blurb: string;
  position: [number, number, number]; // camera position in the hall
  look: number; // initial yaw (radians)
  image?: string;
};

export const tourZones: TourZone[] = [
  { id: "entry", name: "The Gate", blurb: "Where every warrior's journey begins.", position: [0, 1.7, 12], look: 0 },
  { id: "iron", name: "Iron Pit", blurb: "Dumbbells to 60 kg, power racks, platforms.", position: [-9, 1.7, 2], look: 0.9 },
  { id: "cardio", name: "Cardio Deck", blurb: "Treadmills, rowers and air bikes facing the wall of fire.", position: [9, 1.7, 2], look: -0.9 },
  { id: "combat", name: "Combat Zone", blurb: "Heavy bags, a CrossFit rig and turf for sled pushes.", position: [-6, 1.7, -6], look: 0.6 },
  { id: "spa", name: "Spa Sanctum", blurb: "Steam, sauna and a cold plunge to restore the body.", position: [6, 1.7, -6], look: -0.6 },
];

// ── Real gym views (entrance experience). Real photos of Dungeon Gym only.
//    • kind "photo": one wide photo, set `hfov` to the lens's real horizontal field of view.
//    • kind "equirect": a true 360° panorama (2:1 image), enables full 360° rotation.
//    Add more entries to let visitors switch between views.
export const gymViews: import("@/lib/gym/look").GymView[] = [
  {
    // full 360°: the four tour-zone photos stitched into one panorama (scripted, blended seams).
    // Swap in a real 2:1 360° photo here any time (keep kind "equirect").
    id: "panorama",
    label: "360° gym floor",
    src: "/images/gym/gym-360.jpg",
    kind: "equirect",
    hfov: 360,
    aspect: 2,
    fov: 46,
    maxPitch: 9,
  },
  {
    id: "main-floor",
    label: "Main training floor",
    src: "/images/gym/main-floor.jpg",
    kind: "photo",
    hfov: 104, // ultra-wide phone lens (cropped)
    aspect: 686 / 502,
    pitch: -10, // rest the view on the training floor rather than the ceiling
  },
];

// ── Virtual tour: one wide photo per zone (or a 2:1 360° panorama with kind "equirect").
//    hfov = horizontal angle the photo really captured (degrees). Hotspots sit on things visible
//    in the photo: u/v = 0..1 from the photo's left / top edge, `to` = destination zone id.
export const virtualTour: import("@/lib/tour/tour").TourStop[] = [
  {
    id: "strength",
    zone: "01",
    title: "Strength Training",
    description: "Cable stations, selectorised machines and Olympic benches under the red-and-black beams.",
    label: "Strength training floor",
    src: "/images/tour/zone-01-strength.jpg",
    srcSmall: "/images/tour/zone-01-strength-sm.jpg",
    thumb: "/images/tour/zone-01-strength-thumb.jpg",
    kind: "photo",
    hfov: 100,
    aspect: 1672 / 941,
    pitch: -4,
    hotspots: [
      { to: "main-floor", u: 0.465, v: 0.6 }, // wooden door
      { to: "free-weights", u: 0.79, v: 0.64 }, // barbell benches on the right
    ],
  },
  {
    id: "cardio",
    zone: "02",
    title: "Cardio & Treadmills",
    description: "A full row of touchscreen treadmills facing the windows and the trees outside.",
    label: "Treadmill row",
    src: "/images/tour/zone-02-cardio.jpg",
    srcSmall: "/images/tour/zone-02-cardio-sm.jpg",
    thumb: "/images/tour/zone-02-cardio-thumb.jpg",
    kind: "photo",
    hfov: 90,
    aspect: 1672 / 941,
    pitch: -3,
    hotspots: [{ to: "main-floor", u: 0.16, v: 0.5 }], // far end of the row
  },
  {
    id: "main-floor",
    zone: "03",
    title: "Main Workout Floor",
    description: "The open hall: spin bikes, cross-trainers and treadmills on turf and polished timber.",
    label: "Main workout floor",
    src: "/images/tour/zone-03-main-floor.jpg",
    srcSmall: "/images/tour/zone-03-main-floor-sm.jpg",
    thumb: "/images/tour/zone-03-main-floor-thumb.jpg",
    kind: "photo",
    hfov: 100,
    aspect: 1672 / 941,
    pitch: -8, // half the frame is ceiling: rest on the machines
    hotspots: [
      { to: "cardio", u: 0.88, v: 0.66 }, // treadmills on the right
      { to: "strength", u: 0.085, v: 0.6 }, // doorway on the left
    ],
  },
  {
    id: "free-weights",
    zone: "04",
    title: "Dumbbell & Free Weights",
    description: "Full dumbbell racks, adjustable benches and mirror walls on rubber flooring.",
    label: "Dumbbell and free-weights area",
    src: "/images/tour/zone-04-free-weights.jpg",
    srcSmall: "/images/tour/zone-04-free-weights-sm.jpg",
    thumb: "/images/tour/zone-04-free-weights-thumb.jpg",
    kind: "photo",
    hfov: 100,
    aspect: 1672 / 941,
    pitch: -4,
    hotspots: [{ to: "strength", u: 0.52, v: 0.47 }], // mirror reflecting the strength floor
  },
];

// ── Muscle map
export type MuscleId = "chest" | "shoulders" | "arms" | "core" | "legs" | "back";

export const muscles: Record<
  MuscleId,
  { name: string; program: string; desc: string; exercises: string[]; trainer: string; intensity: number }
> = {
  chest: {
    name: "Chest",
    program: "Iron Chest & Power",
    desc: "Build a thick, powerful chest with progressive overload pressing and fly work.",
    exercises: ["Barbell Bench Press", "Incline DB Press", "Cable Crossovers", "Weighted Dips"],
    trainer: "Vikram Rathore",
    intensity: 85,
  },
  shoulders: {
    name: "Shoulders",
    program: "Boulder Shoulders",
    desc: "3D delts through overhead pressing, lateral work and rear-delt rows.",
    exercises: ["Overhead Press", "Lateral Raises", "Face Pulls", "Arnold Press"],
    trainer: "Arjun Mehta",
    intensity: 75,
  },
  arms: {
    name: "Arms",
    program: "Forged Arms",
    desc: "High-volume biceps and triceps supersets for sleeves that don't fit.",
    exercises: ["Barbell Curls", "Skull Crushers", "Hammer Curls", "Rope Pushdowns"],
    trainer: "Vikram Rathore",
    intensity: 70,
  },
  core: {
    name: "Core",
    program: "Steel Core",
    desc: "Anti-rotation, bracing and conditioning for a core that protects every lift.",
    exercises: ["Hanging Leg Raises", "Ab Wheel", "Pallof Press", "Farmer Carries"],
    trainer: "Sara Khan",
    intensity: 65,
  },
  legs: {
    name: "Legs",
    program: "Pillars of the Dungeon",
    desc: "Squats, hinges and lunges. Never skip the foundation of real strength.",
    exercises: ["Back Squat", "Romanian Deadlift", "Walking Lunges", "Leg Press"],
    trainer: "Arjun Mehta",
    intensity: 95,
  },
  back: {
    name: "Back",
    program: "Wings of Iron",
    desc: "Width and thickness with pull-ups, rows and heavy deadlifts.",
    exercises: ["Deadlift", "Weighted Pull-ups", "Barbell Rows", "Lat Pulldown"],
    trainer: "Rohan Das",
    intensity: 90,
  },
};

// Photos: placeholder Unsplash images (free licence). Swap for real gym photos in /public/images.
export const classes = [
  { name: "Strength", tag: "Iron", desc: "Powerlifting fundamentals and progressive overload.", image: "/images/classes/strength.webp" },
  { name: "CrossFit", tag: "Fire", desc: "High-intensity functional WODs in the Combat Zone.", image: "/images/classes/crossfit.webp" },
  { name: "Boxing", tag: "Fury", desc: "Bag work, pad drills and fight conditioning.", image: "/images/classes/boxing.webp" },
  { name: "HIIT", tag: "Burn", desc: "45 minutes of intervals that melt fat.", image: "/images/classes/hiit.webp" },
  { name: "Yoga", tag: "Flow", desc: "Mobility and breath to balance the grind.", image: "/images/classes/yoga.webp" },
  { name: "Zumba", tag: "Rhythm", desc: "Dance cardio with dungeon-level energy.", image: "/images/classes/zumba.webp" },
];

export const backgrounds = {
  pass: "/images/bg/pass.webp",
};

// ── Trainers. Add `image: "/trainers/name.jpg"` to show a real photo.
export type Trainer = {
  id: string;
  name: string;
  role: string;
  title: string;
  bio: string;
  years: number;
  stats: { label: string; value: number }[];
  specialties: string[];
  hue: number; // aura colour (0-360)
  image?: string;
  imagePos?: string; // CSS object-position for cropping
};

export const trainers: Trainer[] = [
  {
    id: "vikram",
    name: "Vikram Rathore",
    role: "Head Coach",
    title: "The Warlord",
    bio: "National-level powerlifter with a 280 kg deadlift. Vikram built the Iron Pit and the programs that come out of it.",
    years: 12,
    stats: [
      { label: "Strength", value: 98 },
      { label: "Cardio", value: 62 },
      { label: "Mobility", value: 70 },
    ],
    specialties: ["Powerlifting", "Hypertrophy", "Competition Prep"],
    hue: 30,
    image: "/images/trainers/vikram.webp",
    imagePos: "50% 30%",
  },
  {
    id: "sara",
    name: "Sara Khan",
    role: "HIIT & Core",
    title: "The Tempest",
    bio: "Ex-national athlete turned conditioning coach. Her HIIT classes are legendary and always full.",
    years: 8,
    stats: [
      { label: "Strength", value: 74 },
      { label: "Cardio", value: 97 },
      { label: "Mobility", value: 85 },
    ],
    specialties: ["HIIT", "Fat Loss", "Core Strength"],
    hue: 350,
    image: "/images/trainers/sara.webp",
    imagePos: "60% 40%",
  },
  {
    id: "arjun",
    name: "Arjun Mehta",
    role: "Strength & Legs",
    title: "The Titan",
    bio: "Certified strength and conditioning specialist. Arjun turns skinny legs into pillars.",
    years: 9,
    stats: [
      { label: "Strength", value: 92 },
      { label: "Cardio", value: 70 },
      { label: "Mobility", value: 78 },
    ],
    specialties: ["Squat Mastery", "Athletic Power", "Body Recomp"],
    hue: 45,
    image: "/images/trainers/arjun.webp",
    imagePos: "40% 30%",
  },
  {
    id: "rohan",
    name: "Rohan Das",
    role: "Combat & CrossFit",
    title: "The Reaper",
    bio: "Pro boxer and CrossFit L2 trainer. He runs the Combat Zone with fury and precision.",
    years: 7,
    stats: [
      { label: "Strength", value: 84 },
      { label: "Cardio", value: 91 },
      { label: "Mobility", value: 80 },
    ],
    specialties: ["Boxing", "CrossFit", "Conditioning"],
    hue: 15,
    image: "/images/trainers/rohan.webp",
    imagePos: "45% 35%",
  },
];

export const ranks = [
  { name: "Prisoner", level: "I", req: "Day 1", perk: "Full gym access + orientation", glyph: "⛓" },
  { name: "Warrior", level: "II", req: "50 check-ins", perk: "Free body-composition scans", glyph: "⚔" },
  { name: "Gladiator", level: "III", req: "150 check-ins", perk: "1 free spa session / month", glyph: "🛡" },
  { name: "Dungeon Lord", level: "IV", req: "365 check-ins", perk: "Lifetime price lock + Hall of Fame", glyph: "♛" },
];

type Metrics = { weight: number; fat: number; strength: number };
export type Transformation = {
  name: string;
  months: number;
  headline: string;
  quote: string;
  before: Metrics;
  after: Metrics;
  /** first is month 0, last is the final month */
  milestones: { month: number; title: string; text: string }[];
};

export const transformations: Transformation[] = [
  {
    name: "Rahul S.",
    months: 6,
    headline: "−20 kg in 6 months",
    quote: "I walked in at 98 kg and couldn't do a pull-up. Six months in the Dungeon changed everything.",
    before: { weight: 98, fat: 32, strength: 40 },
    after: { weight: 78, fat: 16, strength: 100 },
    milestones: [
      { month: 0, title: "Day one", text: "98 kg, 32% body fat and zero pull-ups. Full assessment and a plan built around his week." },
      { month: 1, title: "Habits first", text: "Three sessions a week, form drills and a protein target he could actually hit." },
      { month: 2, title: "The scale moves", text: "Down 10 kg. Back pain gone, energy up, first heavy squat sessions." },
      { month: 4, title: "First pull-up", text: "One clean rep in front of the whole floor. Strength score more than doubled." },
      { month: 6, title: "Today", text: "78 kg at 16% body fat, deadlifting one and a half times his bodyweight." },
    ],
  },
  {
    name: "Aditya K.",
    months: 5,
    headline: "+10 kg of muscle in 5 months",
    quote: "I was the skinny guy who avoided the weights room. Arjun's program put real muscle on my frame.",
    before: { weight: 64, fat: 18, strength: 30 },
    after: { weight: 74, fat: 14, strength: 88 },
    milestones: [
      { month: 0, title: "Day one", text: "64 kg and nervous under a bar. Coach Arjun starts him on the big four lifts." },
      { month: 1, title: "Eat to grow", text: "A surplus he could keep up, and progressive overload every single week." },
      { month: 3, title: "Bodyweight bench", text: "Benched 64 kg for a clean set of five. Shirts started fitting differently." },
      { month: 5, title: "Today", text: "74 kg at 14% body fat. Ten kilos heavier and leaner than when he started." },
    ],
  },
];

export const spaServices = [
  { name: "Steam Room", time: "20 min", desc: "Eucalyptus-infused steam that opens the lungs and loosens tight muscle.", hue: 190, image: "/images/spa/steam.webp" },
  { name: "Finnish Sauna", time: "15 min", desc: "Dry heat at 85°C to boost circulation and recovery.", hue: 30, image: "/images/spa/sauna.webp" },
  { name: "Deep Tissue Massage", time: "60 min", desc: "Therapist-led release of knots built by heavy training.", hue: 25, image: "/images/spa/massage.webp" },
  { name: "Ice Plunge", time: "3 min", desc: "4°C cold water immersion to cut inflammation and reset the nervous system.", hue: 200, image: "/images/spa/ice.webp" },
  { name: "Jacuzzi", time: "25 min", desc: "Hydro-jets for active recovery after leg day.", hue: 180, image: "/images/spa/jacuzzi.webp" },
];

export const rituals: Record<string, { label: string; steps: { name: string; time: string }[] }> = {
  legs: {
    label: "Leg Day",
    steps: [
      { name: "Jacuzzi", time: "15 min" },
      { name: "Deep Tissue Massage", time: "45 min" },
      { name: "Ice Plunge", time: "3 min" },
    ],
  },
  upper: {
    label: "Upper Body",
    steps: [
      { name: "Finnish Sauna", time: "15 min" },
      { name: "Shoulder Release Massage", time: "30 min" },
      { name: "Steam Room", time: "10 min" },
    ],
  },
  cardio: {
    label: "Cardio / HIIT",
    steps: [
      { name: "Ice Plunge", time: "3 min" },
      { name: "Steam Room", time: "15 min" },
      { name: "Hydration Bar", time: "10 min" },
    ],
  },
  stress: {
    label: "Stress & Sleep",
    steps: [
      { name: "Steam Room", time: "15 min" },
      { name: "Aroma Massage", time: "60 min" },
      { name: "Jacuzzi", time: "20 min" },
    ],
  },
};

export const plans = [
  {
    id: "warrior",
    name: "Warrior",
    monthly: 1999,
    yearly: 19990,
    blurb: "Everything you need to start forging.",
    features: ["Full gym access", "Locker & shower", "Fitness assessment", "Dungeon app (coming soon)"],
    featured: false,
  },
  {
    id: "gladiator",
    name: "Gladiator",
    monthly: 3499,
    yearly: 34990,
    blurb: "Gym plus every group class.",
    features: ["Everything in Warrior", "Unlimited group classes", "Monthly body scan", "2 spa sessions / month"],
    featured: false,
  },
  {
    id: "lord",
    name: "Dungeon Lord",
    monthly: 5999,
    yearly: 59990,
    blurb: "The full kingdom: gym, spa and a personal coach.",
    features: ["Everything in Gladiator", "Unlimited spa access", "8 PT sessions / month", "Custom diet plan", "Priority booking"],
    featured: true,
  },
];

// typical crowd curve (% busy) for each hour 5:00 – 23:00
export const crowdCurve: Record<number, number> = {
  5: 25, 6: 55, 7: 78, 8: 70, 9: 48, 10: 32, 11: 26, 12: 30, 13: 28, 14: 22,
  15: 26, 16: 40, 17: 68, 18: 92, 19: 88, 20: 70, 21: 50, 22: 30, 23: 12,
};

export const todaysClasses = [
  { time: "06:00", name: "Strength", coach: "Vikram", spots: 4, total: 16 },
  { time: "07:30", name: "HIIT Burn", coach: "Sara", spots: 0, total: 20 },
  { time: "09:00", name: "Yoga Flow", coach: "Meera", spots: 9, total: 18 },
  { time: "17:30", name: "CrossFit WOD", coach: "Rohan", spots: 3, total: 14 },
  { time: "18:30", name: "Boxing", coach: "Rohan", spots: 6, total: 12 },
  { time: "20:00", name: "Zumba", coach: "Sara", spots: 11, total: 25 },
];

export const testimonials = [
  { name: "Aditya K.", text: "Best gym in the city, period. The equipment is insane and the vibe is unmatched.", rating: 5 },
  { name: "Neha R.", text: "Train hard, then sauna and massage in the same building. I'm never leaving.", rating: 5 },
  { name: "Karan P.", text: "Vikram fixed my squat in one session. Real coaches, not just instructors.", rating: 5 },
  { name: "Simran J.", text: "Clean, premium and the spa is like a 5-star hotel. Worth every rupee.", rating: 5 },
  { name: "Imran A.", text: "The Combat Zone is my second home. Rohan's boxing class is pure fire.", rating: 5 },
  { name: "Ananya T.", text: "I love the rank system. Hitting Gladiator felt like a real achievement!", rating: 5 },
  { name: "Dev M.", text: "Never crowded if you check the live meter. Genius feature.", rating: 4 },
  { name: "Riya S.", text: "The ice plunge after leg day is a game changer. Recovery feels elite.", rating: 5 },
];
