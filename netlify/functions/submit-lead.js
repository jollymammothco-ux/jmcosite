const { sendNotificationEmail } = require("./lib/resend-notify");

const INTEREST_LABELS = {
  rapiddashboard: "RapidDashboard",
  "go-mammoth": "Go Mammoth System",
  "call-agent": "AI call agent",
  "smart-crm": "Smart CRM",
  marketing: "Marketing & lead gen",
  branding: "Branding & creative",
  other: "Not sure yet",
};

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const webhookUrl = process.env.GHL_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error("GHL_WEBHOOK_URL is not configured");
    return json(500, { error: "Lead capture is not configured yet." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid request body." });
  }

  if (payload.website) {
    return json(200, { ok: true });
  }

  const name = clean(payload.name);
  const email = clean(payload.email);
  const company = clean(payload.company);
  const interest = clean(payload.interest);
  const message = clean(payload.message);

  if (!name || !email || !interest) {
    return json(400, { error: "Name, email, and interest are required." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "Please enter a valid email address." });
  }

  const lead = {
    name,
    email,
    company,
    interest,
    interest_label: INTEREST_LABELS[interest] || interest,
    message,
    source: "jollymammoth-website",
    page_url: clean(payload.page_url),
    submitted_at: new Date().toISOString(),
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("CRM webhook failed:", response.status, detail);
      return json(502, { error: "Could not save your request. Please try again." });
    }

    await sendLeadEmail(lead);

    return json(200, { ok: true });
  } catch (error) {
    console.error("CRM webhook error:", error);
    return json(502, { error: "Could not save your request. Please try again." });
  }
};

async function sendLeadEmail(lead) {
  const lines = [
    "New contact form submission.",
    "",
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    lead.company ? `Company: ${lead.company}` : null,
    `Interest: ${lead.interest_label}`,
    lead.message ? `Message:\n${lead.message}` : null,
    lead.page_url ? `Page: ${lead.page_url}` : null,
    `Submitted: ${lead.submitted_at}`,
  ].filter(Boolean);

  await sendNotificationEmail({
    subject: `New website lead: ${lead.name}`,
    text: lines.join("\n"),
  });
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
