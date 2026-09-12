"use client";

import { useEffect, useMemo, useState } from "react";

type Slot = { id: string; astrologerName: string; startsAt: string; endsAt: string };

function dayKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
function dayLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(value));
}
function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(value));
}
function slotDurationMinutes(slot: Slot) {
  return Math.round((new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime()) / 60000);
}

export default function AvailabilityPicker({ selectedSlotId, onSelect, refreshToken = 0, service }: { selectedSlotId: string; onSelect: (slot: Slot | null) => void; refreshToken?: number; service: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const isCompleteKundli = service === "Entire Kundli Analysis";
  const requiredDuration = isCompleteKundli ? 60 : 15;

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

  const filteredSlots = useMemo(() => slots.filter((slot) => slotDurationMinutes(slot) === requiredDuration), [slots, requiredDuration]);

  useEffect(() => {
    if (selectedSlotId && !filteredSlots.some((slot) => slot.id === selectedSlotId)) onSelect(null);
  }, [filteredSlots, selectedSlotId, onSelect]);

  const groups = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const slot of filteredSlots) {
      const key = dayKey(slot.startsAt);
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filteredSlots]);

  useEffect(() => {
    if (!selectedDate && groups.length > 0) setSelectedDate(groups[0][0]);
    if (selectedDate && !groups.some(([key]) => key === selectedDate)) setSelectedDate(groups[0]?.[0] ?? "");
  }, [groups, selectedDate]);

  const selectedGroup = groups.find(([key]) => key === selectedDate)?.[1] ?? [];
  const selectedGroupDate = selectedGroup[0]?.startsAt;
  const sessionLabel = isCompleteKundli ? "1-hour sessions" : "15-minute sessions";

  return (
    <div className="field" style={{ marginTop: 18 }}>
      <label>Choose an available appointment slot</label>
      <p style={{ color: "var(--text-dim)", fontSize: ".78rem", marginBottom: 10 }}>{sessionLabel} are shown based on your selected service. All times are in IST.</p>
      {loading && <p style={{ color: "var(--text-dim)", fontSize: ".85rem" }}>Checking astrologer availability…</p>}
      {error && <p style={{ color: "#E48787", fontSize: ".85rem" }}>{error}</p>}
      {!loading && !error && filteredSlots.length === 0 && <p style={{ color: "var(--text-dim)", fontSize: ".85rem" }}>No {sessionLabel.toLowerCase()} are available yet. Please check again later.</p>}
      {!loading && !error && groups.length > 0 && (
        <>
          <select value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); onSelect(null); }} style={{ width: "100%", padding: "11px 12px", borderRadius: 9, border: "1px solid var(--line)", background: "rgba(15,12,36,.65)", color: "var(--text)", marginBottom: 12 }} aria-label="Choose appointment date">
            {groups.map(([key, group]) => <option key={key} value={key}>{dayLabel(group[0].startsAt)}</option>)}
          </select>
          <div style={{ color: "var(--gold-soft)", fontFamily: "Fraunces,serif", fontSize: ".98rem", marginBottom: 7 }}>{selectedGroupDate ? dayLabel(selectedGroupDate) : ""}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
            {selectedGroup.map((slot) => {
              const selected = selectedSlotId === slot.id;
              return <button key={slot.id} type="button" onClick={() => onSelect(selected ? null : slot)} style={{ border: `1px solid ${selected ? "var(--gold)" : "var(--line)"}`, background: selected ? "rgba(205,164,99,.16)" : "rgba(15,12,36,.45)", color: selected ? "var(--gold-soft)" : "var(--text)", borderRadius: 10, padding: "10px 8px", cursor: "pointer", textAlign: "center" }}>
                <strong style={{ display: "block", fontSize: ".88rem" }}>{timeLabel(slot.startsAt)}</strong>
                <span style={{ display: "block", fontSize: ".7rem", color: "var(--text-dim)", marginTop: 2 }}>{isCompleteKundli ? "1 hour" : "15 min"}</span>
              </button>;
            })}
          </div>
        </>
      )}
      {selectedSlotId && <p style={{ color: "#8FD6A8", fontSize: ".8rem", marginTop: 10 }}>Selected slot. It will be held for 5 minutes while payment is completed.</p>}
    </div>
  );
}
