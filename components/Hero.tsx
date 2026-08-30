import ZodiacWheel from "./ZodiacWheel";

export default function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero-inner">
        <div>
          <div className="eyebrow">Vedic &amp; birth chart astrology</div>
          <h1>
            Your birth chart is <span className="accent">a map.</span>
            <br />We help you read it.
          </h1>
          <p className="lede">
            One-on-one video or phone consultations on career, relationships,
            and timing — grounded in your actual birth chart, not generic
            horoscopes.
          </p>
          <div className="hero-ctas">
            <a href="#booking" className="btn-primary">
              Book your session — ₹500
            </a>
            <a href="#free-prediction" className="btn-ghost">
              Get 1 Free AI Prediction
            </a>
          </div>
        </div>
        <ZodiacWheel />
      </div>
    </section>
  );
}