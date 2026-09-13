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

const SERVICE_LABELS: Record<Language, Record<string, string>> = {
  en: {
    "Marriage": "Marriage",
    "Relationships": "Relationships",
    "Career": "Career",
    "Finance": "Finance",
    "Family & Children": "Family & Children",
    "Health": "Health",
    "Education": "Education",
    "Spirituality": "Spirituality",
    "Legal & Litigation": "Legal & Litigation",
    "General life prediction": "General life prediction",
    "Entire Kundli Analysis": "Entire Kundli Analysis",
  },
  hi: {
    "Marriage": "विवाह",
    "Relationships": "रिश्ते",
    "Career": "करियर",
    "Finance": "वित्त",
    "Family & Children": "परिवार और बच्चे",
    "Health": "स्वास्थ्य",
    "Education": "शिक्षा",
    "Spirituality": "आध्यात्मिकता",
    "Legal & Litigation": "कानूनी और मुकदमेबाजी",
    "General life prediction": "सामान्य जीवन भविष्यवाणी",
    "Entire Kundli Analysis": "संपूर्ण कुंडली विश्लेषण",
  },
  mr: {
    "Marriage": "विवाह",
    "Relationships": "नातेसंबंध",
    "Career": "करिअर",
    "Finance": "आर्थिक विषय",
    "Family & Children": "कुटुंब आणि मुले",
    "Health": "आरोग्य",
    "Education": "शिक्षण",
    "Spirituality": "अध्यात्म",
    "Legal & Litigation": "कायदा आणि न्यायालयीन प्रकरणे",
    "General life prediction": "सामान्य जीवन भविष्यवाणी",
    "Entire Kundli Analysis": "संपूर्ण कुंडली विश्लेषण",
  },
};

const CONTENT = {
  en: {
    title: "Your Kundli — A Personal Map of Life",
    intro: "Your birth chart is more than a horoscope. It is a unique snapshot of the sky at the moment you were born, offering a different perspective on your strengths, challenges, patterns and important periods in life.",
    why: "Why look at your Kundli?",
    points: [
      "Understand yourself better — your natural strengths, tendencies and recurring life patterns.",
      "Gain clarity when you are facing important decisions about career, relationships, money or family.",
      "Explore timing — understand periods that may support growth, change, opportunity or greater patience.",
    ],
    choose: "Our Services",
    closing: "You do not need to have all the answers before a reading. Bring the question that is on your mind, and let your birth chart provide another perspective.",
  },
  hi: {
    title: "आपकी कुंडली — आपके जीवन का व्यक्तिगत नक्शा",
    intro: "आपकी जन्म कुंडली केवल राशिफल नहीं है। यह आपके जन्म के समय आकाश में ग्रहों की एक अनोखी तस्वीर है, जो आपकी शक्तियों, चुनौतियों, जीवन के पैटर्न और महत्वपूर्ण समय को समझने का एक अलग दृष्टिकोण देती है।",
    why: "अपनी कुंडली क्यों देखें?",
    points: [
      "खुद को बेहतर समझें — अपनी प्राकृतिक खूबियों, प्रवृत्तियों और जीवन के दोहराते पैटर्न को जानें।",
      "करियर, रिश्तों, धन या परिवार से जुड़े महत्वपूर्ण निर्णयों में अधिक स्पष्टता पाएं।",
      "समय को समझें — विकास, बदलाव, अवसर या अधिक धैर्य की आवश्यकता वाले दौर को पहचानें।",
    ],
    choose: "हमारी सेवाएँ",
    closing: "रीडिंग से पहले आपके पास सभी उत्तर होना जरूरी नहीं है। जो प्रश्न अभी आपके मन में है, तो घेऊन या, और अपनी जन्म कुंडली से एक नया दृष्टिकोण प्राप्त करें।",
  },
  mr: {
    title: "तुमची कुंडली — तुमच्या जीवनाचा वैयक्तिक नकाशा",
    intro: "तुमची जन्मकुंडली केवळ राशिभविष्य नाही. तुमच्या जन्माच्या क्षणी आकाशातील ग्रहस्थितीचे ते एक अद्वितीय चित्र आहे, जे तुमच्या क्षमता, आव्हाने, जीवनातील पॅटर्न आणि महत्त्वाचे काळ समजून घेण्यासाठी वेगळा दृष्टिकोन देते.",
    why: "तुमची कुंडली का पाहावी?",
    points: [
      "स्वतःला अधिक चांगल्या प्रकारे समजून घ्या — तुमच्या नैसर्गिक क्षमता, प्रवृत्ती आणि वारंवार दिसणारे जीवनातील पॅटर्न जाणून घ्या.",
      "करिअर, नातेसंबंध, पैसा किंवा कुटुंबाबाबत महत्त्वाचे निर्णय घेताना अधिक स्पष्टता मिळवा.",
      "योग्य वेळ समजून घ्या — प्रगती, बदल, संधी किंवा अधिक संयमाची गरज असलेले काळ ओळखा.",
    ],
    choose: "आमच्या सेवा",
    closing: "रीडिंगसाठी येण्यापूर्वी तुमच्याकडे सर्व उत्तरे असणे आवश्यक नाही. सध्या तुमच्या मनात असलेला प्रश्न घेऊन या आणि तुमच्या जन्मकुंडलीतून एक वेगळा दृष्टिकोन मिळवा.",
  },
} as const;

export default function Services({ language }: { language: Language }) {
  const t = tr(language);
  const content = CONTENT[language];

  return (
    <section className="services" id="services">
      <div className="wrap">
        <div className="services-intro">
          <span className="services-eyebrow">{t.vedic}</span>
          <h2>{content.title}</h2>
          <p className="services-lead">{content.intro}</p>

          <div className="services-why">
            <h3>{content.why}</h3>
            <div className="services-points">
              {content.points.map((point, index) => (
                <div className="services-point" key={point}>
                  <span className="services-point-number">0{index + 1}</span>
                  <p>{point}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="services-closing">{content.closing}</p>
        </div>

        <div
          className="services-choice"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "16px",
          }}
        >
          <h3>{content.choose}</h3>
          <a href="#booking" className="btn-primary" style={{ display: "inline-flex", alignItems: "center" }}>
            {language === "hi" ? "ज्योतिषी स्लॉट बुक करें" : language === "mr" ? "ज्योतिषी स्लॉट बुक करा" : "Book an Astrologer Slot"}
          </a>
        </div>

        <div className="service-grid service-grid-all">
          {SERVICES.map(([glyph, title, price, duration]) => (
            <div className="service-card service-card-compact" key={title}>
              <div className="service-card-top">
                <span className="glyph service-glyph">{glyph}</span>
                <span className="service-duration">{duration}</span>
              </div>
              <h3>{SERVICE_LABELS[language][title]}</h3>
              <span className="price">{price} / {t.perSession}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
