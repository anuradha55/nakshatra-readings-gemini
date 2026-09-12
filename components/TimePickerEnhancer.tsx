"use client";

import { useEffect } from "react";

const TIME_IDS = ["ai-time", "booking-birth-time"];
const DATE_IDS = ["ai-date", "booking-birth-date"];

function pad(value: number) { return String(value).padStart(2, "0"); }

function parseTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { hour: 12, minute: 0, period: "AM" };
  const h = Number(match[1]);
  const minute = Number(match[2]);
  return { hour: h === 0 ? 12 : h > 12 ? h - 12 : h, minute: Math.min(59, Math.max(0, minute)), period: h >= 12 ? "PM" : "AM" };
}

function to24Hour(hour: number, minute: number, period: string) {
  let h = hour % 12;
  if (period === "PM") h += 12;
  return `${pad(h)}:${pad(minute)}`;
}

function applyMobileBirthRowLayout(input: HTMLInputElement) {
  if (!window.matchMedia("(max-width: 860px)").matches || input.id !== "ai-time") return;
  const form = input.closest("form.ai-form") as HTMLElement | null;
  const timeField = input.closest(".field") as HTMLElement | null;
  const dateField = form?.querySelector(".field:has(#ai-date)") as HTMLElement | null;
  const birthRow = input.closest(".birth-time-place-row") as HTMLElement | null;

  if (form) {
    form.style.setProperty("grid-template-columns", "minmax(0, 1fr)", "important");
    form.style.setProperty("column-gap", "0", "important");
    form.style.setProperty("grid-column-gap", "0", "important");
  }
  if (birthRow) birthRow.style.setProperty("display", "contents", "important");
  if (dateField) {
    dateField.style.setProperty("grid-column", "1", "important");
    dateField.style.setProperty("width", "100%", "important");
    dateField.style.setProperty("min-width", "0", "important");
    dateField.style.setProperty("max-width", "none", "important");
  }
  if (timeField) {
    timeField.style.setProperty("grid-column", "1", "important");
    timeField.style.setProperty("width", "100%", "important");
    timeField.style.setProperty("min-width", "0", "important");
    timeField.style.setProperty("max-width", "none", "important");
    timeField.style.setProperty("box-sizing", "border-box", "important");
  }
}

function enhanceTime(input: HTMLInputElement) {
  if (input.dataset.customTimePicker === "true") return;
  input.dataset.customTimePicker = "true";
  input.style.display = "none";

  const wrapper = document.createElement("div");
  wrapper.className = "custom-time-picker";
  wrapper.setAttribute("data-for", input.id);
  wrapper.style.height = "52px";
  wrapper.style.minHeight = "52px";
  wrapper.style.maxHeight = "52px";
  wrapper.style.boxSizing = "border-box";
  wrapper.style.overflow = "visible";

  const controls = document.createElement("div");
  controls.className = "custom-time-picker-controls";
  const hourSelect = document.createElement("select");
  const minuteSelect = document.createElement("select");
  const periodSelect = document.createElement("select");
  hourSelect.setAttribute("aria-label", "Hour");
  minuteSelect.setAttribute("aria-label", "Minute");
  periodSelect.setAttribute("aria-label", "AM or PM");

  for (let h = 1; h <= 12; h += 1) { const option = document.createElement("option"); option.value = String(h); option.textContent = pad(h); hourSelect.appendChild(option); }
  for (let m = 0; m <= 59; m += 1) { const option = document.createElement("option"); option.value = String(m); option.textContent = pad(m); minuteSelect.appendChild(option); }
  ["AM", "PM"].forEach((period) => { const option = document.createElement("option"); option.value = period; option.textContent = period; periodSelect.appendChild(option); });

  const setFromInput = () => { const parsed = parseTime(input.value); hourSelect.value = String(parsed.hour); minuteSelect.value = String(parsed.minute); periodSelect.value = parsed.period; };
  const syncInput = () => {
    input.value = to24Hour(Number(hourSelect.value), Number(minuteSelect.value), periodSelect.value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };
  [hourSelect, minuteSelect, periodSelect].forEach((select) => select.addEventListener("change", syncInput));
  setFromInput();
  input.addEventListener("change", setFromInput);
  input.addEventListener("input", setFromInput);

  const icon = document.createElement("span");
  icon.className = "custom-time-picker-icon";
  icon.textContent = "◷";
  icon.setAttribute("aria-hidden", "true");
  controls.append(hourSelect, document.createTextNode(":"), minuteSelect, periodSelect);
  wrapper.append(controls, icon);
  input.parentElement?.insertBefore(wrapper, input.nextSibling);
  applyMobileBirthRowLayout(input);
}

function enhanceDate(input: HTMLInputElement) {
  if (input.dataset.nativeDatePickerReady === "true") return;
  input.dataset.nativeDatePickerReady = "true";
  input.style.display = "block";
  input.style.position = "relative";
  input.style.width = "100%";
  input.style.height = "52px";
  input.style.minHeight = "52px";
  input.style.maxHeight = "52px";
  input.style.boxSizing = "border-box";
  input.style.opacity = "1";
  input.style.pointerEvents = "auto";
  input.style.zIndex = "2";
  input.style.cursor = "pointer";
  input.style.touchAction = "manipulation";
  input.style.textAlign = "left";
  input.style.padding = "0 42px 0 12px";
  input.style.margin = "0";
}

export default function TimePickerEnhancer() {
  useEffect(() => {
    const apply = () => {
      TIME_IDS.forEach((id) => { const input = document.getElementById(id) as HTMLInputElement | null; if (input) enhanceTime(input); });
      DATE_IDS.forEach((id) => { const input = document.getElementById(id) as HTMLInputElement | null; if (input) enhanceDate(input); });
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return <style dangerouslySetInnerHTML={{ __html: `
    .custom-time-picker{width:100%;max-width:100%;height:52px;min-height:52px;max-height:52px;display:flex;flex-wrap:nowrap;align-items:center;justify-content:space-between;gap:0;background:rgba(15,12,36,.55);border:1px solid var(--line);border-radius:10px;padding:0 10px;box-sizing:border-box;overflow:visible;min-width:0;touch-action:manipulation}
    .custom-time-picker:focus-within{outline:2px solid var(--gold);outline-offset:1px}
    .custom-time-picker-controls{display:flex;align-items:center;justify-content:flex-start;flex:1 1 auto;min-width:0;width:auto;gap:0;text-align:left;overflow:visible}
    .custom-time-picker select{appearance:none;-webkit-appearance:none;flex:0 0 auto;width:auto;min-width:0;max-width:none;height:40px;border:0;background:transparent;color:var(--text);font:inherit;font-size:.9rem;text-align:center;text-align-last:center;cursor:pointer;outline:none;padding:0 2px;margin:0;box-sizing:border-box;overflow:visible;flex-shrink:0;touch-action:manipulation}
    .custom-time-picker select[aria-label="Hour"]{flex:0 0 28px;min-width:28px;width:28px}
    .custom-time-picker select[aria-label="Minute"]{flex:0 0 30px;min-width:30px;width:30px;padding-left:4px;padding-right:4px;overflow:visible}
    .custom-time-picker select[aria-label="AM or PM"]{flex:0 0 40px;min-width:40px;width:40px}
    .custom-time-picker-controls> :nth-child(2){flex:0 0 8px;width:8px;text-align:center;overflow:visible}
    .custom-time-picker-icon{flex:0 0 18px;width:18px;color:var(--gold-soft);font-size:.95rem;text-align:center;pointer-events:none;margin-left:10px;overflow:visible}
    .custom-time-picker select option{background:#151126;color:#fff}
    input[data-native-date-picker-ready="true"]{display:block!important;position:relative!important;width:100%!important;height:52px!important;min-height:52px!important;max-height:52px!important;opacity:1!important;pointer-events:auto!important;z-index:2!important;box-sizing:border-box!important;cursor:pointer!important;touch-action:manipulation!important;text-align:left!important;padding:0 42px 0 12px!important;margin:0!important;line-height:normal!important;}
    input[data-native-date-picker-ready="true"]::-webkit-calendar-picker-indicator{opacity:1!important;display:block!important;cursor:pointer!important;width:22px;height:22px;}
    input[data-native-date-picker-ready="true"]::-webkit-date-and-time-value{text-align:left;line-height:normal;}
    input[data-native-date-picker-ready="true"]::-webkit-datetime-edit{text-align:left;padding:0;line-height:normal;}
    input[data-native-date-picker-ready="true"]::-webkit-datetime-edit-fields-wrapper{text-align:left;padding:0;line-height:normal;}
    @media(max-width:860px){
      .ai-form{grid-template-columns:minmax(0,1fr)!important;column-gap:0!important;grid-column-gap:0!important;}
      .ai-form>.field:has(#ai-date){grid-column:1!important;width:100%!important;min-width:0!important;max-width:none!important;}
      .ai-form>.birth-time-place-row{display:contents!important;}
      .ai-form>.birth-time-place-row>.field:has(#ai-time){grid-column:1!important;width:100%!important;min-width:0!important;max-width:none!important;box-sizing:border-box!important;}
      .ai-form>.birth-time-place-row>.field:has(#ai-place){grid-column:1!important;width:100%!important;min-width:0!important;max-width:none!important;box-sizing:border-box!important;}
    }
    @media(max-width:640px){
      .custom-time-picker{height:52px;min-height:52px;max-height:52px;padding-left:10px;padding-right:10px;overflow:visible;min-width:0}
      .custom-time-picker-controls{justify-content:flex-start;min-width:0;overflow:visible}
      .custom-time-picker select{font-size:.8rem;padding-left:1px;padding-right:1px;overflow:visible}
      .custom-time-picker select[aria-label="Hour"]{flex-basis:28px;min-width:28px;width:28px}
      .custom-time-picker select[aria-label="Minute"]{flex-basis:30px;min-width:30px;width:30px;padding-left:4px;padding-right:4px}
      .custom-time-picker select[aria-label="AM or PM"]{flex-basis:40px;min-width:40px;width:40px}
      .custom-time-picker-controls> :nth-child(2){flex-basis:6px;width:6px;overflow:visible}
      .custom-time-picker-icon{flex-basis:16px;width:16px;font-size:.9rem;margin-left:10px;overflow:visible}
    }
    @media(max-width:480px){
      .custom-time-picker{height:52px;min-height:52px;max-height:52px;padding-left:10px;padding-right:10px}
      .custom-time-picker select{font-size:.76rem;line-height:1}
      .custom-time-picker select[aria-label="Hour"]{flex-basis:28px;min-width:28px;width:28px}
      .custom-time-picker select[aria-label="Minute"]{flex-basis:30px;min-width:30px;width:30px;padding-left:4px;padding-right:4px}
      .custom-time-picker select[aria-label="AM or PM"]{flex-basis:40px;min-width:40px;width:40px}
      .custom-time-picker-controls> :nth-child(2){flex-basis:5px;width:5px;overflow:visible}
      .custom-time-picker-icon{flex-basis:14px;width:14px;font-size:.82rem;margin-left:10px;overflow:visible}
    }
  ` }} />;
}
