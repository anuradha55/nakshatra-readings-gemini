type SendSmsResult = {
  sent: boolean;
  sid?: string;
  error?: string;
};

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  // Booking numbers on this India-focused site may be entered as 10 digits.
  // Keep other country numbers unchanged if they already include a country code.
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.startsWith("91") && digits.length === 12) return `+${digits}`;
  return `+${digits}`;
}

export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.error("TWILIO_SMS_CONFIG_ERROR", {
      hasAccountSid: Boolean(accountSid),
      hasAuthToken: Boolean(authToken),
      hasFrom: Boolean(from),
    });
    return { sent: false, error: "Twilio SMS is not configured." };
  }

  const destination = normalizePhoneNumber(to);
  if (!destination) {
    return { sent: false, error: "Recipient phone number is missing." };
  }

  try {
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const form = new URLSearchParams({
      To: destination,
      From: from,
      Body: body,
    });

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
        cache: "no-store",
      }
    );

    const payload = (await response.json().catch(() => ({}))) as {
      sid?: string;
      message?: string;
      code?: number;
    };

    if (!response.ok) {
      const error = payload.message ?? `Twilio returned HTTP ${response.status}`;
      console.error("TWILIO_SMS_SEND_ERROR", {
        status: response.status,
        code: payload.code ?? null,
        error,
      });
      return { sent: false, error };
    }

    return { sent: true, sid: payload.sid };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Twilio SMS error";
    console.error("TWILIO_SMS_NETWORK_ERROR", message);
    return { sent: false, error: message };
  }
}

export async function sendCustomerBookingSms(booking: {
  id: string;
  name: string;
  phone: string;
  service: string;
  amount: number;
}) {
  const amount = (booking.amount / 100).toFixed(2);
  return sendSms({
    to: booking.phone,
    body:
      `Nakshatra Readings: Hi ${booking.name || "Customer"}, your payment of ₹${amount} has been confirmed. ` +
      `Your ${booking.service} consultation is booked. Booking ID: ${booking.id}. We will contact you shortly to schedule your consultation.`,
  });
}

export async function sendAstrologerBookingSms(booking: {
  id: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  birthDetails?: string | null;
  amount: number;
}) {
  const phone = process.env.ASTROLOGER_PHONE_NUMBER;
  if (!phone) {
    console.error("ASTROLOGER_SMS_CONFIG_ERROR: ASTROLOGER_PHONE_NUMBER is missing");
    return { sent: false, error: "Astrologer phone number is not configured." };
  }

  const amount = (booking.amount / 100).toFixed(2);
  const birth = booking.birthDetails ? ` Birth details: ${booking.birthDetails}.` : "";

  return sendSms({
    to: phone,
    body:
      `Nakshatra Readings: New paid booking. Customer: ${booking.name}. Phone: ${normalizePhoneNumber(booking.phone)}. ` +
      `Email: ${booking.email}. Service: ${booking.service}. Amount: ₹${amount}. Booking ID: ${booking.id}.${birth}`,
  });
}
