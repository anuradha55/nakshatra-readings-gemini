"use client";

import { useEffect, useMemo, useState } from "react";
import { Language } from "@/lib/i18n";

type Slot = { id: string; astrologerName: string; startsAt: string; endsAt: string };

function dayKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));
}
function dayLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(value));
}
function timeLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" }).format(new Date(value));
}
function slotDurationMinutes(slot: Slot) {
  return Math.round((new Date(slot.endsAt).getTime() - new Date(slot.startsAt).getTime()) / 60000);
}

const COPY = {
  en: { title: "Choose an available appointment slot", oneHour: "1-hour sessions", fifteen: "15-minute sessions", shown: "are shown based on your selected service. All times are in IST.", loading: "Checking astrologer availability…", unavailable: "No {session} are available yet. Please check again later.", date: "Choose appointment date", selected: "Selected slot. It will be held for 5 minutes while payment is completed.", hour: "1 hour", min: "15 min" },
  hi: { title: "उपलब्ध अपॉइंटमेंट स्लॉट चुनें", oneHour: "1 घंटे के सत्र", fifteen: "15 मिनट के सत्र", shown: "आपकी चुनी हुई सेवा के अनुसार दिखाए गए हैं। सभी समय IST में हैं।", loading: "ज्योतिषी की उपलब्धता जाँची जा रही है…", unavailable: "अभी कोई {session} उपलब्ध नहीं हैं। कृपया बाद में फिर देखें।", date: "अपॉइंटमेंट की तारीख चुनें", selected: "स्लॉट चुन लिया गया है। भुगतान पूरा होने तक इसे 5 मिनट के लिए सुरक्षित रखा जाएगा।", hour: "1 घंटा", min: "15 मिनट" },
  mr: { title: "उपलब्ध अपॉइंटमेंट स्लॉट निवडा", oneHour: "1 तासाचे सत्र", fifteen: "15 मिनिटांचे सत्र", shown: "तुम्ही निवडलेल्या सेवेनुसार दाखवले आहेत. सर्व वेळ IST मध्ये आहेत.", loading: "ज्योतिषीची उपलब्धता तपासत आहोत…", unavailable: "सध्या कोणतेही {session} उपलब्ध नाहीत. कृपया नंतर पुन्हा तपासा.", date: "अपॉइंटमेंटची तारीख निवडा", selected: "स्लॉट निवडला आहे. पेमेंट पूर्ण होईपर्यंत तो 5 मिनिटांसाठी राखून ठेवला जाईल.", hour: "1 तास", min: "15 मिनिटे" },
} as const;

export default function AvailabilityPicker({ selectedSlotId, onSelect, refreshToken = 0, service, language: languageProp }: { selectedSlotId: string; onSelect: (slot: Slot | null) => void; refreshToken?: number; service: string; language?: Language }) {
  const [language, setLanguage] = useState<Language>(languageProp ?? "hi");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const isCompleteKundli = service === "Entire Kundli Analysis";
  const requiredDuration = isCompleteKundli ? 60 : 15;
  const copy = COPY[language];

  useEffect(() => {
    if (languageProp) { setLanguage(languageProp); return; }
    const readLanguage = () => {
      const stored = window.localStorage.getItem("nakshatra-language-v3");
      if (stored === "en" || stored === "hi" || stored === "mr") setLanguage(stored);
    };
    readLanguage();
    const timer = window.setInterval(readLanguage, 500);
    return () => window.clearInterval(timer);
  }, [languageProp]);

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
  const sessionLabel = isCompleteKundli ? copy.oneHour : copy.fifteen;

  return (
    <div className="field" style={{ marginTop: 18 }}>
      <label>{copy.title}</label>
      <p style={{ color: "var(--text-dim)", fontSize: ".78rem", marginBottom: 10 }}>{sessionLabel} {copy.shown}</p>
      {loading && <p style={{ color: "var(--text-dim)", fontSize: ".85rem" }}>{copy.loading}</p>}
      {error && <p style={{ color: "#E48787", fontSize: ".85rem" }}>{error}</p>}
      {!loading && !error && filteredSlots.length === 0 && <p style={{ color: "var(--text-dim)", fontSize: ".85rem" }}>{copy.unavailable.replace("{session}", sessionLabel.toLowerCase())}</p>}
      {!loading && !error && groups.length > 0 && (
        <>
          <select value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); onSelect(null); }} style={{ width: "100%", padding: "11px 12px", borderRadius: 9, border: "1px solid var(--line)", background: "rgba(15,12,36,.65)", color: "var(--text)", marginBottom: 12 }} aria-label={copy.date}>
            {groups.map(([key, group]) => <option key={key} value={key}>{dayLabel(group[0].startsAt)}</option>)}
          </select>
          <div style={{ color: "var(--gold-soft)", fontFamily: "Fraunces,serif", fontSize: ".98rem", marginBottom: 7 }}>{selectedGroupDate ? dayLabel(selectedGroupDate) : ""}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
            {selectedGroup.map((slot) => {
              const selected = selectedSlotId === slot.id;
              return <button key={slot.id} type="button" onClick={() => onSelect(selected ? null : slot)} style={{ border: `1px solid ${selected ? "var(--gold)" : "var(--line)"}`, background: selected ? "rgba(205,164,99,.16)" : "rgba(15,12,36,.45)", color: selected ? "var(--gold-soft)" : "var(--text)", borderRadius: 10, padding: "10px 8px", cursor: "pointer", textAlign: "center" }}>
                <strong style={{ display: "block", fontSize: ".88rem" }}>{timeLabel(slot.startsAt)}</strong>
                <span style={{ display: "block", fontSize: ".7rem", color: "var(--text-dim)", marginTop: 2 }}>{isCompleteKundli ? copy.hour : copy.min}</span>
              </button>;
            })}
          </div>
        </>
      )}
      {selectedSlotId && <p style={{ color: "#8FD6A8", fontSize: ".8rem", marginTop: 10 }}>{copy.selected}</p>}
    </div>
  );
}
