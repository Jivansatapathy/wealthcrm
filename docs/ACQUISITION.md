# Lead Acquisition Pipeline: setup, operation and limitations

This implements the "Investment Intent Data Acquisition Pipeline" brief in `PROMPT.md`. It sits beside the existing Intent Engine (which is unchanged) and lives in `scraper/acquisition/`, served by the same Node service on port 3100 under `/acq` (proxied by Vite as `/api/acq`).

## Run it

```
npm install
cp .env.example .env        # then fill in the ACQ_* values below
npm run scraper             # API + scheduler on :3100  (loads .env automatically)
npm run dev                 # CRM on :3000 -> "Lead Acquisition" in the sidebar
npm test
```

Open **Lead Acquisition** and sign in with an access token.

| Variable | Purpose |
|---|---|
| `ACQ_TOKENS` | `admin:<token>,compliance:<token>,advisor:<token>,viewer:<token>`, each token at least 16 characters. **Required in production.** Outside production, random dev tokens are written to `scraper/data/acq/dev-tokens.json` if this is unset. |
| `ACQ_BUSINESS_NAME` | Legal name of the business receiving enquiries. The public form stays disabled until it is set. |
| `ACQ_PRIVACY_URL` | Privacy notice link shown on the form. |
| `ACQ_PUBLIC_URL`, `ACQ_MAIL_WEBHOOK` | Needed to send the confirmation email (see limitations). |
| `ACQ_TURNSTILE_SECRET`, `ACQ_TURNSTILE_SITE_KEY` | Optional CAPTCHA (Cloudflare Turnstile). |
| `ACQ_MIN_SCORE` | Minimum score for an inferred lead to be kept (default 25). |
| `ACQ_DATA_DIR` | Where the JSON store lives. It holds personal data. Default `scraper/data/acq/` (git-ignored). |
| `ACQ_TRUST_PROXY` | `1` only behind a trusted reverse proxy. |
| `SCRAPER_CONTACT` | Contact string sent in the User-Agent to SEC EDGAR (their fair-access policy requires one). |

Roles: **admin** (everything), **compliance** (review, suppress, verify, consent, export, audit), **advisor** (review, assign, export), **viewer** (read-only, contact details masked).

## How a record moves

Source discovery -> **permission gate** -> ingestion -> normalization -> duplicate detection -> classification -> scoring -> qualification -> human review -> CRM -> assignment -> approved outreach -> follow-up. Each lead carries a `stages` map with status and timestamp per stage, a `history`, and audit-log entries.

- **Permission gate.** No source ingests until an admin records an approval (status, commercial-use status, purpose, geographies, licence reference, approver, timestamp; optional expiry). Prohibited, expired or incomplete records block ingestion. Built-in sources start as `pending_review`. The approval is a business/legal decision this software cannot make for you.
- **Intent classes.** `confirmed` (only from the enquiry form or a provider CSV row carrying full consent evidence), `strong_inferred` (sale, IPO, succession), `weak_inferred` (financing, appointment, etc.), `disqualified` (rejected, with a stored reason). Inferred records are never presented as enquiries.
- **Score (0-100, `acq-v1`).** Direct intent 40, recency 20, source reliability 15, contact verification 10, geography/service relevance 10, evidence completeness 5. It measures evidence, not wealth. Missing data earns zero. A high score never overrides a failed gate.
- **Gates.** confirmed enquiry, inferred signal, contact verified, consent verified, commercial rights verified, eligible for outreach (needs all of them, an allowed channel, no suppression, and advisor approval). Contact-stage pipeline moves are refused for ineligible leads.
- **Contact verification.** A domain/MX check only yields `domain_valid`, which does **not** pass the gate. `verified` comes from the email confirmation link or a logged human check.
- **Deduplication.** Exact keys (source record, URL, email, phone) attach a sighting to the canonical lead and keep source attribution. Fuzzy matches (same company, event type and date window; similar name) only flag a lead for review. Nothing is merged automatically.
- **Suppression.** Withdrawal, do-not-contact and public withdrawal requests store hashes of the contact, so a deleted person cannot be re-imported. Retention expiry redacts personal fields.

## Questionnaire, calculator and advisor matching (own traffic)

Modelled on how SmartAsset, Zoe Financial and Wealthramp work (consumer fills in a questionnaire, then is matched to up to three advisors), but first-party only.

- **`/enquiry.html`** is a 4-step form: goal -> finances -> location -> contact and consent. Everything except the reason, country, name, email and consent is optional and self-reported: goals, timeframe, investable assets, household income, monthly savings, age range, marital status, home ownership, business ownership, state/province, ZIP/postal code. Contact and consent come last, next to the submit button. Answers are stored in `lead.questionnaire` and are erased by deletion or retention expiry like other personal fields.
- **What we deliberately do not do** (SmartAsset's policy shows these for a large network): advertising IDs, device fingerprinting, public-record or data-provider enrichment, and anything like SIN/SSN, account numbers or payment details.
- **`/calculator.html`** is a stand-alone retirement calculator that runs in the browser and sends nothing. Its button links to the form with a topic and a broad asset band (from current savings, not the projection) preselected; the person can change them. This is the template for further traffic sources (content, ads, partner pages linking to `/enquiry.html`).
- **Advisor matching** (`advisors.js`): admins add advisor profiles via `POST /acq/advisors` (regions such as `CA` or `CA-ON`, accepted asset ranges, specialties, goals, capacity). `GET /acq/leads/:id/matches` returns up to 3 active advisors who cover the person's location, accept their stated asset level and have free capacity, ranked by province match, specialty and shared goals, then lightest load. With no stated assets, only advisors who accept every range match: wealth is never guessed. Matches are suggestions of which bank rep should handle the lead, shown in the lead detail. Data is not passed to any outside advisor or firm: the consent wording (v2) says only the business's own representatives who handle the request will see it. A rep calls only after a human approves and assigns the lead and the eligibility gates pass.

## Cookie consent and visitor analytics

`public/consent.js` is loaded by `enquiry.html` and `calculator.html` (add the same `<script src="/consent.js" defer>` to any other public page, including pages that link to `/enquiry.html`).

- **Opt-in.** Until the visitor accepts, only the strictly necessary `wc_consent` cookie (their choice) exists. Reject and Accept have equal prominence. A browser Global Privacy Control signal is treated as a rejection and the banner is not shown. "Cookie settings" (bottom left) reopens the choice at any time.
- **If accepted:** a random visitor ID cookie `wc_vid` (13 months) and one record per page view: path, referring site (host only), `utm_source/medium/campaign`, language and a phone/tablet/desktop class. **No IP address, no full user agent, no ad identifiers, nothing sold or shared.** Bots are ignored.
- **Proof of consent.** The choice is posted to `POST /acq/visitor/consent` first; tracking only switches on once the server has stored it (history with timestamp, notice version `c1` and GPC flag). A visitor who rejects and was never tracked leaves no record at all. If the notice text changes, bump `VISITOR_CONSENT_VERSION` in `visitors.js` and `VERSION` in `consent.js` together; everyone is asked again.
- **Withdrawal.** Rejecting after accepting deletes that visitor's events and clears the visit attribution on any lead from the same browser.
- **Link to enquiries.** If the visitor accepted analytics, the enquiry form sends the visitor ID and the lead gets `visit_attribution` (first touch: landing page, referrer, campaign; page-view count). This answers "which page or campaign brought this person". Without analytics consent nothing is linked.
- **Retention.** Events and visitors unseen for 395 days are deleted by the scheduler.
- **Reporting.** `GET /acq/visitors/summary?days=30` (metrics permission) returns aggregates only: page views, unique visitors, top pages, sources, devices. Rejecters are not recorded, so a consent rate cannot be computed.
- **Legal.** This is built for opt-in regimes (PIPEDA, Quebec Law 25, CASL, GDPR-style). The notice text is in `consent.js`; have counsel review it and add your privacy-notice link and cookie list. Behind a proxy set `ACQ_TRUST_PROXY=1` so the rate limits see real client addresses.

## Importing leads from an advisor-matching provider

Two CSV consent modes, set per source in **Sources -> Permission -> Consent basis**:

- **Per-row proof (default, strict).** Every row must carry consent status, timestamp, wording version, purpose and recipient. Use this when the provider can supply them.
- **Provider-attested.** For networks (SmartAsset AMP-style) whose contract says each consumer opted in to be contacted by your advisor/firm. You must record the **permitted recipient**, a **contact-permission statement** quoting the contract, and tick **personal-data processing allowed**; otherwise the source stays blocked. Rows then only need an ID, a submission date, a name and an email or phone. Country defaults to the source's single geography, category to `financial_advisor`, and consent is dated from the lead's own submission time. Common provider headers (Email, First Name, Zip, Created At, Investable Assets, Consent Status) are recognised automatically.

Provider-attested leads are labelled **provider-attested** (tag `consent:provider_attested`): our records hold no per-person proof, so keep the contract on file. They still need a verified contact and advisor approval before they are outreach-eligible, can be suppressed, and a withdrawn contact cannot be re-imported. Rows the provider marks as not consented are rejected.

## No re-fetching of data we already hold

- **Stored items are skipped.** Each received item is archived by source + record id. On later runs an item already stored (as a lead, a duplicate or a rejection) is not evaluated or stored again; the run records it as `already_have` and bumps its `last_seen`.
- **SEC filings are not re-downloaded.** Form D filings already stored (or read and found to have no usable offering amount) are skipped before their XML is requested. The search window starts at the last successful run (minimum 2 days, maximum 21) instead of always 21 days.
- **Unchanged feeds cost one tiny request.** The ETag / Last-Modified from each fetch is stored and sent back; an unchanged feed answers `304` and the run is recorded as `not_modified`.
- **The older Intent Engine loop** (the 15-minute `scrape()` in `scraper/index.js`) skips Form D filings it has already evaluated and carries their earlier results forward.
- Rule changes do not revive items already stored. To rebuild after changing the rules, delete the untouched leads and their records (as the maintenance step in the audit log did) and collect again.

## API (all under `/acq`; Bearer token unless noted)

Public: `GET /health`, `GET /enquiry/config`, `POST /enquiry`, `POST /enquiry/withdrawal-request`, `GET /enquiry/confirm`.
Sources: `GET|POST /sources`, `PUT /sources/:id/permission`, `PUT /sources/:id/cost`, `POST /sources/:id/{test,refresh,pause,resume}`, `GET /sources/:id/runs`, `POST /sources/:id/runs/:runId/replay`, `GET /rejections`.
Leads: `GET /leads` (filters, pagination), `GET /leads/:id`, `POST /leads/:id/{review,suppress,verify,assign,stage}`, `GET /review-queue`, `GET /crm-leads`.
Other: `GET /consent/:id`, `POST /consent/:id/withdraw`, `GET /metrics`, `GET /audit`, `POST /export` (CSV), `POST /import?source_id=` (CSV body), `GET /whoami`.

CSV import needs the columns `provider_record_id, company_name, country, intent_category, event_date`. A row can only be `confirmed` with `consent_status=granted`, a timestamp, wording version, purpose and recipient. Export never includes suppressed, merged or expired records, hides contact columns from roles without contact access, neutralises spreadsheet formulas, and is audited.

## Verified

- `npm test`: synthetic fixtures only (the pipeline's tests are in `src/__tests__/acquisition.test.js`).
- Live check against real feeds (throwaway data dir): GlobeNewswire Canada, Newswire.ca and SEC EDGAR Form D each connected and returned real records.

## Limitations (read before relying on it)

1. **Storage is a JSON file, not PostgreSQL.** Fine for the target volume (under 100 leads/month); behind `store.js`'s `get/save` so it can be swapped. Back it up and protect the directory.
2. **No free source supplies direct advisor enquiries.** The public sources produce inferred, research-only signals. Confirmed intent comes only from the enquiry form or a provider CSV that proves consent.
3. **Confirmation email needs a mailer.** Set `ACQ_MAIL_WEBHOOK` (an endpoint that sends the mail) and `ACQ_PUBLIC_URL`. Without them a reviewer must verify contacts manually.
4. **No carrier/phone verification.** Phone numbers reach `format_valid` only.
5. **Paid/licensed API connectors are not implemented** (an `api` source can be registered but refuses to run). Each provider needs its own adapter plus a written licence.
6. **Outreach, scheduling and tasks.** The CRM hand-off, assignment, `next_action` and stage tracking exist; sending email/SMS and calendar booking do not.
7. **Auth is bearer tokens**, not SSO. Rotate tokens via `ACQ_TOKENS`; put the service behind TLS. Encryption at rest is the host's responsibility (disk encryption).
8. **Legal review.** PIPEDA/CASL (Canada) and federal/state privacy, telemarketing and securities-marketing rules apply. Consent wording (`consent.js`) is a starting point and needs counsel's sign-off.
9. Wealth is never estimated from deal sizes or titles; `wealth_status` is `public_event_only`, `self_reported` or `unknown`.
