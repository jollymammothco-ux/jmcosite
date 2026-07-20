# Jolly Mammoth Website (Revamp)

Static marketing site for Jolly Mammoth Co — matches the bold, section-driven style of [jollymammoth.co](https://jollymammoth.co) with updated positioning:

- **Flagship:** [RapidDashboard](https://rapiddashboard.ai) (prompt → live dashboard)
- **Implementation:** Go Mammoth System (done-for-you growth stack)
- **Add-ons:** AI call agents, Smart CRMs, marketing
- **Creative:** Branding portfolio section

## Funnel

1. Hero → **See RapidDashboard** or **Book a Strategy Call**
2. Pain points → flagship product proof
3. Go Mammoth + add-ons → case studies → 3-step process
4. Contact form routes interest (RapidDashboard demo redirects to rapiddashboard.ai)
5. Discovery intake form (`intake.html`) → Revenue Command Center via Supabase

## Discovery intake (`intake.html`)

Clients fill out the questionnaire at `/intake.html`. Submissions go to `/.netlify/functions/submit-intake`, which:

1. Saves the raw answers to Supabase `jolly_intake`
2. Creates a `discovery_call` deal in the Revenue Command Center
3. Sends you an email via Resend (if configured)

### Intake setup (Netlify env vars)

Use the **same Supabase project** as the Revenue Command Center. See `.env.example` for:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `INTAKE_OWNER_USER_ID`
- `RESEND_API_KEY`, `NOTIFY_EMAIL`
- Optional: `INTAKE_FROM_EMAIL` (custom from address after domain verification)

Run the SQL migration in the Command Center repo first: `supabase/migrations/002_intake.sql`.

Test the function logic locally:

```bash
node netlify/functions/submit-intake.test.js
```

Local testing with Netlify CLI:

```bash
npm i -g netlify-cli
cp .env.example .env   # add Supabase + Resend values
netlify dev
```

## Run locally

```bash
cd /Users/jackfentress/projects/jollymammoth-website
python3 -m http.server 8080
```

Open http://localhost:8080

## CRM integration (Go High Level)

The contact form posts to a Netlify serverless function, which forwards leads to a **Go High Level** inbound webhook. GHL is the recommended CRM here: it matches the Go Mammoth stack (pipelines, SMS/email automations, calendars, unified inbox, AI workflows) and is what you already white-label for clients.

### Setup

1. In Go High Level, create a workflow: **Triggers → Inbound Webhook**.
2. Map incoming fields: `name`, `email`, `company`, `interest`, `interest_label`, `message`, `source`, `page_url`.
3. Add automations in the same workflow (tag by `interest`, assign pipeline stage, send confirmation SMS/email, notify Slack, etc.).
4. Copy the webhook URL into Netlify: **Site settings → Environment variables → `GHL_WEBHOOK_URL`**.
5. Deploy to Netlify (the repo includes `netlify.toml`).

Local testing with Netlify CLI:

```bash
npm i -g netlify-cli
cp .env.example .env   # add your webhook URL
netlify dev
```

### Why GHL over HubSpot / Salesforce?

| | Go High Level | HubSpot | Salesforce |
|---|---|---|---|
| Best for | Service businesses, done-for-you growth stacks | Inbound marketing & content funnels | Enterprise sales orgs |
| Automations | Workflows, SMS, email, calls, AI agents | Sequences, workflows (strong marketing) | Flow Builder (powerful, complex) |
| Unified comms | Native SMS, email, calls, social DMs | Add-ons / integrations | Requires extra tools |
| Fit for Jolly Mammoth | **Primary** — powers Go Mammoth installs | Good if you want heavy content/SEO CRM | Overkill for a consultancy site |

## Next steps

- [ ] Replace hero image with your own photography
- [x] Wire contact form to Go High Level (add `GHL_WEBHOOK_URL` in Netlify)
- [ ] Add real project detail pages
- [ ] Deploy to Netlify
