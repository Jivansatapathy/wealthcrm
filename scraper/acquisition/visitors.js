// Website visitor analytics, collected ONLY after the visitor opts in through the cookie banner (public/consent.js).
// Opt-in, not opt-out: a visitor who rejects (or sends Global Privacy Control) leaves no record at all except, if they had previously
// accepted, a minimal consent-proof entry; their events are deleted. We store no IP address, no full user agent and no ad identifiers.
import { randomBytes } from 'node:crypto';
import { audit } from './audit.js';

export const VISITOR_CONSENT_VERSION = 'c1';
export const VISITOR_RETENTION_DAYS = 395; // about 13 months
const MAX_EVENTS_PER_VISITOR = 1000;
const MAX_EVENTS_TOTAL = 50000;
const ID = /^v_[0-9a-f]{32}$/;
const err = (message, status = 400) => Object.assign(new Error(message), { status });
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const iso = (ms) => new Date(ms).toISOString();

export const deviceOf = (ua) => {
  const s = String(ua || '');
  if (/bot|crawl|spider|slurp|headless/i.test(s)) return 'bot';
  if (/ipad|tablet/i.test(s)) return 'tablet';
  if (/mobi|android|iphone/i.test(s)) return 'mobile';
  return 'desktop';
};

const hostOf = (ref) => { try { return new URL(ref).hostname.slice(0, 100) || null; } catch { return null; } };

/** Record the visitor's cookie choice. Returns the visitor id only when analytics was accepted. */
export function recordVisitorConsent(ctx, body) {
  if (body.version !== VISITOR_CONSENT_VERSION) throw err('The cookie notice has changed; please reload the page');
  if (typeof body.analytics !== 'boolean') throw err('analytics must be true or false');
  const now = ctx.now();
  const gpc = body.gpc === true;
  const analytics = body.analytics && !gpc; // a browser privacy signal always wins
  const visitors = ctx.store.get('visitors', {});
  const given = clean(body.visitor_id, 40);
  const known = ID.test(given) ? visitors[given] : null;
  const entry = { at: iso(now), analytics, version: VISITOR_CONSENT_VERSION, ...(gpc ? { gpc: true } : {}) };

  if (analytics) {
    const id = known ? known.visitor_id : 'v_' + randomBytes(16).toString('hex');
    const v = visitors[id] || { visitor_id: id, created_at: iso(now), first_touch: null, page_views: 0, last_seen: iso(now), consent_history: [] };
    v.analytics = true;
    v.consent_history = [...v.consent_history, entry].slice(-20);
    visitors[id] = v;
    ctx.store.save('visitors');
    return { ok: true, visitor_id: id };
  }
  if (known) {
    // Withdrawal: delete their events and anything derived from them, keep only the proof that they said no.
    const visits = ctx.store.get('visits', []);
    ctx.store.set('visits', visits.filter((e) => e.visitor_id !== known.visitor_id));
    Object.assign(known, { analytics: false, first_touch: null, page_views: 0, consent_history: [...known.consent_history, entry].slice(-20) });
    const leads = ctx.store.get('leads', {});
    let touched = 0;
    for (const l of Object.values(leads)) if (l.visit_attribution?.visitor_id === known.visitor_id) { l.visit_attribution = null; touched++; }
    if (touched) ctx.store.save('leads');
    ctx.store.save('visitors');
    audit(ctx.store, { actor: 'subject', action: 'visitor.analytics_withdrawn', entity: 'visitor', entityId: known.visitor_id, detail: { leads_cleared: touched } }, now);
  }
  return { ok: true, visitor_id: null };
}

/** Record one page view. Silently ignored unless this visitor currently has analytics consent. */
export function recordVisit(ctx, body, userAgent) {
  const id = clean(body.visitor_id, 40);
  const v = ID.test(id) ? ctx.store.get('visitors', {})[id] : null;
  if (!v || v.analytics !== true) return { ok: true, recorded: false };
  const device = deviceOf(userAgent);
  if (device === 'bot' || v.page_views >= MAX_EVENTS_PER_VISITOR) return { ok: true, recorded: false };
  const path = clean(body.path, 200);
  if (!/^\/[\w\-./%]*$/.test(path)) throw err('Invalid path');
  const now = ctx.now();
  const ev = {
    visitor_id: id, at: iso(now), path, device, referrer_host: hostOf(clean(body.referrer, 300)),
    utm_source: clean(body.utm_source, 100) || null, utm_medium: clean(body.utm_medium, 100) || null, utm_campaign: clean(body.utm_campaign, 100) || null,
    language: clean(body.language, 12) || null,
  };
  const visits = ctx.store.get('visits', []);
  visits.push(ev);
  if (visits.length > MAX_EVENTS_TOTAL) visits.splice(0, visits.length - MAX_EVENTS_TOTAL);
  if (!v.first_touch) v.first_touch = { at: ev.at, landing_path: path, referrer_host: ev.referrer_host, utm_source: ev.utm_source, utm_medium: ev.utm_medium, utm_campaign: ev.utm_campaign, device };
  v.page_views += 1;
  v.last_seen = ev.at;
  ctx.store.save('visits');
  ctx.store.save('visitors');
  return { ok: true, recorded: true };
}

/** What we attach to an enquiry from the same browser, only while that visitor still has analytics consent. */
export function attributionFor(ctx, visitorId) {
  const id = clean(visitorId, 40);
  const v = ID.test(id) ? ctx.store.get('visitors', {})[id] : null;
  if (!v || v.analytics !== true) return null;
  return { visitor_id: id, first_touch: v.first_touch, page_views: v.page_views, consent_version: VISITOR_CONSENT_VERSION };
}

/** Retention: events and visitors unseen for ~13 months are deleted. */
export function purgeVisitors(ctx) {
  const cutoff = ctx.now() - VISITOR_RETENTION_DAYS * 864e5;
  const visits = ctx.store.get('visits', []);
  const kept = visits.filter((e) => Date.parse(e.at) >= cutoff);
  if (kept.length !== visits.length) ctx.store.set('visits', kept);
  const visitors = ctx.store.get('visitors', {});
  let n = 0;
  for (const [id, v] of Object.entries(visitors)) if (Date.parse(v.last_seen) < cutoff) { delete visitors[id]; n++; }
  if (n) ctx.store.save('visitors');
  return visits.length - kept.length + n;
}

/** Aggregates for the CRM. Contains no personal data. */
export function visitorSummary(ctx, days = 30) {
  const since = ctx.now() - days * 864e5;
  const visits = ctx.store.get('visits', []).filter((e) => Date.parse(e.at) >= since);
  const top = (fn, n = 10) => {
    const c = {};
    visits.forEach((e) => { const k = fn(e); c[k] = (c[k] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));
  };
  const visitors = Object.values(ctx.store.get('visitors', {}));
  const leads = Object.values(ctx.store.get('leads', {})).filter((l) => l.visit_attribution);
  return {
    window_days: days, page_views: visits.length, unique_visitors: new Set(visits.map((e) => e.visitor_id)).size,
    consented_visitors_total: visitors.filter((v) => v.analytics).length, withdrawn_total: visitors.filter((v) => !v.analytics).length,
    top_pages: top((e) => e.path), top_sources: top((e) => e.utm_source || e.referrer_host || 'direct'), devices: top((e) => e.device),
    enquiries_with_attribution: leads.length,
    note: 'Visitors who reject cookies are not recorded, so a consent rate cannot be computed from this data.',
  };
}
