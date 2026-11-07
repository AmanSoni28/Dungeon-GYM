// ─────────────────────────────────────────────────────────────
//  All editable website content lives here.
//  Replace placeholder text, prices, trainers etc. with real data.
// ─────────────────────────────────────────────────────────────

export const brand = {
  name: "Dungeon",
  full: "Dungeon Gym & Spa",
  tagline: "Forge Your Body. Restore Your Soul.",
  currency: "₹",
  phone: "+91 98765 43210",
  whatsapp: "919876543210", // digits only, used for wa.me link
  email: "hello@dungeongym.in",
  address: "21 Iron Street, Sector 5, Your City",
  mapsUrl: "https://maps.google.com/?q=Dungeon+Gym+and+Spa",
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

export const stats = [
  { value: 1500, suffix: "+", label: "Warriors Trained" },
  { value: 25, suffix: "", label: "Elite Trainers" },
  { value: 10, suffix: " yrs", label: "Of Forging" },
  { value: 24, suffix: "/7", label: "Access" },
];

export const manifesto =
  "This is not a gym. This is where weakness goes to die, where iron meets will, and where every drop of sweat is forged into strength.";

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
    id: "main-floor",
    label: "Main training floor",
    src: "/images/gym/main-floor.jpg",
    kind: "photo",
    hfov: 104, // ultra-wide phone lens (cropped)
    aspect: 686 / 502,
    pitch: -10, // rest the view on the training floor rather than the ceiling
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

export const gallery = [
  { src: "/images/gallery/dark-hall.webp", alt: "The main training hall at night", label: "The Hall" },
  { src: "/images/gallery/deadlift.webp", alt: "Athlete pulling a heavy deadlift", label: "Pull Heavy" },
  { src: "/images/gallery/iron-floor.webp", alt: "Rows of dumbbells on the iron floor", label: "Iron Pit" },
  { src: "/images/gallery/grip.webp", alt: "Chalked hand gripping a loaded barbell", label: "Grip" },
  { src: "/images/gallery/warehouse.webp", alt: "Industrial functional training zone", label: "Combat Zone" },
  { src: "/images/gallery/dumbbells.webp", alt: "Athlete lifting dumbbells from the rack", label: "Rack Up" },
  { src: "/images/gallery/shadow-lift.webp", alt: "Lifter in dramatic low light", label: "In the Dark" },
];

export const backgrounds = {
  creed: "/images/bg/creed.webp",
  pass: "/images/bg/pass.webp",
};

// ── Equipment showcase (procedural 3D models)
export const equipment = [
  {
    id: "dumbbell",
    name: "Hex Dumbbell",
    spec: "2.5 – 60 kg",
    desc: "Knurled chrome handles and rubber-coated hex heads. The backbone of the Iron Pit.",
    muscles: ["Chest", "Arms", "Shoulders"],
  },
  {
    id: "kettlebell",
    name: "Cast Kettlebell",
    spec: "4 – 48 kg",
    desc: "Single-piece cast iron for swings, snatches and Turkish get-ups.",
    muscles: ["Posterior Chain", "Core", "Grip"],
  },
  {
    id: "plate",
    name: "Olympic Plate",
    spec: "1.25 – 25 kg",
    desc: "Calibrated bumper plates for deadlifts and Olympic lifting.",
    muscles: ["Legs", "Back", "Full Body"],
  },
] as const;

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

export const transformations = [
  {
    name: "Rahul S.",
    months: 6,
    quote: "I walked in at 98 kg and couldn't do a pull-up. Six months in the Dungeon changed everything.",
    before: { weight: 98, fat: 32, strength: 40 },
    after: { weight: 78, fat: 16, strength: 100 },
  },
  {
    name: "Priya M.",
    months: 4,
    quote: "Sara's HIIT plus the spa recovery days made my plan feel sustainable for the first time.",
    before: { weight: 72, fat: 30, strength: 35 },
    after: { weight: 61, fat: 21, strength: 80 },
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
