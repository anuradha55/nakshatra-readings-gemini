"use client";

import { useEffect, useMemo, useState } from "react";

type Slot = { id: string; astrologerName: string; startsAt: string; endsAt: string };

function dayLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}
function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export default function AvailabilityPicker({ selectedSlotId, onSelect, refreshToken = 0 }: { selectedSlotId: string; onSelect: (slot: Slot | null) => void; refreshToken?: number }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetch("/api/availability", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Unable to load appointment slots.");
        if (active) setSlots(body.slots ?? []);
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : "Unable to load appointment slots."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [refreshToken]);

  const groups = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of slots) {
      const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(slot.startsAt));
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return Array.from(map.values());
  }, [slots]);

  return (
    <div className="field" style={{ marginTop: 18 }}>
      <label>Choose an available appointment slot</label>
      <p style={{ color: "var(--text-dim)", fontSize: ".78rem", marginBottom: 10 }}>Only times marked available by the astrologer are shown. Times are in IST.</p>
      {loading && <p style={{ color: "var(--text-dim)", fontSize: ".85rem" }}>Checking astrologer availability…</p>}
      {error && <p style={{ color: "#E48787", fontSize: ".85rem" }}>{error}</p>}
      {!loading && !error && slots.length === 0 && <p style={{ color: "var(--text-dim)", fontSize: ".85rem" }}>No appointment slots are available yet. Please check again later.</p>}
      <div style={{ display: "grid", gap: 14 }}>
        {groups.map((group) => (
          <div key={group[0].id}>
            <div style={{ color: "var(--gold-soft)", fontFamily: "Fraunces,serif", fontSize: ".98rem", marginBottom: 7 }}>{dayLabel(group[0].startsAt)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
              {group.map((slot) => {
                const selected = selectedSlotId === slot.id;
                return <button key={slot.id} type="button" onClick={() => onSelect(selected ? null : slot)} style={{ border: `1px solid ${selected ? "var(--gold)" : "var(--line)"}`, background: selected ? "rgba(205,164,99,.16)" : "rgba(15,12,36,.45)", color: selected ? "var(--gold-soft)" : "var(--text)", borderRadius: 10, padding: "10px 8px", cursor: "pointer", textAlign: "center" }}>
                  <strong style={{ display: "block", fontSize: ".88rem" }}>{timeLabel(slot.startsAt)}</strong>
                  <span style={{ display: "block", fontSize: ".7rem", color: "var(--text-dim)", marginTop: 2 }}>{timeLabel(slot.endsAt)} end</span>
                </button>;
              })}
            </div>
          </div>
        ))}
      </div>
      {selectedSlotId && <p style={{ color: "#8FD6A8", fontSize: ".8rem", marginTop: 10 }}>Selected slot. It will be held for 10 minutes while payment is completed.</p>}
    </div>
  );
}
