// Stages: INGESTION -> NORMALIZATION -> DUPLICATE DETECTION -> CLASSIFICATION -> SCORING -> QUALIFICATION.
// Every received item is archived (accepted, rejected or duplicate) with origin tags; every rejection has a reason.
import { evaluateItem } from '../score.js';
import { buildCrmIndex, matchCrm } from '../match.js';
import { audit } from './audit.js';
import { normalizeItem, sha } from './normalize.js';
import { classifyInferred } from './classify.js';
import { findMatches } from './dedupe.js';
import { newLead, refreshLead, markStage } from './leads.js';
import { retentionDays, DAY_MS } from './registry.js';
import { isSuppressed } from './consent.js';
import { recordTags } from './tags.js';

const MAX_AGE_DAYS = 30;
const MAX_REJECTIONS = 2000;

export function recordRejection(ctx, run, rec, reason) {
  const list = ctx.store.get('rejections', []);
  list.push({ run_id: run.run_id, source_id: run.source_id, at: new Date(ctx.now()).toISOString(), title: String(rec.title || '').slice(0, 200), url: rec.original_source_url || rec.url || null, reason });
  if (list.length > MAX_REJECTIONS) list.splice(0, list.length - MAX_REJECTIONS);
  run.reject_reasons[reason] = (run.reject_reasons[reason] || 0) + 1;
  run.rejected++;
}

/**
 * Archive every received item, keyed by source + record id so repeat sightings update one row.
 * Public headlines only: personal enquiry/CSV data lives on the lead itself, never duplicated here.
 */
export function archiveRecord(ctx, source, run, item, rec, status, reason = null, leadId = null) {
  const records = ctx.store.get('records', {});
  const key = `${source.source_id}:${rec.source_record_id}`;
  const at = new Date(ctx.now()).toISOString();
  const prev = records[key];
  records[key] = {
    record_key: key, source_id: source.source_id, source_name: source.source_name, source_record_id: rec.source_record_id,
    tags: recordTags(source, run, [`status:${status}`]), run_id: run.run_id, first_run_id: prev?.first_run_id || run.run_id,
    title: String(item.title || '').slice(0, 300), url: item.link || null, summary: String(item.summary || '').slice(0, 600),
    published_at: item.date || null, country: rec.country || null,
    first_seen: prev?.first_seen || at, last_seen: at, seen_count: (prev?.seen_count || 0) + 1,
    status, reason, lead_id: leadId || prev?.lead_id || null,
  };
}

/** Attach a repeat sighting to the canonical lead, preserving the extra source attribution. */
function attach(ctx, canon, rec, method) {
  const known = canon.source_attributions.some((a) => a.source_id === rec.source_id && a.record_id === rec.source_record_id);
  if (known || (canon.original_source_id === rec.source_id && canon.original_source_record_id === rec.source_record_id)) return;
  canon.source_attributions.push({ source_id: rec.source_id, url: rec.original_source_url, record_id: rec.source_record_id, at: new Date(ctx.now()).toISOString(), via: method });
  canon.updated_at = new Date(ctx.now()).toISOString();
}

export function processItems(ctx, source, items, run) {
  const now = ctx.now();
  const leads = ctx.store.get('leads', {});
  const minScore = Number(ctx.env.ACQ_MIN_SCORE ?? 25);
  const crmIdx = ctx.crmData ? buildCrmIndex(ctx.crmData) : [];
  const evSource = { reliability: source.source_reliability, region: source.geographic_coverage.length === 1 ? source.geographic_coverage[0] : source.region || 'any' };

  const records = ctx.store.get('records', {});
  const seenAt = new Date(now).toISOString();

  for (const item of items) {
    run.received++;
    const rec = normalizeItem(item, source);
    // Already stored (as a lead, a duplicate or a rejection): do not evaluate or store it again, just note it is still in the feed
    const known = records[`${source.source_id}:${rec.source_record_id}`];
    if (known) { known.last_seen = seenAt; known.seen_count++; run.already_have++; continue; }
    const reject = (reason) => { recordRejection(ctx, run, rec, reason); archiveRecord(ctx, source, run, item, rec, 'rejected', reason); };

    if (!rec.title) { reject('Missing title'); continue; }
    if (item.date && now - new Date(item.date) > MAX_AGE_DAYS * DAY_MS) { reject(`Older than ${MAX_AGE_DAYS} days`); continue; }
    if (!rec.original_source_url) { reject('No source URL: cannot trace provenance'); continue; }

    // SEC Form D facts: skip pooled funds and partnership vehicles (investors, not an owner liquidity event) and tiny raises
    const fd = item.meta?.formD ? item.meta : null;
    if (fd) {
      const floor = Number(ctx.env.ACQ_FORMD_MIN_USD || 250000);
      if (fd.isFund) { reject('Pooled investment fund, not an operating-business liquidity event'); continue; }
      if (/limited partnership/i.test(fd.entityType || '')) { reject('Partnership vehicle, not an owner liquidity event'); continue; }
      if (fd.amount < floor) { reject(`Below minimum deal size ($${floor.toLocaleString('en-US')})`); continue; }
    }

    const ev = evaluateItem({ title: item.title, summary: item.summary, date: item.date }, evSource, now, { allowUS: true });
    if (ev.reject) { reject(ev.reject); continue; }
    if (!rec.company_name && !rec.person) { reject('Insufficient evidence: no company or person identified'); continue; }
    if (rec.country && !(source.permission.permitted_geographies || []).includes(rec.country)) {
      reject(`Country ${rec.country} is outside the source's permitted geographies`); continue;
    }

    const cls = classifyInferred(ev, rec, source.source_reliability);
    // Decision-maker: a named person from the headline, else the filing's executive officer (public SEC record; name and role only)
    const exec = fd?.persons?.find((p) => p.roles.some((r) => /executive officer/i.test(r))) || fd?.persons?.find((p) => p.roles.some((r) => /director/i.test(r))) || null;
    const person = rec.person || (exec ? { name: exec.name, title: `${exec.roles.join(', ')} (per SEC Form D)` } : null);
    const [first, ...rest] = person ? person.name.split(' ') : [];
    const cand = newLead({
      lead_id: 'ACQ-' + sha(`${rec.source_id}|${rec.source_record_id}`, 'sha1').slice(0, 10).toUpperCase(),
      first_name: first || null, last_name: rest.join(' ') || null, display_name: person?.name || rec.company_name,
      professional_title: person?.title || null, company_name: rec.company_name, country: rec.country, state_or_province: rec.state_or_province, city: rec.city,
      ...cls, original_source_url: rec.original_source_url, original_source_id: rec.source_id, original_source_record_id: rec.source_record_id,
      event_date: rec.event_date, evidence_excerpt: `${rec.title}${rec.summary ? ` — ${rec.summary}` : ''}`.slice(0, 300),
      evidence_hash: sha(`${rec.title}|${rec.original_source_url}|${rec.event_date}`), source_reliability: source.source_reliability,
      retention_expiry: new Date(now + retentionDays(ctx, source.source_id) * DAY_MS).toISOString(),
      permitted_purpose: source.permission.permitted_purpose, wealth_status: 'public_event_only',
      investment_interest_category: cls.intent_category,
      crm_match: crmIdx.length ? matchCrm(`${item.title} ${item.summary || ''}`, crmIdx) : null,
      related_persons: (fd?.persons || []).slice(0, 10),
      tags: recordTags(source, run),
      received_via: { source_id: source.source_id, source_name: source.source_name, channel: source.access_method, run_id: run.run_id, trigger: run.trigger, received_at: new Date(now).toISOString() },
    }, now);
    markStage(cand, 'ingestion', 'done', now);
    markStage(cand, 'normalization', 'done', now);

    const m = findMatches(cand, leads);
    if (m.exact) {
      attach(ctx, m.exact, rec, m.method); run.duplicates++; markStage(m.exact, 'duplicate_detection', 'done', now);
      archiveRecord(ctx, source, run, item, rec, 'duplicate', `Matched existing lead by ${m.method}`, m.exact.lead_id);
      continue;
    }
    markStage(cand, 'duplicate_detection', m.candidates.length ? 'flagged' : 'done', now);
    if (m.candidates.length) Object.assign(cand, { duplicate_candidate_ids: m.candidates.map((c) => c.id), match_method: m.candidates[0].method, match_confidence: m.candidates[0].confidence, merge_status: 'candidate' });
    markStage(cand, 'classification', 'done', now);
    markStage(cand, 'verification', 'skipped', now); // public events carry no contact details to verify
    markStage(cand, 'consent_rights', 'done', now);

    refreshLead(ctx, cand);
    if (cand.intent_score < minScore) { reject(`Below minimum relevance score (${cand.intent_score} < ${minScore})`); continue; }

    leads[cand.lead_id] = cand;
    run.accepted++;
    archiveRecord(ctx, source, run, item, rec, 'accepted', null, cand.lead_id);
    audit(ctx.store, { actor: 'system', action: 'lead.created', entity: 'lead', entityId: cand.lead_id, detail: { source_id: source.source_id, run_id: run.run_id, intent_class: cand.intent_class, score: cand.intent_score } }, now);
  }
  ctx.store.save('leads');
  ctx.store.save('rejections');
  ctx.store.save('records');
}

/** Used by CSV import and the enquiry form: add a fully built lead, enforcing suppression and dedupe. */
export function addLead(ctx, lead, rec, run) {
  const leads = ctx.store.get('leads', {});
  if (isSuppressed(ctx, { email: lead.business_email, phone: lead.business_phone })) { recordRejection(ctx, run, rec, 'Do-not-contact: contact is on the suppression list'); return null; }
  const m = findMatches(lead, leads);
  if (m.exact) { attach(ctx, m.exact, { source_id: lead.original_source_id, source_record_id: lead.original_source_record_id, original_source_url: lead.original_source_url }, m.method); run.duplicates++; return null; }
  if (m.candidates.length) Object.assign(lead, { duplicate_candidate_ids: m.candidates.map((c) => c.id), match_method: m.candidates[0].method, match_confidence: m.candidates[0].confidence, merge_status: 'candidate' });
  markStage(lead, 'duplicate_detection', m.candidates.length ? 'flagged' : 'done', ctx.now());
  refreshLead(ctx, lead);
  leads[lead.lead_id] = lead;
  run.accepted++;
  audit(ctx.store, { actor: 'system', action: 'lead.created', entity: 'lead', entityId: lead.lead_id, detail: { source_id: lead.original_source_id, run_id: lead.received_via?.run_id || run.run_id, intent_class: lead.intent_class, score: lead.intent_score } }, ctx.now());
  return lead;
}

export const newRun = (ctx, sourceId, trigger, kind = 'fetch') => ({
  run_id: 'RUN-' + sha(`${sourceId}${ctx.now()}${Math.random()}`, 'sha1').slice(0, 10).toUpperCase(), source_id: sourceId, kind, trigger,
  started_at: new Date(ctx.now()).toISOString(), finished_at: null, status: 'running', attempts: 0, received: 0, accepted: 0, rejected: 0, duplicates: 0,
  already_have: 0, skipped_known: 0, not_modified: false, reject_reasons: {}, error: null,
});
