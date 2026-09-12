import { Language, tr } from "@/lib/i18n";

const SERVICES = [
  ["☉", "Marriage", "₹100", "15 min"],
  ["♀", "Relationships", "₹100", "15 min"],
  ["♃", "Career", "₹100", "15 min"],
  ["₹", "Finance", "₹100", "15 min"],
  ["♧", "Family & Children", "₹100", "15 min"],
  ["☿", "Health", "₹100", "15 min"],
  ["✦", "Education", "₹100", "15 min"],
  ["☾", "Spirituality", "₹100", "15 min"],
  ["⚖", "Legal & Litigation", "₹100", "15 min"],
  ["✧", "General life prediction", "₹100", "15 min"],
  ["◈", "Entire Kundli Analysis", "₹500", "60 min"],
] as const;

export default function Services({ language }: { language: Language }) {
  const t = tr(language);

  return (
    <section className="services" id="services">
      <div className="wrap">
        <h2>{t.servicesTitle}</h2>
        <p>{t.servicesText}</p>
        <div className="service-grid service-grid-all">
          {SERVICES.map(([glyph, title, price, duration]) => (
            <div className="service-card service-card-compact" key={title}>
              <div className="service-card-top">
                <span className="glyph service-glyph">{glyph}</span>
                <span className="service-duration">{duration}</span>
              </div>
              <h3>{title}</h3>
              <span className="price">{price} / {t.perSession}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
