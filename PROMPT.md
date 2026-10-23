# VGT Wealth AI CRM: Project Prompt

Use this document as the master brief when working on, extending or handing off this project. It describes what the product is, who it is for, how it works today, and what data it needs.

---

## 1. What this project is

**VGT Wealth AI CRM** is an AI-powered CRM for the **wealth management departments of Canadian banks**, built by Venus Global Technology (VGT). The working demo is themed around Scotiabank and its wealth brands (ScotiaMcLeod, Private Banking, MD Financial, Scotiatrust, Commercial Wealth Advisory).

It is **not** a general-purpose CRM. It serves wealth advisors, relationship managers, private bankers, financial planners and wealth executives. It combines:

- client relationship management
- wealth prospect intelligence
- AI opportunity detection ("intent signals")
- advisor automation
- compliance workflows

**Core idea:** detect *life and liquidity events* that create a wealth-planning need, such as a business sale, IPO, financing round, retirement or succession. Then turn each one into a scored, explainable lead. Route the lead to the right division and give the advisor a ready-made outreach plan.

**Hard guardrail:** the AI *supports advisors*. It must never independently approve suitability, recommend trades or make regulated financial decisions. Everything it drafts (emails, notes, CRM updates) needs human approval.

---

## 2. Modules

| # | Module | Purpose |
|---|--------|---------|
| 1 | Client 360° | Consolidated profile: relationships, goals, interactions, authorized account summaries |
| 2 | Wealth Prospect Intelligence | Find affluent / HNW prospects from permitted internal and licensed data |
| 3 | AI Wealth Intent Engine | Detect signals such as retirement inquiries, liquidity events, investment interest |
| 4 | Advisor CRM | Prospects, appointments, tasks, referrals, notes, opportunities |
| 5 | Household & Family Relationships | Spouses, households, business ownership, authorized relationships |
| 6 | AI Advisor Copilot | Meeting briefs, interaction summaries, follow-up drafts, next best action |
| 7 | Referral Management | Referrals from retail, commercial, mortgage and business banking |
| 8 | Wealth Opportunity Pipeline | Financial planning, private banking, estate planning, investment services |
| 9 | Client Onboarding | Document collection, KYC status, approval workflows, bank-system integration |
| 10 | Portfolio Intelligence | Authorized portfolio summaries, reviews, risk alerts |
| 11 | Client Engagement | Consent-based campaigns, event invitations, appointment reminders |
| 12 | Management Dashboard | Advisor productivity, referrals, pipeline, revenue attribution |

Modules 1, 3, 6, 7, 8 and 12 plus a **Source Intelligence** view exist as UI today. The routes are `intent_stream`, `source_intel`, `pipeline`, `client360`, `referrals`, `copilot` and `analytics`. Onboarding, portfolio intelligence and engagement are in the plan but not built yet.

---

## 3. Architecture (as it exists in the repo)

```
Public sources ──► scraper/ (RSS, EDGAR, custom URLs)
                     │  parse → extract → match → score (rule-based)
                     ▼
              scraper/data/signals.json  ◄── custom-sources.json
                     │
        Vite dev middleware: /api/intent/leads, /api/intent/refresh,
                             /api/live-market-feed
                     ▼
        React app (src/): Intent Engine · Source Intelligence · Pipeline ·
        Client 360 · Referral Hub · Advisor Copilot · Executive Analytics
                     ▲
        src/data/wealthData.js  (demo/seed data, "Illustrative, not real bank records")
```

- **Frontend:** React 18 + Vite 5, lucide-react icons, Vitest + Testing Library for tests (`src/__tests__/`).
- **Scraper:** plain Node ES modules in `scraper/`, run with `npm run scraper` (continuous) or `npm run scraper:once`.
- **Scoring:** deliberately **rule-based and auditable**, with no model and no API key. See `scraper/score.js`.
- **Legacy:** `server.js`, `js/` and `css/` are an older zero-dependency static prototype. They use CommonJS and no longer run, because `package.json` sets `"type": "module"`. The live app is `npm run dev`.
- **Config:** `.env` (git-ignored). `.env.example` lists the optional keys for market data, enrichment, databases and LLMs. Most are not yet wired in.

---

## 4. The Intent Engine

### 4.1 Signal types (current rules)

| Signal | Base weight | Target division | Urgency |
|--------|------------:|-----------------|---------|
| M&A: business sale / acquisition | 62 | ScotiaMcLeod & Private Banking | Immediate (<7 days) |
| Liquidity event: IPO / public listing | 58 | ScotiaMcLeod & Private Banking | Immediate |
| Succession & retirement trigger | 52 | ScotiaMcLeod & Private Banking | Urgent (<14 days) |
| Corporate liquidity: financing / private placement | 50 | Commercial Wealth Advisory | Urgent |
| Executive equity & insider activity | 40 | Commercial Wealth Advisory | Review (<30 days) |
| Dividend / distribution windfall | 30 | Commercial Wealth Advisory | Review |
| Executive appointment | 28 | Commercial Wealth Advisory | Review |

### 4.2 Scoring formula

```
score = ( strongest-signal weight
        + 20% of up to two secondary signals
        + deal-size bonus            (+2 … +14, by amount)
        + recency adjustment         (+6 for ≤1 day … −30 for >30 days)
        + Canadian-nexus adjustment )
        × source-reliability factor  (0.7 – 1.0)
```

Every score ships with `reasons: [{label, points}]` so an advisor or compliance reviewer can see exactly why a lead scored as it did.

### 4.3 Noise rejection

Rejected with an explicit reason: event or webinar notices, opinion and stock-tip headlines, residential real estate, debt issuance and news roundups, and items with no wealth-intent keywords. US-only items score lower unless there is a Canadian nexus.

### 4.4 Outputs per lead

Intent score (0–100), signal types, primary signal, deal amount, **estimated investable mandate** (about 15% of the deal for "hot" signals, 8% otherwise, with mega-deals over $5B left unsized), urgency, target division, rationale, recommended strategy, outreach channel and compliance notice.

---

## 5. Intent data we need

### 5.1 Already ingested (public, no licence)

| Source | Kind | Reliability |
|--------|------|-------------|
| GlobeNewswire Canada | RSS press wire | 1.0 |
| Newswire.ca (CNW) | RSS press wire | 1.0 |
| The Globe and Mail, Financial Post | Google News RSS (deal keywords) | 0.9 |
| Founder-exit / business-sale news | Google News RSS | 0.8 |
| Executive-transition / succession news | Google News RSS | 0.8 |
| SEC EDGAR Form D (Canadian private placements) | Regulatory | 1.0 |
| SEC EDGAR Schedule 13D (large holders) | Regulatory (Atom) | 0.7 |
| User-added custom URLs | Configured in the CRM | by source |

### 5.2 Intent data to add: public / permitted external

- **SEDAR+** material-change reports, early-warning reports, insider reports. There is no public feed and the site is bot-protected, so this needs a licensed or contracted route.
- **TSX / TSXV / CSE / NEO** listing, delisting, lock-up and bought-deal notices.
- **Corporations Canada / provincial registries:** director changes, dissolutions, amalgamations (ownership and holdco structure).
- **Land-title and large commercial real-estate transactions** (not residential).
- **Philanthropic and foundation filings** (CRA charity returns) as a wealth indicator.
- **Private-company funding and exit data** (PitchBook, Crunchbase, Apollo, ZoomInfo) through licensed APIs only.
- **Executive moves** (appointments, retirements, board changes) from licensed or news sources.

### 5.3 Intent data to add: internal bank data (consent-based)

This is the highest-value signal and the least used so far. All of it needs client consent and data-governance approval.

- **Commercial banking:** facility discharge or payoff, treasury inflows, escrow or subscription accounts opened, large deposit spikes, business-sale indicators.
- **Retail and mortgage:** mortgage payoff, large inbound transfers, GIC maturities, new high-balance accounts.
- **Digital behaviour:** completed retirement or IPP assessments, planning-tool usage, appointment requests, "wealth planning" inquiries.
- **Existing wealth CRM:** last review date, overdue reviews, life events recorded in meeting notes, open tasks.
- **Referrals:** referrer, source team (Commercial, Retail, Mortgage, Business Banking), referral reason, acceptance status.
- **Household graph:** spouse, dependants, owned entities (holdcos, family trusts, professional corporations), authorized relationships.

### 5.4 Canonical record shape (intent lead)

Match this shape when adding sources or replacing the demo data. It mirrors `wealthData.js`:

```
id, name, title, company (with ticker/exchange), industry, location, avatar
intentScore (0–100), urgency, estimatedAUM, targetDivision
primarySignalType, status, dateDetected, confidence
signals[]: { source, type, detail, weight }
aiAnalysis: { headline, rationale, recommendedStrategy,
              suggestedOutreachChannel, complianceNotice }
householdPreview: { spouse, entities[], jurisdiction }
actionTaken
```

Pipeline opportunities add `leadId, stage, probability, expectedRevenue, assignedAdvisor, division, nextAction, targetCloseDate, notes`. Stages run in order: `intent_detected → advisor_qualified → discovery_scheduled → wealth_plan_presented → kyc_onboarding → funded_active`.

---

## 6. Compliance and governance requirements

Treat these as non-negotiable when changing anything:

- **Consent and privacy:** PIPEDA consent before using personal or internal data. Record source attribution on every signal.
- **Regulatory posture:** CIRO suitability boundary, OSFI audit-readiness, and KYC/AML status tracked per client.
- **Audit logging:** who saw, changed, promoted or contacted whom, and when.
- **Identity matching and deduplication** before any lead is merged with an existing client.
- **Access controls:** advisors see only their authorized clients. Compliance has its own workspace.
- **No fabricated data in production.** Demo data stays labelled "Illustrative data, not real bank records". Public-source leads are inferred from headlines, not confirmed facts about a person's finances.
- **Human in the loop:** AI drafts are suggestions. An advisor approves before anything is sent or recorded.

---

## 7. How to work on this project

- Run the app with `npm run dev`. Vite picks the next free port (3000, 3001, 3002…) if the default is busy.
- Run the scraper once with `npm run scraper:once`. Run tests with `npm test`.
- Keep scoring **transparent**. Prefer adding or tuning rules in `scraper/score.js` over opaque model calls. If an LLM is added, use it for drafting and summarising only, never for scoring or suitability.
- Add new sources in `scraper/sources.js` with an `id`, `kind`, `category`, `reliability` and `region`.
- Never commit `.env`. Keys in `.env.example` are placeholders.

---

## 8. Suggested next steps

1. Replace `wealthData.js` seed data with the scraper's live leads end to end, and persist them in a database. `.env.example` already reserves Supabase and Postgres/Mongo variables.
2. Build the internal-bank-data ingestion layer (section 5.3) behind a consent and permissions model.
3. Add identity matching and deduplication against existing clients.
4. Wire an LLM for the Advisor Copilot (meeting briefs, follow-up drafts) with an approval step.
5. Build Client Onboarding / KYC, Portfolio Intelligence and Client Engagement modules.
6. Add authentication, role-based access and an audit log.
7. Remove or port the legacy `server.js`, `js/` and `css/` prototype.



# MASTER IMPLEMENTATION PROMPT: VGT WEALTH AI CRM — INVESTMENT INTENT DATA ACQUISITION PIPELINE

## 1. Project Objective

Build a production-ready Investment Intent Data Acquisition Pipeline for VGT Wealth AI CRM.

The objective is to discover, qualify, verify, manage, and convert investment-related prospects across the United States and Canada.

The system must prioritize people who have explicitly expressed interest in finding a financial advisor, obtaining wealth-management services, planning for retirement, managing liquidity events, or exploring investment opportunities.

The system must also support the discovery of potential investors through public, permitted sources, while clearly distinguishing inferred intent from verified enquiries.

**Core requirement:** Build a functional data-acquisition engine, not a static dashboard, mockup, or collection of fabricated sample leads.

Do not populate production tables with fake people, invented contact details, fabricated intent scores, or imaginary API responses.

If no real data source is connected, display an honest empty state explaining that no live sources are configured.

## 2. Target Market and Business Model

Target markets:
- United States
- Canada

Target prospects:
- Individuals actively seeking financial advisors
- Individuals requesting wealth-management consultations
- High-net-worth individuals who voluntarily express relevant interest
- Business owners involved in publicly reported exits or acquisitions
- Founders and executives associated with liquidity events
- Individuals exploring retirement, succession, or wealth planning
- Prospects seeking information about investment opportunities, subject to applicable marketing and securities regulations

Target lead volume:
- Initial target: 10–50 qualified leads per month
- Maximum initial operating capacity: fewer than 100 leads per month
- Prioritize lead quality, documented intent, contactability, and lawful reuse over raw volume.

Budget:
- Start with free public sources, open datasets, and free API tiers where permitted.
- Support paid providers only when the business explicitly approves the cost.
- Never assume a free API allows commercial use, unrestricted storage, personal-data enrichment, or lead resale.

## 3. Pipeline Architecture

Implement the following stages:

SOURCE DISCOVERY
    ↓
SOURCE PERMISSION AND CONFIGURATION
    ↓
DATA INGESTION
    ↓
NORMALIZATION
    ↓
DUPLICATE DETECTION
    ↓
EVENT AND INTENT CLASSIFICATION
    ↓
CONTACT AND IDENTITY VERIFICATION
    ↓
CONSENT AND COMMERCIAL-RIGHTS CHECK
    ↓
INTENT SCORING
    ↓
LEAD QUALIFICATION
    ↓
HUMAN REVIEW
    ↓
CRM LEAD CREATION
    ↓
ADVISOR ASSIGNMENT
    ↓
APPROVED OUTREACH
    ↓
FOLLOW-UP AND CONVERSION TRACKING

Each stage must have an explicit status, error handling, timestamps, retry rules, and audit records.

A lead must never bypass mandatory permission, provenance, verification, or consent checks.

## 4. Source Intelligence Module

Build a configurable source registry.

Each source must contain:

- source_id
- source_name
- source_type
- geographic_coverage
- source_url
- access_method
- API_or_feed_endpoint
- authentication_requirements
- licence_type
- commercial_use_allowed
- personal_data_processing_allowed
- redistribution_allowed
- permitted_retention_period
- permitted_refresh_frequency
- source_reliability
- last_successful_fetch
- last_attempted_fetch
- records_received
- records_accepted
- records_rejected
- source_health
- error_message

Supported ingestion methods:

1. Official APIs
2. Public RSS feeds
3. Permitted public web pages
4. Official public filings and announcements
5. Licensed data-provider APIs
6. Provider-authorized CSV imports
7. Consent-based website enquiry forms
8. Authorized internal CRM and referral integrations

Do not bypass CAPTCHAs, access controls, login restrictions, robots restrictions, rate limits, or provider terms.

Do not scrape private social-media profiles or acquire personal information through unauthorized sources.

### Initial public-source categories

Prioritize sources relevant to the US and Canadian markets.

- Business acquisition and sale announcements
- Startup funding and financing announcements
- IPO and public-listing announcements
- Executive appointments and retirements
- Publicly reported succession events
- Regulatory disclosures and official filings
- Business-owner and corporate registry records where permitted
- Public company announcements
- Financial-planning enquiry forms that explicitly consent to contact
- Licensed financial-advisor referral platforms

Examples of source categories to evaluate include SEC EDGAR, official exchange announcements, Canadian public corporate disclosures, reputable press-release feeds, and approved financial-advisor lead providers.

Do not claim a source is integrated until its connector has been implemented, tested, and successfully retrieved real records.

## 5. Source Permission and Licensing Gate

Before a source can supply production leads, run a permission check.

Store:

- commercial_use_status
- permitted_purpose
- permitted_geographies
- contact_permission_status
- redistribution_status
- licence_reference
- approval_timestamp
- approved_by
- expiry_date
- review_required

Allowed statuses:

- approved
- approved_with_restrictions
- pending_review
- prohibited
- expired

Block ingestion into production lead tables when the source is prohibited or when mandatory permission information is missing.

Public availability does not automatically grant permission to collect, enrich, retain, contact, or resell personal information.

## 6. Intent Classification

Create distinct intent classes.

### A. Confirmed expressed intent

The individual has directly submitted an enquiry or explicitly requested an advisor introduction.

Examples:
- Requests a financial-advisor consultation
- Submits a wealth-management contact form
- Requests a retirement-planning consultation
- Explicitly requests information about an eligible investment service
- Opts into a provider's advisor-matching service

Required evidence:
- Original enquiry or authorized provider record
- Source reference
- Date and time
- Intent category
- Applicable consent wording
- Consent status
- Permitted recipient and purpose
- Contact channel permissions

A confirmed enquiry is not proof of wealth, accreditation, suitability, or willingness to purchase a particular investment product.

### B. Strong inferred intent

A public event suggests a possible need for wealth planning.

Examples:
- Publicly announced business sale
- Founder liquidity event
- IPO or significant shareholding disclosure
- Business succession announcement
- Executive retirement announcement

These records must remain labelled INFERRED until the individual directly confirms their interest.

### C. Weak inferred intent

Examples:
- General executive appointment
- Industry participation
- Public company affiliation
- Broad business-growth news

These records may be retained as research signals but must not be presented as confirmed investment enquiries.

### D. Disqualified records

Reject or suppress records that:
- Lack sufficient source evidence
- Are duplicated
- Have expired or invalid source permissions
- Contain fabricated or unverified contact details
- Have unresolved identity mismatches
- Have an applicable do-not-contact restriction
- Are stale beyond the source-specific retention or relevance policy
- Have no defensible relationship to the configured target market

Record the reason for every rejection.

## 7. Canonical Lead Data Model

Create a normalized lead schema.

### Identity and contact

- lead_id
- first_name
- last_name
- display_name
- professional_title
- company_name
- business_email
- email_verification_status
- business_phone
- phone_verification_status
- country
- state_or_province
- city
- preferred_contact_channel

Do not expose or collect personal contact details unless the source, purpose, and applicable permissions allow it.

### Intent evidence

- intent_class
- intent_category
- intent_description
- original_source_url
- original_source_id
- original_source_record_id
- event_date
- discovery_date
- evidence_excerpt
- evidence_hash
- source_reliability
- intent_confidence
- last_verified_at

Store enough evidence to explain the classification without unnecessarily retaining sensitive source content.

### Wealth qualification

- wealth_status
- wealth_range
- wealth_estimate_source
- wealth_estimate_date
- wealth_evidence_type
- investment_interest_category
- qualification_confidence

Wealth statuses:

- self_reported
- verified_with_permission
- third_party_licensed_estimate
- public_event_only
- unknown

Do not derive a person's exact net worth from company valuation, executive title, fundraising amounts, property values, or transaction values.

### Consent and permissions

- consent_status
- consent_timestamp
- consent_source
- consent_text_version
- permitted_purpose
- permitted_recipient
- permitted_channels
- opt_out_status
- do_not_contact_status
- licence_status
- retention_expiry

### Sales management

- intent_score
- intent_score_reasons
- qualification_status
- review_status
- assigned_advisor
- lead_owner
- pipeline_stage
- next_action
- next_action_due
- last_contacted_at
- contact_attempt_count
- conversion_status
- created_at
- updated_at

## 8. Identity Matching and Deduplication

Implement deduplication before lead creation.

Use a combination of:
- Normalized email address, where permitted
- Normalized business phone number, where permitted
- Provider lead ID
- Source record ID
- Company domain
- Name and company matching
- Original event URL
- Event date and event type

Use fuzzy matching only to flag potential duplicates for review.

Never automatically merge two individuals solely because they have similar names or work at the same company.

Maintain:
- canonical_lead_id
- duplicate_candidate_ids
- match_method
- match_confidence
- merge_status
- merge_audit_record

Preserve source attribution from all authorized contributing records.

## 9. Transparent Intent Scoring

Implement a configurable, explainable 0–100 score.

The score must represent the strength and relevance of evidence, not a person's actual wealth or willingness to invest.

Suggested model:

A. Directly expressed intent: 0–40 points
B. Intent recency: 0–20 points
C. Source reliability: 0–15 points
D. Contact verification: 0–10 points
E. Geographic and service relevance: 0–10 points
F. Evidence completeness: 0–5 points

Maximum: 100 points.

Use only supported evidence. Missing data must not receive invented positive points.

A public business sale must not receive the same intent classification as a person who explicitly requested an advisor.

Apply separate qualification gates:

- Confirmed enquiry
- Inferred public signal
- Contact verified
- Consent verified
- Commercial rights verified
- Eligible for outreach

A high score must never override a failed permission or consent gate.

Every score must include a list of reasons, point contributions, evidence references, scoring-rule version, and calculation timestamp.

## 10. Qualification Rules

Create these operational segments:

### Sales-ready enquiry
- Directly expressed relevant intent
- Adequate contact information
- Source provenance recorded
- Contact permission confirmed for the intended recipient and channel
- Commercial use authorized
- No applicable suppression flag

### Research-qualified prospect
- Relevant public wealth event
- Credible source
- Sufficient evidence
- Contact identity not necessarily verified
- No claim that the person wants advice

### Needs manual review
- Possible duplicate
- Unclear identity
- Ambiguous intent
- Uncertain commercial rights
- Incomplete verification

### Suppressed
- Opted out
- Do not contact
- Prohibited data use
- Invalid source permission
- Expired record
- Failed mandatory checks

## 11. Lead Acquisition Dashboard

Build a functional React dashboard with the following screens.

### A. Source Intelligence

Show:
- Connected sources
- Approved versus pending sources
- API or feed status
- Last successful refresh
- Records imported
- Records rejected
- Error logs
- Licensing and permission status

Actions:
- Add source
- Configure connector
- Test connection
- Run authorized refresh
- Pause source
- View ingestion logs

Never display a source as connected merely because its configuration exists.

### B. Intent Lead Explorer

Include:
- Search by name, company, geography, or signal
- Country filter
- Intent category filter
- Confirmed versus inferred filter
- Minimum score
- Contact-verification filter
- Consent-status filter
- Source filter
- Date range
- Review status
- Assigned owner

Every lead row must show the source, evidence, intent class, score explanation, verification status, and next action.

### C. Lead Detail

Display:
- Authorized contact information
- Intent evidence
- Original source link
- Event date
- Contact-verification results
- Consent and licensing records
- Deduplication results
- Score breakdown
- Audit history
- Advisor notes
- Outreach eligibility

### D. Review Queue

Provide:
- Approve
- Reject
- Request further verification
- Mark duplicate
- Suppress
- Escalate to compliance

Approval actions must be permission-controlled and logged.

### E. Acquisition Analytics

Track:
- Leads received by source
- Confirmed-intent percentage
- Contact verification rate
- Duplicate rate
- Rejection rate
- Cost per qualified lead
- Cost per booked meeting
- Conversion rate
- Source freshness
- Consent failures
- Leads eligible for outreach

Do not report fabricated conversion rates or inferred revenue.

## 12. Website Enquiry Acquisition

Build an optional opt-in landing page where people can voluntarily request an introduction or consultation.

Form fields:
- Name
- Email
- Phone, optional unless required
- Country and location
- Type of advice requested
- Preferred contact method
- Optional self-reported investable-asset range
- Preferred consultation timeframe
- Consent to share the enquiry with the specifically identified business or advisor

Provide:
- Clear privacy notice
- Data-use purpose
- Identity of the receiving business
- Explicit sharing consent where required
- Separate optional marketing consent
- Withdrawal and deletion request mechanism
- Timestamped consent records
- CAPTCHA or appropriate anti-abuse controls

Never preselect optional consent checkboxes.

Only create a confirmed-intent lead after successful submission and required validation.

## 13. Ingestion and Processing Backend

Implement a modular backend with separate components for:

- Source registry
- Source connectors
- Scheduled ingestion
- Record normalization
- Deduplication
- Intent classification
- Scoring
- Contact verification
- Consent validation
- Review workflow
- CRM synchronization
- Audit logging

Suggested architecture:
- React + Vite frontend
- Node.js backend using ES modules
- PostgreSQL for persistent production data
- A scheduled worker for ingestion
- Redis and a queue only if the expected workload requires them
- Provider-specific API adapters
- Centralized error handling and structured logs

Reuse the existing scraper and API implementation wherever appropriate. Inspect the repository before changing the architecture.

Do not introduce unnecessary services, infrastructure, or paid APIs.

## 14. API Endpoints

Implement documented endpoints appropriate to the existing architecture.

Suggested routes:

GET /api/sources
POST /api/sources
POST /api/sources/:id/test
POST /api/sources/:id/refresh
GET /api/sources/:id/runs

GET /api/intent/leads
GET /api/intent/leads/:id
POST /api/intent/leads/:id/review
POST /api/intent/leads/:id/suppress
POST /api/intent/leads/:id/verify

GET /api/intent/metrics
GET /api/intent/review-queue
POST /api/intent/export

GET /api/consent/:leadId
POST /api/consent/:leadId/withdraw

Validate inputs, authenticate users, enforce authorization, paginate results, rate-limit sensitive operations, and avoid leaking personal information through logs or errors.

Exports must contain only fields the requesting user is authorized to access.

## 15. CSV Import and Export

Support provider-authorized CSV imports.

During import:
- Validate headers
- Validate data types
- Normalize fields
- Verify required provenance fields
- Check source permissions
- Deduplicate
- Record import batch ID
- Capture rejection reasons
- Provide an import summary

Support authorized CSV export.

Include:
- lead_id
- intent_class
- intent_category
- company_name
- authorized contact fields
- country
- intent_score
- score_reasons
- source_name
- source_url
- event_date
- consent_status
- verification_status
- outreach_eligibility
- assigned_owner

Never export suppressed records as actionable leads.

## 16. Outreach and CRM Integration

Provide integrations for:
- Existing VGT Wealth CRM
- Advisor assignment
- CRM task creation
- Appointment scheduling
- Email or messaging providers, subject to applicable permission requirements

Default workflow:

New lead
→ Evidence review
→ Verification
→ Consent and rights validation
→ Advisor approval
→ Approved contact
→ Meeting scheduled
→ Qualified opportunity
→ Converted or closed

All outreach drafts must be reviewed by an authorized human before sending.

Do not automatically contact people based solely on public wealth events.

## 17. Privacy, Security, and Governance

Implement:
- Role-based access control
- Encryption in transit and at rest
- Secrets management
- Audit logs
- Retention and deletion policies
- Access logs
- Data export controls
- Consent withdrawal handling
- Do-not-contact suppression
- Provider licence restrictions
- Duplicate and identity-resolution controls
- Data breach response procedures

For Canada, evaluate PIPEDA and applicable provincial privacy laws, along with CASL requirements for commercial electronic messages.

For the United States, evaluate applicable federal and state privacy, telemarketing, email, and financial-services requirements.

Where the business provides regulated financial services, ensure that applicable registration, securities-marketing, and advisor eligibility requirements are addressed.

Do not assume a consumer enquiry permits unrestricted resale or sharing with unrelated financial firms.

## 18. Reliability and Refresh Scheduling

Support configurable source-specific refresh schedules.

Requirements:
- Respect source rate limits
- Use incremental ingestion where supported
- Implement bounded retries with backoff
- Track last successful fetch
- Prevent overlapping jobs
- Store ingestion run IDs
- Support replay of failed batches
- Preserve historical evidence
- Mark stale signals appropriately
- Alert administrators to repeated failures

Do not repeatedly scrape a source when an official feed or authorized API is available.

## 19. Required Tests

Write tests for:
- Source permission enforcement
- API authentication and authorization
- Valid and invalid records
- Intent classification
- Score calculations
- Missing evidence
- Deduplication
- Identity collisions
- Consent withdrawal
- Do-not-contact suppression
- CSV import validation
- CSV export authorization
- Provider API failures
- Retry behaviour
- Empty-source states
- Audit logging

Use synthetic fixtures only in tests, and clearly label all development fixtures as test data.

Production must not contain test prospects.

## 20. Implementation Plan

Phase 1 — Repository audit:
- Inspect existing routes, components, scraper, database layer, environment configuration, and tests.
- Identify existing functionality and reuse it.
- Produce a concise implementation plan before making breaking changes.

Phase 2 — Real source acquisition:
- Select accessible, permitted sources.
- Implement at least one working connector.
- Verify that the connector returns real source records.
- Record source permissions and provenance.

Phase 3 — Processing engine:
- Normalize records.
- Deduplicate.
- Classify intent.
- Score with transparent rules.
- Validate contact and consent information.

Phase 4 — Production dashboard:
- Implement the source registry, intent explorer, lead detail, review queue, and analytics.
- Connect every screen to actual backend data.

Phase 5 — CRM integration:
- Connect approved leads to the existing CRM.
- Implement human approval, assignment, and follow-up tracking.

Phase 6 — Validation:
- Run the test suite.
- Validate real connector responses.
- Verify error handling and permissions.
- Document required environment variables.
- Provide setup and deployment instructions.

## 21. Definition of Done

The implementation is complete only when:

1. At least one permitted source connector successfully retrieves real records.
2. Every record has a traceable source.
3. Confirmed and inferred intent are clearly distinguished.
4. Production contains no fabricated leads.
5. Duplicate detection is operational.
6. Scores are explainable.
7. Contact, consent, and licensing checks are enforced.
8. The dashboard displays real backend data.
9. CSV import/export respects access and usage permissions.
10. Errors, refresh times, and ingestion results are visible.
11. Automated tests pass.
12. Setup instructions and limitations are documented.

If no free source supplies direct investment enquiries, report that limitation honestly. Do not manufacture confirmed intent from public announcements.

**Final objective:** Build a sustainable, compliant lead acquisition pipeline that finds genuine prospects, demonstrates why each prospect qualifies, and helps the sales team turn verified enquiries into real client relationships.
