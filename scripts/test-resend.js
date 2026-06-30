#!/usr/bin/env node
/**
 * One-off test: verify Resend is configured.
 * Usage:
 *   RESEND_API_KEY=re_your_key NOTIFY_EMAIL=you@example.com node scripts/test-resend.js
 *
 * Do NOT commit your API key. Use env vars only.
 */

const apiKey = process.env.RESEND_API_KEY;
const toEmail = process.env.NOTIFY_EMAIL || "jollymammothco@gmail.com";
const fromEmail = process.env.INTAKE_FROM_EMAIL || "onboarding@resend.dev";

if (!apiKey || apiKey === "re_xxxxxxxxx") {
  console.error("Set RESEND_API_KEY to your real key (from resend.com → API Keys).");
  process.exit(1);
}

async function main() {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: "Jolly Mammoth — Resend test",
      html: "<p>Congrats — Resend is working. Intake notifications are ready.</p>",
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    console.error("Failed:", response.status, body);
    process.exit(1);
  }

  console.log("Email sent to", toEmail);
  console.log(body);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
