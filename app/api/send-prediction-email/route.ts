import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function clean(value: unknown, max = 2000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function predictionToHtml(markdown: string) {
  const escaped = escapeHtml(markdown).replace(/\r\n/g, "\n");
  const lines = escaped.split("\n");
  const html: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^#{1,6}\s+/.test(line)) {
      const text = line.replace(/^#{1,6}\s+/, "").replace(/\*\*(.*?)\*\*/g, "$1");
      html.push(`<h2 style="color:#CDA463;margin:22px 0 8px;font-size:20px;">${text}</h2>`);
      continue;
    }
    if (/^[-*+]\s+/.test(line)) {
      const text = line.replace(/^[-*+]\s+/, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      html.push(`<li style="margin:6px 0;">${text}</li>`);
      continue;
    }
    if (/^\d+[.)]\s+/.test(line)) {
      const text = line.replace(/^\d+[.)]\s+/, "").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      html.push(`<p style="margin:8px 0;">${text}</p>`);
      continue;
    }
    const text = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>");
    html.push(`<p style="margin:10px 0;line-height:1.65;">${text}</p>`);
  }

  return html.join("");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = clean(body.email, 200).toLowerCase();
    const name = clean(body.name, 100) || "there";
    const answer = clean(body.answer, 20000);

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!answer) {
      return NextResponse.json({ error: "The AI prediction is empty." }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM_EMAIL;
    if (!apiKey || !from) {
      console.error("PREDICTION_EMAIL_CONFIG_ERROR: RESEND_API_KEY or RESEND_FROM_EMAIL is missing");
      return NextResponse.json({ success: false, error: "Email service is not configured yet." }, { status: 503 });
    }

    const html = `<!doctype html><html><body style="margin:0;background:#0F0C24;color:#F3EFE6;font-family:Arial,sans-serif;padding:30px;"><div style="max-width:720px;margin:auto;background:#191345;border:1px solid rgba(205,164,99,.35);border-radius:16px;padding:28px;"><h1 style="color:#E7D3A6;margin:0 0 8px;">Your Nakshatra AI Astrology Reading</h1><p style="color:#B9B3D6;margin:0 0 22px;">Hello ${escapeHtml(name)}, here is your AI-generated astrology prediction.</p>${predictionToHtml(answer)}<hr style="border:0;border-top:1px solid rgba(243,239,230,.14);margin:28px 0;"><p style="font-size:12px;color:#8f89a8;">AI-generated astrology guidance is for personal reflection and is not a scientific prediction or a guarantee of future events.</p></div></body></html>`;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your Nakshatra AI Astrology Reading",
        html,
        text: answer,
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error("PREDICTION_EMAIL_SEND_ERROR", response.status, details);
      return NextResponse.json({ success: false, error: "The prediction was generated, but the email could not be sent." }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PREDICTION_EMAIL_ERROR", error);
    return NextResponse.json({ success: false, error: "The prediction was generated, but the email could not be sent." }, { status: 500 });
  }
}
