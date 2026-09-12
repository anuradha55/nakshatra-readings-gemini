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

  // The native <input type="date"> itself must receive the mobile gesture.
  // A synthetic wrapper calling showPicker()/click() is unreliable on mobile
  // browsers because the browser may reject it as not being the gesture target.
  input.style.position = "absolute";
  input.style.left = "0";
  input.style.top = "0";
  input.style.width = "100%";
  input.style.height = "52px";
  input.style.minHeight = "52px";
  input.style.maxHeight = "52px";
  input.style.opacity = "0";
  input.style.pointerEvents = "auto";
  input.style.cursor = "pointer";
  input.style.zIndex = "4";
  input.style.padding = "0";
  input.style.margin = "0";
  input.style.border = "0";
  input.style.boxSizing = "border-box";
  input.style.touchAction = "manipulation";

  const wrapper = document.createElement("div");
  wrapper.className = "custom-date-picker";
  wrapper.setAttribute("data-for", input.id);
  wrapper.style.pointerEvents = "none";
  wrapper.style.zIndex = "1";

  const display = document.createElement("span");
  display.className = "custom-date-picker-value";

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
      .custom-date-picker{position:absolute;left:0;top:0;width:100%;max-width:100%;height:52px;min-height:52px;max-height:52px;display:flex;align-items:center;justify-content:space-between;gap:8px;background:rgba(15,12,36,.55);border:1px solid var(--line);border-radius:10px;padding:0 12px;box-sizing:border-box;overflow:hidden;color:var(--text);z-index:1;text-align:left;touch-action:none;user-select:none}
      .custom-date-picker-value{min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-dim);font-family:'Work Sans',sans-serif;font-size:.92rem;text-align:left}
      .custom-date-picker.has-value .custom-date-picker-value{color:var(--text)}
      .custom-date-picker-icon{flex:0 0 auto;color:var(--gold-soft);font-size:.9rem;pointer-events:none}
      input[data-custom-date-picker="true"]{position:absolute!important;left:0!important;top:0!important;width:100%!important;height:52px!important;min-height:52px!important;max-height:52px!important;padding:0!important;margin:0!important;opacity:0!important;border:0!important;background:transparent!important;cursor:pointer!important;z-index:4!important;pointer-events:auto!important;box-sizing:border-box!important;touch-action:manipulation!important}
      @media(max-width:640px){
        .custom-date-picker{height:52px;min-height:52px;max-height:52px;padding:0 10px}
        .custom-date-picker-value{font-size:.84rem}
      }
      @media(max-width:480px){
        .custom-date-picker{height:52px;min-height:52px;max-height:52px;padding:0 10px}
      }
    ` }} />
  );
}
