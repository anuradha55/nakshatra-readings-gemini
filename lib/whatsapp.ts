export type WhatsAppTemplateParameter = string | number;

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

function templateParameter(value: WhatsAppTemplateParameter) {
  return { type: "text", text: String(value) };
}

export async function sendWhatsAppTemplate(input: {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParameters?: WhatsAppTemplateParameter[];
}) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const apiVersion = process.env.WHATSAPP_GRAPH_API_VERSION;

  if (!accessToken || !phoneNumberId || !apiVersion) {
    console.error("WHATSAPP_CONFIG_ERROR", {
      hasAccessToken: Boolean(accessToken),
      hasPhoneNumberId: Boolean(phoneNumberId),
      hasApiVersion: Boolean(apiVersion),
    });
    return { sent: false, error: "WhatsApp service is not configured." };
  }

  const to = normalizePhone(input.to);
  if (to.length < 8 || to.length > 15) {
    return { sent: false, error: "Invalid WhatsApp phone number." };
  }

  const bodyParameters = input.bodyParameters ?? [];
  const response = await fetch(
    `https://graph.facebook.com/${encodeURIComponent(apiVersion)}/${encodeURIComponent(phoneNumberId)}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: input.templateName,
          language: { code: input.languageCode ?? process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en" },
          ...(bodyParameters.length
            ? {
                components: [
                  {
                    type: "body",
                    parameters: bodyParameters.map(templateParameter),
                  },
                ],
              }
            : {}),
        },
      }),
    }
  );

  if (!response.ok) {
    const details = await response.text();
    console.error("WHATSAPP_SEND_ERROR", response.status, details);
    return { sent: false, error: "WhatsApp message could not be sent." };
  }

  const data = await response.json().catch(() => ({}));
  return {
    sent: true,
    messageId: data?.messages?.[0]?.id ?? null,
  };
}
