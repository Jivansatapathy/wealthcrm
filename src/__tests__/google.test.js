// @vitest-environment node
// TEST DATA ONLY: synthetic API responses.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateKeyPairSync } from 'node:crypto';
import { createStore } from '../../scraper/acquisition/store.js';
import { createContext } from '../../scraper/acquisition/index.js';
import { setPermission, getSource } from '../../scraper/acquisition/registry.js';
import { runSource } from '../../scraper/acquisition/runner.js';
import { marketSummary, classifyTopic } from '../../scraper/acquisition/google.js';

const NOW = Date.parse('2026-10-28T12:00:00Z');
const PERM = { status: 'approved', commercial_use_status: 'yes (test)', permitted_purpose: 'market research', permitted_geographies: ['CA'], licence_reference: 'TEST' };

function makeCtx(env, googleFetch) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'g-test-'));
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const keyFile = path.join(dir, 'sa.json');
  fs.writeFileSync(keyFile, JSON.stringify({ client_email: 'sa@test.iam', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) }));
  return createContext({ store: createStore(dir), env: { NODE_ENV: 'test', ACQ_TOKENS: 'admin:adminadminadmin1234', GOOGLE_SERVICE_ACCOUNT_FILE: keyFile, ...env }, now: () => NOW, sleep: async () => {}, googleFetch });
}

describe('google market signals', () => {
  it('classifies wealth topics', () => {
    expect(classifyTopic('best gic rates ontario')).toBe('gic');
    expect(classifyTopic('weather today')).toBeNull();
  });

  it('is blocked until the source is approved', async () => {
    const ctx = makeCtx({}, async () => ({}));
    expect((await runSource(ctx, 'google-ads-keyword-planner')).status).toBe('blocked');
  });

  it('fails clearly when credentials are missing', async () => {
    const ctx = makeCtx({}, async () => ({}));
    setPermission(ctx, 'google-ads-keyword-planner', PERM, 'admin:test');
    const run = await runSource(ctx, 'google-ads-keyword-planner');
    expect(run.status).toBe('failed');
    expect(run.error).toMatch(/GOOGLE_ADS_DEVELOPER_TOKEN/);
  });

  it('stores Keyword Planner volumes as market signals, not leads', async () => {
    const calls = [];
    const ctx = makeCtx({ GOOGLE_ADS_DEVELOPER_TOKEN: 'dev', GOOGLE_ADS_CUSTOMER_ID: '123-456-7890', GOOGLE_ADS_CLIENT_ID: 'c', GOOGLE_ADS_CLIENT_SECRET: 's', GOOGLE_ADS_REFRESH_TOKEN: 'r' }, async (url, opts) => {
      calls.push({ url, opts });
      if (url.includes('oauth2')) return { access_token: 'tok' };
      return { results: [{ text: 'gic rates canada', keywordMetrics: { avgMonthlySearches: '9900', competition: 'HIGH',
        monthlySearchVolumes: [1, 1, 1, 100, 100, 100].map((n) => ({ monthlySearches: String(n) })) } }] };
    });
    setPermission(ctx, 'google-ads-keyword-planner', PERM, 'admin:test');
    const run = await runSource(ctx, 'google-ads-keyword-planner');
    expect(run.status).toBe('success');
    const api = calls.find((c) => c.url.includes('googleads'));
    expect(api.url).toContain('/customers/1234567890:generateKeywordHistoricalMetrics');
    expect(api.opts.headers['developer-token']).toBe('dev');
    expect(Object.values(ctx.store.get('leads', {}))).toHaveLength(0);
    const gic = marketSummary(ctx).topics.find((t) => t.topic === 'gic');
    expect(gic.search_volume).toBe(9900);
    expect(gic.trend_pct).toBe(9900);
    expect(getSource(ctx, 'google-ads-keyword-planner').connected).toBe(true);
  });

  it('keeps wealth queries from Search Console and drops personal-looking ones', async () => {
    const ctx = makeCtx({ GSC_SITE_URL: 'https://example.test/' }, async (url) => url.includes('oauth2') ? { access_token: 't' } : {
      rows: [{ keys: ['rrsp calculator'], clicks: 4, impressions: 100, position: 3 }, { keys: ['rrsp jane@example.com'], clicks: 1, impressions: 1 }, { keys: ['cat videos'], clicks: 1, impressions: 9 }] });
    setPermission(ctx, 'google-search-console', PERM, 'admin:test');
    const run = await runSource(ctx, 'google-search-console');
    expect(run.status).toBe('success');
    expect(run.accepted).toBe(1);
    expect(marketSummary(ctx).topics[0]).toMatchObject({ topic: 'rrsp', own_site_impressions: 100 });
  });
  it('stores Bank of Canada rates and flags the 4-week change', async () => {
    const ctx = makeCtx({}, async () => ({ observations: [
      { d: '2026-09-23', V80691339: { v: '3.00' } }, { d: '2026-10-21', V80691339: { v: '2.75' } }, { d: '2026-10-27', V39079: { v: '2.25' } }] }));
    setPermission(ctx, 'boc-rates', PERM, 'admin:test');
    expect((await runSource(ctx, 'boc-rates')).status).toBe('success');
    const s = marketSummary(ctx);
    expect(s.rates.find((r) => r.label.startsWith('GIC 1-year'))).toMatchObject({ rate_pct: 2.75, change_4w_pts: -0.25 });
    expect(s.rates.find((r) => r.label.includes('policy')).rate_pct).toBe(2.25);
  });

  it('counts Eventbrite registrations per wealth event without reading attendees', async () => {
    const calls = [];
    const ctx = makeCtx({ EVENTBRITE_TOKEN: 't', EVENTBRITE_ORG_ID: '99' }, async (url) => { calls.push(url); return { events: [
      { id: '1', name: { text: 'Retirement Planning Webinar' }, ticket_classes: [{ quantity_sold: 12 }, { quantity_sold: 3 }] }, { id: '2', name: { text: 'Office party' }, ticket_classes: [{ quantity_sold: 50 }] }] }; });
    setPermission(ctx, 'eventbrite-events', PERM, 'admin:test');
    expect((await runSource(ctx, 'eventbrite-events')).status).toBe('success');
    expect(marketSummary(ctx).topics.find((t) => t.topic === 'retirement_planning').event_registrations).toBe(15);
    expect(calls.some((u) => u.includes('attendees'))).toBe(false);
  });
});

describe('midu connector', () => {
  const row = (o) => ({ id: 'r1', date: '2026-10-28', company: 'Maple Test Co', city: 'Toronto', country: 'CA', amount_usd: 5000000, headline: 'Maple Test Co raises $5M Series A', url: 'https://midu.si/story/1', ai: { summary: 'Raised a Series A.' }, ...o });
  it('keeps only Canadian rows, dedupes across searches and carries attribution', async () => {
    const { fetchMidu } = await import('../../scraper/midu.js');
    const calls = [];
    const fetchImpl = async (url, opts) => { calls.push({ url, opts }); return { ok: true, status: 200, json: async () => ({ data: [row(), row({ id: 'r2', company: 'US Co', country: 'US', url: 'https://midu.si/story/2' })] }) }; };
    const items = await fetchMidu({ key: 'k', fetchImpl, now: Date.parse('2026-10-28T00:00:00Z') });
    expect(items).toHaveLength(1);
    expect(items[0].summary).toMatch(/Data: Midu \(midu\.si\)/);
    expect(calls[0].opts.headers.Authorization).toBe('Bearer k');
  });
  it('fails clearly without a key and on a rejected key', async () => {
    const { fetchMidu } = await import('../../scraper/midu.js');
    await expect(fetchMidu({})).rejects.toThrow(/MIDU_API_KEY/);
    await expect(fetchMidu({ key: 'bad', fetchImpl: async () => ({ ok: false, status: 401 }) })).rejects.toThrow(/401/);
  });
});

describe('midu company naming', () => {
  it('leads the title with the company name so extraction picks the right company', async () => {
    const { fetchMidu } = await import('../../scraper/midu.js');
    const { extractCompany } = await import('../../scraper/extract.js');
    const r = { id: 'a', date: '2026-10-28', company: 'Aerium', city: 'Toronto', country: 'CA', headline: 'McKinsey alumni raise $2.5 million USD to build AI', url: 'https://midu.si/story/a', ai: {} };
    const items = await fetchMidu({ key: 'k', fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ data: [r] }) }) });
    expect(extractCompany(items[0].title)).toBe('Aerium');
  });
});
