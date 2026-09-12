"use client";

import { ChangeEvent } from "react";

type BirthTimePickerProps = {
  id: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
};

const hours = Array.from({ length: 12 }, (_, i) => i + 1);
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function parseTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return { hour: 12, minute: "00", period: "AM" };
  const hour24 = Number(match[1]);
  const minute = match[2];
  return {
    hour: hour24 % 12 || 12,
    minute,
    period: hour24 >= 12 ? "PM" : "AM",
  };
}

export default function BirthTimePicker({ id, name, value, onChange, hint }: BirthTimePickerProps) {
  const parsed = parseTime(value);

  function update(part: "hour" | "minute" | "period", next: string) {
    const hour = part === "hour" ? Number(next) : parsed.hour;
    const minute = part === "minute" ? next : parsed.minute;
    const period = part === "period" ? next : parsed.period;
    let hour24 = hour % 12;
    if (period === "PM") hour24 += 12;
    onChange(`${String(hour24).padStart(2, "0")}:${minute}`);
  }

  const handle = (part: "hour" | "minute" | "period") => (event: ChangeEvent<HTMLSelectElement>) => {
    update(part, event.target.value);
  };

  return (
    <div className="birth-time-picker">
      <div className="birth-time-controls" aria-label="Birth time">
        <select aria-label="Hour" value={parsed.hour} onChange={handle("hour")}>
          {hours.map((hour) => <option key={hour} value={hour}>{String(hour).padStart(2, "0")}</option>)}
        </select>
        <span className="birth-time-separator">:</span>
        <select aria-label="Minute" value={parsed.minute} onChange={handle("minute")}>
          {minutes.map((minute) => <option key={minute} value={minute}>{minute}</option>)}
        </select>
        <select aria-label="AM or PM" value={parsed.period} onChange={handle("period")}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      <input id={id} name={name} type="hidden" value={value} required />
      {hint && <small className="field-hint">{hint}</small>}
    </div>
  );
}
