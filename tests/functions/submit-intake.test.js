const assert = require("assert");
const {
  parseIntakePayload,
  validateIntake,
  mapIntakeToDeal,
} = require("../../netlify/functions/submit-intake");

const sample = {
  contact_name: "Jane Doe",
  contact_email: "jane@example.com",
  contact_phone: "555-0100",
  business_name: "Acme Roofing",
  website: "acmeroofing.com",
  what_you_do: "Commercial roofing",
  size: "Small crew",
  normal_week: "Chasing invoices",
  wish_report: "Profitable crews",
  by_hand: "Copying between apps",
  frustration: "Too much paperwork",
  ai_workflow_benefit: "AI could automate job scheduling from our inbox",
  six_months: "Get Saturdays back",
  tools: "QuickBooks",
  access: "Yes",
  off_limits: "Employee SSNs",
  page_url: "https://jollymammoth.co/intake.html",
};

const intake = parseIntakePayload(sample);
assert.strictEqual(validateIntake(intake), null);

const deal = mapIntakeToDeal(intake, "00000000-0000-0000-0000-000000000001", "intake-uuid");
assert.strictEqual(deal.company_name, "Acme Roofing");
assert.strictEqual(deal.stage, "demo_requested");
assert.strictEqual(deal.lead_source, "site_form");
assert.strictEqual(deal.intake_id, "intake-uuid");
assert.ok(deal.discovery_pain_point.includes("Too much paperwork"));
assert.ok(deal.discovery_goals.includes("Get Saturdays back"));
assert.ok(deal.discovery_goals.includes("Where AI could help"));
assert.ok(deal.research_notes.includes("Commercial roofing"));
assert.ok(deal.next_action_notes.includes("Employee SSNs"));
assert.ok(deal.next_action_notes.includes("Security & privacy"));

assert.strictEqual(validateIntake(parseIntakePayload({ ...sample, contact_email: "" })), "Email is required.");
assert.strictEqual(
  validateIntake(parseIntakePayload({ ...sample, normal_week: "" })),
  "Please walk us through a normal week — what eats the most time?"
);
assert.strictEqual(
  validateIntake(parseIntakePayload({ ...sample, six_months: "" })),
  "Please tell us what success would look like in six months."
);

console.log("submit-intake tests passed");
