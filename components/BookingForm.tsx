"use client";

import { FormEvent, useEffect, useState } from "react";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: () => void) => void;
    };
  }
}

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

type Booking = {
  name: string;
  phone: string;
  email: string;
  service: string;
  birthdetails: string;
};

type PlaceSuggestion = {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
};

function timeOptions() {
  const options: { value: string; label: string }[] = [];
  for (let hour = 0; hour < 24; hour += 1) {
    for (let minute = 0; minute < 60; minute += 1) {
      const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
      const displayHour = hour % 12 || 12;
      const period = hour < 12 ? "AM" : "PM";
      options.push({
        value,
        label: `${displayHour}:${String(minute).padStart(2, "0")} ${period}`,
      });
    }
  }
  return options;
}

const TIME_OPTIONS = timeOptions();

export default function BookingForm() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);
  const [birthTime, setBirthTime] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showPlaces, setShowPlaces] = useState(false);
  const [placeLoading, setPlaceLoading] = useState(false);

  useEffect(() => {
    const query = birthPlace.trim();
    if (query.length < 2) {
      setPlaceSuggestions([]);
      setShowPlaces(false);
      return;
    }

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
        if ((error as Error).name !== "AbortError") {
          setPlaceSuggestions([]);
        }
      } finally {
        setPlaceLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [birthPlace]);

  function selectPlace(place: PlaceSuggestion) {
    setBirthPlace(
      [place.name, place.admin1, place.country].filter(Boolean).join(", ")
    );
    setShowPlaces(false);
  }

  async function loadRazorpay() {
    if (window.Razorpay) return true;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
      document.body.appendChild(script);
    });
    return true;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setOk(false);
    setStatus("");

    const form = new FormData(e.currentTarget);
    const birthDate = String(form.get("birthDate") ?? "").trim();

    const booking: Booking = {
      name: String(form.get("name") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      service: String(form.get("service") ?? ""),
      birthdetails: `${birthDate}, ${birthTime}, ${birthPlace}`,
    };

    try {
      if (!RAZORPAY_KEY_ID) {
        throw new Error("Razorpay Key ID is not configured.");
      }

      await loadRazorpay();

      const orderRes = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking }),
      });

      const order = await orderRes.json();
      if (!orderRes.ok) throw new Error(order.error ?? "Could not start payment.");

      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Nakshatra Readings",
        description: `${booking.service} — Astrology session`,
        order_id: order.id,
        prefill: {
          name: booking.name,
          email: booking.email,
          contact: booking.phone,
        },
        theme: { color: "#CDA463" },
        handler: async (response: Record<string, string>) => {
          setStatus("Confirming payment…");

          try {
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                bookingId: order.bookingId,
              }),
            });

            const result = await verifyRes.json();

            if (verifyRes.ok && result.success) {
              setLoading(false);
              setOk(true);
              setStatus("Payment confirmed! We’ll reach out shortly to schedule your call.");
            } else {
              setLoading(false);
              setOk(false);
              setStatus(
                `Payment received but confirmation failed. Payment ID: ${response.razorpay_payment_id}`
              );
            }
          } catch {
            setLoading(false);
            setOk(false);
            setStatus(
              `Payment received but confirmation could not be completed. Payment ID: ${response.razorpay_payment_id}`
            );
          }
        },
      });

      rzp.on("payment.failed", () => {
        setOk(false);
        setStatus("Payment failed. Please try again.");
        setLoading(false);
      });

      rzp.open();
    } catch (error) {
      setOk(false);
      setStatus(error instanceof Error ? error.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <section className="booking" id="booking">
      <div className="wrap">
        <div className="booking-panel">
          <div>
            <h2>Book your reading</h2>
            <p>
              Fill in your details below. You&apos;ll be asked to pay securely
              via Razorpay — once payment is confirmed, we&apos;ll reach out to
              schedule your call.
            </p>
            <div className={ok ? "status-msg status-ok" : "status-msg status-err"}>
              {status}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Your name</label>
              <input name="name" id="name" type="text" required />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone number</label>
              <input name="phone" id="phone" type="tel" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                name="email"
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                title="Please enter a valid email address, for example name@example.com"
              />
            </div>
            <div className="field">
              <label htmlFor="service">What would you like to focus on?</label>
              <select name="service" id="service" defaultValue="Career & direction">
                <option>Career & direction</option>
                <option>Relationships</option>
                <option>General life reading</option>
              </select>
            </div>

            <div className="ai-two">
              <div className="field">
                <label htmlFor="booking-birth-date">Birth date</label>
                <input
                  name="birthDate"
                  id="booking-birth-date"
                  type="date"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="booking-birth-time">Birth time</label>
                <select
                  id="booking-birth-time"
                  name="birthTime"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  required
                >
                  <option value="">Select time</option>
                  {TIME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field place-field">
              <label htmlFor="booking-birth-place">Birth place</label>
              <div className="place-input-wrap">
                <input
                  id="booking-birth-place"
                  name="birthPlace"
                  value={birthPlace}
                  onChange={(e) => setBirthPlace(e.target.value)}
                  onFocus={() => placeSuggestions.length && setShowPlaces(true)}
                  placeholder="Start typing a city or town"
                  autoComplete="off"
                  required
                />
                {placeLoading && <span className="place-loading">Searching…</span>}
              </div>
              {showPlaces && placeSuggestions.length > 0 && (
                <div className="place-suggestions">
                  {placeSuggestions.map((place, index) => (
                    <button
                      type="button"
                      className="place-option"
                      key={`${place.name}-${place.latitude}-${index}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectPlace(place)}
                    >
                      <strong>{place.name}</strong>
                      <span>
                        {[place.admin1, place.country].filter(Boolean).join(", ")}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="price-line">
              <span>Session fee</span>
              <span className="amt">₹500</span>
            </div>
            <button type="submit" className="btn-primary pay-btn" disabled={loading || ok}>
              {ok ? "Payment confirmed ✓" : loading ? "Preparing payment…" : "Pay ₹500 & book session"}
            </button>
            <p className="note">
              Payments are processed securely by Razorpay. Your card/UPI details never touch our servers.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
