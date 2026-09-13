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

function enhanceTime(input: HTMLInputElement) {
  if (input.dataset.customTimePicker === "true") return;
  input.dataset.customTimePicker = "true";
  input.style.display = "none";
  const wrapper = document.createElement("div");
  wrapper.className = "custom-time-picker";
  wrapper.setAttribute("data-for", input.id);
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
  const syncInput = () => { input.value = to24Hour(Number(hourSelect.value), Number(minuteSelect.value), periodSelect.value); input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true })); };
  [hourSelect, minuteSelect, periodSelect].forEach((select) => select.addEventListener("change", syncInput));
  input.addEventListener("change", setFromInput); input.addEventListener("input", setFromInput); setFromInput();
  const icon = document.createElement("span"); icon.className = "custom-time-picker-icon"; icon.textContent = "◷"; icon.setAttribute("aria-hidden", "true");
  controls.append(hourSelect, document.createTextNode(":"), minuteSelect, periodSelect); wrapper.append(controls, icon); input.parentElement?.insertBefore(wrapper, input.nextSibling);
}

function enhanceDate(input: HTMLInputElement) {
  if (input.dataset.nativeDatePickerReady === "true") return;
  input.dataset.nativeDatePickerReady = "true";
  // iOS WebKit has a known width-calculation bug for date/time inputs when
  // horizontal padding is applied. Keep padding at zero and center the native
  // date value through the WebKit pseudo-element instead.
  Object.assign(input.style, {
    display: "block", position: "relative", width: "100%", minWidth: "0", maxWidth: "100%",
    height: "52px", minHeight: "52px", maxHeight: "52px", boxSizing: "border-box", opacity: "1",
    pointerEvents: "auto", zIndex: "2", cursor: "pointer", touchAction: "manipulation",
    textAlign: "center", padding: "0", margin: "0", fontSize: "18px", lineHeight: "52px", verticalAlign: "middle",
  });
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
    .custom-time-picker{position:relative;width:100%;max-width:100%;height:52px;min-height:52px;display:flex;align-items:center;justify-content:center;background:rgba(15,12,36,.55);border:1px solid var(--line);border-radius:10px;padding:0 42px 0 10px;box-sizing:border-box;min-width:0;touch-action:manipulation}
    .custom-time-picker:focus-within{outline:2px solid var(--gold);outline-offset:1px}
    .custom-time-picker-controls{display:flex;align-items:center;justify-content:center;flex:0 1 auto;min-width:0;width:auto;gap:0;text-align:center;overflow:visible}
    .custom-time-picker select{appearance:none;-webkit-appearance:none;flex:0 0 auto;width:auto;min-width:0;max-width:none;height:40px;border:0;background:transparent;color:var(--text);font:inherit;font-size:18px;line-height:40px;text-align:center;text-align-last:center;cursor:pointer;outline:none;padding:0 2px;margin:0;box-sizing:border-box;overflow:visible;touch-action:manipulation}
    .custom-time-picker select[aria-label="Hour"]{flex:0 0 32px;min-width:32px;width:32px}
    .custom-time-picker select[aria-label="Minute"]{flex:0 0 34px;min-width:34px;width:34px;padding-left:4px;padding-right:4px}
    .custom-time-picker select[aria-label="AM or PM"]{flex:0 0 46px;min-width:46px;width:46px}
    .custom-time-picker-controls> :nth-child(2){flex:0 0 8px;width:8px;text-align:center;font-size:18px;line-height:40px}
    .custom-time-picker-icon{position:absolute;right:10px;top:50%;transform:translateY(-50%);width:18px;color:var(--gold-soft);font-size:18px;line-height:1;text-align:center;pointer-events:none}
    .custom-time-picker select option{background:#151126;color:#fff}

    input[data-native-date-picker-ready="true"]{display:block!important;position:relative!important;width:100%!important;inline-size:100%!important;min-width:0!important;min-inline-size:0!important;max-width:100%!important;max-inline-size:100%!important;height:52px!important;min-height:52px!important;max-height:52px!important;opacity:1!important;pointer-events:auto!important;z-index:2!important;box-sizing:border-box!important;cursor:pointer!important;touch-action:manipulation!important;text-align:center!important;padding:0!important;margin:0!important;font-size:18px!important;line-height:52px!important;vertical-align:middle!important;}
    input[data-native-date-picker-ready="true"]::-webkit-calendar-picker-indicator{opacity:1!important;display:block!important;cursor:pointer!important;width:22px;height:22px;}
    input[data-native-date-picker-ready="true"]::-webkit-date-and-time-value{text-align:center;min-height:52px;line-height:52px!important;height:52px!important;font-size:18px;display:flex;align-items:center;justify-content:center;}
    input[data-native-date-picker-ready="true"]::-webkit-datetime-edit{text-align:center;padding:0;line-height:52px!important;font-size:18px;vertical-align:middle;}
    input[data-native-date-picker-ready="true"]::-webkit-datetime-edit-fields-wrapper{text-align:center;padding:0;line-height:52px!important;font-size:18px;vertical-align:middle;}

    @media(max-width:860px){
      .ai-form{display:flex!important;flex-direction:column!important;gap:16px!important;width:100%!important;min-width:0!important;max-width:100%!important;overflow:visible!important;}
      .ai-form>.field{width:100%!important;min-width:0!important;max-width:none!important;margin-bottom:0!important;box-sizing:border-box!important;}
      .ai-form>.field:has(#ai-date){overflow:hidden!important;}
      .ai-form>.field:has(#ai-date)>#ai-date{width:100%!important;inline-size:100%!important;min-width:0!important;max-width:100%!important;box-sizing:border-box!important;}
      .ai-form>.birth-time-place-row{display:flex!important;flex-direction:column!important;gap:16px!important;width:100%!important;min-width:0!important;max-width:none!important;margin:0!important;grid-template-columns:none!important;}
      .ai-form>.birth-time-place-row>.field{width:100%!important;min-width:0!important;max-width:none!important;margin-bottom:0!important;box-sizing:border-box!important;}
      .booking-panel form .booking-birth-stacked{display:flex!important;flex-direction:column!important;gap:16px!important;width:100%!important;min-width:0!important;max-width:100%!important;margin:0!important;grid-template-columns:none!important;box-sizing:border-box!important;overflow:visible!important;}
      .booking-panel form .booking-birth-stacked>.field{width:100%!important;min-width:0!important;max-width:100%!important;margin-bottom:0!important;box-sizing:border-box!important;overflow:hidden!important;}
      .booking-panel form .booking-birth-stacked>.field:has(#booking-birth-date){width:100%!important;max-width:100%!important;min-width:0!important;}
      .booking-panel form .booking-birth-stacked>.field:has(#booking-birth-date)>#booking-birth-date{display:block!important;width:100%!important;inline-size:100%!important;min-width:0!important;min-inline-size:0!important;max-width:100%!important;max-inline-size:100%!important;box-sizing:border-box!important;padding:0!important;margin:0!important;}
      .ai-form input,.ai-form select,.ai-form textarea,.ai-form .custom-time-picker,.booking-panel form input,.booking-panel form select,.booking-panel form textarea,.booking-panel form .custom-time-picker{min-width:0!important;box-sizing:border-box!important;}
      .ai-form input[data-native-date-picker-ready="true"],.booking-panel form input[data-native-date-picker-ready="true"]{width:100%!important;inline-size:100%!important;min-width:0!important;min-inline-size:0!important;max-width:100%!important;max-inline-size:100%!important;box-sizing:border-box!important;text-align:center!important;padding:0!important;margin:0!important;font-size:18px!important;line-height:52px!important;}
      .ai-form input[data-native-date-picker-ready="true"]::-webkit-date-and-time-value,.booking-panel form input[data-native-date-picker-ready="true"]::-webkit-date-and-time-value{min-height:52px!important;height:52px!important;line-height:52px!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;}
      .ai-form input[data-native-date-picker-ready="true"]::-webkit-datetime-edit,.booking-panel form input[data-native-date-picker-ready="true"]::-webkit-datetime-edit,.ai-form input[data-native-date-picker-ready="true"]::-webkit-datetime-edit-fields-wrapper,.booking-panel form input[data-native-date-picker-ready="true"]::-webkit-datetime-edit-fields-wrapper{line-height:52px!important;font-size:18px!important;vertical-align:middle!important;text-align:center!important;padding:0!important;}
      .ai-form .custom-time-picker,.booking-panel form .custom-time-picker{align-items:center!important;justify-content:center!important;text-align:center!important;}
      .ai-form .custom-time-picker-controls,.booking-panel form .custom-time-picker-controls{align-items:center!important;justify-content:center!important;text-align:center!important;}
      .ai-form .custom-time-picker select,.booking-panel form .custom-time-picker select{font-size:18px!important;line-height:40px!important;}
      .ai-form .custom-time-picker .custom-time-picker-icon,.booking-panel form .custom-time-picker .custom-time-picker-icon{position:absolute!important;right:10px!important;left:auto!important;top:50%!important;transform:translateY(-50%)!important;margin:0!important;font-size:18px!important;line-height:1!important;}
      .ai-form .field-hint,.booking-panel form .field-hint{display:block!important;margin-top:6px!important;line-height:1.3!important;}
    }
    @media(max-width:480px){
      .custom-time-picker{height:52px;min-height:52px;max-height:52px;padding-left:10px;padding-right:42px}
      .custom-time-picker select{font-size:18px;line-height:40px}
      .custom-time-picker select[aria-label="Hour"]{flex-basis:32px;min-width:32px;width:32px}
      .custom-time-picker select[aria-label="Minute"]{flex-basis:34px;min-width:34px;width:34px;padding-left:4px;padding-right:4px}
      .custom-time-picker select[aria-label="AM or PM"]{flex-basis:46px;min-width:46px;width:46px}
      .custom-time-picker-controls> :nth-child(2){flex-basis:6px;width:6px;font-size:18px;line-height:40px}
      .custom-time-picker-icon{right:10px;width:16px;font-size:18px}
    }
  ` }} />;
}
