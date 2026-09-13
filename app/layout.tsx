import type { Metadata } from "next";
import "./globals.css";
import "./ai-mobile-layout.css";
import "./ai-mobile-refinement.css";
import "./services.css";
import "./ai-detail-button.css";
import TimePickerEnhancer from "@/components/TimePickerEnhancer";

export const metadata: Metadata = {
  title: "Nakshatra Readings — Personal Astrology Consultations",
  description:
    "One-on-one Vedic astrology consultations on career, relationships and timing.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="hi">
      <body>
        {children}
        <TimePickerEnhancer />
      </body>
    </html>
  );
}
