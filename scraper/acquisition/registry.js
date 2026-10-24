// Source registry + permission/licensing gate. Nothing ingests into production lead tables unless the gate passes.
import { createHash } from 'node:crypto';
import { BUILTIN_SOURCES } from '../sources.js';
import { isSafeUrl } from '../pipeline.js';
import { audit } from './audit.js';

export const PERMISSION_STATUSES = ['approved', 'approved_with_restrictions', 'pending_review', 'prohibited', 'expired'];
export const ACCESS_METHODS = ['rss', 'html', 'api', 'csv', 'form'];
const DAY = 864e5;

// Facts about each built-in source. Licence text records what we know, not a legal conclusion:
// every source stays `pending_review` until an admin records an approval.
const BUILTIN_META = {
  'globenewswire-ca': { source_type: 'press_wire', geo: ['CA'], licence_type: 'Publisher RSS feed; GlobeNewswire terms of use apply (review required)', refresh: 30 },
  'newswire-ca': { source_type: 'press_wire', geo: ['CA'], licence_type: 'Publisher RSS feed; Cision/Newswire.ca terms of use apply (review required)', refresh: 30 },
  'news-globe': { source_type: 'news_rss', geo: ['CA'], licence_type: 'Google News RSS search results linking to publisher content; Google and publisher terms apply (review required)', refresh: 60 },
  'news-fp': { source_type: 'news_rss', geo: ['CA'], licence_type: 'Google News RSS search results linking to publisher content; Google and publisher terms apply (review required)', refresh: 60 },
  'news-founder-exits': { source_type: 'news_rss', geo: ['CA'], licence_type: 'Google News RSS search results linking to publisher content; Google and publisher terms apply (review required)', refresh: 60 },
  'news-exec-change': { source_type: 'news_rss', geo: ['CA'], licence_type: 'Google News RSS search results linking to publisher content; Google and publisher terms apply (review required)', refresh: 60 },
  'edgar-form-d-ca': { source_type: 'regulatory_filing', geo: ['CA', 'US'], licence_type: 'US government public data (SEC EDGAR); fair-access policy: declared User-Agent, max 10 requests/second', refresh: 60, auth: 'None; User-Agent with contact required (set SCRAPER_CONTACT)' },
  'edgar-13d': { source_type: 'regulatory_filing', geo: ['US'], licence_type: 'US government public data (SEC EDGAR); fair-access policy: declared User-Agent, max 10 requests/second', refresh: 60, auth: 'None; User-Agent with contact required (set SCRAPER_CONTACT)' },
};

const SYSTEM_SOURCES = [
  { source_id: 'website-enquiry', source_name: 'Website enquiry form (first-party)', source_type: 'enquiry_form', geographic_coverage: ['CA', 'US'],
    source_url: null, access_method: 'form', reliability: 1, system: true,
    licence_type: 'First-party: consent captured on our own opt-in form', auth: 'Public form with honeypot, rate limit and optional CAPTCHA' },
];

const blankPermission = () => ({
  status: 'pending_review', commercial_use_status: null, permitted_purpose: null, permitted_geographies: [],
  contact_permission_status: null, redistribution_status: null, licence_reference: null, approval_timestamp: null,
  approved_by: null, expiry_date: null, review_required: true, personal_data_processing_allowed: null, permitted_retention_days: null,
  permitted_refresh_minutes: null, notes: null,
  // row_evidence: every imported row must carry its own consent proof. provider_attested: the provider's contract warrants
  // the consumer opted in to be contacted by `permitted_recipient`, so rows need only identify the person and a contact.
  consent_basis: 'row_evidence', permitted_recipient: null,
});

/** @returns {{allowed:boolean, status:string, reasons:string[]}} */
export function evaluatePermission(perm, now = Date.now()) {
  const p = perm || blankPermission();
  const reasons = [];
  let status = p.status;
  if (status === 'prohibited') return { allowed: false, status, reasons: ['Source is prohibited'] };
  if (p.expiry_date && new Date(p.expiry_date).getTime() <= now) { status = 'expired'; reasons.push('Permission expired'); }
  if (!['approved', 'approved_with_restrictions'].includes(status)) reasons.push(`Permission status is ${status}`);
  if (!p.commercial_use_status) reasons.push('Commercial-use status missing');
  if (!p.permitted_purpose) reasons.push('Permitted purpose missing');
  if (!p.permitted_geographies?.length) reasons.push('Permitted geographies missing');
  if (!p.licence_reference) reasons.push('Licence reference missing');
  if (!p.approval_timestamp || !p.approved_by) reasons.push('Approval record missing');
  if (p.consent_basis === 'provider_attested') {
    if (!p.permitted_recipient) reasons.push('Permitted recipient missing (provider-attested consent)');
    if (!p.contact_permission_status) reasons.push('Contact permission statement missing (provider-attested consent)');
  }
  return { allowed: reasons.length === 0, status, reasons };
}

const idFor = (name, url) => 'acq-' + createHash('sha1').update(`${name}|${url || ''}`).digest('hex').slice(0, 8);

function baseOf(ctx) {
  const builtin = BUILTIN_SOURCES.map((s) => {
    const m = BUILTIN_META[s.id] || {};
    return {
      source_id: s.id, source_name: s.name, source_type: m.source_type || 'news_rss', geographic_coverage: m.geo || ['CA'],
      source_url: s.url, access_method: s.kind === 'edgar-formd' ? 'api' : s.kind === 'atom' ? 'rss' : s.kind,
      endpoint: s.url, auth: m.auth || 'None', licence_type: m.licence_type || 'Unknown (review required)',
      reliability: s.reliability, kind: s.kind, refresh: m.refresh || 60, region: s.region, builtin: true,
    };
  });
  const legacy = (ctx.customSources?.() || []).map((s) => ({
    source_id: s.id, source_name: s.name, source_type: 'custom', geographic_coverage: [s.region === 'US' ? 'US' : 'CA'],
    source_url: s.url, access_method: 'html', endpoint: s.url, auth: 'None', licence_type: 'User-added URL (review required)',
    reliability: s.reliability ?? 0.7, kind: s.kind || 'auto', refresh: 120, region: s.region || 'any', custom: true, enabled: s.enabled !== false,
  }));
  const added = Object.values(ctx.store.get('acq_sources', {})).map((s) => ({ ...s, custom: true }));
  const system = SYSTEM_SOURCES.map((s) => ({ ...s, endpoint: null, refresh: 0, region: 'any', kind: 'form', system: true }));
  return [...builtin, ...system, ...legacy, ...added];
}

export function listSources(ctx) {
  const now = ctx.now();
  const perms = ctx.store.get('permissions', {});
  const state = ctx.store.get('source_state', {});
  return baseOf(ctx).map((b) => {
    const perm = { ...blankPermission(), ...(perms[b.source_id] || {}) };
    const gate = evaluatePermission(perms[b.source_id], now);
    const st = state[b.source_id] || {};
    const failing = (st.consecutive_failures || 0) >= 3;
    let health = 'never_run';
    if (b.system) health = gate.allowed ? 'healthy' : 'blocked';
    else if (!gate.allowed) health = 'blocked';
    else if (st.paused) health = 'paused';
    else if (st.last_attempted_fetch) health = failing ? 'failing' : st.consecutive_failures ? 'degraded' : 'healthy';
    const hasConnector = b.access_method === 'rss' || b.access_method === 'html' || b.kind === 'edgar-formd';
    return {
      ...b,
      connector: b.system || b.access_method === 'csv' ? 'manual' : hasConnector ? 'implemented' : 'not_implemented',
      API_or_feed_endpoint: b.endpoint,
      authentication_requirements: b.auth,
      commercial_use_allowed: perm.commercial_use_status ? /^(yes|true|allowed|approved)/i.test(perm.commercial_use_status) : null,
      personal_data_processing_allowed: perm.personal_data_processing_allowed,
      redistribution_allowed: perm.redistribution_status ? /^(yes|true|allowed|approved)/i.test(perm.redistribution_status) : null,
      permitted_retention_period: perm.permitted_retention_days ?? 90,
      permitted_refresh_frequency: perm.permitted_refresh_minutes ?? b.refresh,
      source_reliability: b.reliability,
      last_successful_fetch: st.last_successful_fetch || null,
      last_attempted_fetch: st.last_attempted_fetch || null,
      records_received: st.records_received || 0,
      records_accepted: st.records_accepted || 0,
      records_rejected: st.records_rejected || 0,
      source_health: health,
      error_message: st.error_message || null,
      paused: !!st.paused,
      alert: failing,
      // "connected" means a real fetch has succeeded, never merely that configuration exists
      connected: !!st.last_successful_fetch && health !== 'blocked',
      monthly_cost: st.monthly_cost || 0,
      permission: { ...perm, ...gate, status: gate.status },
    };
  });
}

export const getSource = (ctx, id) => listSources(ctx).find((s) => s.source_id === id) || null;

export function permissionGate(ctx, id) {
  return evaluatePermission(ctx.store.get('permissions', {})[id], ctx.now());
}

const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function setPermission(ctx, id, input, actor) {
  const src = getSource(ctx, id);
  if (!src) throw Object.assign(new Error('Unknown source'), { status: 404 });
  const status = input.status;
  if (!PERMISSION_STATUSES.includes(status)) throw Object.assign(new Error(`status must be one of ${PERMISSION_STATUSES.join(', ')}`), { status: 400 });
  const rec = {
    status,
    commercial_use_status: str(input.commercial_use_status, 120) || null,
    permitted_purpose: str(input.permitted_purpose, 300) || null,
    permitted_geographies: (Array.isArray(input.permitted_geographies) ? input.permitted_geographies : []).filter((g) => ['CA', 'US'].includes(g)),
    contact_permission_status: str(input.contact_permission_status, 120) || null,
    redistribution_status: str(input.redistribution_status, 120) || null,
    personal_data_processing_allowed: typeof input.personal_data_processing_allowed === 'boolean' ? input.personal_data_processing_allowed : null,
    licence_reference: str(input.licence_reference, 300) || null,
    expiry_date: input.expiry_date ? new Date(input.expiry_date).toISOString() : null,
    review_required: status === 'approved_with_restrictions' ? input.review_required !== false : !!input.review_required,
    permitted_retention_days: Number.isFinite(+input.permitted_retention_days) && +input.permitted_retention_days > 0 ? Math.floor(+input.permitted_retention_days) : null,
    permitted_refresh_minutes: Number.isFinite(+input.permitted_refresh_minutes) && +input.permitted_refresh_minutes >= 5 ? Math.floor(+input.permitted_refresh_minutes) : null,
    notes: str(input.notes, 500) || null,
    consent_basis: input.consent_basis === 'provider_attested' ? 'provider_attested' : 'row_evidence',
    permitted_recipient: str(input.permitted_recipient, 150) || null,
    approval_timestamp: ['approved', 'approved_with_restrictions'].includes(status) ? new Date(ctx.now()).toISOString() : null,
    approved_by: ['approved', 'approved_with_restrictions'].includes(status) ? actor : null,
  };
  if (['approved', 'approved_with_restrictions'].includes(status)) {
    const missing = [!rec.commercial_use_status && 'commercial use', !rec.permitted_purpose && 'permitted purpose',
      !rec.permitted_geographies.length && 'permitted geographies (tick CA and/or US)', !rec.licence_reference && 'licence reference',
      rec.consent_basis === 'provider_attested' && !rec.permitted_recipient && 'permitted recipient (the advisor or firm named in the provider contract)',
      rec.consent_basis === 'provider_attested' && !rec.contact_permission_status && 'contact permission statement (what the contract says about contacting these people)',
      rec.consent_basis === 'provider_attested' && rec.personal_data_processing_allowed !== true && 'personal-data processing allowed (tick it only if the contract permits)'].filter(Boolean);
    if (missing.length) throw Object.assign(new Error(`An approval needs: ${missing.join(', ')}`), { status: 400 });
  }
  if (rec.expiry_date && isNaN(new Date(rec.expiry_date))) throw Object.assign(new Error('expiry_date is invalid'), { status: 400 });
  const perms = ctx.store.get('permissions', {});
  perms[id] = rec;
  ctx.store.save('permissions');
  audit(ctx.store, { actor, action: 'source.permission_set', entity: 'source', entityId: id, detail: { status, licence_reference: rec.licence_reference, gate: evaluatePermission(rec, ctx.now()) } }, ctx.now());
  return rec;
}

export function addSource(ctx, input, actor) {
  const name = str(input.source_name, 100);
  const method = input.access_method;
  if (!name) throw Object.assign(new Error('source_name is required'), { status: 400 });
  if (!ACCESS_METHODS.includes(method) || method === 'form') throw Object.assign(new Error('access_method must be rss, html, api or csv'), { status: 400 });
  const url = str(input.source_url, 500) || null;
  if (['rss', 'html', 'api'].includes(method) && !isSafeUrl(url)) throw Object.assign(new Error('A public http(s) source_url is required'), { status: 400 });
  const geo = (Array.isArray(input.geographic_coverage) ? input.geographic_coverage : ['CA']).filter((g) => ['CA', 'US'].includes(g));
  if (!geo.length) throw Object.assign(new Error('geographic_coverage must include CA and/or US'), { status: 400 });
  const rel = Number(input.source_reliability);
  const id = idFor(name, url);
  const added = ctx.store.get('acq_sources', {});
  if (added[id]) throw Object.assign(new Error('Source already exists'), { status: 409 });
  added[id] = {
    source_id: id, source_name: name, source_type: str(input.source_type, 40) || (method === 'csv' ? 'licensed_provider' : 'custom'),
    geographic_coverage: geo, source_url: url, access_method: method, endpoint: url, auth: str(input.authentication_requirements, 200) || 'None',
    licence_type: str(input.licence_type, 300) || 'Unknown (review required)', reliability: rel >= 0 && rel <= 1 ? rel : 0.6,
    kind: method === 'rss' ? 'rss' : method === 'html' ? 'auto' : method, refresh: 60, region: geo.length === 1 ? geo[0] : 'any',
  };
  ctx.store.save('acq_sources');
  audit(ctx.store, { actor, action: 'source.added', entity: 'source', entityId: id, detail: { source_name: name, access_method: method } }, ctx.now());
  return getSource(ctx, id);
}

export function updateSourceState(ctx, id, patch) {
  const state = ctx.store.get('source_state', {});
  state[id] = { ...(state[id] || {}), ...patch };
  ctx.store.save('source_state');
  return state[id];
}

// One-click setup covers only sources with clear public-data terms. Google News search feeds are excluded on purpose.
export const QUICKSTART_SOURCES = ['edgar-form-d-ca', 'edgar-13d', 'globenewswire-ca', 'newswire-ca'];
export const QUICKSTART_ATTESTATION = 'I have reviewed the published terms of use of these sources and approve them for internal research use only. ' +
  'Public announcements will be treated as inferred signals: no one is contacted because of a public event alone.';

/** Records one operator attestation per source that is not already approved (never overrides an explicit prohibition). */
export function quickstartApprove(ctx, actor) {
  const approved = [];
  const perms = ctx.store.get('permissions', {});
  const date = new Date(ctx.now()).toISOString().slice(0, 10);
  for (const id of QUICKSTART_SOURCES) {
    const s = getSource(ctx, id);
    if (!s || s.permission.allowed || perms[id]?.status === 'prohibited') continue;
    setPermission(ctx, id, {
      status: 'approved', commercial_use_status: 'research use only (operator-attested)',
      permitted_purpose: 'Identify public wealth-planning signals for research; no outreach from public data alone',
      permitted_geographies: ['CA', 'US'], contact_permission_status: 'none (public events only)', redistribution_status: 'no',
      personal_data_processing_allowed: false, permitted_retention_days: 90,
      licence_reference: `Operator attestation by ${actor} on ${date}; source terms: ${s.source_url}`,
    }, actor);
    approved.push(id);
  }
  audit(ctx.store, { actor, action: 'source.quickstart', entity: 'source', detail: { approved } }, ctx.now());
  return approved;
}

/** The first-party enquiry form is our own consent-capture channel, so it carries its own rights record. */
export function ensureSystemPermissions(ctx) {
  const perms = ctx.store.get('permissions', {});
  if (perms['website-enquiry']) return;
  perms['website-enquiry'] = {
    ...blankPermission(), status: 'approved', commercial_use_status: 'yes (first-party consent)',
    permitted_purpose: "Respond to the individual's own request for an advisor introduction",
    permitted_geographies: ['CA', 'US'], contact_permission_status: 'per-submission consent', redistribution_status: 'no',
    personal_data_processing_allowed: true, licence_reference: 'first-party consent form', review_required: false,
    approval_timestamp: new Date(ctx.now()).toISOString(), approved_by: 'system', permitted_retention_days: 365,
  };
  ctx.store.save('permissions');
}

export const retentionDays = (ctx, id) => getSource(ctx, id)?.permitted_retention_period ?? 90;
export const DAY_MS = DAY;
