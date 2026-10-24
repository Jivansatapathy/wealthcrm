// Provider-authorised CSV import and permission-aware export.
import { addLead, newRun, recordRejection } from './ingest.js';
import { getSource, listSources, permissionGate } from './registry.js';
import { newLead, markStage } from './leads.js';
import { normEmail, normPhone } from './dedupe.js';
import { isValidEmailFormat, checkPhone } from './verify.js';
import { ENQUIRY_CATEGORIES } from './classify.js';
import { sha } from './normalize.js';
import { recordTags } from './tags.js';
import { audit } from './audit.js';

const MAX_ROWS = 5000;
const MAX_BYTES = 2 * 1024 * 1024;
const err = (message, status = 400) => Object.assign(new Error(message), { status });

export function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((x) => x !== '')) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

/** Cells starting with = + - @ are prefixed so spreadsheets never execute them as formulas. */
export const csvCell = (v) => {
  let s = v == null ? '' : Array.isArray(v) ? v.join(';') : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const REQUIRED = ['provider_record_id', 'company_name', 'country', 'intent_category', 'event_date'];
// Provider-attested sources (e.g. advisor-matching networks whose contract warrants the consumer opted in) need far fewer columns
const REQUIRED_ATTESTED = ['provider_record_id', 'event_date'];
const OPTIONAL = ['first_name', 'last_name', 'business_email', 'business_phone', 'professional_title', 'state_or_province', 'city', 'original_source_url',
  'intent_class', 'consent_status', 'consent_timestamp', 'consent_text_version', 'permitted_purpose', 'permitted_recipient', 'preferred_contact_channel', 'permitted_channels',
  'investable_assets', 'postal_code'];

// Typical provider export headers -> our canonical column names
const ALIASES = {
  provider_record_id: ['provider record id', 'lead id', 'id', 'record id', 'lead number', 'reference', 'reference id'],
  first_name: ['first name', 'firstname', 'first', 'given name'], last_name: ['last name', 'lastname', 'last', 'surname', 'family name'],
  business_email: ['email', 'email address', 'e mail', 'business email'], business_phone: ['phone', 'phone number', 'mobile', 'mobile phone', 'telephone', 'business phone'],
  company_name: ['company', 'company name', 'organization', 'business name'], country: ['country', 'country code'],
  state_or_province: ['state', 'province', 'state province', 'state or province'], city: ['city', 'town'],
  event_date: ['date', 'created', 'created at', 'created date', 'submitted', 'submitted at', 'lead date', 'timestamp', 'date submitted', 'event date'],
  intent_category: ['category', 'intent', 'lead type', 'need', 'topic'],
  consent_status: ['consent status', 'consent', 'opt in', 'opted in', 'opt in status'],
  investable_assets: ['investable assets', 'assets', 'investable', 'asset range', 'portfolio size'], postal_code: ['zip', 'zip code', 'postal code', 'postcode'],
};
const ALIAS_LOOKUP = new Map(Object.entries(ALIASES).flatMap(([canon, list]) => [[canon.replace(/_/g, ' '), canon], ...list.map((a) => [a, canon])]));
const canonicalHeader = (h) => { const k = h.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); return ALIAS_LOOKUP.get(k) || h.trim().toLowerCase(); };
const normCountry = (v) => { const s = String(v || '').trim().toLowerCase(); return ['ca', 'can', 'canada'].includes(s) ? 'CA' : ['us', 'usa', 'united states', 'united states of america'].includes(s) ? 'US' : String(v || '').trim().toUpperCase(); };

export async function importCsv(ctx, sourceId, text, actor) {
  if (Buffer.byteLength(text) > MAX_BYTES) throw err('CSV is larger than 2 MB', 413);
  const source = getSource(ctx, sourceId);
  if (!source) throw err('Unknown source', 404);
  if (source.access_method !== 'csv') throw err('This source is not registered for CSV import');
  const gate = permissionGate(ctx, sourceId);
  if (!gate.allowed) throw err(`Blocked by permission gate: ${gate.reasons.join('; ')}`, 409);

  const table = parseCsv(text);
  if (table.length < 2) throw err('CSV has no data rows');
  const perm = source.permission;
  const attested = perm.consent_basis === 'provider_attested';
  const required = attested ? REQUIRED_ATTESTED : REQUIRED;
  const headers = table[0].map(canonicalHeader);
  const missing = required.filter((h) => !headers.includes(h));
  if (missing.length) throw err(`Missing required column(s): ${missing.join(', ')}`);
  const unknown = headers.filter((h) => !REQUIRED.includes(h) && !OPTIONAL.includes(h));
  if (table.length - 1 > MAX_ROWS) throw err(`CSV has more than ${MAX_ROWS} rows`, 413);

  const run = newRun(ctx, sourceId, 'import', 'import');
  run.batch_id = 'IMP-' + sha(`${sourceId}${ctx.now()}`, 'sha1').slice(0, 8).toUpperCase();
  const now = ctx.now();
  const rejections = [];
  const reject = (i, rec, reason) => { recordRejection(ctx, run, { title: `row ${i}: ${rec.company_name || ''}`, url: rec.original_source_url }, reason); rejections.push({ row: i, reason }); };

  for (let i = 1; i < table.length; i++) {
    run.received++;
    const rec = Object.fromEntries(headers.map((h, j) => [h, (table[i][j] ?? '').trim()]));
    const rowNo = i + 1;
    rec.country = normCountry(rec.country) || (source.geographic_coverage.length === 1 ? source.geographic_coverage[0] : '');
    if (attested) rec.intent_category ||= 'financial_advisor';
    const miss = required.concat(attested ? ['country'] : []).filter((h) => !rec[h]);
    if (miss.length) { reject(rowNo, rec, `Missing provenance/required field(s): ${miss.join(', ')}`); continue; }
    if (attested && /^(withdrawn|revoked|no|false|opted.?out)$/i.test(rec.consent_status || '')) { reject(rowNo, rec, 'Provider marks this lead as not consented / withdrawn'); continue; }
    if (!['CA', 'US'].includes(rec.country)) { reject(rowNo, rec, 'country must be CA or US'); continue; }
    if (!(perm.permitted_geographies || []).includes(rec.country)) { reject(rowNo, rec, 'Country is outside the source\'s permitted geographies'); continue; }
    const date = new Date(rec.event_date);
    if (isNaN(date)) { reject(rowNo, rec, 'event_date is not a valid date'); continue; }
    if (!ENQUIRY_CATEGORIES.includes(rec.intent_category) && !/^[a-z_]{3,60}$/.test(rec.intent_category)) { reject(rowNo, rec, 'intent_category is invalid'); continue; }
    const email = normEmail(rec.business_email);
    const phone = normPhone(rec.business_phone);
    if (rec.business_email && !isValidEmailFormat(email)) { reject(rowNo, rec, 'business_email is not a valid address'); continue; }
    if (rec.business_phone && !phone) { reject(rowNo, rec, 'business_phone is not a valid US/Canada number'); continue; }
    if (attested ? !(rec.first_name || rec.last_name) : !(rec.first_name && rec.last_name) && !rec.company_name) { reject(rowNo, rec, 'Identity unclear'); continue; }
    if (attested && !email && !phone) { reject(rowNo, rec, 'No contact details (email or phone)'); continue; }

    // Strict mode: a claim of confirmed intent needs the consent evidence that proves it; otherwise reject rather than downgrade silently.
    // Provider-attested mode: the contract (recorded on the source) warrants the consumer opted in, so the lead is confirmed unless the row says otherwise.
    const claimsConfirmed = attested ? !/^inferred$/i.test(rec.intent_class || '') : rec.intent_class === 'confirmed';
    if (claimsConfirmed && !attested) {
      const evidence = rec.consent_status === 'granted' && rec.consent_timestamp && !isNaN(new Date(rec.consent_timestamp)) && rec.consent_text_version && rec.permitted_purpose && rec.permitted_recipient;
      if (!evidence) { reject(rowNo, rec, 'Confirmed intent claimed without consent evidence (status, timestamp, wording version, purpose, recipient)'); continue; }
      if (!email && !phone) { reject(rowNo, rec, 'Confirmed enquiry has no contact details'); continue; }
    }
    const channels = attested
      ? [email && 'email', phone && 'phone'].filter(Boolean)
      : (rec.permitted_channels || '').split(/[;|]/).map((c) => c.trim()).filter((c) => ['email', 'phone'].includes(c));
    const preferred = channels.includes(rec.preferred_contact_channel) ? rec.preferred_contact_channel : attested ? channels[0] : (rec.preferred_contact_channel || null);
    const assets = (rec.investable_assets || '').slice(0, 40);
    const lead = newLead({
      lead_id: 'ACQ-' + sha(`${sourceId}|${rec.provider_record_id}`, 'sha1').slice(0, 10).toUpperCase(),
      first_name: rec.first_name || null, last_name: rec.last_name || null,
      display_name: [rec.first_name, rec.last_name].filter(Boolean).join(' ') || rec.company_name, professional_title: rec.professional_title || null,
      company_name: rec.company_name, business_email: email, business_phone: phone,
      email_verification_status: 'unverified', phone_verification_status: phone ? checkPhone(phone) : 'unverified',
      country: rec.country, state_or_province: rec.state_or_province || null, city: rec.city || null,
      preferred_contact_channel: preferred || null,
      intent_class: claimsConfirmed ? 'confirmed' : 'strong_inferred', intent_category: rec.intent_category,
      intent_description: claimsConfirmed
        ? (attested ? 'Consumer asked an advisor-matching provider for an introduction (provider-attested consent)' : 'Provider-supplied enquiry with consent evidence')
        : 'Provider-supplied signal (not a confirmed enquiry)',
      original_source_id: sourceId, original_source_record_id: rec.provider_record_id, original_source_url: rec.original_source_url || source.source_url,
      event_date: date.toISOString(), evidence_excerpt: `Provider record ${rec.provider_record_id}: ${rec.intent_category}`.slice(0, 300),
      evidence_hash: sha(`${sourceId}|${rec.provider_record_id}|${rec.event_date}`), source_reliability: source.source_reliability,
      intent_confidence: claimsConfirmed ? (attested ? 0.7 : 0.8) : 0.5, signal_weight: 40,
      consent_basis: claimsConfirmed ? (attested ? 'provider_attested' : 'row_evidence') : null,
      // Attested consent is dated from the lead's own submission time and tied to the recipient named in the source's contract record
      consent_status: claimsConfirmed ? 'granted' : 'none',
      consent_timestamp: claimsConfirmed ? (attested ? date.toISOString() : new Date(rec.consent_timestamp).toISOString()) : null,
      consent_source: sourceId, consent_text_version: claimsConfirmed ? (attested ? `provider-attested:${sourceId}` : rec.consent_text_version) : null,
      permitted_purpose: attested ? perm.permitted_purpose : (rec.permitted_purpose || perm.permitted_purpose),
      permitted_recipient: claimsConfirmed ? (attested ? perm.permitted_recipient : rec.permitted_recipient) : null,
      permitted_channels: channels,
      wealth_status: assets ? 'self_reported' : 'unknown', wealth_range: assets || null, wealth_estimate_source: assets ? `provider:${sourceId}` : null,
      wealth_estimate_date: assets ? date.toISOString() : null,
      retention_expiry: new Date(now + (source.permitted_retention_period || 90) * 864e5).toISOString(),
      import_batch_id: run.batch_id,
      tags: recordTags(source, run, [`batch:${run.batch_id}`, attested && claimsConfirmed && 'consent:provider_attested']),
      received_via: { source_id: sourceId, source_name: source.source_name, channel: 'csv', run_id: run.run_id, trigger: 'import', received_at: new Date(now).toISOString(), batch_id: run.batch_id },
    }, now);
    ['ingestion', 'normalization', 'classification', 'consent_rights'].forEach((s) => markStage(lead, s, 'done', now));
    markStage(lead, 'verification', 'pending', now);
    addLead(ctx, lead, rec, run);
  }
  ctx.store.save('leads');
  ctx.store.save('rejections');
  run.status = 'success'; run.finished_at = new Date(ctx.now()).toISOString();
  const runs = ctx.store.get('runs', []);
  runs.push(run);
  ctx.store.save('runs');
  audit(ctx.store, { actor, action: 'import.csv', entity: 'source', entityId: sourceId, detail: { batch_id: run.batch_id, received: run.received, accepted: run.accepted, rejected: run.rejected, duplicates: run.duplicates } }, ctx.now());
  return { batch_id: run.batch_id, total: run.received, accepted: run.accepted, rejected: run.rejected, duplicates: run.duplicates, ignored_columns: unknown, rejections: rejections.slice(0, 200) };
}

export const EXPORT_COLUMNS = ['lead_id', 'intent_class', 'intent_category', 'company_name', 'display_name', 'business_email', 'business_phone', 'country',
  'intent_score', 'score_reasons', 'source_name', 'source_url', 'event_date', 'consent_status', 'verification_status', 'outreach_eligibility', 'assigned_owner'];

export function exportCsv(ctx, ids, perms, actor) {
  const leads = ctx.store.get('leads', {});
  const sources = Object.fromEntries(listSources(ctx).map((s) => [s.source_id, s.source_name]));
  const canContact = perms.has('leads.contact');
  const pool = (ids?.length ? ids.map((i) => leads[i]).filter(Boolean) : Object.values(leads))
    // suppressed, merged and expired records are never exported as actionable leads
    .filter((l) => l.qualification_status !== 'suppressed' && l.merge_status !== 'merged' && !l.expired && !l.redacted);
  const lines = [EXPORT_COLUMNS.join(',')];
  for (const l of pool) {
    lines.push([
      l.lead_id, l.intent_class, l.intent_category, l.company_name, l.display_name, canContact ? l.business_email : '', canContact ? l.business_phone : '', l.country,
      l.intent_score, l.intent_score_reasons.filter((r) => r.points).map((r) => `${r.component}:${r.points}`).join(' '), sources[l.original_source_id] || l.original_source_id,
      l.original_source_url, l.event_date, l.consent_status,
      `email:${l.email_verification_status}; phone:${l.phone_verification_status}`, l.gates.eligible_for_outreach ? 'eligible' : 'not_eligible', l.assigned_advisor,
    ].map(csvCell).join(','));
  }
  audit(ctx.store, { actor, action: 'export.csv', entity: 'leads', detail: { rows: pool.length, contact_fields: canContact } }, ctx.now());
  return { csv: lines.join('\r\n') + '\r\n', rows: pool.length };
}
