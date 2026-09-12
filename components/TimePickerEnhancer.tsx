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

  const button = document.createElement("button");
  button.type = "button";
  button.className = "custom-time-picker-display";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");

  const value = document.createElement("span");
  value.className = "custom-time-picker-value";

  const icon = document.createElement("span");
  icon.className = "custom-time-picker-icon";
  icon.textContent = "◷";
  icon.setAttribute("aria-hidden", "true");

  button.append(value, icon);

  const menu = document.createElement("div");
  menu.className = "custom-time-picker-menu";
  menu.setAttribute("role", "listbox");

  const hourColumn = document.createElement("div");
  const minuteColumn = document.createElement("div");
  const periodColumn = document.createElement("div");
  hourColumn.className = minuteColumn.className = periodColumn.className = "custom-time-picker-column";

  let selectedHour = 12;
  let selectedMinute = 0;
  let selectedPeriod = "AM";

  const updateDisplay = () => {
    value.textContent = `${pad(selectedHour)} : ${pad(selectedMinute)} ${selectedPeriod}`;
  };

  const syncInput = () => {
    input.value = to24Hour(selectedHour, selectedMinute, selectedPeriod);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    updateDisplay();
  };

  const makeOption = (text: string, onClick: () => void) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "custom-time-picker-option";
    option.textContent = text;
    option.addEventListener("click", onClick);
    return option;
  };

  for (let h = 1; h <= 12; h += 1) {
    hourColumn.appendChild(makeOption(pad(h), () => {
      selectedHour = h;
      syncInput();
    }));
  }
  for (let m = 0; m <= 59; m += 1) {
    minuteColumn.appendChild(makeOption(pad(m), () => {
      selectedMinute = m;
      syncInput();
    }));
  }
  ["AM", "PM"].forEach((period) => {
    periodColumn.appendChild(makeOption(period, () => {
      selectedPeriod = period;
      syncInput();
      closeMenu();
    }));
  });

  menu.append(hourColumn, minuteColumn, periodColumn);
  wrapper.append(button, menu);

  const setFromInput = () => {
    const parsed = parseTime(input.value);
    selectedHour = parsed.hour;
    selectedMinute = parsed.minute;
    selectedPeriod = parsed.period;
    updateDisplay();
  };

  const closeMenu = () => {
    menu.classList.remove("open");
    button.setAttribute("aria-expanded", "false");
  };

  button.addEventListener("click", (event) => {
    event.preventDefault();
    const isOpen = menu.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target as Node)) closeMenu();
  });

  setFromInput();
  input.addEventListener("change", setFromInput);
  input.addEventListener("input", setFromInput);
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
      .custom-time-picker{position:relative;width:100%;height:46px}
      .custom-time-picker-display{width:100%;height:46px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 12px;background:rgba(15,12,36,.55);border:1px solid var(--line);border-radius:10px;color:var(--text);font:inherit;font-size:.92rem;cursor:pointer}
      .custom-time-picker-display:focus{outline:2px solid var(--gold);outline-offset:1px}
      .custom-time-picker-value{flex:1 1 auto;text-align:center;white-space:nowrap;overflow:visible}
      .custom-time-picker-icon{flex:0 0 22px;color:var(--gold-soft);font-size:1.05rem;text-align:center;pointer-events:none}
      .custom-time-picker-menu{position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:50;display:none;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:8px;background:#171238;border:1px solid rgba(205,164,99,.35);border-radius:10px;box-shadow:0 16px 35px rgba(0,0,0,.45)}
      .custom-time-picker-menu.open{display:grid}
      .custom-time-picker-column{max-height:190px;overflow-y:auto;display:flex;flex-direction:column;gap:2px;scrollbar-width:thin;scrollbar-color:var(--gold) rgba(15,12,36,.8)}
      .custom-time-picker-column::-webkit-scrollbar{width:7px}
      .custom-time-picker-column::-webkit-scrollbar-track{background:rgba(15,12,36,.8);border-radius:999px}
      .custom-time-picker-column::-webkit-scrollbar-thumb{background:var(--gold);border:1px solid #171238;border-radius:999px}
      .custom-time-picker-column::-webkit-scrollbar-thumb:hover{background:var(--gold-soft)}
      .custom-time-picker-option{width:100%;height:34px;flex:0 0 34px;border:0;border-radius:7px;background:transparent;color:var(--text);font:inherit;font-size:.9rem;cursor:pointer;text-align:center}
      .custom-time-picker-option:hover,.custom-time-picker-option:focus{background:rgba(205,164,99,.14);color:var(--gold-soft);outline:none}
      /* Force the browser calendar glyph to render white on the dark purple form. */
      input[type="date"]{color-scheme:dark !important;accent-color:var(--gold)}
      input[type="date"]::-webkit-calendar-picker-indicator,
      input[type="date"]::-webkit-calendar-picker-indicator:hover{filter:brightness(0) invert(1) !important;-webkit-filter:brightness(0) invert(1) !important;opacity:1 !important;cursor:pointer}
      @media(max-width:640px){.custom-time-picker-menu{grid-template-columns:1fr 1fr 1fr}.custom-time-picker-option{height:36px;flex-basis:36px}.custom-time-picker-column{max-height:180px}.custom-time-picker-display{padding:0 10px}}
    ` }} />
  );
}
