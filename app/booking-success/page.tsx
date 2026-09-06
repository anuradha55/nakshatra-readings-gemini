"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type Confirmation = {
  booking: {
    id: string;
    name: string;
    service: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  };
  astrologer: {
    name: string;
    phone: string;
  };
};

function formatBookingDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function BookingSuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking");
  const [data, setData] = useState<Confirmation | null>(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState<"pdf" | "png" | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = searchParams.get("booking");
    if (!id) {
      setError("Booking reference is missing.");
      return;
    }

    fetch("/api/bookings/" + encodeURIComponent(id))
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || "Unable to load booking.");
        setData(body);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Unable to load booking.")
      );
  }, [searchParams]);

  const getReceiptCanvas = async () => {
    if (!receiptRef.current) throw new Error("Booking receipt is not ready yet.");

    const html2canvas = (await import("html2canvas")).default;
    return html2canvas(receiptRef.current, {
      scale: 2,
      backgroundColor: "#0d0b1f",
      useCORS: true,
      logging: false,
    });
  };

  const downloadPng = async () => {
    if (!data) return;
    setDownloading("png");

    try {
      const canvas = await getReceiptCanvas();
      const link = document.createElement("a");
      link.download = "nakshatra-readings-booking-" + data.booking.id + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (downloadError) {
      console.error("PNG_DOWNLOAD_ERROR", downloadError);
      alert("Unable to download the booking PNG. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  const downloadPdf = async () => {
    if (!data) return;
    setDownloading("pdf");

    try {
      const [canvas, jsPdfModule] = await Promise.all([
        getReceiptCanvas(),
        import("jspdf"),
      ]);

      const { jsPDF } = jsPdfModule;
      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;

      if (imageHeight <= pageHeight - margin * 2) {
        pdf.addImage(imageData, "PNG", margin, margin, imageWidth, imageHeight);
      } else {
        let remainingHeight = imageHeight;
        let position = margin;
        pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
        remainingHeight -= pageHeight - margin * 2;

        while (remainingHeight > 0) {
          pdf.addPage();
          position = margin - (imageHeight - remainingHeight);
          pdf.addImage(imageData, "PNG", margin, position, imageWidth, imageHeight);
          remainingHeight -= pageHeight - margin * 2;
        }
      }

      pdf.save("nakshatra-readings-booking-" + data.booking.id + ".pdf");
    } catch (downloadError) {
      console.error("PDF_DOWNLOAD_ERROR", downloadError);
      alert("Unable to download the booking PDF. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  if (error) {
    return (
      <main className="confirmation-page">
        <div className="confirmation-card">
          <h1>Booking confirmation unavailable</h1>
          <p>{error}</p>
          <a className="btn-primary" href="/">Back to home</a>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="confirmation-page">
        <div className="confirmation-card">
          <p>Loading your secure booking confirmation…</p>
        </div>
      </main>
    );
  }

  const bookingDateTime = formatBookingDate(data.booking.createdAt);

  return (
    <main className="confirmation-page">
      <div className="confirmation-card">
        <div ref={receiptRef} className="booking-receipt">
          <div className="confirmation-icon">✓</div>
          <p className="confirmation-eyebrow">PAYMENT SUCCESSFUL</p>
          <h1>Your booking is confirmed</h1>
          <p className="confirmation-intro">
            Thank you, {data.booking.name}. Your payment has been verified successfully.
          </p>

          <div className="confirmation-details">
            <div>
              <span>Booking reference</span>
              <strong>{data.booking.id}</strong>
            </div>
            <div>
              <span>Booking date & time</span>
              <strong>{bookingDateTime} IST</strong>
            </div>
            <div>
              <span>Service</span>
              <strong>{data.booking.service}</strong>
            </div>
            <div>
              <span>Amount paid</span>
              <strong>₹{data.booking.amount.toFixed(2)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong className="confirmed">Confirmed</strong>
            </div>
          </div>

          <div className="share-instruction">
            <p className="confirmation-eyebrow">NEXT STEP</p>
            <h2>Share your booking confirmation with the astrologer</h2>
            <p>
              Download this confirmation as a PDF or PNG and share it with the astrologer
              through WhatsApp or any other convenient method.
            </p>
          </div>

          <p className="confirmation-note">
            Please keep your booking reference and booking date & time for your records.
          </p>
        </div>

        <div className="download-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={downloadPdf}
            disabled={downloading !== null}
          >
            {downloading === "pdf" ? "Preparing PDF…" : "Download PDF"}
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={downloadPng}
            disabled={downloading !== null}
          >
            {downloading === "png" ? "Preparing PNG…" : "Download PNG"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="confirmation-page">
          <div className="confirmation-card">
            <p>Loading your secure booking confirmation…</p>
          </div>
        </main>
      }
    >
      <BookingSuccessContent />
    </Suspense>
  );
}
