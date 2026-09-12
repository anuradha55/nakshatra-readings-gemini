"use client";

import { FormEvent, useEffect, useState } from "react";
import { Language, tr } from "@/lib/i18n";
import AvailabilityPicker from "@/components/AvailabilityPicker";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

type Booking = { name: string; phone: string; email: string; service: string; birthdetails: string; slotId: string };
type PlaceSuggestion = { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string };

type SelectedSlot = { id: string; astrologerName: string; startsAt: string; endsAt: string };

export default function BookingForm({ language }: { language: Language }) {
  const t = tr(language);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<SelectedSlot | null>(null);
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
        url.searchParams.set("name", query); url.searchParams.set("count", "6"); url.searchParams.set("language", "en"); url.searchParams.set("format", "json");
        const res = await fetch(url.toString(), { signal: controller.signal });
        const data = await res.json(); setPlaceSuggestions(data?.results ?? []); setShowPlaces(Boolean(data?.results?.length));
      } catch (error) { if ((error as Error).name !== "AbortError") setPlaceSuggestions([]); }
      finally { setPlaceLoading(false); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [birthPlace]);

  function selectPlace(place: PlaceSuggestion) {
    setBirthPlace([place.name, place.admin1, place.country].filter(Boolean).join(", ")); setShowPlaces(false);
  }
  function setDiagnostic(message: string) { console.info(`[Payment diagnostic] ${message}`); setStatus(message); }

  async function loadRazorpay() {
    if (window.Razorpay) return true;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script"); script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => window.Razorpay ? resolve() : reject(new Error("Razorpay script loaded, but Checkout is not available."));
      script.onerror = () => reject(new Error("Could not load Razorpay Checkout.")); document.body.appendChild(script);
    });
    return true;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedSlot) { setStatus("Please choose an available appointment slot before payment."); return; }
    setLoading(true); setOk(false); setStatus("Starting payment...");
    const form = new FormData(e.currentTarget); const birthDate = String(form.get("birthDate") ?? "").trim();
    const booking: Booking = { name: String(form.get("name") ?? "").trim(), phone: String(form.get("phone") ?? "").trim(), email: String(form.get("email") ?? "").trim(), service: String(form.get("service") ?? ""), birthdetails: `${birthDate}, ${birthTime}, ${birthPlace}`, slotId: selectedSlot.id };
    try {
      if (!RAZORPAY_KEY_ID) throw new Error("Razorpay Key ID is not configured.");
      setDiagnostic("Step 1/4: Loading Razorpay Checkout..."); await loadRazorpay();
      setDiagnostic("Step 2/4: Razorpay Checkout loaded. Creating payment order...");
      const orderRes = await fetch("/api/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ booking }) });
      let order: Record<string, unknown>;
      try { order = await orderRes.json(); } catch { throw new Error(`Order API returned an invalid response (HTTP ${orderRes.status}).`); }
      if (!orderRes.ok) {
        const diagnostic = order.diagnostic && typeof order.diagnostic === "object" ? order.diagnostic as { message?: unknown; statusCode?: unknown; razorpayCode?: unknown; razorpayDescription?: unknown; razorpayReason?: unknown } : null;
        const details = diagnostic ? [typeof diagnostic.message === "string" ? diagnostic.message : "", diagnostic.statusCode ? "HTTP/Razorpay status: " + diagnostic.statusCode : "", typeof diagnostic.razorpayCode === "string" ? "Razorpay code: " + diagnostic.razorpayCode : "", typeof diagnostic.razorpayDescription === "string" ? diagnostic.razorpayDescription : "", typeof diagnostic.razorpayReason === "string" ? diagnostic.razorpayReason : ""].filter(Boolean).join("\n") : "";
        const baseError = typeof order.error === "string" ? order.error : "Could not start payment (HTTP " + orderRes.status + ").";
        throw new Error(baseError + (details ? "\n\nDiagnostic:\n" + details : ""));
      }
      if (!order.id || !order.amount || !order.currency || !order.bookingId) throw new Error("Order was created but the website received incomplete payment details.");
      setDiagnostic("Step 3/4: Payment order created. Initializing Razorpay popup...");
      if (!window.Razorpay) throw new Error("Razorpay Checkout is not available after loading the script.");
      let rzp;
      try {
        rzp = new window.Razorpay({ key: RAZORPAY_KEY_ID, amount: order.amount, currency: order.currency, name: "Nakshatra Readings", description: `${booking.service} — Astrology session`, order_id: order.id, prefill: { name: booking.name, email: booking.email, contact: booking.phone }, theme: { color: "#CDA463" }, handler: async (response: Record<string, string>) => {
          setStatus("Payment received securely. Confirming your booking…"); let verificationFinished = false;
          const timeoutId = window.setTimeout(() => { if (!verificationFinished) { setLoading(false); setOk(true); setStatus("Payment received successfully. We’re confirming your booking in the background. Please do not make another payment."); } }, 12000);
          try {
            const verifyRes = await fetch("/api/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature, bookingId: order.bookingId }) });
            const result = await verifyRes.json().catch(() => ({})); verificationFinished = true; window.clearTimeout(timeoutId); setLoading(false);
            if (verifyRes.ok && result.success) { setOk(true); setStatus("Payment confirmed! Opening your booking confirmation…"); window.location.assign("/booking-success?booking=" + encodeURIComponent(String(order.bookingId))); return; }
            setOk(true); setStatus("Payment received successfully. We could not complete the final confirmation on this screen. Please do not make another payment; we will reconcile your booking automatically.");
          } catch { verificationFinished = true; window.clearTimeout(timeoutId); setLoading(false); setOk(true); setStatus("Payment received successfully. Confirmation is taking longer than expected. Please do not make another payment; we will reconcile your booking automatically."); }
        } });
      } catch (error) { throw new Error(`Razorpay popup initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`); }
      rzp.on("payment.failed", () => { setOk(false); setStatus("Payment failed. Please try again."); setLoading(false); });
      setDiagnostic("Step 4/4: Opening secure Razorpay payment window...");
      try { rzp.open(); window.setTimeout(() => { setStatus((current) => current === "Step 4/4: Opening secure Razorpay payment window..." ? "" : current); }, 1500); } catch (error) { throw new Error(`Razorpay popup could not open: ${error instanceof Error ? error.message : "Unknown error"}`); }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong."; console.error("[Payment diagnostic] Payment flow failed:", error); setOk(false); setStatus(`Payment error: ${message}`); window.alert(`Payment diagnostic error:\n${message}`); setLoading(false);
    }
  }

  return <section className="booking" id="booking"><div className="wrap"><div className="booking-panel"><div><h2>{t.bookingTitle}</h2><p>{t.bookingText}</p><div className={ok ? "status-msg status-ok" : "status-msg status-err"}>{status}</div></div><form onSubmit={handleSubmit} onInvalidCapture={(event) => { const target = event.target as HTMLInputElement | HTMLSelectElement; setStatus(`Form validation: please complete the required field "${target.name || target.id || "unknown"}".`); }}>
    <div className="field"><label htmlFor="name">{t.name}</label><input name="name" id="name" type="text" required /></div>
    <div className="field"><label htmlFor="phone">{t.phone}</label><input name="phone" id="phone" type="tel" required /></div>
    <div className="field"><label htmlFor="email">{t.email}</label><input name="email" id="email" type="email" required autoComplete="email" placeholder="name@example.com" title="Please enter a valid email address, for example name@example.com" /></div>
    <div className="field"><label htmlFor="service">{t.focus}</label><select name="service" id="service" defaultValue="Career & direction"><option>{t.career}</option><option>{t.relationships}</option><option>{t.general}</option></select></div>
    <div className="field"><label htmlFor="booking-birth-date">{t.birthDate}</label><input name="birthDate" id="booking-birth-date" type="date" required /></div>
    <div className="ai-two birth-time-place-row" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "12px", width: "100%" }}><div className="field"><label htmlFor="booking-birth-time">{t.birthTime}</label><input id="booking-birth-time" name="birthTime" type="time" value={birthTime} onChange={(e) => setBirthTime(e.target.value)} step="60" required style={{ width: "100%", height: "46px", minWidth: 0, boxSizing: "border-box" }} /><small className="field-hint">Select the exact hour and minute.</small></div><div className="field place-field"><label htmlFor="booking-birth-place">{t.birthPlace}</label><div className="place-input-wrap"><input id="booking-birth-place" name="birthPlace" value={birthPlace} onChange={(e) => setBirthPlace(e.target.value)} onFocus={() => placeSuggestions.length && setShowPlaces(true)} placeholder={t.placePlaceholder} autoComplete="off" required />{placeLoading && <span className="place-loading">{t.searching}</span>}</div>{showPlaces && placeSuggestions.length > 0 && <div className="place-suggestions">{placeSuggestions.map((place, index) => <button type="button" className="place-option" key={`${place.name}-${place.latitude}-${index}`} onMouseDown={(event) => event.preventDefault()} onClick={() => selectPlace(place)}><strong>{place.name}</strong><span>{[place.admin1, place.country].filter(Boolean).join(", ")}</span></button>)}</div>}</div></div>
    <AvailabilityPicker selectedSlotId={selectedSlot?.id ?? ""} onSelect={setSelectedSlot} />
    <div className="price-line"><span>{t.sessionFee}</span><span className="amt">₹500</span></div>
    <button type="submit" className="btn-primary pay-btn" disabled={loading || ok}>{ok ? t.confirmed : loading ? (status.includes("Confirming") || status.includes("Payment received") ? t.confirming : t.preparing) : t.pay}</button><p className="note">{t.secure}</p>
  </form></div></div></section>;
}
