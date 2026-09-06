"use client";
import React, { FormEvent, useEffect, useState } from "react";
import NorthIndianChart from "@/components/NorthIndianChart";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, handler: () => void) => void };
  }
}

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

function timeOptions() {
  const options: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 1) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const displayHour = hour % 12 || 12;
      const period = hour < 12 ? "AM" : "PM";
      options.push({ value, label: `${displayHour}:${String(minute).padStart(2, "0")} ${period}` });
    }
  }
  return options;
}

const TIME_OPTIONS = timeOptions();
const RETRYABLE_STATUS = new Set([500, 502, 503, 504]);

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export default function AiPrediction() {
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    const query = birthPlace.trim();
    if (query.length < 2) { setPlaceSuggestions([]); setShowPlaces(false); return; }
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
  }, [birthPlace]);

  function selectPlace(place: PlaceSuggestion) {
    setBirthPlace([place.name, place.admin1, place.country].filter(Boolean).join(", "));
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
          setMessage("Payment confirmed. Your ₹10 AI prediction is ready—click the button once more to generate it.");
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

    setLoading(true); setAnswer(""); setChart(null); setMessage(""); setEmailStatus("");

    if (freePredictionUsed && !paidPaymentId) {
      try {
        await startPaidPredictionPayment(form);
      } catch (error) {
        setLoading(false);
        setMessage(error instanceof Error ? error.message : "Unable to start the ₹10 payment.");
      }
      return;
    }

    const payload = JSON.stringify({ name: form.get("name"), email, birthDate: form.get("birthDate"), birthTime: form.get("birthTime"), birthPlace: form.get("birthPlace"), question: form.get("question"), paidPaymentId: paidPaymentId || undefined });

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
              setEmailStatus(emailRes.ok ? "A copy of your AI prediction has been sent to your email." : (emailData?.error ?? "Prediction generated, but the email could not be sent."));
            } catch {
              setEmailStatus("Prediction generated, but the email could not be sent.");
            }
            return;
          }

          if (data?.freePredictionUsed) {
            setFreePredictionUsed(true);
            setPaidPrice(Number(data?.paidPrice ?? 10));
            setMessage(data?.error ?? "A free AI prediction has already been used for these birth details.");
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
            <div className="eyebrow">AI astrology</div>
            <h2>Ask your chart a question.</h2>
            <p>Get one free chart-based Vedic astrology interpretation for each unique set of birth details. Additional predictions can be offered for ₹10.</p>
            <div className="ai-benefits"><span>✦ Ascendant</span><span>✦ Planetary positions</span><span>✦ Mahadasha & Antardasha</span><span>✦ Question analysis</span></div>
          </div>
          <form className="ai-form" onSubmit={submit} onInput={() => { setFreePredictionUsed(false); setPaidPaymentId(""); }}>
            <div className="field"><label htmlFor="ai-name">Your name</label><input id="ai-name" name="name" /></div>
            <div className="field"><label htmlFor="ai-email">Email</label><input id="ai-email" name="email" type="email" required autoComplete="email" placeholder="name@example.com" title="Enter a valid email address, for example name@example.com" /></div>
            <div className="ai-two">
              <div className="field"><label htmlFor="ai-date">Birth date</label><input id="ai-date" name="birthDate" type="date" required /></div>
              <div className="field"><label htmlFor="ai-time">Birth time</label><select id="ai-time" name="birthTime" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} required><option value="">Select time</option>{TIME_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
            </div>
            <div className="field place-field"><label htmlFor="ai-place">Birth place</label><div className="place-input-wrap"><input id="ai-place" name="birthPlace" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} onFocus={() => placeSuggestions.length && setShowPlaces(true)} placeholder="Start typing a city or town" autoComplete="off" required />{placeLoading && <span className="place-loading">Searching…</span>}</div>
              {showPlaces && placeSuggestions.length > 0 && <div className="place-suggestions">{placeSuggestions.map((place, index) => <button type="button" className="place-option" key={`${place.name}-${place.latitude}-${index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => selectPlace(place)}><strong>{place.name}</strong><span>{[place.admin1, place.country].filter(Boolean).join(", ")}</span></button>)}</div>}
            </div>
            <div className="field"><label htmlFor="ai-question">Your question</label><textarea id="ai-question" name="question" rows={4} maxLength={500} placeholder="e.g. What does the coming period look like for my career?" required /></div>
            <button className="btn-primary ai-btn" type="submit" disabled={loading}>
              {loading
                ? "Calculating your chart…"
                : freePredictionUsed
                  ? `Get an AI prediction for ₹${paidPrice}`
                  : "Get 1 free AI prediction"}
            </button>
{freePredictionUsed && <p className="ai-paid-note">{paidPaymentId ? "Payment confirmed. Click the button to generate your AI prediction." : `These birth details have already used their free prediction. Additional AI predictions are ₹${paidPrice} each.`}</p>}
            {remaining !== null && <p className="ai-remaining">{remaining} free prediction{remaining === 1 ? "" : "s"} remaining</p>}
            {message && <p className="status-msg status-err">{message}</p>}
            {emailStatus && <p className="status-msg status-ok">{emailStatus}</p>}
          </form>
        </div>
        {answer && <div className="ai-result"><div className="ai-result-head"><div><h3>Your AI astrology reading</h3><span>Chart calculated · AI interpreted</span></div></div>{chart && <NorthIndianChart {...chart} />}<div className="ai-answer" style={{ maxHeight: "none", overflowY: "visible", overflowX: "visible", paddingRight: "0", paddingBottom: "32px" }}>{renderMarkdown(answer)}</div><div className="ai-cta"><div><strong>Want a deeper reading?</strong><p>Discuss your complete chart with a human astrologer for 30–45 minutes.</p></div><a href="#booking" className="btn-primary">Book for ₹500</a></div></div>}
        <p className="ai-disclaimer">AI-generated astrology guidance is for personal reflection and is not a scientific prediction, guarantee of future events, or professional advice.</p>
      </div>
    </section>
  );
}
