import Image from "next/image";
import { gallery } from "@/data/site";
import { SplitHeading } from "@/components/ui/SplitHeading";

// grid area for each photo (see .gallery__grid in sections-gym.css)
const AREAS = ["a", "b", "c", "d", "e", "f", "g"];
const SIZES = [
  "(max-width: 760px) 100vw, 66vw",
  "(max-width: 760px) 50vw, 34vw",
  "(max-width: 760px) 50vw, 34vw",
  "(max-width: 760px) 50vw, 34vw",
  "(max-width: 760px) 50vw, 34vw",
  "(max-width: 760px) 100vw, 50vw",
  "(max-width: 760px) 100vw, 50vw",
];

/** Editorial photo collage: each frame reveals with clip-path and parallaxes inside, both pure CSS scroll-driven. */
export function Gallery() {
  return (
    <section className="section gallery">
      <div className="container">
        <div className="section-head gallery__head">
          <p className="eyebrow">Inside the Dungeon</p>
          <SplitHeading lines={["Built for", { text: "the obsessed", className: "gold-text" }]} />
          <p className="lead">12,000 sq ft of iron, turf and shadow. Every corner is designed to make you train harder than you thought you could.</p>
        </div>

        <div className="gallery__grid">
          {gallery.map((g, i) => (
            <figure key={g.src} className="gframe" style={{ gridArea: AREAS[i] }} data-cursor="">
              <div className="gframe__media">
                <Image src={g.src} alt={g.alt} fill sizes={SIZES[i]} quality={85} />
              </div>
              <figcaption>
                <span>0{i + 1}</span>
                {g.label}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
