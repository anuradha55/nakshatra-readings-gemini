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
            <div className="language-picker">
              <span className="language-icon" aria-hidden="true">文</span>
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
            </div>

            <a href="#booking" className="cta">
              {t.book}
            </a>
          </div>
        </nav>
      </div>
      <style jsx global>{`
        .language-picker {
          position: relative;
          display: inline-flex;
          align-items: center;
          height: 38px;
          min-width: 118px;
          padding: 0 10px;
          border: 1px solid rgba(205,164,99,.45);
          border-radius: 999px;
          background: rgba(15,12,36,.55);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,.02), 0 6px 18px rgba(0,0,0,.12);
          transition: border-color .2s, background .2s, box-shadow .2s;
        }
        .language-picker:hover {
          border-color: rgba(205,164,99,.75);
          background: rgba(33,26,85,.8);
        }
        .language-picker:focus-within {
          border-color: var(--gold);
          box-shadow: 0 0 0 2px rgba(205,164,99,.16);
        }
        .language-icon {
          flex: 0 0 auto;
          color: var(--gold);
          font-size: .9rem;
          line-height: 1;
          margin-right: 6px;
          pointer-events: none;
        }
        .language-select {
          appearance: none;
          -webkit-appearance: none;
          width: 100%;
          min-width: 0;
          height: 100%;
          padding: 0 18px 0 0;
          margin: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--gold-soft);
          font-family: 'Work Sans', sans-serif;
          font-size: .8rem;
          font-weight: 500;
          letter-spacing: .02em;
          cursor: pointer;
        }
        .language-picker::after {
          content: '⌄';
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-55%);
          color: var(--gold);
          font-size: .9rem;
          pointer-events: none;
        }
        .language-select option {
          background: #171238;
          color: #F3EFE6;
          font-family: 'Work Sans', sans-serif;
        }
        @media (max-width: 860px) {
          .language-picker {
            min-width: 92px;
            width: 92px;
            height: 36px;
            padding: 0 8px;
          }
          .language-icon { font-size: .82rem; margin-right: 5px; }
          .language-select { font-size: .72rem; padding-right: 15px; }
          .language-picker::after { right: 8px; font-size: .8rem; }
        }
        @media (max-width: 480px) {
          .language-picker { min-width: 88px; width: 88px; }
        }
      `}</style>
    </header>
  );
}
