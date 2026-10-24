// @vitest-environment node
// TEST DATA ONLY: every person, company, URL and email below is a synthetic fixture. Nothing here ever reaches production.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fetchFormD } from '../../scraper/edgar.js';
import { fetchSource } from '../../scraper/pipeline.js';
import { detectCountry } from '../../scraper/acquisition/normalize.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { createStore } from '../../scraper/acquisition/store.js';
import { createContext } from '../../scraper/acquisition/index.js';
import { createApi } from '../../scraper/acquisition/api.js';
import { addSource, evaluatePermission, getSource, listSources, setPermission, ensureSystemPermissions } from '../../scraper/acquisition/registry.js';
import { runSource, replayBatch, robotsAllows } from '../../scraper/acquisition/runner.js';
import { processItems } from '../../scraper/acquisition/ingest.js';
import { newRun } from '../../scraper/acquisition/ingest.js';
import { submitEnquiry, requestWithdrawal } from '../../scraper/acquisition/enquiry.js';
import { reviewLead, verifyLead, suppressLead, withdrawConsent, setStage, serializeLead, applyRetention, assignLead, listLeads } from '../../scraper/acquisition/leads.js';
import { importCsv, exportCsv, parseCsv, csvCell } from '../../scraper/acquisition/csv.js';
import { computeMetrics } from '../../scraper/acquisition/metrics.js';
import { scoreLead } from '../../scraper/acquisition/scoring.js';
import { isSuppressed } from '../../scraper/acquisition/consent.js';
import { ROLE_PERMS } from '../../scraper/acquisition/auth.js';
import { recordVisit, recordVisitorConsent, attributionFor, purgeVisitors, visitorSummary } from '../../scraper/acquisition/visitors.js';

const NOW = Date.parse('2026-10-22T12:00:00Z');
const GOOD_PERM = { status: 'approved', commercial_use_status: 'yes (test licence)', permitted_purpose: 'test research', permitted_geographies: ['CA', 'US'], licence_reference: 'TEST-LICENCE-1' };
const SALE = { title: 'Maple Test Industries Inc. to be acquired by Northern Test Capital for $450 million', link: 'https://example.test/a1', summary: 'Toronto-based Maple Test Industries founder confirms sale.', date: '2026-10-22T08:00:00Z' };
const APPOINT = { title: 'Birch Test Corp appoints Alex Sample as chief executive officer', link: 'https://example.test/a2', summary: 'Vancouver, BC.', date: '2026-10-22T09:00:00Z' };
const ENQUIRY = { name: 'Jane Testperson', email: 'jane.testperson@example.com', phone: '416-555-0199', country: 'CA', advice_type: 'retirement_planning', preferred_contact: 'email', consent_share: true, consent_text_version: 'v2' };

const perms = (role) => new Set(ROLE_PERMS[role]);
const dirs = [];

function makeCtx(over = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acq-test-'));
  dirs.push(dir);
  return createContext({
    store: createStore(dir),
    env: { ACQ_BUSINESS_NAME: 'Test Bank Wealth', ACQ_MIN_SCORE: '20', NODE_ENV: 'test', ACQ_TOKENS: 'admin:adminadminadmin1234,viewer:viewerviewer123456,advisor:advisoradvisor1234' },
    now: () => NOW, sleep: async () => {}, resolveMx: async () => [{ exchange: 'mx.example.com' }],
    fetchSource: async () => [SALE, APPOINT], fetchText: async () => '', fetchJson: async () => ({}), ...over,
  });
}
const approve = (ctx, id = 'globenewswire-ca', over = {}) => setPermission(ctx, id, { ...GOOD_PERM, ...over }, 'admin:test');
const ingest = (ctx, items, id = 'globenewswire-ca') => { const run = newRun(ctx, id, 'test'); processItems(ctx, getSource(ctx, id), items, run); return run; };
const leadsOf = (ctx) => Object.values(ctx.store.get('leads', {}));

describe('source permission gate', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('blocks ingestion from a source that has not been approved', async () => {
    const run = await runSource(ctx, 'globenewswire-ca', { trigger: 'scheduled' });
    expect(run.status).toBe('blocked');
    expect(run.error).toMatch(/permission gate/i);
    expect(leadsOf(ctx)).toHaveLength(0);
  });

  it('blocks when mandatory permission fields are missing, prohibited, or expired', async () => {
    // The API refuses to save an incomplete approval...
    expect(() => approve(ctx, 'globenewswire-ca', { licence_reference: '' })).toThrow(/licence reference/);
    // ...and a stored record that is incomplete (e.g. older data) still fails the gate
    ctx.store.set('permissions', { 'globenewswire-ca': { status: 'approved', permitted_geographies: ['CA'] } });
    const gate0 = evaluatePermission(ctx.store.get('permissions', {})['globenewswire-ca'], NOW);
    expect(gate0.allowed).toBe(false);
    expect(gate0.reasons).toContain('Licence reference missing');
    expect((await runSource(ctx, 'globenewswire-ca', { trigger: 'scheduled' })).status).toBe('blocked');
    approve(ctx, 'globenewswire-ca', { status: 'prohibited' });
    expect((await runSource(ctx, 'globenewswire-ca', { trigger: 'scheduled' })).status).toBe('blocked');
    approve(ctx, 'globenewswire-ca', { expiry_date: '2026-01-01' });
    const gate = evaluatePermission(ctx.store.get('permissions', {})['globenewswire-ca'], NOW);
    expect(gate.allowed).toBe(false);
    expect(gate.status).toBe('expired');
  });

  it('ingests once approved and records provenance on every lead', async () => {
    approve(ctx);
    const run = await runSource(ctx, 'globenewswire-ca', { trigger: 'scheduled' });
    expect(run.status).toBe('success');
    const leads = leadsOf(ctx);
    expect(leads.length).toBeGreaterThan(0);
    for (const l of leads) {
      expect(l.original_source_url).toMatch(/^https:/);
      expect(l.original_source_id).toBe('globenewswire-ca');
      expect(l.evidence_hash).toBeTruthy();
    }
  });

  it('hands the fetcher the shape it expects (id, url, kind), not registry field names', async () => {
    let seen;
    const c = makeCtx({ fetchSource: async (s) => { seen = s; return []; } });
    approve(c);
    await runSource(c, 'globenewswire-ca', { trigger: 'scheduled' });
    expect(seen).toMatchObject({ id: 'globenewswire-ca', kind: 'rss' });
    expect(seen.url).toMatch(/^https:\/\/www\.globenewswire\.com\//);
  });

  it('never shows a source as connected until a real fetch has succeeded', async () => {
    approve(ctx);
    expect(getSource(ctx, 'globenewswire-ca').connected).toBe(false);
    await runSource(ctx, 'globenewswire-ca', { trigger: 'scheduled' });
    expect(getSource(ctx, 'globenewswire-ca').connected).toBe(true);
  });

  it('rejects items outside the source\'s permitted geographies', () => {
    approve(ctx, 'globenewswire-ca', { permitted_geographies: ['CA'] });
    const run = ingest(ctx, [{ title: 'Delta Test Corp of Austin, Texas acquires Echo Test Inc. for $80 million', link: 'https://example.test/us1', summary: '', date: '2026-10-22T07:00:00Z' }]);
    expect(run.accepted).toBe(0);
    expect(Object.keys(run.reject_reasons).join()).toMatch(/permitted geographies/);
  });
});

describe('classification, scoring and qualification', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); approve(ctx); });

  it('labels a public sale as INFERRED, never confirmed, and never outreach-eligible', () => {
    ingest(ctx, [SALE]);
    const [lead] = leadsOf(ctx);
    expect(lead.intent_class).toBe('strong_inferred');
    expect(lead.gates.confirmed_enquiry).toBe(false);
    expect(lead.gates.eligible_for_outreach).toBe(false);
    expect(lead.gates.failed).toContain('Not a confirmed enquiry');
    expect(lead.wealth_status).toBe('public_event_only');
    expect(lead.qualification_status).toBe('research_qualified');
  });

  it('classifies a general executive appointment as weak inferred', () => {
    ingest(ctx, [APPOINT]);
    expect(leadsOf(ctx)[0].intent_class).toBe('weak_inferred');
  });

  it('produces an explainable score whose parts add up and stay within each maximum', () => {
    ingest(ctx, [SALE]);
    const l = leadsOf(ctx)[0];
    expect(l.scoring_rule_version).toBe('acq-v1');
    expect(l.intent_score_reasons.map((r) => r.component)).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(l.intent_score_reasons.reduce((s, r) => s + r.points, 0)).toBe(l.intent_score);
    l.intent_score_reasons.forEach((r) => expect(r.points).toBeLessThanOrEqual(r.max));
    expect(l.intent_score_reasons.find((r) => r.component === 'D').points).toBe(0); // no contact data, no invented points
  });

  it('gives missing evidence zero points rather than invented ones', () => {
    const bare = scoreLead({ intent_class: 'weak_inferred', signal_weight: 28, source_reliability: 0 }, NOW);
    expect(bare.intent_score_reasons.find((r) => r.component === 'B').points).toBe(0);
    expect(bare.intent_score_reasons.find((r) => r.component === 'F').points).toBe(0);
    expect(bare.intent_score_reasons.find((r) => r.component === 'E').points).toBe(1);
  });

  it('records a reason for every rejection', () => {
    const run = ingest(ctx, [
      { title: 'Should investors buy this stock after the acquisition?', link: 'https://example.test/c1', date: '2026-10-22T08:00:00Z' },
      { title: 'Old Test Inc. acquired by Other Test Ltd for $50 million in Toronto', link: 'https://example.test/c2', date: '2026-06-01T08:00:00Z' },
      { title: 'Nolink Test Inc. acquired for $50 million in Toronto', date: '2026-10-22T08:00:00Z' },
    ]);
    expect(run.accepted).toBe(0);
    expect(run.rejected).toBe(3);
    expect(Object.keys(run.reject_reasons).join('|')).toMatch(/Opinion.*Older than 30 days.*No source URL/);
    expect(ctx.store.get('rejections', []).every((r) => r.reason)).toBe(true);
  });
});

describe('deduplication and identity', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); approve(ctx); });

  it('treats the same record or URL seen twice as one lead and does not process it again', () => {
    ingest(ctx, [SALE]);
    const run = ingest(ctx, [SALE]);
    expect(leadsOf(ctx)).toHaveLength(1);
    expect(run.already_have).toBe(1);
    expect(run.accepted + run.rejected + run.duplicates).toBe(0);
  });

  it('counts the same page under a tracking-parameter URL as a duplicate (exact match), not a new lead', () => {
    ingest(ctx, [SALE]);
    const run = ingest(ctx, [{ ...SALE, link: `${SALE.link}?utm_source=newsletter` }]);
    expect(leadsOf(ctx)).toHaveLength(1);
    expect(run.duplicates).toBe(1);
  });

  it('preserves attribution when a second source reports the same URL', () => {
    approve(ctx, 'newswire-ca');
    ingest(ctx, [SALE]);
    ingest(ctx, [SALE], 'newswire-ca');
    const [l] = leadsOf(ctx);
    expect(l.source_attributions.map((a) => a.source_id)).toContain('newswire-ca');
  });

  it('only FLAGS fuzzy matches (same company and event, different URL); it never auto-merges', () => {
    ingest(ctx, [SALE]);
    ingest(ctx, [{ ...SALE, link: 'https://example.test/other-coverage' }]);
    const leads = leadsOf(ctx);
    expect(leads).toHaveLength(2);
    const flagged = leads.find((l) => l.duplicate_candidate_ids.length);
    expect(flagged.merge_status).toBe('candidate');
    expect(flagged.match_confidence).toBeGreaterThan(0);
    expect(flagged.qualification_status).toBe('needs_manual_review');
  });

  it('does not merge different people who share a company', () => {
    ingest(ctx, [{ title: 'Pine Test Corp: founder Sam Ample sells stake in Pine Test Corp for $20 million, Toronto', link: 'https://example.test/p1', date: '2026-10-22T08:00:00Z' }]);
    ingest(ctx, [{ title: 'Pine Test Corp: co-founder Rae Sample retires from Pine Test Corp, Toronto', link: 'https://example.test/p2', date: '2026-10-22T09:00:00Z' }]);
    expect(leadsOf(ctx).filter((l) => l.merge_status !== 'merged')).toHaveLength(2);
  });

  it('lets a reviewer merge a duplicate manually with an audit record', () => {
    ingest(ctx, [SALE]);
    ingest(ctx, [{ ...SALE, link: 'https://example.test/other-coverage' }]);
    const [canon, dupe] = leadsOf(ctx);
    const merged = reviewLead(ctx, dupe.lead_id, { decision: 'mark_duplicate', canonical_lead_id: canon.lead_id, note: 'same deal' }, 'compliance:t');
    expect(merged.merge_status).toBe('merged');
    expect(merged.merge_audit_record).toHaveLength(1);
    expect(ctx.store.get('leads', {})[canon.lead_id].source_attributions.length).toBe(1);
  });
});

describe('enquiry form: the only source of CONFIRMED intent', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); });

  it('is disabled until the receiving business is configured', async () => {
    const c = makeCtx({ env: {} });
    await expect(submitEnquiry(c, ENQUIRY, '1.1.1.1')).rejects.toMatchObject({ status: 503 });
  });

  it('refuses a submission without explicit consent or with stale consent wording', async () => {
    await expect(submitEnquiry(ctx, { ...ENQUIRY, consent_share: false }, 'ip')).rejects.toThrow(/agree/);
    await expect(submitEnquiry(ctx, { ...ENQUIRY, consent_share: 'true' }, 'ip')).rejects.toThrow(/agree/);
    await expect(submitEnquiry(ctx, { ...ENQUIRY, consent_text_version: 'v0' }, 'ip')).rejects.toThrow(/wording/);
    expect(leadsOf(ctx)).toHaveLength(0);
  });

  it('validates inputs', async () => {
    await expect(submitEnquiry(ctx, { ...ENQUIRY, email: 'nope' }, 'ip')).rejects.toThrow(/email/);
    await expect(submitEnquiry(ctx, { ...ENQUIRY, country: 'FR' }, 'ip')).rejects.toThrow(/Country/);
    await expect(submitEnquiry(ctx, { ...ENQUIRY, preferred_contact: 'phone', phone: '' }, 'ip')).rejects.toThrow(/contact method/);
  });

  it('silently drops honeypot submissions without creating a lead', async () => {
    const r = await submitEnquiry(ctx, { ...ENQUIRY, website: 'http://spam.test' }, 'ip');
    expect(r.ok).toBe(true);
    expect(leadsOf(ctx)).toHaveLength(0);
  });

  it('creates a confirmed lead with a full consent record, but not yet eligible (email unconfirmed)', async () => {
    await submitEnquiry(ctx, { ...ENQUIRY, asset_range: '1m_5m', marketing_consent: true }, 'ip');
    const [l] = leadsOf(ctx);
    expect(l.intent_class).toBe('confirmed');
    expect(l.consent_status).toBe('granted');
    expect(l.consent_text_version).toBe('v2');
    expect(l.permitted_recipient).toBe('Test Bank Wealth');
    expect(l.marketing_consent).toBe(false); // optional consent is never inferred
    expect(l.wealth_status).toBe('self_reported');
    expect(l.email_verification_status).toBe('pending_confirmation');
    expect(l.gates.eligible_for_outreach).toBe(false);
    expect(l.qualification_status).toBe('needs_manual_review');
    expect(l.intent_score).toBeGreaterThan(60);
  });

  it('becomes sales-ready and outreach-eligible only after verification AND advisor approval', async () => {
    await submitEnquiry(ctx, ENQUIRY, 'ip');
    const id = leadsOf(ctx)[0].lead_id;
    await expect(verifyLead(ctx, id, { method: 'manual_email_confirmation' }, 'a')).rejects.toThrow(/note/);
    let l = await verifyLead(ctx, id, { method: 'manual_email_confirmation', note: 'Replied from the address on file' }, 'compliance:t');
    expect(l.gates.contact_verified).toBe(true);
    expect(l.qualification_status).toBe('sales_ready_enquiry');
    expect(l.gates.eligible_for_outreach).toBe(false); // advisor approval still pending
    l = reviewLead(ctx, id, { decision: 'approve' }, 'advisor:t');
    expect(l.gates.eligible_for_outreach).toBe(true);
    expect(l.pipeline_stage).toBe('approved_contact');
  });

  it('a domain check alone never satisfies the contact-verified gate', async () => {
    await submitEnquiry(ctx, ENQUIRY, 'ip');
    const l = await verifyLead(ctx, leadsOf(ctx)[0].lead_id, { method: 'mx_check' }, 'a');
    expect(l.email_verification_status).toBe('domain_valid');
    expect(l.gates.contact_verified).toBe(false);
  });

  it('blocks contact-stage changes for ineligible leads', async () => {
    ingest(approveAndReturn(ctx), [SALE]);
    const id = leadsOf(ctx)[0].lead_id;
    reviewLead(ctx, id, { decision: 'approve' }, 'advisor:t');
    expect(() => setStage(ctx, id, { stage: 'meeting_scheduled' }, 'advisor:t')).toThrow(/not eligible/);
    expect(leadsOf(ctx)[0].pipeline_stage).toBe('research_approved');
  });

  it('only assigns approved leads', async () => {
    await submitEnquiry(ctx, ENQUIRY, 'ip');
    expect(() => assignLead(ctx, leadsOf(ctx)[0].lead_id, { assigned_advisor: 'A. Advisor' }, 'a')).toThrow(/approved/);
  });
});
function approveAndReturn(ctx) { approve(ctx); return ctx; }

describe('consent withdrawal and do-not-contact', () => {
  let ctx;
  beforeEach(async () => { ctx = makeCtx(); await submitEnquiry(ctx, ENQUIRY, 'ip'); });

  it('withdrawal suppresses the lead, blocks outreach, and survives re-submission', async () => {
    const id = leadsOf(ctx)[0].lead_id;
    const l = withdrawConsent(ctx, id, {}, 'compliance:t');
    expect(l.consent_status).toBe('withdrawn');
    expect(l.qualification_status).toBe('suppressed');
    expect(l.gates.eligible_for_outreach).toBe(false);
    await submitEnquiry(ctx, ENQUIRY, 'ip');
    expect(leadsOf(ctx)).toHaveLength(1);
  });

  it('deletion removes personal data but keeps the suppression', () => {
    const id = leadsOf(ctx)[0].lead_id;
    const l = withdrawConsent(ctx, id, { delete: true }, 'compliance:t');
    expect(l.business_email).toBeNull();
    expect(l.first_name).toBeNull();
    expect(isSuppressed(ctx, { email: ENQUIRY.email })).toBe(true);
  });

  it('a public withdrawal request is honoured immediately and uniformly', () => {
    const known = requestWithdrawal(ctx, { email: ENQUIRY.email });
    const unknown = requestWithdrawal(ctx, { email: 'nobody@example.com' });
    expect(known.message).toBe(unknown.message);
    expect(leadsOf(ctx)[0].do_not_contact_status).toBe(true);
  });

  it('a reviewer can suppress with do-not-contact', () => {
    const id = leadsOf(ctx)[0].lead_id;
    const l = suppressLead(ctx, id, { reason: 'asked not to be called', do_not_contact: true }, 'compliance:t');
    expect(l.qualification_status).toBe('suppressed');
    expect(isSuppressed(ctx, { phone: ENQUIRY.phone })).toBe(true);
  });

  it('expired retention redacts personal data', () => {
    const l = leadsOf(ctx)[0];
    l.retention_expiry = '2026-01-01T00:00:00Z';
    expect(applyRetention(ctx)).toBe(1);
    expect(ctx.store.get('leads', {})[l.lead_id]).toMatchObject({ business_email: null, expired: true, qualification_status: 'suppressed' });
  });
});

describe('CSV import and export', () => {
  let ctx;
  const HEADER = 'provider_record_id,first_name,last_name,company_name,business_email,country,intent_category,event_date,intent_class,consent_status,consent_timestamp,consent_text_version,permitted_purpose,permitted_recipient,preferred_contact_channel,permitted_channels';
  beforeEach(() => {
    ctx = makeCtx();
    addSource(ctx, { source_name: 'Test Provider', access_method: 'csv', geographic_coverage: ['CA', 'US'] }, 'admin:t');
  });
  const csvId = () => listSources(ctx).find((s) => s.access_method === 'csv').source_id;

  it('refuses to import into an unapproved source or a non-CSV source', async () => {
    await expect(importCsv(ctx, csvId(), `${HEADER}\n`, 'a')).rejects.toMatchObject({ status: 409 });
    approve(ctx);
    await expect(importCsv(ctx, 'globenewswire-ca', `${HEADER}\nx`, 'a')).rejects.toThrow(/not registered for CSV/);
  });

  it('validates headers and each row, recording a reason per rejected row', async () => {
    approve(ctx, csvId());
    await expect(importCsv(ctx, csvId(), 'a,b\n1,2', 'a')).rejects.toThrow(/Missing required column/);
    const rows = [
      HEADER,
      'P1,Ann,Sample,Acme Test,ann@example.com,CA,financial_advisor,2026-10-20,confirmed,granted,2026-10-20T10:00:00Z,v1,advice intro,Test Bank,email,email',
      'P2,Bob,Sample,Beta Test,bob@example.com,CA,financial_advisor,2026-10-20,confirmed,,,,,,,',
      'P3,Cy,Sample,Gamma Test,cy@example.com,FR,financial_advisor,2026-10-20,,,,,,,,',
      ',Di,Sample,Delta Test,di@example.com,CA,financial_advisor,2026-10-20,,,,,,,,',
      'P5,Ed,Sample,Echo Test,not-an-email,CA,financial_advisor,2026-10-20,,,,,,,,',
      'P6,Flo,Sample,Foxtrot Test,flo@example.com,CA,retirement_planning,not-a-date,,,,,,,,',
      'P7,Gus,Sample,Golf Test,gus@example.com,CA,wealth_management,2026-10-19,inferred,,,,,,,',
    ];
    const s = await importCsv(ctx, csvId(), rows.join('\n'), 'admin:t');
    expect(s).toMatchObject({ total: 7, accepted: 2, rejected: 5 });
    expect(s.batch_id).toMatch(/^IMP-/);
    expect(s.rejections.map((r) => r.reason).join('|')).toMatch(/consent evidence.*country.*provenance.*valid address.*valid date/);
    const confirmed = leadsOf(ctx).find((l) => l.intent_class === 'confirmed');
    expect(confirmed.consent_status).toBe('granted');
    expect(confirmed.import_batch_id).toBe(s.batch_id);
  });

  it('skips suppressed contacts and duplicates on re-import', async () => {
    approve(ctx, csvId());
    const row = 'P1,Ann,Sample,Acme Test,ann@example.com,CA,financial_advisor,2026-10-20,,,,,,,,';
    await importCsv(ctx, csvId(), `${HEADER}\n${row}`, 'a');
    const again = await importCsv(ctx, csvId(), `${HEADER}\n${row}`, 'a');
    expect(again.duplicates).toBe(1);
    expect(leadsOf(ctx)).toHaveLength(1);
  });

  it('exports only what the role may see, never suppressed records, and neutralises formulas', async () => {
    approve(ctx);
    ingest(ctx, [SALE, APPOINT]);
    await submitEnquiry(ctx, { ...ENQUIRY, name: '=HYPERLINK("http://evil.test")' }, 'ip');
    const [first] = leadsOf(ctx);
    suppressLead(ctx, first.lead_id, { reason: 'test' }, 'compliance:t');
    const viewer = exportCsv(ctx, null, perms('viewer'), 'viewer:t');
    expect(viewer.rows).toBe(leadsOf(ctx).length - 1);
    expect(viewer.csv).not.toContain(ENQUIRY.email);
    expect(viewer.csv).not.toContain(first.lead_id);
    expect(viewer.csv).toContain("'=HYPERLINK");
    const admin = exportCsv(ctx, null, perms('admin'), 'admin:t');
    expect(admin.csv).toContain(ENQUIRY.email);
    expect(ctx.store.get('audit', []).filter((a) => a.action === 'export.csv')).toHaveLength(2);
  });

  it('parses quoted CSV and escapes cells', () => {
    expect(parseCsv('a,b\n"x,1","y ""q"""\n')).toEqual([['a', 'b'], ['x,1', 'y "q"']]);
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('+1')).toBe("'+1");
  });
});

describe('provider-attested CSV import (advisor-matching networks)', () => {
  let ctx, sid;
  const HDR = 'Lead ID,First Name,Last Name,Email,Phone,State,Zip,Created At,Investable Assets,Consent Status';
  const ATTEST = { ...GOOD_PERM, permitted_geographies: ['US'], consent_basis: 'provider_attested', permitted_recipient: 'Test Advisory LLC',
    contact_permission_status: 'contract s.4: consumer opted in to be contacted by recipient', personal_data_processing_allowed: true, licence_reference: 'CONTRACT-TEST-9' };
  beforeEach(() => {
    ctx = makeCtx();
    sid = addSource(ctx, { source_name: 'Test Matching Network', access_method: 'csv', geographic_coverage: ['US'] }, 'a').source_id;
    setPermission(ctx, sid, ATTEST, 'admin:t');
  });

  it('requires the contract details on record before attested consent can be approved', () => {
    expect(() => setPermission(ctx, sid, { ...ATTEST, permitted_recipient: '' }, 'a')).toThrow(/permitted recipient/);
    expect(() => setPermission(ctx, sid, { ...ATTEST, contact_permission_status: '' }, 'a')).toThrow(/contact permission/);
    expect(() => setPermission(ctx, sid, { ...ATTEST, personal_data_processing_allowed: false }, 'a')).toThrow(/personal-data processing/);
    ctx.store.get('permissions', {})[sid] = { ...ATTEST, permitted_recipient: null, approval_timestamp: new Date(NOW).toISOString(), approved_by: 'x' };
    expect(getSource(ctx, sid).permission.allowed).toBe(false); // an incomplete stored record still blocks
  });

  it('reads a typical provider export, defaults country and category, and labels consent as provider-attested', async () => {
    const csv = [HDR,
      'L-1,Ann,Sample,ann.sample@example.com,312-555-0101,IL,60601,2026-10-20T10:00:00Z,$500k-$1M,',
      'L-2,Bob,Sample,,,TX,75001,2026-10-20T11:00:00Z,,',
      'L-3,,,cy@example.com,,TX,75001,2026-10-20T11:00:00Z,,',
      'L-4,Di,Sample,di@example.com,,NY,10001,2026-10-20T11:00:00Z,,withdrawn',
      'L-5,Ed,Sample,not-an-email,,NY,10001,2026-10-20T11:00:00Z,,'].join('\n');
    const s = await importCsv(ctx, sid, csv, 'admin:t');
    expect(s).toMatchObject({ total: 5, accepted: 1, rejected: 4 });
    expect(s.rejections.map((r) => r.reason).join('|')).toMatch(/No contact details.*Identity unclear.*not consented.*valid address/);
    const l = leadsOf(ctx)[0];
    expect(l).toMatchObject({
      intent_class: 'confirmed', intent_category: 'financial_advisor', country: 'US', state_or_province: 'IL', consent_basis: 'provider_attested',
      consent_status: 'granted', permitted_recipient: 'Test Advisory LLC', consent_text_version: `provider-attested:${sid}`,
      wealth_status: 'self_reported', wealth_range: '$500k-$1M', preferred_contact_channel: 'email', permitted_channels: ['email', 'phone'],
    });
    expect(l.consent_timestamp).toBe('2026-10-20T10:00:00.000Z'); // the lead's own submission time
    expect(l.tags).toContain('consent:provider_attested');
  });

  it('still needs verified contact and advisor approval before outreach, and stays suppressible', async () => {
    await importCsv(ctx, sid, `${HDR}\nL-1,Ann,Sample,ann.sample@example.com,,IL,60601,2026-10-20T10:00:00Z,,`, 'a');
    const id = leadsOf(ctx)[0].lead_id;
    let l = leadsOf(ctx)[0];
    expect(l.gates.consent_verified).toBe(true);
    expect(l.gates.contact_verified).toBe(false);
    expect(l.qualification_status).toBe('needs_manual_review');
    expect(l.gates.eligible_for_outreach).toBe(false);
    l = await verifyLead(ctx, id, { method: 'manual_email_confirmation', note: 'Confirmed by reply to the address' }, 'compliance:t');
    expect(l.qualification_status).toBe('sales_ready_enquiry');
    l = reviewLead(ctx, id, { decision: 'approve' }, 'advisor:t');
    expect(l.gates.eligible_for_outreach).toBe(true);
    withdrawConsent(ctx, id, {}, 'compliance:t');
    expect(leadsOf(ctx)[0].gates.eligible_for_outreach).toBe(false);
    const again = await importCsv(ctx, sid, `${HDR}\nL-9,Ann,Sample,ann.sample@example.com,,IL,60601,2026-10-21T10:00:00Z,,`, 'a');
    expect(again.accepted).toBe(0); // withdrawn contacts cannot be re-imported
  });

  it('does not relax strict sources: they still need per-row consent proof', async () => {
    const strict = addSource(ctx, { source_name: 'Strict Provider', access_method: 'csv', geographic_coverage: ['US'] }, 'a').source_id;
    approve(ctx, strict, { permitted_geographies: ['US'] });
    await expect(importCsv(ctx, strict, `${HDR}\nL-1,Ann,Sample,a@example.com,,IL,60601,2026-10-20T10:00:00Z,,`, 'a')).rejects.toThrow(/Missing required column/);
  });
});

describe('ingestion reliability', () => {
  it('retries a failing provider with backoff, then records the failure', async () => {
    let calls = 0; const sleeps = [];
    const ctx = makeCtx({ fetchSource: async () => { calls++; throw new Error('HTTP 503'); }, sleep: async (ms) => sleeps.push(ms) });
    approve(ctx);
    const run = await runSource(ctx, 'globenewswire-ca', { trigger: 'scheduled' });
    expect(run.status).toBe('failed');
    expect(calls).toBe(3);
    expect(sleeps).toEqual([1000, 4000]);
    const src = getSource(ctx, 'globenewswire-ca');
    expect(src.error_message).toBe('HTTP 503');
    expect(src.connected).toBe(false);
    expect(src.source_health).toBe('degraded');
  });

  it('flags a source as failing after repeated failures', async () => {
    let t = NOW;
    const ctx = makeCtx({ now: () => t, fetchSource: async () => { throw new Error('down'); } });
    approve(ctx);
    for (let i = 0; i < 3; i++) { await runSource(ctx, 'globenewswire-ca', { trigger: 'scheduled' }); t += 3600e3; }
    const src = getSource(ctx, 'globenewswire-ca');
    expect(src.source_health).toBe('failing');
    expect(src.alert).toBe(true);
  });

  it('does not run the same source twice at once', async () => {
    let release;
    const gate = new Promise((r) => { release = r; });
    const ctx = makeCtx({ fetchSource: async () => { await gate; return [SALE]; } });
    approve(ctx);
    const first = runSource(ctx, 'globenewswire-ca', { trigger: 'scheduled' });
    const second = await runSource(ctx, 'globenewswire-ca', { trigger: 'scheduled' });
    expect(second.status).toBe('skipped_overlap');
    release();
    expect((await first).status).toBe('success');
  });

  it('respects a rate-limit floor between manual refreshes', async () => {
    const ctx = makeCtx();
    approve(ctx);
    expect((await runSource(ctx, 'globenewswire-ca', { trigger: 'manual' })).status).toBe('success');
    expect((await runSource(ctx, 'globenewswire-ca', { trigger: 'manual' })).status).toBe('skipped_rate_limit');
  });

  it('does not fetch paused sources and has no connector for API-only sources', async () => {
    const ctx = makeCtx();
    approve(ctx);
    ctx.store.set('source_state', { 'globenewswire-ca': { paused: true } });
    expect((await runSource(ctx, 'globenewswire-ca', { trigger: 'scheduled' })).status).toBe('skipped_paused');
    const api = addSource(ctx, { source_name: 'Licensed API', access_method: 'api', source_url: 'https://api.example.test/v1' }, 'a');
    approve(ctx, api.source_id);
    const run = await runSource(ctx, api.source_id, { trigger: 'scheduled' });
    expect(run.status).toBe('failed');
    expect(run.error).toMatch(/No connector is implemented/);
  });

  it('replays a stored batch idempotently', async () => {
    const ctx = makeCtx();
    approve(ctx);
    const run = await runSource(ctx, 'globenewswire-ca', { trigger: 'scheduled' });
    const before = leadsOf(ctx).length;
    const replay = replayBatch(ctx, 'globenewswire-ca', run.run_id, 'admin:t');
    expect(replay.replay_of).toBe(run.run_id);
    expect(leadsOf(ctx)).toHaveLength(before);
  });

  it('reads robots.txt: disallow blocks, 404 allows, unreadable fails closed', async () => {
    const txt = 'User-agent: *\nDisallow: /private';
    expect(await robotsAllows('https://example.test/private/x', async () => txt)).toBe(false);
    expect(await robotsAllows('https://example.test/public', async () => txt)).toBe(true);
    expect(await robotsAllows('https://example.test/x', async () => { throw Object.assign(new Error('nf'), { status: 404 }); })).toBe(true);
    expect(await robotsAllows('https://example.test/x', async () => { throw new Error('timeout'); })).toBe(false);
  });
});

describe('empty states, masking and audit', () => {
  it('reports honest empty metrics', () => {
    const ctx = makeCtx();
    const m = computeMetrics(ctx, listSources(ctx));
    expect(m.totals.leads).toBe(0);
    expect(m.confirmed_intent_pct).toBeNull();
    expect(m.conversion_rate_pct).toBeNull();
    expect(m.cost_per_qualified_lead).toBeNull();
    expect(m.source_freshness.every((s) => s.last_successful_fetch === null)).toBe(true);
  });

  it('masks contact details for roles without leads.contact', async () => {
    const ctx = makeCtx();
    await submitEnquiry(ctx, ENQUIRY, 'ip');
    const lead = leadsOf(ctx)[0];
    const masked = serializeLead(lead, perms('viewer'));
    expect(masked.business_email).toMatch(/^j\*\*\*@e\*\*\*/);
    expect(masked.contact_masked).toBe(true);
    expect(serializeLead(lead, perms('admin')).business_email).toBe(ENQUIRY.email);
    expect(serializeLead(lead, perms('admin')).email_confirmation_token_hash).toBeUndefined();
  });

  it('writes audit entries with actors and keeps personal data out of them', async () => {
    const ctx = makeCtx();
    await submitEnquiry(ctx, ENQUIRY, 'ip');
    const id = leadsOf(ctx)[0].lead_id;
    await verifyLead(ctx, id, { method: 'mx_check' }, 'compliance:abc123');
    reviewLead(ctx, id, { decision: 'escalate', note: 'check wording' }, 'advisor:def456');
    const log = ctx.store.get('audit', []);
    expect(log.map((a) => a.action)).toEqual(expect.arrayContaining(['lead.created', 'lead.verify', 'lead.review.escalate']));
    expect(log.find((a) => a.action === 'lead.verify').actor).toBe('compliance:abc123');
    expect(JSON.stringify(log)).not.toContain(ENQUIRY.email);
    expect(JSON.stringify(ctx.store.get('rejections', []))).not.toContain('Jane');
  });

  it('ensures the system enquiry source carries its own rights record', () => {
    const ctx = makeCtx();
    ensureSystemPermissions(ctx);
    expect(getSource(ctx, 'website-enquiry').permission.allowed).toBe(true);
  });
});

describe('origin tags and the received-data archive', () => {
  let ctx;
  const records = () => Object.values(ctx.store.get('records', {}));
  beforeEach(() => { ctx = makeCtx(); approve(ctx); });

  it('archives every received item (accepted, rejected, duplicate) with origin tags', () => {
    const junk = { title: 'Should investors buy this stock after the acquisition?', link: 'https://example.test/junk', date: '2026-10-22T08:00:00Z' };
    const run = ingest(ctx, [SALE, junk]);
    ingest(ctx, [SALE]);
    const byStatus = Object.fromEntries(records().map((r) => [r.title.slice(0, 12), r.status]));
    expect(byStatus['Maple Test I']).toBe('accepted'); // a repeat sighting keeps its original outcome
    expect(records().find((r) => r.url === junk.link)).toMatchObject({ status: 'rejected', reason: expect.stringMatching(/Opinion/) });
    const sale = records().find((r) => r.url === SALE.link);
    expect(sale.seen_count).toBe(2);
    expect(sale.lead_id).toBeTruthy();
    expect(sale.tags).toEqual(expect.arrayContaining(['source:globenewswire-ca', 'channel:rss', 'type:press_wire', 'geo:CA', 'status:accepted']));
    expect(sale.first_run_id).toBe(run.run_id); // tags carry the latest run; the first one is kept separately
    expect(sale.tags).toContain(`run:${sale.run_id}`);
    expect(records()).toHaveLength(2); // repeat sightings update one row
  });

  it('tags leads with where they were received and keeps derived tags current', () => {
    const run = ingest(ctx, [SALE]);
    const l = leadsOf(ctx)[0];
    expect(l.tags).toEqual(expect.arrayContaining(['source:globenewswire-ca', 'channel:rss', `run:${run.run_id}`, 'class:strong_inferred', 'segment:research_qualified']));
    expect(l.received_via).toMatchObject({ source_id: 'globenewswire-ca', channel: 'rss', run_id: run.run_id });
    suppressLead(ctx, l.lead_id, { reason: 'test' }, 'compliance:t');
    const after = leadsOf(ctx)[0];
    expect(after.tags).toContain('segment:suppressed');
    expect(after.tags).not.toContain('segment:research_qualified');
  });

  it('filters leads by tag', () => {
    ingest(ctx, [SALE]);
    expect(listLeads(ctx, { tag: 'channel:rss' }, perms('admin')).total).toBe(1);
    expect(listLeads(ctx, { tag: 'channel:form' }, perms('admin')).total).toBe(0);
  });

  it('tags enquiry and CSV leads with their channel', async () => {
    await submitEnquiry(ctx, ENQUIRY, 'ip');
    const enq = leadsOf(ctx).find((l) => l.original_source_id === 'website-enquiry');
    expect(enq.tags).toEqual(expect.arrayContaining(['source:website-enquiry', 'channel:form', 'type:enquiry_form']));
    const src = addSource(ctx, { source_name: 'Tag Provider', access_method: 'csv' }, 'a');
    approve(ctx, src.source_id);
    const s = await importCsv(ctx, src.source_id, 'provider_record_id,company_name,country,intent_category,event_date\nP1,Acme Test,CA,financial_advisor,2026-10-20', 'a');
    const csvLead = leadsOf(ctx).find((l) => l.original_source_id === src.source_id);
    expect(csvLead.tags).toEqual(expect.arrayContaining(['channel:csv', `batch:${s.batch_id}`]));
  });

  it('does not copy personal enquiry data into the public-record archive', async () => {
    await submitEnquiry(ctx, ENQUIRY, 'ip');
    expect(JSON.stringify(records())).not.toContain(ENQUIRY.email);
  });

  it('purges archived records after the source retention period', () => {
    approve(ctx, 'globenewswire-ca', { permitted_retention_days: 30 });
    ingest(ctx, [SALE]);
    expect(records()).toHaveLength(1);
    ctx.now = () => NOW + 31 * 864e5;
    applyRetention(ctx);
    expect(records()).toHaveLength(0);
  });

  it('serves the archive over HTTP with tag counts, and runs only approved sources', async () => {
    const tok = 'adminadminadmin1234';
    const handle = createApi(ctx);
    const call = async (method, url) => {
      const req = Object.assign(Readable.from([]), { method, headers: { authorization: `Bearer ${tok}` }, socket: { remoteAddress: '8.8.8.8' } });
      let status, out = '';
      await handle(req, { writeHead: (s) => { status = s; }, end: (d) => { out = d || ''; } }, new URL(url, 'http://x'));
      return { status, json: JSON.parse(out) };
    };
    const all = await call('POST', '/acq/sources/run-all');
    expect(all.status).toBe(200);
    expect(all.json.runs.map((r) => r.source_id)).toEqual(['globenewswire-ca']);
    expect(all.json.not_run_unapproved).toContain('newswire-ca');
    const rec = await call('GET', '/acq/records?status=accepted&tag=channel:rss');
    expect(rec.json.total).toBeGreaterThan(0);
    expect(rec.json.tag_counts['source:globenewswire-ca']).toBe(rec.json.total);
    expect((await call('GET', '/acq/records?status=rejected&tag=channel:form')).json.total).toBe(0);
    expect((await call('GET', '/acq/metrics')).json.records_archived).toBeGreaterThan(0);
  });
});

describe('never re-fetching data we already hold', () => {
  let ctx;
  const DAY = 864e5;
  beforeEach(() => { ctx = makeCtx(); approve(ctx); });

  it('does not re-evaluate or re-store items it already has, including earlier rejections', () => {
    const junk = { title: 'Should investors buy this stock after the acquisition?', link: 'https://example.test/junk2', date: '2026-10-22T08:00:00Z' };
    ingest(ctx, [SALE, junk]);
    const rejections = ctx.store.get('rejections', []).length;
    const run = ingest(ctx, [SALE, junk]);
    expect(run.already_have).toBe(2);
    expect(run.accepted + run.rejected + run.duplicates).toBe(0);
    expect(ctx.store.get('rejections', []).length).toBe(rejections);
    expect(leadsOf(ctx)).toHaveLength(1);
    expect(Object.values(ctx.store.get('records', {})).find((r) => r.url === SALE.link).seen_count).toBe(2);
  });

  it('asks only for the window since the last success, with feed validators and a "known" check', async () => {
    let t = NOW; const seen = [];
    const c = makeCtx({ now: () => t, fetchSource: async (s, hints) => { seen.push(hints); return Object.assign([SALE], { validators: { etag: '"v1"', last_modified: 'Thu, 22 Oct 2026 12:00:00 GMT' } }); } });
    approve(c);
    await runSource(c, 'globenewswire-ca', { trigger: 'scheduled' });
    t += 3 * DAY;
    await runSource(c, 'globenewswire-ca', { trigger: 'scheduled' });
    expect(seen[0]).toMatchObject({ days: 21, validators: undefined });
    expect(seen[1].days).toBe(4);
    expect(seen[1].validators.etag).toBe('"v1"');
    expect(seen[1].isKnown(SALE.link)).toBe(true);
    expect(seen[1].isKnown('https://example.test/never-seen')).toBe(false);
  });

  it('treats an unchanged feed (304) as a successful, zero-cost run', async () => {
    let t = NOW; let calls = 0;
    const c = makeCtx({ now: () => t, fetchSource: async () => (++calls === 1 ? Object.assign([SALE], { validators: { etag: '"v1"' } }) : Object.assign([], { notModified: true })) });
    approve(c);
    await runSource(c, 'globenewswire-ca', { trigger: 'scheduled' });
    const before = leadsOf(c).length;
    t += 2 * DAY;
    const run = await runSource(c, 'globenewswire-ca', { trigger: 'scheduled' });
    expect(run).toMatchObject({ status: 'success', not_modified: true, received: 0 });
    expect(leadsOf(c)).toHaveLength(before);
    expect(ctx && getSource(c, 'globenewswire-ca').connected).toBe(true);
    expect(c.store.get('source_state', {})['globenewswire-ca'].validators.etag).toBe('"v1"'); // kept for the next request
  });

  it('remembers SEC filings it read but could not use, so they are not downloaded again', async () => {
    let t = NOW; const seen = []; const base = 'https://www.sec.gov/Archives/edgar/data/1/000000000026000001/';
    const c = makeCtx({ now: () => t, fetchSource: async (s, hints) => { seen.push(hints); return Object.assign([], { unusable: seen.length === 1 ? [base] : [] }); } });
    approve(c);
    await runSource(c, 'globenewswire-ca', { trigger: 'scheduled' });
    expect(Object.values(c.store.get('records', {}))[0]).toMatchObject({ status: 'rejected', reason: /offering amount/ });
    t += DAY;
    await runSource(c, 'globenewswire-ca', { trigger: 'scheduled' });
    expect(seen[1].isKnown(base)).toBe(true);
  });

  it('EDGAR: filings already held are not downloaded; unreadable-amount ones are reported as unusable', async () => {
    const hit = (n) => ({ _id: `0000000000-26-00000${n}:primary_doc.xml`, _source: { ciks: [`000000${n}`], file_date: '2026-10-20' } });
    const good = '<edgarSubmission><primaryIssuer><entityName>Test Co Ltd.</entityName></primaryIssuer><totalAmountSold>900000</totalAmountSold></edgarSubmission>';
    const noAmount = '<edgarSubmission><primaryIssuer><entityName>Blank Test Ltd.</entityName></primaryIssuer></edgarSubmission>';
    const calls = [];
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      calls.push(String(url));
      const xml = String(url).includes('/1/') ? good : noAmount;
      return { ok: true, json: async () => ({ hits: { hits: [hit(1), hit(2), hit(3)] } }), text: async () => xml };
    });
    try {
      const known = new Set(['https://www.sec.gov/Archives/edgar/data/1/000000000026000001/']);
      const items = await fetchFormD({ days: 5, isKnown: (l) => known.has(l) });
      const xmlCalls = calls.filter((c) => c.endsWith('primary_doc.xml'));
      expect(xmlCalls).toHaveLength(2);                       // filing 1 was already held
      expect(xmlCalls.some((c) => c.includes('/1/'))).toBe(false);
      expect(items.skippedKnown).toBe(1);
      expect(items.unusable).toHaveLength(2);                 // both remaining filings carry no amount here
    } finally { spy.mockRestore(); }
  });

  it('sends conditional-request headers and reads the validators back', async () => {
    const calls = [];
    const feed = '<rss><channel><item><title>T</title><link>https://x.test/1</link></item></channel></rss>';
    const spy = vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(async (u, o) => { calls.push(o.headers); return { status: 304, ok: false, headers: { get: () => null } }; })
      .mockImplementationOnce(async (u, o) => { calls.push(o.headers); return { status: 200, ok: true, text: async () => feed, headers: { get: (n) => ({ etag: '"b"', 'last-modified': 'Fri, 23 Oct 2026 00:00:00 GMT' })[n.toLowerCase()] } }; });
    try {
      const v = { etag: '"a"', last_modified: 'Thu, 22 Oct 2026 00:00:00 GMT' };
      const unchanged = await fetchSource({ kind: 'rss', url: 'https://x.test/feed' }, { validators: v });
      expect(unchanged.notModified).toBe(true);
      expect(calls[0]).toMatchObject({ 'If-None-Match': '"a"', 'If-Modified-Since': v.last_modified });
      const fresh = await fetchSource({ kind: 'rss', url: 'https://x.test/feed' }, { validators: v });
      expect(fresh).toHaveLength(1);
      expect(fresh.validators).toEqual({ etag: '"b"', last_modified: 'Fri, 23 Oct 2026 00:00:00 GMT' });
    } finally { spy.mockRestore(); }
  });
});

describe('lead-quality fixes', () => {
  let ctx;
  beforeEach(() => { ctx = makeCtx(); approve(ctx); approve(ctx, 'newswire-ca'); approve(ctx, 'edgar-form-d-ca'); });
  const formD = (over = {}, meta = {}) => ({
    title: 'Test Mining Ltd. closes $1,200,000 private placement', link: 'https://example.test/fd1/', date: '2026-10-22T00:00:00Z',
    summary: 'Test Mining Ltd. of VANCOUVER, BC, Canada filed SEC Form D reporting a $1,200,000 private placement financing.',
    meta: { formD: true, amount: 1200000, entityType: 'Corporation', industryGroup: 'Other', isFund: false, persons: [{ name: 'Pat Example', roles: ['Director'] }, { name: 'Sam Sample', roles: ['Executive Officer', 'Director'] }], ...meta },
    ...over,
  });

  it('classifies a "bought deal" private placement as financing, not an IPO, and ignores the US-distribution legend', () => {
    ingest(ctx, [{ title: 'Hercules Test Metals Announces Upsize of "Bought Deal" Private Placement of Common Shares to $45 Million', link: 'https://example.test/h1', date: '2026-10-22T09:00:00Z', summary: 'NOT FOR DISTRIBUTION TO U.S. NEWS WIRE SERVICES OR FOR DISSEMINATION IN THE UNITED STATES' }]);
    const l = leadsOf(ctx)[0];
    expect(l.intent_category).toBe('corporate_financing');
    expect(l.intent_class).toBe('weak_inferred');
    expect(l.country).toBe('CA');
  });

  it('tags a US deal on a Canadian wire as US, and does not misread company names as US states', () => {
    ingest(ctx, [{ title: 'Broker Test Services Advises on the Sale of Mount Pleasant Test Motors in Mount Pleasant, Iowa, from Coleman Test Group to Lani Test Group', link: 'https://example.test/i1', date: '2026-10-22T09:00:00Z' }], 'newswire-ca');
    expect(leadsOf(ctx)[0]).toMatchObject({ country: 'US', intent_category: 'business_sale_or_acquisition', qualification_status: 'research_qualified' });
    expect(detectCountry('Nevada Copper Corp. to be acquired', { geographic_coverage: ['CA', 'US'] })).toBeNull();
    expect(detectCountry('Acme, a Delaware corporation, raised funds', { geographic_coverage: ['CA', 'US'] })).toBeNull();
  });

  it('keeps weak background signals on a watchlist, out of the review queue and the qualified count', () => {
    ingest(ctx, [APPOINT]);
    const l = leadsOf(ctx)[0];
    expect(l.qualification_status).toBe('watchlist');
    const m = computeMetrics(ctx, listSources(ctx));
    expect(m.totals.qualified).toBe(0);
    expect(m.review_queue_size).toBe(0);
  });

  it('rejects pooled funds, partnership vehicles and tiny Form D raises, each with a reason', () => {
    const run = ingest(ctx, [
      formD({ link: 'https://example.test/f1/' }, { isFund: true }),
      formD({ link: 'https://example.test/f2/' }, { entityType: 'Limited Partnership' }),
      formD({ link: 'https://example.test/f3/' }, { amount: 2132 }),
    ], 'edgar-form-d-ca');
    expect(run.accepted).toBe(0);
    expect(Object.keys(run.reject_reasons)).toEqual(expect.arrayContaining([expect.stringMatching(/Pooled investment fund/), expect.stringMatching(/Partnership vehicle/), expect.stringMatching(/Below minimum deal size/)]));
  });

  it('names the executive officer from the filing as the decision-maker and keeps the other roles', () => {
    ingest(ctx, [formD()], 'edgar-form-d-ca');
    const l = leadsOf(ctx)[0];
    expect(l.display_name).toBe('Sam Sample');
    expect(l.professional_title).toMatch(/Executive Officer.*per SEC Form D/);
    expect(l.company_name).toBe('Test Mining Ltd.');
    expect(l.related_persons.map((p) => p.name)).toEqual(['Pat Example', 'Sam Sample']);
    expect(l.business_email).toBeNull(); // naming someone is not contact permission
    expect(l.gates.eligible_for_outreach).toBe(false);
  });

  it('parses names, roles, fund and entity facts from a Form D without keeping street addresses', async () => {
    const xml = `<edgarSubmission><primaryIssuer><entityName>Test Mining Ltd.</entityName><city>Vancouver</city><stateOrCountry>A1</stateOrCountry></primaryIssuer>
      <entityType>Corporation</entityType><industryGroup><industryGroupType>Other</industryGroupType></industryGroup>
      <relatedPersonsList><relatedPersonInfo><relatedPersonName><firstName>Sam</firstName><lastName>Sample</lastName></relatedPersonName>
      <relatedPersonAddress><street1>1 Private Street</street1><city>Vancouver</city></relatedPersonAddress>
      <relatedPersonRelationshipList><relationship>Executive Officer</relationship><relationship>Director</relationship></relatedPersonRelationshipList></relatedPersonInfo></relatedPersonsList>
      <offeringSalesAmounts><totalAmountSold>1200000</totalAmountSold></offeringSalesAmounts></edgarSubmission>`;
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => ({
      ok: true, json: async () => ({ hits: { hits: [{ _id: '0001062993-26-005252:primary_doc.xml', _source: { ciks: ['0001773838'], file_date: '2026-10-20' } }] } }), text: async () => xml,
    }));
    try {
      const items = await fetchFormD({ days: 7, limit: 1 });
      expect(items).toHaveLength(1);
      expect(items[0].meta).toMatchObject({ formD: true, amount: 1200000, entityType: 'Corporation', isFund: false, persons: [{ name: 'Sam Sample', roles: ['Executive Officer', 'Director'] }] });
      expect(JSON.stringify(items)).not.toContain('Private Street');
    } finally { spy.mockRestore(); }
  });
});

describe('one-click collection (quickstart)', () => {
  const adminTok = 'adminadminadmin1234', advisorTok = 'advisoradvisor1234';
  let ctx, handle;
  const call = async (method, url, { token = adminTok, body } = {}) => {
    const req = Object.assign(Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []), { method, headers: { authorization: `Bearer ${token}` }, socket: { remoteAddress: '7.7.7.7' } });
    let status, out = '';
    await handle(req, { writeHead: (s) => { status = s; }, end: (d) => { out = d || ''; } }, new URL(url, 'http://x'));
    return { status, json: JSON.parse(out) };
  };
  beforeEach(() => { ctx = makeCtx(); handle = createApi(ctx); });

  it('needs an administrator and an explicit confirmation of the terms review', async () => {
    expect((await call('POST', '/acq/quickstart', { token: advisorTok, body: { confirm: true, reviewed_terms: true } })).status).toBe(403);
    expect((await call('POST', '/acq/quickstart', { body: {} })).status).toBe(400);
    expect((await call('POST', '/acq/quickstart', { body: { confirm: true } })).status).toBe(400);
    expect(Object.keys(ctx.store.get('permissions', {}))).toEqual(['website-enquiry']);
    expect(leadsOf(ctx)).toHaveLength(0);
  });

  it('approves only the recommended public sources, records who approved, then collects', async () => {
    const r = await call('POST', '/acq/quickstart', { body: { confirm: true, reviewed_terms: true } });
    expect(r.status).toBe(200);
    expect(r.json.approved.sort()).toEqual(['edgar-13d', 'edgar-form-d-ca', 'globenewswire-ca', 'newswire-ca']);
    expect(r.json.runs.length).toBe(4);
    expect(r.json.not_run_unapproved).toEqual(expect.arrayContaining(['news-globe', 'news-fp']));
    const perm = ctx.store.get('permissions', {})['globenewswire-ca'];
    expect(perm.approved_by).toMatch(/^admin:/);
    expect(perm.licence_reference).toContain('Operator attestation by admin:');
    expect(getSource(ctx, 'news-globe').permission.allowed).toBe(false); // Google News feeds need their own review
    expect(leadsOf(ctx).length).toBeGreaterThan(0);
    expect(ctx.store.get('audit', []).some((a) => a.action === 'source.quickstart')).toBe(true);
  });

  it('never overrides an existing approval or an explicit prohibition', async () => {
    approve(ctx, 'globenewswire-ca', { licence_reference: 'CONTRACT-42' });
    ctx.store.get('permissions', {})['edgar-13d'] = { status: 'prohibited' };
    const r = await call('POST', '/acq/quickstart', { body: { confirm: true, reviewed_terms: true } });
    expect(r.json.approved).not.toContain('globenewswire-ca');
    expect(r.json.approved).not.toContain('edgar-13d');
    expect(ctx.store.get('permissions', {})['globenewswire-ca'].licence_reference).toBe('CONTRACT-42');
    expect(ctx.store.get('permissions', {})['edgar-13d'].status).toBe('prohibited');
  });
});

describe('HTTP API: authentication, authorization, rate limiting', () => {
  const adminTok = 'adminadminadmin1234', viewerTok = 'viewerviewer123456', advisorTok = 'advisoradvisor1234';
  async function call(handle, method, url, { token, body, text } = {}) {
    const payload = text ?? (body ? JSON.stringify(body) : '');
    const req = Object.assign(Readable.from(payload ? [Buffer.from(payload)] : []), { method, headers: token ? { authorization: `Bearer ${token}` } : {}, socket: { remoteAddress: '9.9.9.9' } });
    let status; let out = '';
    const res = { writeHead: (s) => { status = s; }, end: (d) => { out = d || ''; } };
    const handled = await handle(req, res, new URL(url, 'http://x'));
    let json; try { json = JSON.parse(out); } catch { json = null; }
    return { handled, status, json, text: out };
  }

  it('requires a valid token and enforces role permissions', async () => {
    const ctx = makeCtx();
    const handle = createApi(ctx);
    expect((await call(handle, 'GET', '/acq/sources')).status).toBe(401);
    expect((await call(handle, 'GET', '/acq/sources', { token: 'wrong-wrong-wrong-wrong' })).status).toBe(401);
    expect((await call(handle, 'GET', '/acq/sources', { token: viewerTok })).status).toBe(200);
    expect((await call(handle, 'POST', '/acq/sources', { token: viewerTok, body: { source_name: 'x', access_method: 'csv' } })).status).toBe(403);
    expect((await call(handle, 'POST', '/acq/export', { token: viewerTok, body: {} })).status).toBe(403);
    expect((await call(handle, 'POST', '/acq/leads/ACQ-X/suppress', { token: advisorTok, body: {} })).status).toBe(403);
    expect((await call(handle, 'GET', '/acq/audit', { token: advisorTok })).status).toBe(403);
    expect((await call(handle, 'PUT', '/acq/sources/globenewswire-ca/permission', { token: adminTok, body: GOOD_PERM })).status).toBe(200);
  });

  it('leaves the enquiry config public and only handles /acq paths', async () => {
    const handle = createApi(makeCtx());
    const cfg = await call(handle, 'GET', '/acq/enquiry/config');
    expect(cfg.status).toBe(200);
    expect(cfg.json.configured).toBe(true);
    expect(cfg.json.consent.share).toContain('Test Bank Wealth');
    expect((await call(handle, 'GET', '/leads')).handled).toBe(false);
  });

  it('rate-limits the public enquiry endpoint and rejects bad input without leaking internals', async () => {
    const handle = createApi(makeCtx());
    const bad = await call(handle, 'POST', '/acq/enquiry', { body: { ...ENQUIRY, email: 'x' } });
    expect(bad.status).toBe(400);
    const codes = [];
    for (let i = 0; i < 6; i++) codes.push((await call(handle, 'POST', '/acq/enquiry', { body: { ...ENQUIRY, consent_share: false } })).status);
    expect(codes).toContain(429);
  });

  it('rejects malformed JSON and invalid ids', async () => {
    const handle = createApi(makeCtx());
    expect((await call(handle, 'POST', '/acq/sources', { token: adminTok, text: '{bad' })).status).toBe(400);
    expect((await call(handle, 'GET', '/acq/leads/..%2Fetc', { token: adminTok })).status).toBe(400);
    expect((await call(handle, 'GET', '/acq/leads/ACQ-NOPE', { token: adminTok })).status).toBe(404);
  });

  it('runs the end-to-end flow over HTTP: approve source, refresh, list, review, export', async () => {
    const ctx = makeCtx();
    const handle = createApi(ctx);
    await call(handle, 'PUT', '/acq/sources/globenewswire-ca/permission', { token: adminTok, body: GOOD_PERM });
    const refresh = await call(handle, 'POST', '/acq/sources/globenewswire-ca/refresh', { token: adminTok });
    expect(refresh.json.run.status).toBe('success');
    const list = await call(handle, 'GET', '/acq/leads?kind=inferred&min_score=20', { token: advisorTok });
    expect(list.json.total).toBeGreaterThan(0);
    const id = list.json.leads[0].lead_id;
    const detail = await call(handle, 'GET', `/acq/leads/${id}`, { token: advisorTok });
    expect(detail.json.lead.intent_score_reasons.length).toBe(6);
    const review = await call(handle, 'POST', `/acq/leads/${id}/review`, { token: advisorTok, body: { decision: 'approve' } });
    expect(review.json.lead.review_status).toBe('approved');
    const csv = await call(handle, 'POST', '/acq/export', { token: advisorTok, body: {} });
    expect(csv.status).toBe(200);
    expect(csv.text.split('\r\n')[0]).toContain('outreach_eligibility');
    const metrics = await call(handle, 'GET', '/acq/metrics', { token: viewerTok });
    expect(metrics.json.totals.leads).toBeGreaterThan(0);
    const crm = await call(handle, 'GET', '/acq/crm-leads', { token: advisorTok });
    expect(crm.json.leads.map((l) => l.id)).toContain(id);
    expect(crm.json.leads[0].aiAnalysis.complianceNotice).toMatch(/Not eligible for outreach/);
  });
});

describe('questionnaire and advisor matching', () => {
  let ctx;
  const Q = { age_range: '50_59', marital_status: 'married_or_partnered', household_income_range: '250k_500k', home_ownership: 'own', owns_business: 'yes', goals: ['retire_comfortably', 'reduce_taxes'], postal_code: 'm5v 2t6', asset_range: '1m_5m', state_or_province: 'ON' };
  const adv = (over) => ({ advisor_id: 'a1', name: 'Alex Advisor', regions: ['CA'], asset_ranges: ['1m_5m'], capacity: 5, ...over });
  beforeEach(() => { ctx = makeCtx(); });

  it('stores validated optional answers on the lead and normalises the postal code', async () => {
    await submitEnquiry(ctx, { ...ENQUIRY, ...Q }, 'ip');
    const [l] = leadsOf(ctx);
    expect(l.questionnaire).toMatchObject({ age_range: '50_59', owns_business: 'yes', postal_code: 'M5V2T6', goals: ['retire_comfortably', 'reduce_taxes'] });
  });

  it('keeps the form valid with no answers and rejects unknown values', async () => {
    await submitEnquiry(ctx, ENQUIRY, 'ip');
    expect(leadsOf(ctx)[0].questionnaire).toBeNull();
    await expect(submitEnquiry(ctx, { ...ENQUIRY, age_range: '999' }, 'ip')).rejects.toThrow(/age/);
    await expect(submitEnquiry(ctx, { ...ENQUIRY, goals: ['get_rich'] }, 'ip')).rejects.toThrow(/goals/);
    await expect(submitEnquiry(ctx, { ...ENQUIRY, postal_code: '12' }, 'ip')).rejects.toThrow(/postal/i);
  });

  it('erases questionnaire answers when consent is withdrawn with deletion', async () => {
    await submitEnquiry(ctx, { ...ENQUIRY, ...Q }, 'ip');
    const [l] = leadsOf(ctx);
    withdrawConsent(ctx, l.lead_id, { delete: true }, 'admin:test');
    expect(ctx.store.get('leads', {})[l.lead_id].questionnaire).toBeNull();
  });

  it('suggests at most three advisors, filtered by location, asset level and capacity', async () => {
    const { saveAdvisor, matchAdvisors } = await import('../../scraper/acquisition/advisors.js');
    saveAdvisor(ctx, adv(), 'admin:test');
    saveAdvisor(ctx, adv({ advisor_id: 'a2', name: 'Bea Broker', regions: ['CA-ON'], specialties: ['retirement_planning'], goals: ['reduce_taxes'] }), 'admin:test');
    saveAdvisor(ctx, adv({ advisor_id: 'a3', name: 'Cy Wrongassets', asset_ranges: ['under_250k'] }), 'admin:test');
    saveAdvisor(ctx, adv({ advisor_id: 'a4', name: 'Di Wrongplace', regions: ['US'] }), 'admin:test');
    saveAdvisor(ctx, adv({ advisor_id: 'a5', name: 'Ed Inactive', active: false }), 'admin:test');
    saveAdvisor(ctx, adv({ advisor_id: 'a6', name: 'Flo Full', capacity: 0 }), 'admin:test');
    saveAdvisor(ctx, adv({ advisor_id: 'a7', name: 'Gus Seventh' }), 'admin:test');
    saveAdvisor(ctx, adv({ advisor_id: 'a8', name: 'Hal Eighth' }), 'admin:test');
    await submitEnquiry(ctx, { ...ENQUIRY, advice_type: 'retirement_planning', ...Q }, 'ip');
    const m = matchAdvisors(ctx, leadsOf(ctx)[0]);
    expect(m).toHaveLength(3);
    expect(m[0].advisor_id).toBe('a2'); // province match + specialty + shared goal outranks the rest
    expect(m.map((x) => x.advisor_id)).not.toEqual(expect.arrayContaining(['a3', 'a4', 'a5', 'a6']));
  });

  it('never guesses wealth: with no stated assets only advisors who accept every range match', async () => {
    const { saveAdvisor, matchAdvisors } = await import('../../scraper/acquisition/advisors.js');
    saveAdvisor(ctx, adv(), 'admin:test');
    saveAdvisor(ctx, adv({ advisor_id: 'all', name: 'Any Level', asset_ranges: ['under_250k', '250k_1m', '1m_5m', '5m_plus'] }), 'admin:test');
    await submitEnquiry(ctx, ENQUIRY, 'ip');
    expect(matchAdvisors(ctx, leadsOf(ctx)[0]).map((x) => x.advisor_id)).toEqual(['all']);
  });

  it('validates advisor profiles', async () => {
    const { saveAdvisor } = await import('../../scraper/acquisition/advisors.js');
    expect(() => saveAdvisor(ctx, adv({ regions: ['FR'] }), 'admin')).toThrow(/regions/);
    expect(() => saveAdvisor(ctx, adv({ asset_ranges: ['lots'] }), 'admin')).toThrow(/asset_ranges/);
    expect(() => saveAdvisor(ctx, adv({ advisor_id: 'X Y' }), 'admin')).toThrow(/advisor_id/);
  });
});

describe('cookie consent and visitor analytics', () => {
  let ctx;
  const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120';
  const accept = () => recordVisitorConsent(ctx, { version: 'c1', analytics: true });
  beforeEach(() => { ctx = makeCtx(); });

  it('records nothing for a visitor who rejects, and ignores events without consent', () => {
    expect(recordVisitorConsent(ctx, { version: 'c1', analytics: false }).visitor_id).toBeNull();
    expect(Object.keys(ctx.store.get('visitors', {}))).toHaveLength(0);
    expect(recordVisit(ctx, { visitor_id: 'v_' + 'a'.repeat(32), path: '/enquiry.html' }, DESKTOP).recorded).toBe(false);
    expect(ctx.store.get('visits', [])).toHaveLength(0);
  });

  it('requires an explicit boolean and the current notice version', () => {
    expect(() => recordVisitorConsent(ctx, { version: 'c0', analytics: true })).toThrow(/changed/);
    expect(() => recordVisitorConsent(ctx, { version: 'c1', analytics: 'yes' })).toThrow(/true or false/);
  });

  it('treats Global Privacy Control as a rejection even if analytics: true is sent', () => {
    expect(recordVisitorConsent(ctx, { version: 'c1', analytics: true, gpc: true }).visitor_id).toBeNull();
  });

  it('records page views after opt-in with no IP, only a referrer host and a device class', () => {
    const { visitor_id } = accept();
    expect(visitor_id).toMatch(/^v_[0-9a-f]{32}$/);
    const r = recordVisit(ctx, { visitor_id, path: '/calculator.html', referrer: 'https://news.example.com/a?b=1', utm_source: 'newsletter' }, DESKTOP);
    expect(r.recorded).toBe(true);
    const [ev] = ctx.store.get('visits', []);
    expect(ev).toMatchObject({ path: '/calculator.html', referrer_host: 'news.example.com', utm_source: 'newsletter', device: 'desktop' });
    expect(JSON.stringify(ev)).not.toMatch(/\d+\.\d+\.\d+\.\d+|Mozilla/);
    expect(ctx.store.get('visitors', {})[visitor_id].first_touch.landing_path).toBe('/calculator.html');
    expect(recordVisit(ctx, { visitor_id, path: '/x' }, 'Googlebot/2.1').recorded).toBe(false);
    expect(() => recordVisit(ctx, { visitor_id, path: 'javascript:alert(1)' }, DESKTOP)).toThrow(/path/);
  });

  it('links an enquiry to the visitor only while they have consent, and clears it on withdrawal', async () => {
    const { visitor_id } = accept();
    recordVisit(ctx, { visitor_id, path: '/calculator.html', utm_campaign: 'spring' }, DESKTOP);
    await submitEnquiry(ctx, { ...ENQUIRY, visitor_id }, 'ip');
    const [l] = leadsOf(ctx);
    expect(l.visit_attribution).toMatchObject({ visitor_id, page_views: 1, first_touch: { utm_campaign: 'spring' } });
    recordVisitorConsent(ctx, { version: 'c1', analytics: false, visitor_id });
    expect(ctx.store.get('leads', {})[l.lead_id].visit_attribution).toBeNull();
    expect(ctx.store.get('visits', [])).toHaveLength(0);
    expect(ctx.store.get('visitors', {})[visitor_id]).toMatchObject({ analytics: false, first_touch: null, page_views: 0 });
  });

  it('does not attach attribution for a visitor who rejected', async () => {
    await submitEnquiry(ctx, { ...ENQUIRY, visitor_id: 'v_' + 'b'.repeat(32) }, 'ip');
    expect(leadsOf(ctx)[0].visit_attribution).toBeNull();
  });

  it('deletes events and visitors after the retention period and summarises without personal data', () => {
    const { visitor_id } = accept();
    recordVisit(ctx, { visitor_id, path: '/enquiry.html' }, 'iPhone Mobile Safari');
    const s = visitorSummary(ctx);
    expect(s).toMatchObject({ page_views: 1, unique_visitors: 1, devices: [{ key: 'mobile', count: 1 }] });
    expect(JSON.stringify(s)).not.toContain(visitor_id);
    const later = makeCtx({ store: ctx.store, now: () => NOW + 400 * 864e5 });
    expect(purgeVisitors(later)).toBe(2);
    expect(later.store.get('visits', [])).toHaveLength(0);
  });
});
