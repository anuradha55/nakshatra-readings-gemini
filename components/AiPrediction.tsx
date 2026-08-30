"use client";
import React, { FormEvent, useEffect, useState } from "react";
import NorthIndianChart from "@/components/NorthIndianChart";

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

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();

    setLoading(true); setAnswer(""); setChart(null); setMessage(""); setEmailStatus("");
    const payload = JSON.stringify({ name: form.get("name"), email, birthDate: form.get("birthDate"), birthTime: form.get("birthTime"), birthPlace: form.get("birthPlace"), question: form.get("question") });

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
            setChart(data?.chart ?? null);
            setRemaining(data?.remaining ?? null);

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
            <div className="eyebrow">Free AI astrology</div>
            <h2>Ask your chart a question.</h2>
            <p>Get a chart-based Vedic astrology interpretation using your birth details, planetary positions and current Vimshottari Dasha.</p>
            <div className="ai-benefits"><span>✦ Ascendant</span><span>✦ Planetary positions</span><span>✦ Mahadasha & Antardasha</span><span>✦ Question analysis</span></div>
          </div>
          <form className="ai-form" onSubmit={submit}>
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
            <button className="btn-primary ai-btn" type="submit" disabled={loading}>{loading ? "Calculating your chart…" : "Get my free prediction"}</button>
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
