async function sendNotificationEmail({ subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.NOTIFY_EMAIL;
  const fromEmail =
    process.env.NOTIFY_FROM_EMAIL ||
    process.env.INTAKE_FROM_EMAIL ||
    "Jolly Mammoth <onboarding@resend.dev>";

  if (!apiKey || !toEmail) {
    console.warn("Email notification not configured — set RESEND_API_KEY and NOTIFY_EMAIL");
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Resend email failed:", response.status, detail);
    return false;
  }

  return true;
}

module.exports = { sendNotificationEmail };
