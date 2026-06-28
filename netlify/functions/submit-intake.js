const SUPABASE_HEADERS = (serviceKey) => ({
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
});

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ownerUserId = process.env.INTAKE_OWNER_USER_ID;

  if (!supabaseUrl || !serviceKey || !ownerUserId) {
    console.error("Supabase intake env vars are not fully configured");
    return json(500, { error: "Intake capture is not configured yet." });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid request body." });
  }

  if (clean(payload.company_url_confirm)) {
    return json(200, { ok: true });
  }

  const intake = parseIntakePayload(payload);
  const validationError = validateIntake(intake);
  if (validationError) {
    return json(400, { error: validationError });
  }

  try {
    const intakeRow = await supabaseInsert(
      supabaseUrl,
      serviceKey,
      "jolly_intake",
      {
        contact_name: intake.contact_name,
        contact_email: intake.contact_email,
        contact_phone: intake.contact_phone || null,
        business_name: intake.business_name,
        website: intake.website || null,
        what_you_do: intake.what_you_do || null,
        size: intake.size || null,
        normal_week: intake.normal_week || null,
        wish_report: intake.wish_report || null,
        by_hand: intake.by_hand || null,
        frustration: intake.frustration || null,
        ai_workflow_benefit: intake.ai_workflow_benefit || null,
        six_months: intake.six_months || null,
        tools: intake.tools || null,
        access: intake.access || null,
        off_limits: intake.off_limits || null,
        page_url: intake.page_url || null,
        source: "jolly-intake",
      }
    );

    const dealPayload = mapIntakeToDeal(intake, ownerUserId, intakeRow.id);
    const dealRow = await supabaseInsert(supabaseUrl, serviceKey, "deals", dealPayload);

    await supabasePatch(supabaseUrl, serviceKey, "jolly_intake", intakeRow.id, {
      deal_id: dealRow.id,
    });

    await sendIntakeEmail(intake, dealRow.id);

    return json(200, { ok: true, deal_id: dealRow.id });
  } catch (error) {
    console.error("Intake submission error:", error);
    return json(502, { error: "Could not save your request. Please try again." });
  }
};

function parseIntakePayload(payload) {
  return {
    contact_name: clean(payload.contact_name),
    contact_email: clean(payload.contact_email),
    contact_phone: clean(payload.contact_phone),
    business_name: clean(payload.business_name),
    website: clean(payload.website),
    what_you_do: clean(payload.what_you_do),
    size: clean(payload.size),
    normal_week: clean(payload.normal_week),
    wish_report: clean(payload.wish_report),
    by_hand: clean(payload.by_hand),
    frustration: clean(payload.frustration),
    ai_workflow_benefit: clean(payload.ai_workflow_benefit),
    six_months: clean(payload.six_months),
    tools: clean(payload.tools),
    access: clean(payload.access),
    off_limits: clean(payload.off_limits),
    page_url: clean(payload.page_url),
  };
}

function validateIntake(intake) {
  if (!intake.contact_name) return "Your name is required.";
  if (!intake.contact_email) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(intake.contact_email)) {
    return "Please enter a valid email address.";
  }
  if (!intake.business_name) return "Business name is required.";

  const hasDiscovery =
    intake.normal_week ||
    intake.wish_report ||
    intake.by_hand ||
    intake.frustration ||
    intake.ai_workflow_benefit ||
    intake.six_months;

  if (!hasDiscovery) {
    return "Please answer at least one question about how your business runs.";
  }

  return null;
}

function mapIntakeToDeal(intake, userId, intakeId) {
  const today = new Date().toISOString().slice(0, 10);

  const painSections = [];
  if (intake.frustration) painSections.push(`**Biggest frustration**\n${intake.frustration}`);
  if (intake.normal_week) painSections.push(`**Normal week**\n${intake.normal_week}`);
  if (intake.by_hand) painSections.push(`**Should be automatic**\n${intake.by_hand}`);

  const goalSections = [];
  if (intake.six_months) goalSections.push(`**Six months out**\n${intake.six_months}`);
  if (intake.wish_report) goalSections.push(`**Wish report**\n${intake.wish_report}`);
  if (intake.ai_workflow_benefit) {
    goalSections.push(`**Where AI could help**\n${intake.ai_workflow_benefit}`);
  }

  const researchParts = [];
  if (intake.what_you_do) researchParts.push(`What they do: ${intake.what_you_do}`);
  if (intake.website) researchParts.push(`Website: ${intake.website}`);
  if (intake.size) researchParts.push(`Team size: ${intake.size}`);

  const workflowParts = [];
  if (intake.tools) workflowParts.push(`Tools: ${intake.tools}`);
  if (intake.access) workflowParts.push(`Admin access: ${intake.access}`);

  return {
    user_id: userId,
    company_name: intake.business_name,
    contact_name: intake.contact_name,
    contact_email: intake.contact_email,
    contact_phone: intake.contact_phone || null,
    stage: "demo_requested",
    lead_source: "site_form",
    mrr_cents: 0,
    discovery_pain_point: painSections.join("\n\n") || null,
    discovery_workflows: workflowParts.join("\n") || null,
    discovery_goals: goalSections.join("\n\n") || null,
    research_notes: researchParts.join("\n") || null,
    next_action_notes: intake.off_limits ? `Off limits: ${intake.off_limits}` : null,
    last_contact_date: today,
    intake_id: intakeId,
  };
}

async function supabaseInsert(url, serviceKey, table, row) {
  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      ...SUPABASE_HEADERS(serviceKey),
      Prefer: "return=representation",
    },
    body: JSON.stringify(row),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase insert into ${table} failed: ${response.status} ${detail}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data[0] : data;
}

async function supabasePatch(url, serviceKey, table, id, updates) {
  const response = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      ...SUPABASE_HEADERS(serviceKey),
      Prefer: "return=minimal",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase patch on ${table} failed: ${response.status} ${detail}`);
  }
}

async function sendIntakeEmail(intake, dealId) {
  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.NOTIFY_EMAIL;
  const fromEmail = process.env.INTAKE_FROM_EMAIL || "Jolly Mammoth <onboarding@resend.dev>";

  if (!apiKey || !toEmail) {
    console.warn("Email notification not configured — set RESEND_API_KEY and NOTIFY_EMAIL");
    return;
  }

  const subject = `New demo intake: ${intake.business_name}`;
  const text = [
    `New discovery intake submitted.`,
    ``,
    `Business: ${intake.business_name}`,
    `Contact: ${intake.contact_name}`,
    `Email: ${intake.contact_email}`,
    intake.contact_phone ? `Phone: ${intake.contact_phone}` : null,
    intake.frustration ? `Frustration: ${intake.frustration}` : null,
    intake.ai_workflow_benefit ? `Where AI could help: ${intake.ai_workflow_benefit}` : null,
    ``,
    `Deal ID: ${dealId}`,
    `Open your Revenue Command Center to review the full intake.`,
  ]
    .filter(Boolean)
    .join("\n");

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
  }
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

exports.parseIntakePayload = parseIntakePayload;
exports.validateIntake = validateIntake;
exports.mapIntakeToDeal = mapIntakeToDeal;
