"use client";
import { FormEvent, useState } from "react";
import NorthIndianChart from "@/components/NorthIndianChart";

type ChartData = React.ComponentProps<typeof NorthIndianChart>;

export default function AiPrediction() {
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [chart, setChart] = useState<ChartData | null>(null);
  const [message, setMessage] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setAnswer(""); setChart(null); setMessage("");
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/ai-prediction", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), email: form.get("email"), birthDate: form.get("birthDate"), birthTime: form.get("birthTime"), birthPlace: form.get("birthPlace"), question: form.get("question") }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.limitReached ? "Your free AI predictions are used. You can book a detailed human consultation for ₹500." : (data.error ?? "Could not generate a prediction."));
        return;
      }
      setAnswer(data.answer); setChart(data.chart ?? null); setRemaining(data.remaining);
    } catch { setMessage("Something went wrong. Please try again."); }
    finally { setLoading(false); }
  }

  return (
    <section className="ai-section" id="free-prediction">
      <div className="wrap">
        <div className="ai-panel">
          <div className="ai-copy">
            <div className="eyebrow">Free AI astrology</div>
            <h2>Ask your chart a question.</h2>
            <p>Get a chart-based Vedic astrology interpretation using your birth details, planetary positions and current Vimshottari Dasha.</p>
            <div className="ai-benefits"><span>✦ Ascendant</span><span>✦ Planetary positions</span><span>✦ Mahadasha & Antardasha</span><span>✦ Question analysis</span></div>
          </div>
          <form className="ai-form" onSubmit={submit}>
            <div className="field"><label htmlFor="ai-name">Your name</label><input id="ai-name" name="name" /></div>
            <div className="field"><label htmlFor="ai-email">Email</label><input id="ai-email" name="email" type="email" required /></div>
            <div className="ai-two">
              <div className="field"><label htmlFor="ai-date">Birth date</label><input id="ai-date" name="birthDate" type="date" required /></div>
              <div className="field"><label htmlFor="ai-time">Birth time</label><input id="ai-time" name="birthTime" type="time" required /></div>
            </div>
            <div className="field"><label htmlFor="ai-place">Birth place</label><input id="ai-place" name="birthPlace" placeholder="e.g. Pune, Maharashtra" required /></div>
            <div className="field"><label htmlFor="ai-question">Your question</label><textarea id="ai-question" name="question" rows={4} maxLength={500} placeholder="e.g. What does the coming period look like for my career?" required /></div>
            <button className="btn-primary ai-btn" type="submit" disabled={loading}>{loading ? "Calculating your chart…" : "Get my free prediction"}</button>
            {remaining !== null && <p className="ai-remaining">{remaining} free prediction{remaining === 1 ? "" : "s"} remaining</p>}
            {message && <p className="status-msg status-err">{message}</p>}
          </form>
        </div>

        {answer && (
          <div className="ai-result">
            <div className="ai-result-head"><div><h3>Your AI astrology reading</h3><span>Chart calculated · AI interpreted</span></div></div>
            {chart && <NorthIndianChart {...chart} />}
            <div className="ai-answer">{answer}</div>
            <div className="ai-cta"><div><strong>Want a deeper reading?</strong><p>Discuss your complete chart with a human astrologer for 30–45 minutes.</p></div><a href="#booking" className="btn-primary">Book for ₹500</a></div>
          </div>
        )}
        <p className="ai-disclaimer">AI-generated astrology guidance is for personal reflection and is not a scientific prediction, guarantee of future events, or professional advice.</p>
      </div>
    </section>
  );
}
