# Dungeon Gym & Spa

Premium, fully animated website for Dungeon Gym & Spa (frontend; backend-ready).

## Run it

```bash
npm install      # first time only
npm run dev      # development → http://localhost:3000
npm run build    # production build
npm start        # serve the production build
```

## Tech

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| 3D | Three.js via React Three Fiber + Drei (all models are procedural, no downloads) |
| Scroll animation | GSAP ScrollTrigger (pinning, scrubbing) + Lenis smooth scroll |
| UI animation | Framer Motion |
| Modern CSS | Scroll-driven animations, View Transitions, Anchor Positioning, `@property`, `:has()`, OKLCH, `color-mix()`, `@starting-style`, nesting |

## Edit content

**All text, prices, trainers, classes and contact details live in [`src/data/site.ts`](src/data/site.ts).**

- **Trainer photos:** put images in `public/trainers/` and add `image: "/trainers/vikram.jpg"` to the trainer.
- **Real 360° photos:** put an equirectangular JPG in `public/tour/` and add `image: "/tour/iron-pit.jpg"` to a tour zone. It replaces the 3D hall for that zone.
- **WhatsApp / phone / address:** edit the `brand` object.

## Structure

```
src/
  app/            layout (fonts, providers) + page (section order)
  components/
    chrome/       preloader, cursor, navbar, WhatsApp, marquee
    sections/     one file per landing-page section
    three/        3D scenes (gate, tour hall, muscle body, equipment)
    ui/           buttons, magnetic, split headings
  data/site.ts    ← all content
  styles/         design tokens + section styles
```

## Future backend (planned hooks)

- Free Pass form → `POST /api/passes` (see `FreePass.tsx`)
- Live crowd meter → real check-in counts (see `LiveStatus.tsx`)
- Membership → Razorpay / Stripe checkout
- Suggested stack: Next.js API routes + Supabase (Postgres, auth) + Razorpay
