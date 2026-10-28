// Market-signal connectors: Google (Search Console, GA4, Ads Keyword Planner), Bank of Canada rates, Eventbrite registrations.
// These return AGGREGATE demand data only (no person is identified), so they are stored as market signals, never as leads.
// Credentials are server-side env vars (never VITE_-prefixed). Each source still passes the registry permission gate.
import { createSign } from 'node:crypto';
import fs from 'node:fs';
import { sha } from './normalize.js';

export const GOOGLE_SOURCES = [
  { source_id: 'google-search-console', source_name: 'Google Search Console (own site queries)', kind: 'google-gsc',
    source_url: 'https://developers.google.com/webmaster-tools', auth: 'Service account added as a user on the verified property (GOOGLE_SERVICE_ACCOUNT_FILE, GSC_SITE_URL)',
    licence_type: 'Google API Services Terms; data for sites you own and have verified' },
  { source_id: 'google-analytics-ga4', source_name: 'Google Analytics 4 Data API (own site engagement)', kind: 'google-ga4',
    source_url: 'https://developers.google.com/analytics/devguides/reporting/data/v1', auth: 'Service account with Viewer role on the property (GOOGLE_SERVICE_ACCOUNT_FILE, GA4_PROPERTY_ID)',
    licence_type: 'Google Analytics terms; personal information must not be sent to GA4; aggregate use only' },
  { source_id: 'google-ads-keyword-planner', source_name: 'Google Ads Keyword Planner (Canadian search demand)', kind: 'google-ads',
    source_url: 'https://developers.google.com/google-ads/api/docs/keyword-planning/overview', auth: 'OAuth refresh token + approved developer token (GOOGLE_ADS_* variables)',
    licence_type: 'Google Ads API terms and developer-token access level apply (review required before redistribution)' },
].map((s) => ({ ...s, source_type: 'market_signal', geographic_coverage: ['CA'], access_method: 'api', endpoint: s.source_url,
  reliability: 0.8, refresh: 1440, region: 'CA', market: true, builtin: true }));

export const OTHER_MARKET_SOURCES = [
  { source_id: 'boc-rates', source_name: 'Bank of Canada Valet (policy rate, posted GIC rates)', kind: 'boc-rates',
    source_url: 'https://www.bankofcanada.ca/valet/docs', auth: 'None (public API, no key)',
    licence_type: 'Bank of Canada terms of use (https://www.bankofcanada.ca/terms/); attribution required (review required)' },
  { source_id: 'eventbrite-events', source_name: 'Eventbrite (own events: registration counts only)', kind: 'eventbrite',
    source_url: 'https://www.eventbrite.com/platform/api', auth: 'Private OAuth token for your organization (EVENTBRITE_TOKEN, EVENTBRITE_ORG_ID)',
    licence_type: 'Eventbrite API terms; first-party events only; counts only, attendee data is not read' },
].map((s) => ({ ...s, source_type: 'market_signal', geographic_coverage: ['CA'], access_method: 'api', endpoint: s.source_url,
  reliability: s.source_id === 'boc-rates' ? 0.95 : 0.9, refresh: s.source_id === 'boc-rates' ? 1440 : 360, region: 'CA', market: true, builtin: true }));

// topic -> [seed keywords for Keyword Planner, regex used to classify queries and page paths]
export const TOPICS = {
  gic: { seeds: ['gic rates canada', 'best gic rates', 'cashable gic'], re: /\bgics?\b|guaranteed investment/i },
  rrsp: { seeds: ['rrsp contribution limit', 'rrsp calculator', 'rrsp vs tfsa'], re: /\brrsps?\b/i },
  tfsa: { seeds: ['tfsa contribution limit', 'tfsa investments'], re: /\btfsas?\b/i },
  rrif: { seeds: ['rrif minimum withdrawal', 'rrif calculator'], re: /\brrifs?\b/i },
  retirement_planning: { seeds: ['retirement planning canada', 'retirement calculator canada'], re: /retire|pension|cpp|oas/i },
  private_banking: { seeds: ['private wealth management canada', 'private banking canada'], re: /private (wealth|banking)|high net worth|wealth manage/i },
  succession_planning: { seeds: ['business succession planning', 'sell my business canada'], re: /succession|sell (my|a) business|exit plan/i },
  portfolio_transfer: { seeds: ['transfer investment account canada', 'transfer rrsp to another bank'], re: /transfer.*(rrsp|tfsa|account|portfolio)|switch (advisor|broker)/i },
  estate_planning: { seeds: ['estate planning canada', 'family trust canada'], re: /estate|trust|will and/i },
};

export const classifyTopic = (text) => Object.keys(TOPICS).find((t) => TOPICS[t].re.test(text)) || null;
const PII = /@|\d{7,}/; // queries/paths that look like emails or long numbers are dropped, never stored
const day = (ms) => new Date(ms).toISOString().slice(0, 10);
const need = (env, names) => {
  const missing = names.filter((n) => !env[n]);
  if (missing.length) throw new Error(`Google connector not configured: set ${missing.join(', ')}`);
};

const b64url = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');

async function tokenFromServiceAccount(ctx, scope) {
  need(ctx.env, ['GOOGLE_SERVICE_ACCOUNT_FILE']);
  const sa = JSON.parse(fs.readFileSync(ctx.env.GOOGLE_SERVICE_ACCOUNT_FILE, 'utf8'));
  const iat = Math.floor(ctx.now() / 1000);
  const head = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({ iss: sa.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 })}`;
  const sig = createSign('RSA-SHA256').update(head).sign(sa.private_key, 'base64url');
  const res = await ctx.googleFetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${sig}` }).toString(),
  });
  return res.access_token;
}

async function tokenFromRefresh(ctx) {
  need(ctx.env, ['GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_REFRESH_TOKEN']);
  const res = await ctx.googleFetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: ctx.env.GOOGLE_ADS_CLIENT_ID, client_secret: ctx.env.GOOGLE_ADS_CLIENT_SECRET, refresh_token: ctx.env.GOOGLE_ADS_REFRESH_TOKEN }).toString(),
  });
  return res.access_token;
}

const sig = (source, topic, period, key) => `${source}:${topic}:${period}:${sha(key, 'sha1').slice(0, 10)}`;

// ---- Search Console: top queries for our own property, classified by wealth topic ----
async function collectGsc(ctx, source) {
  need(ctx.env, ['GSC_SITE_URL']);
  const token = await tokenFromServiceAccount(ctx, 'https://www.googleapis.com/auth/webmasters.readonly');
  const end = ctx.now() - 3 * 864e5; // Search Console data lags ~2-3 days
  const body = { startDate: day(end - 27 * 864e5), endDate: day(end), dimensions: ['query'], rowLimit: 500, dimensionFilterGroups: [{ filters: [{ dimension: 'country', operator: 'equals', expression: 'can' }] }] };
  const res = await ctx.googleFetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(ctx.env.GSC_SITE_URL)}/searchAnalytics/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const period = body.endDate;
  const out = [];
  for (const r of res.rows || []) {
    const q = String(r.keys?.[0] || '');
    const topic = classifyTopic(q);
    if (!topic || PII.test(q)) continue;
    out.push({ signal_id: sig(source.source_id, topic, period, q), topic, metric: 'search_query', label: q, impressions: r.impressions, clicks: r.clicks, position: r.position, period });
  }
  return out;
}

// ---- GA4: engagement with wealth-topic pages (aggregate counts only) ----
async function collectGa4(ctx, source) {
  need(ctx.env, ['GA4_PROPERTY_ID']);
  const token = await tokenFromServiceAccount(ctx, 'https://www.googleapis.com/auth/analytics.readonly');
  const res = await ctx.googleFetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(ctx.env.GA4_PROPERTY_ID)}:runReport`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ dateRanges: [{ startDate: '28daysAgo', endDate: 'yesterday' }], dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }], limit: 500 }),
  });
  const period = day(ctx.now() - 864e5);
  const out = [];
  for (const r of res.rows || []) {
    const path = String(r.dimensionValues?.[0]?.value || '').split('?')[0];
    const topic = classifyTopic(path.replace(/[-_/]/g, ' '));
    if (!topic || PII.test(path)) continue;
    out.push({ signal_id: sig(source.source_id, topic, period, path), topic, metric: 'page_engagement', label: path, views: +r.metricValues[0].value, users: +r.metricValues[1].value, period });
  }
  return out;
}

// ---- Keyword Planner: Canadian monthly search volume for seed keywords per topic ----
async function collectAds(ctx, source) {
  need(ctx.env, ['GOOGLE_ADS_DEVELOPER_TOKEN', 'GOOGLE_ADS_CUSTOMER_ID']);
  const token = await tokenFromRefresh(ctx);
  const version = ctx.env.GOOGLE_ADS_API_VERSION || 'v20';
  const cid = ctx.env.GOOGLE_ADS_CUSTOMER_ID.replace(/-/g, '');
  const headers = { Authorization: `Bearer ${token}`, 'developer-token': ctx.env.GOOGLE_ADS_DEVELOPER_TOKEN, 'Content-Type': 'application/json' };
  if (ctx.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = ctx.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g, '');
  const topicOf = Object.fromEntries(Object.entries(TOPICS).flatMap(([t, v]) => v.seeds.map((k) => [k, t])));
  const res = await ctx.googleFetch(`https://googleads.googleapis.com/${version}/customers/${cid}:generateKeywordHistoricalMetrics`, {
    method: 'POST', headers,
    body: JSON.stringify({ keywords: Object.keys(topicOf), geoTargetConstants: ['geoTargetConstants/2124'], language: 'languageConstants/1000', keywordPlanNetwork: 'GOOGLE_SEARCH' }),
  });
  const period = day(ctx.now()).slice(0, 7);
  const out = [];
  for (const r of res.results || []) {
    const topic = topicOf[r.text] || classifyTopic(r.text);
    if (!topic) continue;
    const m = r.keywordMetrics || {};
    const months = (m.monthlySearchVolumes || []).map((v) => +v.monthlySearches);
    const recent = months.slice(-3).reduce((a, b) => a + b, 0), prior = months.slice(-6, -3).reduce((a, b) => a + b, 0);
    out.push({ signal_id: sig(source.source_id, topic, period, r.text), topic, metric: 'search_volume', label: r.text, avg_monthly_searches: +m.avgMonthlySearches || 0,
      competition: m.competition || null, trend_pct: prior ? Math.round(((recent - prior) / prior) * 100) : null, period });
  }
  return out;
}

// ---- Bank of Canada Valet: policy rate and posted GIC rates (a driver of GIC / retirement-income demand) ----
const BOC_SERIES = {
  V39079: { label: 'Bank of Canada policy rate', topic: 'rate_environment' },
  V80691311: { label: 'Prime rate', topic: 'rate_environment' },
  V80691339: { label: 'GIC 1-year (posted)', topic: 'gic' },
  V80691340: { label: 'GIC 3-year (posted)', topic: 'gic' },
  V80691341: { label: 'GIC 5-year (posted)', topic: 'gic' },
};
async function collectBoc(ctx, source) {
  const ids = Object.keys(BOC_SERIES);
  const res = await ctx.googleFetch(`https://www.bankofcanada.ca/valet/observations/${ids.join(',')}/json?recent=60`, {});
  const period = day(ctx.now());
  const out = [];
  for (const id of ids) {
    const obs = (res.observations || []).filter((o) => o[id]?.v != null && o[id].v !== '').map((o) => ({ d: o.d, v: +o[id].v })).sort((a, b) => a.d.localeCompare(b.d));
    if (!obs.length) continue;
    const last = obs[obs.length - 1];
    const cutoff = day(Date.parse(last.d) - 28 * 864e5);
    const before = [...obs].reverse().find((o) => o.d <= cutoff);
    out.push({ signal_id: sig(source.source_id, BOC_SERIES[id].topic, period, id), topic: BOC_SERIES[id].topic, metric: 'rate', label: BOC_SERIES[id].label,
      rate_pct: last.v, change_4w_pts: before ? +(last.v - before.v).toFixed(2) : null, observed: last.d, period });
  }
  return out;
}

// ---- Eventbrite: tickets sold per own event, classified by wealth topic. Counts only; no attendee is read. ----
async function collectEventbrite(ctx, source) {
  need(ctx.env, ['EVENTBRITE_TOKEN', 'EVENTBRITE_ORG_ID']);
  const res = await ctx.googleFetch(`https://www.eventbriteapi.com/v3/organizations/${encodeURIComponent(ctx.env.EVENTBRITE_ORG_ID)}/events/?status=live,started,ended&expand=ticket_classes&order_by=start_desc&page_size=50`, {
    headers: { Authorization: `Bearer ${ctx.env.EVENTBRITE_TOKEN}` },
  });
  const period = day(ctx.now());
  const out = [];
  for (const e of res.events || []) {
    const name = e.name?.text || '';
    const topic = classifyTopic(name);
    if (!topic) continue;
    const registrations = (e.ticket_classes || []).reduce((a, t) => a + (+t.quantity_sold || 0), 0);
    out.push({ signal_id: sig(source.source_id, topic, period, String(e.id || name)), topic, metric: 'event_registrations', label: name.slice(0, 120), registrations, event_start: e.start?.utc || null, period });
  }
  return out;
}

const COLLECTORS = { 'google-gsc': collectGsc, 'google-ga4': collectGa4, 'google-ads': collectAds, 'boc-rates': collectBoc, eventbrite: collectEventbrite };

/** Fetches, stores (upsert by signal_id) and returns counts. Throws when the connector is not configured. */
export async function runMarketSource(ctx, source) {
  const rows = await COLLECTORS[source.kind](ctx, source);
  const store = ctx.store.get('market_signals', {});
  const nowIso = new Date(ctx.now()).toISOString();
  let added = 0;
  for (const r of rows) {
    if (!store[r.signal_id]) added++;
    store[r.signal_id] = { ...r, source_id: source.source_id, entity_type: 'market', classification: 'market_signal', country: 'CA', collected_at: nowIso };
  }
  ctx.store.save('market_signals');
  return { received: rows.length, added };
}

/** Aggregate by topic for the dashboard: latest period per source/metric only. */
export function marketSummary(ctx) {
  const rows = Object.values(ctx.store.get('market_signals', {}));
  const latest = {};
  for (const r of rows) { const k = `${r.source_id}:${r.metric}`; if (!latest[k] || r.period > latest[k]) latest[k] = r.period; }
  const topics = {};
  const rates = [];
  for (const r of rows) {
    if (r.period !== latest[`${r.source_id}:${r.metric}`]) continue;
    if (r.metric === 'rate') { rates.push({ label: r.label, rate_pct: r.rate_pct, change_4w_pts: r.change_4w_pts, observed: r.observed }); continue; }
    const t =(topics[r.topic] ||= { topic: r.topic, search_volume: 0, own_site_impressions: 0, own_site_clicks: 0, page_views: 0, event_registrations: 0, trend_pct: null });
    if (r.metric === 'event_registrations') t.event_registrations += r.registrations || 0;
    if (r.metric === 'search_volume') { t.search_volume += r.avg_monthly_searches; if (r.trend_pct != null) t.trend_pct = Math.max(t.trend_pct ?? -Infinity, r.trend_pct); }
    if (r.metric === 'search_query') { t.own_site_impressions += r.impressions || 0; t.own_site_clicks += r.clicks || 0; }
    if (r.metric === 'page_engagement') t.page_views += r.views || 0;
  }
  return { classification: 'market_signal', note: 'Aggregate demand only. Not individuals and not contactable.', rates, topics: Object.values(topics).sort((a, b) => b.search_volume - a.search_volume) };
}
