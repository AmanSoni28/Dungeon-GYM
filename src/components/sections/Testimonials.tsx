import { testimonials } from "@/data/site";

function Row({ items, reverse }: { items: typeof testimonials; reverse?: boolean }) {
  const cards = items.map((t, i) => (
    <figure key={i} className="review">
      <div className="review__stars" aria-label={`${t.rating} out of 5 stars`}>
        {"★★★★★".slice(0, t.rating)}
        <span>{"★★★★★".slice(t.rating)}</span>
      </div>
      <blockquote>“{t.text}”</blockquote>
      <figcaption>
        <span className="review__avatar">{t.name[0]}</span>
        {t.name}
        <small>Google Review</small>
      </figcaption>
    </figure>
  ));
  return (
    <div className={`reviews__row ${reverse ? "is-reverse" : ""}`}>
      <div className="reviews__track">
        {cards}
        {cards}
      </div>
    </div>
  );
}

export function Testimonials() {
  const half = Math.ceil(testimonials.length / 2);
  return (
    <section className="section reviews">
      <div className="container">
        <div className="section-head is-center">
          <p className="eyebrow">4.9 ★ on Google · 800+ reviews</p>
          <h2 className="h-lg reveal">
            Voices from <span className="gold-text">the dungeon</span>
          </h2>
        </div>
      </div>
      <Row items={testimonials.slice(0, half)} />
      <Row items={testimonials.slice(half)} reverse />
    </section>
  );
}
