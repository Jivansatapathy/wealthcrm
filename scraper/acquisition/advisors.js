// Our own advisors and a deterministic "up to three" matcher, like SmartAsset/Zoe/Wealthramp but for one firm's team.
// Matching only SUGGESTS advisors to the reviewer. Nothing is sent to an advisor until a human approves and assigns the lead.
import { audit } from './audit.js';
import { ASSET_RANGES } from './enquiry.js';
import { ENQUIRY_CATEGORIES } from './classify.js';
import { GOALS } from './questionnaire.js';

export const MAX_MATCHES = 3;
const ID = /^[a-z0-9][a-z0-9_-]{1,40}$/;
const err = (message, status = 400) => Object.assign(new Error(message), { status });
const list = (v, allowed, label, max = 20) => {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > max) throw err(`${label} must be a list`);
  const out = [...new Set(v.map((x) => String(x).trim()))].filter(Boolean);
  if (allowed && out.some((x) => !allowed.includes(x))) throw err(`Invalid value in ${label}`);
  return out;
};

export const listAdvisors = (ctx) => Object.values(ctx.store.get('advisors', {})).sort((a, b) => a.name.localeCompare(b.name));

/** Create or replace an advisor profile. Regions: "CA", "US", or "CA-ON" style country-province/state codes. */
export function saveAdvisor(ctx, input, actor) {
  const id = String(input.advisor_id || '').trim().toLowerCase();
  if (!ID.test(id)) throw err('advisor_id must be 2-41 characters: lowercase letters, digits, - or _');
  const name = String(input.name || '').trim().slice(0, 100);
  if (name.length < 2) throw err('name is required');
  const regions = list(input.regions, null, 'regions').map((r) => r.toUpperCase());
  if (!regions.length || regions.some((r) => !/^(CA|US)(-[A-Z]{2})?$/.test(r))) throw err('regions must be CA, US or CA-ON style codes, at least one');
  const asset_ranges = list(input.asset_ranges, ASSET_RANGES.filter((a) => a !== 'prefer_not_to_say'), 'asset_ranges');
  if (!asset_ranges.length) throw err('asset_ranges needs at least one range');
  const capacity = Number(input.capacity ?? 5);
  if (!Number.isInteger(capacity) || capacity < 0 || capacity > 500) throw err('capacity must be a whole number from 0 to 500');
  const store = ctx.store.get('advisors', {});
  const now = new Date(ctx.now()).toISOString();
  store[id] = {
    advisor_id: id, name, regions, asset_ranges,
    specialties: list(input.specialties, ENQUIRY_CATEGORIES, 'specialties'),
    goals: list(input.goals, GOALS, 'goals'),
    capacity, active: input.active !== false, created_at: store[id]?.created_at || now, updated_at: now,
  };
  ctx.store.save('advisors');
  audit(ctx.store, { actor, action: 'advisor.save', entity: 'advisor', entityId: id, detail: { regions, asset_ranges, capacity, active: store[id].active } }, ctx.now());
  return store[id];
}

/** Open assigned (non-closed) leads per advisor name; used so a full advisor is not suggested. */
function load(ctx) {
  const n = {};
  for (const l of Object.values(ctx.store.get('leads', {}))) {
    if (l.assigned_advisor && !['converted', 'closed'].includes(l.pipeline_stage) && l.conversion_status === 'open') n[l.assigned_advisor] = (n[l.assigned_advisor] || 0) + 1;
  }
  return n;
}

/**
 * Up to three advisors who are active, cover the lead's location, accept its asset level and have free capacity.
 * Hard filters first (asset level, location, capacity); then a transparent score: state/province match, specialty, shared goals, then lightest load.
 * A lead with no stated assets matches only advisors who accept every range, so we never guess wealth.
 */
export function matchAdvisors(ctx, lead) {
  const assets = lead.wealth_status === 'self_reported' ? lead.wealth_range : null;
  const q = lead.questionnaire || {};
  const open = load(ctx);
  const rows = [];
  for (const a of listAdvisors(ctx)) {
    if (!a.active) continue;
    const country = lead.country;
    const state = lead.state_or_province ? String(lead.state_or_province).toUpperCase().slice(0, 2) : null;
    const exact = state && a.regions.includes(`${country}-${state}`);
    if (!(exact || a.regions.includes(country))) continue;
    const accepts = assets ? a.asset_ranges.includes(assets) : ASSET_RANGES.filter((r) => r !== 'prefer_not_to_say').every((r) => a.asset_ranges.includes(r));
    if (!accepts) continue;
    const used = open[a.name] || open[a.advisor_id] || 0;
    if (used >= a.capacity) continue;
    const sharedGoals = (q.goals || []).filter((g) => a.goals.includes(g));
    const reasons = [exact ? `covers ${country}-${state}` : `covers ${country}`, assets ? `accepts ${assets}` : 'accepts any asset level'];
    let score = exact ? 10 : 0;
    if (a.specialties.includes(lead.intent_category)) { score += 20; reasons.push(`specialty: ${lead.intent_category}`); }
    if (sharedGoals.length) { score += 5 * sharedGoals.length; reasons.push(`goals: ${sharedGoals.join(', ')}`); }
    rows.push({ advisor_id: a.advisor_id, name: a.name, score, reasons, open_leads: used, capacity: a.capacity });
  }
  rows.sort((x, y) => y.score - x.score || x.open_leads - y.open_leads || x.name.localeCompare(y.name));
  return rows.slice(0, MAX_MATCHES);
}
