// Stage: NORMALIZATION. Turns a raw feed item into the fields the lead model needs. Never invents names or contacts.
import { createHash } from 'node:crypto';
import { cleanTitle, extractCompany, extractPerson, extractLocation } from '../extract.js';
import { CANADA_RE, US_RE, stripDisclaimers } from '../score.js';

export const sha = (s, algo = 'sha256') => createHash(algo).update(String(s)).digest('hex');

const TRACKING = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid'];
export function normalizeUrl(u) {
  try {
    const x = new URL(u);
    x.hash = '';
    TRACKING.forEach((k) => x.searchParams.delete(k));
    return (x.origin + x.pathname.replace(/\/$/, '') + x.search).toLowerCase();
  } catch { return null; }
}

export function detectCountry(rawText, source) {
  const text = stripDisclaimers(rawText);
  if (CANADA_RE.test(text)) return 'CA';
  if (US_RE.test(text)) return 'US';
  const cov = source.geographic_coverage || [];
  return cov.length === 1 ? cov[0] : null;
}

export function normalizeItem(item, source) {
  const text = `${item.title}. ${item.summary || ''}`;
  const location = extractLocation(text);
  const [city, prov] = location ? location.split(',').map((s) => s.trim()) : [null, null];
  return {
    source_id: source.source_id,
    source_record_id: sha(item.link || item.title, 'sha1').slice(0, 16),
    original_source_url: item.link || null,
    title: cleanTitle(item.title),
    summary: (item.summary || '').slice(0, 240),
    event_date: item.date || null,
    company_name: extractCompany(item.title),
    person: extractPerson(text),
    city: city || null,
    state_or_province: prov || null,
    country: detectCountry(text, source),
  };
}
