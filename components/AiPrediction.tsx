"use client";
import React, { FormEvent, useEffect, useState } from "react";
import NorthIndianChart from "@/components/NorthIndianChart";
import { Language, tr } from "@/lib/i18n";


const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

type ChartData = React.ComponentProps<typeof NorthIndianChart>;
type PlaceSuggestion = { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string };

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|<br\s*\/?\s*>)/gi);
  return parts.map((part, index) => {
    if (/^<br\s*\/?\s*>$/i.test(part)) return <br key={index} />;
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function renderMarkdown(markdown: string) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) { i += 1; continue; }
    if (/^(---+|___+|\*\*\*+)$/.test(line)) { blocks.push(<hr key={`hr-${i}`} />); i += 1; continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = Math.min(heading[1].length + 2, 6);
      const Tag = `h${level}` as React.ElementType;
      blocks.push(<Tag key={`h-${i}`}>{renderInline(heading[2])}</Tag>);
      i += 1; continue;
    }
    if (line.startsWith("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      const header = line.split("|").slice(1, -1).map((cell) => cell.trim());
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(lines[i].trim().split("|").slice(1, -1).map((cell) => cell.trim())); i += 1; }
      blocks.push(<div className="ai-table-wrap" key={`table-${i}`}><table className="ai-table"><thead><tr>{header.map((cell, j) => <th key={j}>{renderInline(cell)}</th>)}</tr></thead><tbody>{rows.map((row, r) => <tr key={r}>{header.map((_, j) => <td key={j}>{renderInline(row[j] ?? "")}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*+]\s+/, "")); i += 1; }
      blocks.push(<ul className="ai-md-list" key={`ul-${i}`}>{items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}</ul>);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (/^\d+[.)]\s+/.test(current)) { items.push(current.replace(/^\d+[.)]\s+/, "")); i += 1; continue; }
        if (!current && i + 1 < lines.length && /^\d+[.)]\s+/.test(lines[i + 1].trim())) { i += 1; continue; }
        break;
      }
      blocks.push(<ol className="ai-md-list" key={`ol-${i}`}>{items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}</ol>);
      continue;
    }
    const paragraph: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next || /^(#{1,6})\s+/.test(next) || /^(---+|___+|\*\*\*+)$/.test(next) || /^[-*+]\s+/.test(next) || /^\d+[.)]\s+/.test(next) || next.startsWith("|")) break;
      paragraph.push(next); i += 1;
    }
    blocks.push(<p key={`p-${i}`}>{renderInline(paragraph.join(" "))}</p>);
  }
  return blocks;
}

const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

function extractConclusion(markdown: string) {
  const match = markdown.match(/(?:^|\\n)##\\s*(?:6\\.\\s*)?(?:Conclusion|निष्कर्ष|निष्कर्ष:)\\s*\\n([\\s\\S]*?)(?=\\n##\\s*|$)/i);
  if (!match) return "";
  return (match?.[1] ?? "").trim();
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function AiPrediction({ language }: { language: Language }) {
  const t = tr(language);
  const [loading, setLoading] = useState(false);
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [answer, setAnswer] = useState("");
  const [chart, setChart] = useState<ChartData | null>(null);
  const [message, setMessage] = useState("");
  const [emailStatus, setEmailStatus] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [freePredictionUsed, setFreePredictionUsed] = useState(false);
  const [paidPrice, setPaidPrice] = useState(10);
  const [paidPaymentId, setPaidPaymentId] = useState("");
  const [birthTime, setBirthTime] = useState("12:00");
  const [birthPlace, setBirthPlace] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showPlaces, setShowPlaces] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState("");

  useEffect(() => {
    const query = birthPlace.trim();
    if (query.length < 2 || query === selectedPlace) { setPlaceSuggestions([]); setShowPlaces(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setPlaceLoading(true);
        const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
        url.searchParams.set("name", query);
        url.searchParams.set("count", "6");
        url.searchParams.set("language", "en");
        url.searchParams.set("format", "json");
        const res = await fetch(url.toString(), { signal: controller.signal });
        const data = await res.json();
        setPlaceSuggestions(data?.results ?? []);
        setShowPlaces(Boolean(data?.results?.length));
      } catch (error) {
        if ((error as Error).name !== "AbortError") setPlaceSuggestions([]);
      } finally { setPlaceLoading(false); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [birthPlace, selectedPlace]);

  function selectPlace(place: PlaceSuggestion) {
    const fullPlace = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
    setSelectedPlace(fullPlace);
    setBirthPlace(fullPlace);
    setPlaceSuggestions([]);
    setShowPlaces(false);
  }

  async function loadRazorpay() {
    if (window.Razorpay) return;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => window.Razorpay ? resolve() : reject(new Error("Razorpay Checkout did not load."));
      script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
      document.body.appendChild(script);
    });
  }

  async function startPaidPredictionPayment(form: FormData) {
    if (!RAZORPAY_KEY_ID) throw new Error("Razorpay Key ID is not configured.");
    await loadRazorpay();

    const birthDate = String(form.get("birthDate") ?? "").trim();
    const birthTimeValue = String(form.get("birthTime") ?? "").trim();
    const birthPlaceValue = String(form.get("birthPlace") ?? "").trim();

    const orderRes = await fetch("/api/ai-prediction/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ birthDate, birthTime: birthTimeValue, birthPlace: birthPlaceValue }),
    });
    const order = await orderRes.json().catch(() => null);
    if (!orderRes.ok || !order?.id || !order?.paymentId) {
      throw new Error(order?.error ?? "Unable to create the ₹10 AI prediction payment.");
    }
    if (!window.Razorpay) throw new Error("Razorpay Checkout is not available.");

    const rzp = new window.Razorpay({
      key: RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: "Nakshatra Readings",
      description: "AI Astrology Prediction",
      order_id: order.id,
      prefill: {
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
      },
      theme: { color: "#CDA463" },
      handler: async (response: Record<string, string>) => {
        try {
          const verifyRes = await fetch("/api/ai-prediction/verify-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              paymentId: order.paymentId,
            }),
          });
          const verified = await verifyRes.json().catch(() => null);
          if (!verifyRes.ok || !verified?.success) throw new Error(verified?.error ?? "Payment verification failed.");

          setPaidPaymentId(String(order.paymentId));
          setMessage("Payment confirmed. Generating your AI prediction…");
          setLoading(false);
          window.setTimeout(() => document.getElementById("ai-paid-prediction-submit")?.click(), 150);
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Payment was received but could not be verified on the website.");
        } finally {
          setLoading(false);
        }
      },
    });

    rzp.on("payment.failed", () => {
      setLoading(false);
      setMessage("Payment was not completed. You have not been charged for the prediction.");
    });
    rzp.open();
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();

    setLoading(true); setAnswer(""); setChart(null); setMessage(""); setEmailStatus(""); setShowDetailedReport(false);

    if (freePredictionUsed && !paidPaymentId) {
      try {
        await startPaidPredictionPayment(form);
      } catch (error) {
        setLoading(false);
        setMessage(error instanceof Error ? error.message : "Unable to start the ₹10 payment.");
      }
      return;
    }

    const payload = JSON.stringify({ name: form.get("name"), email, birthDate: form.get("birthDate"), birthTime: form.get("birthTime"), birthPlace: form.get("birthPlace"), question: form.get("question"), paidPaymentId: paidPaymentId || undefined, language });

    try {
      let lastError = "Could not generate a prediction.";
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const res = await fetch("/api/ai-prediction", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
          let data: any = null;
          try { data = await res.json(); } catch { data = null; }

          if (res.ok) {
            const generatedAnswer = data?.answer ?? "";
            setAnswer(generatedAnswer);
            setPaidPaymentId("");
            setChart(data?.chart ?? null);
            setRemaining(data?.remaining ?? null);
            if (data?.freePredictionUsed) {
              setFreePredictionUsed(true);
              setPaidPrice(Number(data?.paidPrice ?? 10));
            }

            try {
              const emailRes = await fetch("/api/send-prediction-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: form.get("name"), email, answer: generatedAnswer }),
              });
              const emailData = await emailRes.json().catch(() => null);
              setEmailStatus(emailRes.ok ? "A copy of your AI prediction has been sent to your email." : "");
            } catch {
              setEmailStatus("");
            }
            return;
          }

          if (data?.freePredictionUsed) {
            setFreePredictionUsed(true);
            setPaidPrice(Number(data?.paidPrice ?? 10));
            setMessage(data?.error ?? "The free AI prediction has already been used.");
            return;
          }

          lastError = data?.error ?? `Prediction service returned ${res.status}.`;
          if (!RETRYABLE_STATUS.has(res.status) || attempt === 2) break;
        } catch (error) {
          lastError = error instanceof Error ? error.message : "Network error while generating the prediction.";
          if (attempt === 2) break;
        }
        await wait(700 * (attempt + 1));
      }
      setMessage(lastError || "Could not generate a prediction. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ai-section" id="free-prediction">
      <div className="wrap">
        <div className="ai-panel">
          <div className="ai-copy">
            <div className="eyebrow">{t.aiEyebrow}</div>
            <h2>{t.aiTitle}</h2>
            <p>{t.aiText}</p>
            <div className="ai-benefits">{t.aiBenefits.map((benefit) => <span key={benefit}>✦ {benefit}</span>)}</div>
          </div>
          <form className="ai-form" onSubmit={submit} onInput={() => { setFreePredictionUsed(false); setPaidPaymentId(""); }}>
            
            <div className="field"><label htmlFor="ai-name">{t.aiName}</label><input id="ai-name" name="name" /></div>
            <div className="field"><label htmlFor="ai-email">{t.email}</label><input id="ai-email" name="email" type="email" required autoComplete="email" placeholder="name@example.com" title="Enter a valid email address, for example name@example.com" /></div>
            <div className="ai-two">
              <div className="field"><label htmlFor="ai-date">{t.birthDate}</label><input id="ai-date" name="birthDate" type="date" required /></div>
              <div className="field"><label htmlFor="ai-time">{t.birthTime}</label><input id="ai-time" name="birthTime" type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} step="60" required /><small className="field-hint">Select the exact hour and minute.</small></div>
            </div>
            <div className="field place-field"><label htmlFor="ai-place">{t.birthPlace}</label><div className="place-input-wrap"><input id="ai-place" name="birthPlace" value={birthPlace} onChange={(e) => { setSelectedPlace(""); setBirthPlace(e.target.value); }} onFocus={() => !selectedPlace && placeSuggestions.length && setShowPlaces(true)} placeholder={t.placePlaceholder} autoComplete="off" required />{placeLoading && <span className="place-loading">{t.searching}</span>}</div>
              {showPlaces && placeSuggestions.length > 0 && <div className="place-suggestions">{placeSuggestions.map((place, index) => <button type="button" className="place-option" key={`${place.name}-${place.latitude}-${index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => selectPlace(place)}><strong>{place.name}</strong><span>{[place.admin1, place.country].filter(Boolean).join(", ")}</span></button>)}</div>}
            </div>
            <div className="field"><label htmlFor="ai-question">{t.question}</label><textarea id="ai-question" name="question" rows={4} maxLength={500} placeholder="e.g. What does the coming period look like for my career?" required /></div>
            <button id="ai-paid-prediction-submit" className="btn-primary ai-btn" type="submit" disabled={loading}>
              {loading
                ? "Calculating your chart…"
                : freePredictionUsed
                  ? `Get an AI prediction for ₹${paidPrice}`
                  : "Get 1 free AI prediction"}
            </button>
{freePredictionUsed && <p className="ai-paid-note">{paidPaymentId ? "Payment confirmed. Generating your AI prediction…" : `The free AI prediction has already been used. Additional AI predictions are ₹${paidPrice} each.`}</p>}
            {remaining !== null && <p className="ai-remaining">{remaining} free prediction{remaining === 1 ? "" : "s"} remaining</p>}
            {message && <p className="status-msg status-err">{message}</p>}
            {emailStatus && <p className="status-msg status-ok">{emailStatus}</p>}
          </form>
        </div>
        {answer && <div className="ai-result"><div className="ai-result-head"><div><h3>{language === "hi" ? "आपकी AI ज्योतिषीय भविष्यवाणी" : language === "mr" ? "तुमचे AI ज्योतिषीय वाचन" : "Your AI astrology reading"}</h3><span>{language === "hi" ? "चार्ट गणना · AI व्याख्या" : language === "mr" ? "कुंडली गणना · AI विश्लेषण" : "Chart calculated · AI interpreted"}</span></div></div>
          <div className="ai-conclusion"><div className="ai-conclusion-label">{t.conclusion}</div>{renderMarkdown(extractConclusion(answer) || answer)}</div>
          <button type="button" className="btn-ghost ai-detail-btn" onClick={() => setShowDetailedReport((value) => !value)}>{showDetailedReport ? t.hideDetailed : t.detailed}</button>
          {showDetailedReport && <div className="ai-detailed-report">{chart && <NorthIndianChart {...chart} />}<div className="ai-answer" style={{ maxHeight: "none", overflowY: "visible", overflowX: "visible", paddingRight: "0", paddingBottom: "32px" }}>{renderMarkdown(answer)}</div></div>}
          <div className="ai-cta"><div><strong>{language === "hi" ? "गहराई से पढ़ना चाहते हैं?" : language === "mr" ? "सखोल वाचन हवे आहे?" : "Want a deeper reading?"}</strong><p>{language === "hi" ? "अपने पूरे चार्ट पर मानव ज्योतिषी से चर्चा करें।" : language === "mr" ? "तुमच्या संपूर्ण कुंडलीवर मानवी ज्योतिषासोबत चर्चा करा." : "Discuss your complete chart with a human astrologer for 30–45 minutes."}</p></div><a href="#booking" className="btn-primary">{language === "hi" ? "₹500 में बुक करें" : language === "mr" ? "₹500 मध्ये बुक करा" : "Book for ₹500"}</a></div></div>}
        <p className="ai-disclaimer">AI-generated astrology guidance is for personal reflection and is not a scientific prediction, guarantee of future events, or professional advice.</p>
      </div>
    </section>
  );
}
