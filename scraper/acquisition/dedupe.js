// Stage: DUPLICATE DETECTION. Exact keys attach the new record to the canonical lead; fuzzy matches only FLAG for human review.
import { norm } from '../match.js';
import { normalizeUrl, sha } from './normalize.js';

export const normPhone = (p) => {
  const d = String(p || '').replace(/\D/g, '');
  const n = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  return n.length === 10 ? `+1${n}` : null;
};
export const normEmail = (e) => (String(e || '').trim().toLowerCase() || null);

const tokens = (s) => new Set(norm(s).split(' ').filter(Boolean));
const jaccard = (a, b) => {
  if (!a.size || !b.size) return 0;
  let i = 0;
  a.forEach((t) => b.has(t) && i++);
  return i / (a.size + b.size - i);
};
const WINDOW_DAYS = 14;

/**
 * @returns {{exact: object|null, method: string|null, candidates: {id, method, confidence}[]}}
 * Redacted / merged / expired leads are ignored.
 */
export function findMatches(cand, leads) {
  const url = normalizeUrl(cand.original_source_url);
  const email = normEmail(cand.business_email);
  const phone = normPhone(cand.business_phone);
  const candidates = [];
  let exact = null;
  let method = null;
  const nameTokens = tokens(`${cand.display_name || ''} ${cand.company_name || ''}`);

  for (const l of Object.values(leads)) {
    if (l.redacted || l.merge_status === 'merged' || l.expired) continue;
    if (cand.original_source_id && l.original_source_id === cand.original_source_id && l.original_source_record_id === cand.original_source_record_id) { exact = l; method = 'source_record_id'; break; }
    if (url && normalizeUrl(l.original_source_url) === url) { exact = l; method = 'event_url'; break; }
    if (email && normEmail(l.business_email) === email) { exact = l; method = 'email'; break; }
    if (phone && normPhone(l.business_phone) === phone) { exact = l; method = 'phone'; break; }

    const sameCompany = cand.company_name && l.company_name && norm(cand.company_name) === norm(l.company_name);
    const sim = jaccard(nameTokens, tokens(`${l.display_name || ''} ${l.company_name || ''}`));
    if (sameCompany && cand.intent_category && cand.intent_category === l.intent_category && cand.event_date && l.event_date &&
      Math.abs(new Date(cand.event_date) - new Date(l.event_date)) <= WINDOW_DAYS * 864e5) {
      candidates.push({ id: l.lead_id, method: 'company_event_window', confidence: 0.7 });
    } else if (sim >= 0.75 && (sameCompany || !cand.company_name)) {
      candidates.push({ id: l.lead_id, method: 'name_company_fuzzy', confidence: Math.round(sim * 100) / 100 });
    }
  }
  return { exact, method, candidates: candidates.sort((a, b) => b.confidence - a.confidence).slice(0, 5) };
}

export { sha };
