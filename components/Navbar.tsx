"use client";
import { Language, tr } from "@/lib/i18n";

export default function Navbar({
  language,
  onLanguageChange,
}: {
  language: Language;
  onLanguageChange: (l: Language) => void;
}) {
  const t = tr(language);

  return (
    <header>
      <div className="wrap">
        <nav className="site-nav">
          <div className="brand">
            <em>✦</em> {t.brand}
          </div>

          <div className="nav-actions">
            <select
              aria-label={t.language}
              value={language}
              onChange={(e) => onLanguageChange(e.target.value as Language)}
              className="language-select"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
              <option value="mr">मराठी</option>
            </select>

            <a href="#booking" className="cta">
              {t.book}
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}