"use client";

import { useEffect } from "react";

const IDS = ["ai-time", "booking-birth-time"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hour: 12, minute: 0, period: "AM" };
  const h = Number(match[1]);
  const minute = Number(match[2]);
  return {
    hour: h === 0 ? 12 : h > 12 ? h - 12 : h,
    minute: Math.min(59, Math.max(0, minute)),
    period: h >= 12 ? "PM" : "AM",
  };
}

function to24Hour(hour: number, minute: number, period: string) {
  let h = hour % 12;
  if (period === "PM") h += 12;
  return `${pad(h)}:${pad(minute)}`;
}

function enhance(input: HTMLInputElement) {
  if (input.dataset.customTimePicker === "true") return;
  input.dataset.customTimePicker = "true";
  input.style.display = "none";

  const wrapper = document.createElement("div");
  wrapper.className = "custom-time-picker";
  wrapper.setAttribute("data-for", input.id);

  const hourSelect = document.createElement("select");
  const minuteSelect = document.createElement("select");
  const periodSelect = document.createElement("select");
  hourSelect.setAttribute("aria-label", "Hour");
  minuteSelect.setAttribute("aria-label", "Minute");
  periodSelect.setAttribute("aria-label", "AM or PM");

  for (let h = 1; h <= 12; h += 1) {
    const option = document.createElement("option");
    option.value = String(h);
    option.textContent = pad(h);
    hourSelect.appendChild(option);
  }
  for (let m = 0; m <= 59; m += 1) {
    const option = document.createElement("option");
    option.value = String(m);
    option.textContent = pad(m);
    minuteSelect.appendChild(option);
  }
  ["AM", "PM"].forEach((period) => {
    const option = document.createElement("option");
    option.value = period;
    option.textContent = period;
    periodSelect.appendChild(option);
  });

  const setFromInput = () => {
    const parsed = parseTime(input.value);
    hourSelect.value = String(parsed.hour);
    minuteSelect.value = String(parsed.minute);
    periodSelect.value = parsed.period;
  };

  const syncInput = () => {
    input.value = to24Hour(Number(hourSelect.value), Number(minuteSelect.value), periodSelect.value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };

  [hourSelect, minuteSelect, periodSelect].forEach((select) => {
    select.addEventListener("change", syncInput);
  });

  setFromInput();
  input.addEventListener("change", setFromInput);
  input.addEventListener("input", setFromInput);

  const icon = document.createElement("span");
  icon.className = "custom-time-picker-icon";
  icon.textContent = "◷";
  icon.setAttribute("aria-hidden", "true");

  wrapper.append(hourSelect, document.createTextNode(":"), minuteSelect, periodSelect, icon);
  input.parentElement?.insertBefore(wrapper, input.nextSibling);
}

export default function TimePickerEnhancer() {
  useEffect(() => {
    const apply = () => {
      IDS.forEach((id) => {
        const input = document.getElementById(id) as HTMLInputElement | null;
        if (input) enhance(input);
      });
    };

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <style dangerouslySetInnerHTML={{ __html: `
      .custom-time-picker{width:100%;height:46px;display:flex;align-items:center;justify-content:center;gap:0;background:rgba(15,12,36,.55);border:1px solid var(--line);border-radius:10px;padding:0 10px;box-sizing:border-box;overflow:visible}
      .custom-time-picker:focus-within{outline:2px solid var(--gold);outline-offset:1px}
      .custom-time-picker select{appearance:none;-webkit-appearance:none;flex:0 0 auto;width:54px;height:38px;min-width:54px;padding:0;margin:0;border:0;background:transparent;color:var(--text);font:inherit;font-size:.92rem;text-align:center;text-align-last:center;cursor:pointer;outline:none;box-sizing:border-box}
      .custom-time-picker select option{background:#151126;color:#fff}
      .custom-time-picker > :nth-child(2){flex:0 0 18px;width:18px;text-align:center}
      .custom-time-picker select:nth-child(4){width:68px;min-width:68px}
      .custom-time-picker-icon{flex:0 0 28px;width:28px;color:var(--gold-soft);font-size:1.05rem;text-align:center;pointer-events:none}
      @media(max-width:640px){.custom-time-picker{padding:0 7px}.custom-time-picker select{width:54px;min-width:54px;font-size:.9rem}.custom-time-picker select:nth-child(4){width:68px;min-width:68px}.custom-time-picker-icon{flex-basis:24px;width:24px}}
    ` }} />
  );
}
