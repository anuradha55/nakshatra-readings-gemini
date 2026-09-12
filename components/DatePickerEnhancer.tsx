"use client";

import { useEffect } from "react";

const IDS = ["ai-date", "booking-birth-date"];

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Select a date";
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}

function enhance(input: HTMLInputElement) {
  if (input.dataset.customDatePicker === "true") return;
  input.dataset.customDatePicker = "true";

  const wrapper = document.createElement("div");
  wrapper.className = "custom-date-picker";
  wrapper.setAttribute("data-for", input.id);

  const display = document.createElement("span");
  display.className = "custom-date-picker-value";
  display.textContent = formatDate(input.value);

  const icon = document.createElement("span");
  icon.className = "custom-date-picker-icon";
  icon.textContent = "▣";
  icon.setAttribute("aria-hidden", "true");

  wrapper.append(display, icon);
  input.parentElement?.insertBefore(wrapper, input.nextSibling);

  const update = () => {
    display.textContent = formatDate(input.value);
    wrapper.classList.toggle("has-value", Boolean(input.value));
  };

  const openPicker = () => {
    try {
      if (typeof input.showPicker === "function") input.showPicker();
      else input.click();
    } catch {
      input.click();
    }
  };

  wrapper.addEventListener("click", openPicker);
  input.addEventListener("change", update);
  input.addEventListener("input", update);
  update();
}

export default function DatePickerEnhancer() {
  useEffect(() => {
    const apply = () => IDS.forEach((id) => {
      const input = document.getElementById(id) as HTMLInputElement | null;
      if (input) enhance(input);
    });
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <style dangerouslySetInnerHTML={{ __html: `
      .custom-date-picker{position:relative;width:100%;max-width:100%;height:46px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(15,12,36,.55);border:1px solid var(--line);border-radius:10px;padding:0 12px;box-sizing:border-box;overflow:hidden;color:var(--text);cursor:pointer}
      .custom-date-picker-value{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-dim);font-family:'Work Sans',sans-serif;font-size:.92rem}
      .custom-date-picker.has-value .custom-date-picker-value{color:var(--text)}
      .custom-date-picker-icon{flex:0 0 auto;color:var(--gold-soft);font-size:.9rem;pointer-events:none}
      .custom-date-picker:focus-within{outline:2px solid var(--gold);outline-offset:1px}
      .custom-date-picker + input[type="date"]{position:absolute!important;inset:auto!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important;opacity:0!important}
      @media(max-width:640px){.custom-date-picker{height:46px;padding:0 10px}.custom-date-picker-value{font-size:.84rem}.custom-date-picker-icon{font-size:.85rem}}
    ` }} />
  );
}
