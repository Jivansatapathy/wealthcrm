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
