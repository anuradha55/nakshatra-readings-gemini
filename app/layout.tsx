import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nakshatra Readings — Personal Astrology Consultations",
  description:
    "One-on-one Vedic astrology consultations on career, relationships and timing.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}