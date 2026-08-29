 "use client";

import { FormEvent, useState } from "react";

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

export default function BookingForm() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [ok, setOk] = useState(false);

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
    setStatus("");

    const form = new FormData(e.currentTarget);
    const booking: Booking = {
      name: String(form.get("name") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      service: String(form.get("service") ?? ""),
      birthdetails: String(form.get("birthdetails") ?? "").trim(),
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
            setOk(true);
            setStatus("Payment confirmed! We’ll reach out shortly to schedule your call.");
            e.currentTarget.reset();
          } else {
            setOk(false);
            setStatus(
              `Payment received but confirmation failed. Payment ID: ${response.razorpay_payment_id}`
            );
          }
          setLoading(false);
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
              <input name="email" id="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="service">What would you like to focus on?</label>
              <select name="service" id="service" defaultValue="Career & direction">
                <option>Career & direction</option>
                <option>Relationships</option>
                <option>General life reading</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="birthdetails">Birth date, time & place</label>
              <textarea
                name="birthdetails"
                id="birthdetails"
                rows={2}
                placeholder="e.g. 14 Aug 1994, 6:45 AM, Pune"
              />
            </div>
            <div className="price-line">
              <span>Session fee</span>
              <span className="amt">₹500</span>
            </div>
            <button type="submit" className="btn-primary pay-btn" disabled={loading}>
              {loading ? "Preparing payment…" : "Pay ₹500 & book session"}
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