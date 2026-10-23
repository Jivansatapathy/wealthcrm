// Fetch every source -> parse -> score -> match to CRM -> stack by company -> CRM-shaped intent leads.
import { createHash } from 'node:crypto';
import { BUILTIN_SOURCES } from './sources.js';
import { parseFeed, parseHtmlLinks } from './parse.js';
import { evaluateItem, formatAmount } from './score.js';
import { cleanTitle, extractCompany, extractPerson, extractLocation } from './extract.js';
import { buildCrmIndex, matchCrm, norm } from './match.js';
import { fetchFormD } from './edgar.js';

// Size of the disclosed event, not an assumption about any person's wealth.
export function tierFor(amount) {
  if (!amount) return 'Unsized';
  if (amount >= 2e6) return 'High ($2M+)';
  if (amount >= 2.5e5) return 'Medium ($250K-$2M)';
  if (amount >= 1e4) return 'Small ($10K-$250K)';
  return 'Unsized';
}

const CONTACT = process.env.SCRAPER_CONTACT || 'vgt-wealthcrm-intent-engine';
const UA = `Mozilla/5.0 (compatible; VGT-WealthCRM-IntentEngine/1.0; +${CONTACT})`;
const MAX_AGE_DAYS = 30;

export function isSafeUrl(u) {
  try {
    const { protocol, hostname } = new URL(u);
    if (!/^https?:$/.test(protocol)) return false;
    return !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1)/i.test(hostname);
  } catch { return false; }
}

async function fetchSource(src) {
  if (src.kind === 'edgar-formd') return fetchFormD();
  const res = await fetch(src.url, { headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/atom+xml, text/html, */*' }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const body = await res.text();
  const isFeed = src.kind === 'rss' || src.kind === 'atom' || /<(rss|feed)[\s>]/i.test(body.slice(0, 2000));
  return isFeed ? parseFeed(body) : parseHtmlLinks(body, src.url);
}

const idFor = (link, title) => 'SCR-' + createHash('sha1').update(link || title).digest('hex').slice(0, 10).toUpperCase();
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Date unknown');

function buildLead(item, source, s, match, now) {
  const title = cleanTitle(item.title);
  const text = `${item.title}. ${item.summary || ''}`;
  const company = extractCompany(item.title);
  const person = extractPerson(text);
  const location = extractLocation(text) || (s.canadian ? 'Canada' : 'Location not stated');
  const amountLabel = formatAmount(s.amount);
  const mandate = s.mandate ? formatAmount(s.mandate) : 'To be sized';
  const confidence = Math.min(97, Math.round(
    40 + source.reliability * 25 + (company ? 10 : 0) + (s.amount ? 10 : 0) + (person ? 7 : 0) + (match ? 5 : 0)));

  return {
    id: idFor(item.link, item.title),
    name: person?.name || company || title.slice(0, 40),
    title: person?.title || (person ? 'Executive' : 'Decision-maker to be identified'),
    company: company || 'Company not identified',
    location,
    industry: source.category,
    targetDivision: s.primary.division,
    intentScore: s.score,
    confidence: `${confidence}% (${source.name})`,
    estimatedAUM: s.mandate ? mandate : 'To be sized',
    dealSize: amountLabel,
    tier: tierFor(s.amount),
    primarySignalType: s.primary.type,
    urgency: s.primary.urgency,
    dateDetected: fmtDate(item.date),
    publishedAt: item.date,
    firstSeen: new Date(now).toISOString(),
    isLiveRealData: true,
    isScraped: true,
    externalUrl: item.link,
    crmMatch: match,
    signals: [{
      source: source.name,
      type: s.primary.type,
      detail: title,
      date: fmtDate(item.date),
      weight: s.reasons.reduce((a, r) => a + Math.max(0, r.points), 0),
    }],
    scoreBreakdown: s.reasons,
    aiAnalysis: {
      headline: title,
      rationale: `${s.primary.rationale}${s.amount ? ` Disclosed deal size: ${amountLabel}.` : ''}${match ? ` CRM link: ${match.relation} "${match.label}".` : ''}`,
      recommendedStrategy: s.primary.strategy,
      suggestedOutreachChannel: match
        ? `Warm outreach from the relationship owner: ${match.label} is already in the CRM.`
        : 'Executive introduction referencing the public announcement; confirm decision-maker before contact.',
      complianceNotice: `Public-source signal (${source.name}). Verify identity and obtain consent before outreach (PIPEDA / CASL); CIRO suitability applies to any recommendation.`,
    },
    householdPreview: { spouse: 'Not yet researched', entities: company ? [company] : [], jurisdiction: location },
    actionTaken: false,
  };
}

/** Stack multiple signals about the same company into one lead with a higher score. */
function stack(leads) {
  const byKey = new Map();
  for (const l of leads.sort((a, b) => b.intentScore - a.intentScore)) {
    const key = l.company !== 'Company not identified' ? norm(l.company) : norm(l.signals[0].detail);
    const top = byKey.get(key);
    if (!top) { byKey.set(key, l); continue; }
    if (top.signals.some((s) => s.detail === l.signals[0].detail)) continue;
    top.signals.push(l.signals[0]);
    const distinct = new Set(top.signals.map((s) => s.source)).size;
    top.intentScore = Math.min(100, top.intentScore + Math.min(10, 4 * (distinct - 1) + 2));
    top.scoreBreakdown.push({ label: `Corroborating signal: ${l.primarySignalType}`, points: 4 });
  }
  return [...byKey.values()];
}

export async function runScrape({ customSources = [], crmData = {}, now = Date.now() } = {}) {
  const idx = buildCrmIndex(crmData);
  const sources = [...BUILTIN_SOURCES, ...customSources.filter((s) => s.enabled !== false)];
  const report = [];
  const leads = [];

  await Promise.all(sources.map(async (src) => {
    const started = Date.now();
    const base = { id: src.id, name: src.name, category: src.category, url: src.url, custom: src.id.startsWith('custom-') };
    try {
      const items = await fetchSource(src);
      const details = [];
      let kept = 0;
      for (const item of items) {
        const row = { title: cleanTitle(item.title), link: item.link, date: item.date };
        if (item.date && now - new Date(item.date) > MAX_AGE_DAYS * 864e5) {
          details.push({ ...row, status: 'filtered', reason: 'Older than 30 days' });
          continue;
        }
        const s = evaluateItem(item, { reliability: 0.7, region: 'CA', ...src }, now);
        if (s.reject) {
          details.push({ ...row, status: 'filtered', reason: s.reject });
          continue;
        }
        const match = matchCrm(`${item.title} ${item.summary || ''}`, idx);
        const lead = buildLead(item, { reliability: 0.7, ...src }, s, match, now);
        if (match) {
          lead.intentScore = Math.min(100, lead.intentScore + 8);
          lead.scoreBreakdown.push({ label: `CRM match: ${match.relation}`, points: 8 });
        }
        leads.push(lead);
        details.push({
          ...row, status: 'signal', score: lead.intentScore, type: lead.primarySignalType,
          company: lead.company, dealSize: lead.dealSize, amount: s.amount || 0, urgency: lead.urgency, crm: match?.label || null,
        });
        kept++;
      }
      report.push({ ...base, ok: true, fetched: items.length, signals: kept, filtered: items.length - kept, ms: Date.now() - started, items: details.slice(0, 150) });
    } catch (e) {
      report.push({ ...base, ok: false, error: e.message, ms: Date.now() - started });
    }
  }));

  return { leads: stack(leads), report };
}
