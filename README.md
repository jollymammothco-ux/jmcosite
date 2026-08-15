# Jolly Mammoth Website

Static marketing site for Jolly Mammoth Co. Dark-only by design, built around a
hi-vis orange and deep slate system. Positioning is advisory-first: a consultancy
that advises and builds, not a software vendor.

- **Go Mammoth** — lead and revenue generation (a lane, not a product page)
- **MammothIQ / RapidDashboard** — job costing, crew hours, and ops intelligence
- **Creative** — brand work, folded into the Work section

## Adding a client case study

**Through the CMS (no code):** go to `/admin`, sign in, open *Case studies*, and
add an entry. Saving commits to git, Netlify rebuilds, and the new page appears at
`/work/<slug>.html` along with a card on the Work index and an entry in the sitemap.

Setup, one time: in Netlify, enable **Identity** (set registration to *Invite only*)
and **Git Gateway** under Site settings → Identity, then invite your own email.

The home page is editable the same way, under **Home page**. Every word on it
lives in `content/landing.json`; the sections, layout and animations do not, and
are not editable from the CMS on purpose.

**By hand:** edit `content/landing.json` or `content/projects.json` and run:

```bash
node scripts/build.js
```

That regenerates `index.html`, `projects.html`, `creative.html`, every page under
`work/`, and `sitemap.xml`.

**Never edit those files directly.** They are build output and are overwritten on
every build and every deploy, so hand edits disappear without warning. Copy goes
in `content/*.json`; structure goes in `scripts/build-*.js`. `index.html` carries
a comment at the top saying so.

Two authoring marks work in any headline field in `landing.json`:
`[[like this]]` paints the yellow accent run, and `{{jolly}}` drops in the
rainbow wordmark.

## Architecture

| Path | What it is |
|---|---|
| `content/landing.json` | Every word on the home page |
| `content/projects.json` | The single source of truth for case studies |
| `scripts/build.js` | The build. Runs both builders below |
| `scripts/build-landing.js` | Generates `index.html` |
| `scripts/build-projects.js` | Generates `work/*.html`, `projects.html`, `creative.html`, `sitemap.xml` |
| `scripts/partials.js` | Shared by both: asset versions, escaping, nav, card helpers |
| `admin/` | Decap CMS. Noindexed and disallowed in robots.txt |
| `boot.js` | Runs in `<head>`. Flags JS so scroll reveals can never blank the page |
| `mammoth.js` | The hero particle herd, sampled from the brand mark's alpha channel |
| `main.js` | Nav, scroll reveals, staggered lists, work-card hover clips |
| `_source-media/` | Original camera and phone uploads. Gitignored, not deployed |

Cache-busting lives in one place: bump `CSS_V` / `JS_V` in `scripts/partials.js`
and rebuild. Every page picks it up; no hand-editing `?v=` strings.

Every page is dark-only. There is no theme toggle; it was removed deliberately.

## Run locally

```bash
python3 -m http.server 8080
```

Open http://localhost:8080

## Discovery intake (`questionnaire.html`)

Clients fill out the questionnaire at `/questionnaire.html`. Submissions go to `/.netlify/functions/submit-intake`, which:

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
