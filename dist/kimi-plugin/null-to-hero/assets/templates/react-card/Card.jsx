/*
  Card, a minimal accessible card component. MIT licensed.
  No required props: every value has a sensible default.
  When an href is given the whole card becomes one keyboard focusable link,
  otherwise it renders as a plain article. No external UI library.
*/

export default function Card({
  title = "Card title",
  description = "A short supporting line that describes this card.",
  imageUrl,
  imageAlt = "",
  href,
  className = "",
}) {
  const rootClass = ["nth-card", href ? "nth-card--link" : "", className]
    .filter(Boolean)
    .join(" ");

  const media = imageUrl ? (
    <img className="nth-card__image" src={imageUrl} alt={imageAlt} loading="lazy" />
  ) : null;

  const body = (
    <div className="nth-card__body">
      <h3 className="nth-card__title">{title}</h3>
      <p className="nth-card__text">{description}</p>
    </div>
  );

  if (href) {
    return (
      <article className={rootClass}>
        <a className="nth-card__link" href={href}>
          {media}
          {body}
        </a>
      </article>
    );
  }

  return (
    <article className={rootClass}>
      {media}
      {body}
    </article>
  );
}
