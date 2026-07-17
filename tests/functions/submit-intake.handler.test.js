const assert = require("assert");

const originalFetch = global.fetch;
const calls = [];

global.fetch = async (url, options = {}) => {
  calls.push({ url, options });

  if (url.includes("/rest/v1/jolly_intake") && options.method === "POST") {
    return {
      ok: true,
      json: async () => [{ id: "intake-123", created_at: "2026-06-25T12:00:00Z" }],
    };
  }

  if (url.includes("/rest/v1/deals") && options.method === "POST") {
    return {
      ok: true,
      json: async () => [{ id: "deal-456" }],
    };
  }

  if (url.includes("/rest/v1/jolly_intake") && options.method === "PATCH") {
    return { ok: true };
  }

  if (url.includes("api.resend.com")) {
    return { ok: true, text: async () => "" };
  }

  throw new Error(`Unexpected fetch: ${url}`);
};

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
process.env.INTAKE_OWNER_USER_ID = "user-789";
process.env.RESEND_API_KEY = "re_test";
process.env.NOTIFY_EMAIL = "jack@jollymammoth.co";

const { handler } = require("../../netlify/functions/submit-intake");

(async () => {
  const response = await handler({
    httpMethod: "POST",
    body: JSON.stringify({
      contact_name: "Jane Doe",
      contact_email: "jane@example.com",
      business_name: "Acme Roofing",
      normal_week: "Chasing paperwork and scheduling crews",
      six_months: "Get Saturdays back",
      frustration: "Paperwork",
      page_url: "https://jollymammoth.co/intake.html",
    }),
  });

  assert.strictEqual(response.statusCode, 200);
  const body = JSON.parse(response.body);
  assert.strictEqual(body.ok, true);
  assert.strictEqual(body.deal_id, "deal-456");

  const intakeInsert = calls.find((c) => c.url.endsWith("/jolly_intake") && c.options.method === "POST");
  const dealInsert = calls.find((c) => c.url.endsWith("/deals") && c.options.method === "POST");
  const emailCall = calls.find((c) => c.url.includes("api.resend.com"));

  assert.ok(intakeInsert);
  assert.ok(dealInsert);
  assert.ok(emailCall);

  const dealPayload = JSON.parse(dealInsert.options.body);
  assert.strictEqual(dealPayload.stage, "discovery_call");
  assert.strictEqual(dealPayload.user_id, "user-789");
  assert.strictEqual(dealPayload.intake_id, "intake-123");

  console.log("submit-intake handler integration test passed");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    global.fetch = originalFetch;
  });
