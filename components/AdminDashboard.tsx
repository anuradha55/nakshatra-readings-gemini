"use client";

import { FormEvent, useEffect, useState } from "react";

type Role = "developer" | "astrologer";
type Slot = { id: string; astrologerEmail: string; astrologerName: string; startsAt: string; endsAt: string; status: string; booking?: { id: string; name: string; phone: string; email: string; service: string; status: string } | null };
type Booking = { id: string; name: string; phone: string; email: string; service: string; birthDetails: string | null; amount: number; currency: string; status: string; createdAt: string; paymentVerifiedAt: string | null; slot?: { id: string; astrologerName: string; startsAt: string; endsAt: string; status: string } | null; payout?: { status: string; payoutAmount: number } | null };

const card: React.CSSProperties = { background: "linear-gradient(160deg,#211A55,#191345)", border: "1px solid rgba(205,164,99,.24)", borderRadius: 18, padding: 22 };
const input: React.CSSProperties = { width: "100%", padding: "11px 12px", borderRadius: 9, border: "1px solid rgba(243,239,230,.14)", background: "rgba(15,12,36,.65)", color: "#F3EFE6" };

function ist(value: string) { return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value)) + " IST"; }
function dateValue(value: string) { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value)); }
function timeValue(value: string) { return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }

export default function AdminDashboard({ role, name, email }: { role: Role; name: string; email: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const [s, b] = await Promise.all([fetch("/api/admin/slots", { cache: "no-store" }), fetch("/api/admin/bookings", { cache: "no-store" })]);
    if (s.ok) setSlots((await s.json()).slots ?? []);
    if (b.ok) setBookings((await b.json()).bookings ?? []);
  }
  useEffect(() => { load().catch(() => setMessage("Unable to load dashboard data.")); }, []);

  async function addSlot(e: FormEvent) {
    e.preventDefault(); setLoading(true); setMessage("");
    try {
      const res = await fetch("/api/admin/slots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, startTime, endTime }) });
      const body = await res.json(); if (!res.ok) throw new Error(body.error || "Unable to create slot.");
      setDate(""); setStartTime(""); setEndTime(""); setMessage("Availability slot added."); await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to create slot."); } finally { setLoading(false); }
  }

  async function changeSlot(id: string, action: "block" | "open") {
    const res = await fetch("/api/admin/slots", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    const body = await res.json(); setMessage(res.ok ? "Slot updated." : body.error || "Unable to update slot."); await load();
  }

  const futureSlots = slots.filter((s) => new Date(s.startsAt) > new Date());
  const paidBookings = bookings.filter((b) => b.status === "PAID");

  return <main style={{ minHeight: "100vh", background: "#0F0C24", color: "#F3EFE6", padding: "28px 18px 70px" }}>
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center", marginBottom: 28, flexWrap: "wrap" }}>
        <div><div style={{ color: "#CDA463", fontSize: 12, letterSpacing: ".15em" }}>NAKSHATRA READINGS</div><h1 style={{ fontFamily: "Georgia,serif", fontWeight: 500, marginTop: 7 }}>{role === "developer" ? "Developer Dashboard" : "Astrologer Dashboard"}</h1><p style={{ color: "#B9B3D6", fontSize: 14 }}>{name} · {email}</p></div>
        <form action="/api/auth/logout" method="post"><button type="submit" style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid rgba(243,239,230,.18)", background: "transparent", color: "#F3EFE6", cursor: "pointer" }}>Sign out</button></form>
      </header>

      {message && <div style={{ ...card, marginBottom: 18, color: message.includes("Unable") || message.includes("no longer") || message.includes("overlap") ? "#E48787" : "#8FD6A8" }}>{message}</div>}

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginBottom: 20 }}>
        <div style={card}><div style={{ color: "#B9B3D6", fontSize: 13 }}>Upcoming slots</div><strong style={{ fontSize: 28 }}>{futureSlots.filter(s => s.status === "AVAILABLE").length}</strong></div>
        <div style={card}><div style={{ color: "#B9B3D6", fontSize: 13 }}>Paid bookings</div><strong style={{ fontSize: 28 }}>{paidBookings.length}</strong></div>
        <div style={card}><div style={{ color: "#B9B3D6", fontSize: 13 }}>Total bookings</div><strong style={{ fontSize: 28 }}>{bookings.length}</strong></div>
      </section>

      <section style={{ ...card, marginBottom: 20 }}>
        <h2 style={{ fontFamily: "Georgia,serif", fontWeight: 500, marginBottom: 6 }}>Set astrologer availability</h2>
        <p style={{ color: "#B9B3D6", fontSize: 13, marginBottom: 16 }}>Customers will see these slots on the paid booking form. All times use IST.</p>
        <form onSubmit={addSlot} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, alignItems: "end" }}>
          <label style={{ fontSize: 12, color: "#B9B3D6" }}>Date<input style={{ ...input, marginTop: 5 }} type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
          <label style={{ fontSize: 12, color: "#B9B3D6" }}>Start time<input style={{ ...input, marginTop: 5 }} type="time" step="60" value={startTime} onChange={e => setStartTime(e.target.value)} required /></label>
          <label style={{ fontSize: 12, color: "#B9B3D6" }}>End time<input style={{ ...input, marginTop: 5 }} type="time" step="60" value={endTime} onChange={e => setEndTime(e.target.value)} required /></label>
          <button disabled={loading} style={{ padding: 12, border: 0, borderRadius: 9, background: "linear-gradient(135deg,#E7D3A6,#CDA463)", color: "#1A1440", fontWeight: 700, cursor: "pointer" }}>{loading ? "Adding…" : "Add available slot"}</button>
        </form>
      </section>

      <section style={{ ...card, marginBottom: 20, overflowX: "auto" }}>
        <h2 style={{ fontFamily: "Georgia,serif", fontWeight: 500, marginBottom: 14 }}>Availability calendar</h2>
        {slots.length === 0 ? <p style={{ color: "#B9B3D6" }}>No slots created yet.</p> : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}><thead><tr>{["Date & time","Astrologer","Status","Booking","Action"].map(h => <th key={h} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid rgba(243,239,230,.14)", color: "#E7D3A6", fontSize: 12 }}>{h}</th>)}</tr></thead><tbody>{slots.map(s => <tr key={s.id}><td style={{ padding: 10, borderBottom: "1px solid rgba(243,239,230,.08)" }}>{ist(s.startsAt)} – {timeValue(s.endsAt)}</td><td style={{ padding: 10, borderBottom: "1px solid rgba(243,239,230,.08)" }}>{s.astrologerName}</td><td style={{ padding: 10, borderBottom: "1px solid rgba(243,239,230,.08)" }}>{s.status}</td><td style={{ padding: 10, borderBottom: "1px solid rgba(243,239,230,.08)" }}>{s.booking ? `${s.booking.name} · ${s.booking.service}` : "—"}</td><td style={{ padding: 10, borderBottom: "1px solid rgba(243,239,230,.08)" }}>{s.status === "AVAILABLE" ? <button onClick={() => changeSlot(s.id, "block")} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(228,135,135,.45)", background: "transparent", color: "#E48787" }}>Block</button> : s.status === "BLOCKED" ? <button onClick={() => changeSlot(s.id, "open")} style={{ padding: "7px 10px", borderRadius: 8, border: "1px solid rgba(143,214,168,.45)", background: "transparent", color: "#8FD6A8" }}>Open</button> : "—"}</td></tr>)}</tbody></table>}
      </section>

      <section style={{ ...card, overflowX: "auto" }}>
        <h2 style={{ fontFamily: "Georgia,serif", fontWeight: 500, marginBottom: 14 }}>Bookings</h2>
        {bookings.length === 0 ? <p style={{ color: "#B9B3D6" }}>No bookings yet.</p> : <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}><thead><tr>{["Customer","Service","Appointment","Payment","Birth details","Created"].map(h => <th key={h} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid rgba(243,239,230,.14)", color: "#E7D3A6", fontSize: 12 }}>{h}</th>)}</tr></thead><tbody>{bookings.map(b => <tr key={b.id}><td style={{ padding: 10, borderBottom: "1px solid rgba(243,239,230,.08)" }}><strong>{b.name}</strong><br/><span style={{ color: "#B9B3D6", fontSize: 12 }}>{b.phone}<br/>{b.email}</span></td><td style={{ padding: 10, borderBottom: "1px solid rgba(243,239,230,.08)" }}>{b.service}</td><td style={{ padding: 10, borderBottom: "1px solid rgba(243,239,230,.08)" }}>{b.slot ? `${ist(b.slot.startsAt)} – ${timeValue(b.slot.endsAt)}` : "No slot"}</td><td style={{ padding: 10, borderBottom: "1px solid rgba(243,239,230,.08)" }}>{b.status}</td><td style={{ padding: 10, borderBottom: "1px solid rgba(243,239,230,.08)", maxWidth: 260 }}>{b.birthDetails || "—"}</td><td style={{ padding: 10, borderBottom: "1px solid rgba(243,239,230,.08)" }}>{ist(b.createdAt)}</td></tr>)}</tbody></table>}
      </section>

      <p style={{ color: "#77718F", fontSize: 12, marginTop: 18 }}>Dashboard access is controlled by your authorized Google account. Customers never see these pages.</p>
    </div>
  </main>;
}
