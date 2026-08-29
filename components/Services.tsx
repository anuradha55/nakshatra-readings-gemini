const services = [
  {
    glyph: "♃",
    title: "Career & direction",
    description: "Timing for job changes, business decisions, and periods of growth or delay.",
  },
  {
    glyph: "♀",
    title: "Relationships",
    description: "Compatibility, timing for marriage, and understanding recurring relationship patterns.",
  },
  {
    glyph: "☽",
    title: "General life reading",
    description: "A broader look at your current chart — good if you&apos;re not sure what to ask yet.",
  },
];

export default function Services() {
  return (
    <section className="services" id="services">
      <div className="wrap">
        <h2>What you can book</h2>
        <p>One flat rate per session — pick the focus that fits what&apos;s on your mind right now.</p>
        <div className="service-grid">
          {services.map((service) => (
            <div className="service-card" key={service.title}>
              <span className="glyph">{service.glyph}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <span className="price">₹500 / session</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}