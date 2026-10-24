// Intent scraper service. Run: npm run scraper   (or `npm run scraper:once` for a single scrape)
// Endpoints: GET /health | GET /leads?min=40 | POST /refresh | GET/POST /sources | DELETE /sources/:id
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { runScrape, isSafeUrl } from './pipeline.js';
import { BUILTIN_SOURCES } from './sources.js';
import { createContext, createApi, startScheduler } from './acquisition/index.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(DIR, 'data');
const SIGNALS_FILE = path.join(DATA, 'signals.json');
const CUSTOM_FILE = path.join(DATA, 'custom-sources.json');
const PORT = Number(process.env.SCRAPER_PORT || 3100);
const INTERVAL_MIN = Number(process.env.SCRAPE_INTERVAL_MIN || 15);

const readJson = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; } };
const writeJson = (f, v) => { fs.mkdirSync(DATA, { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 2)); };

async function loadCrm() {
  try { return (await import(pathToFileURL(path.join(DIR, '..', 'src', 'data', 'wealthData.js')).href)).WEALTH_DATA; }
  catch (e) { console.warn('CRM data unavailable, skipping client matching:', e.message); return {}; }
}

let state = readJson(SIGNALS_FILE, { updatedAt: null, leads: [], report: [] });
let running = null;

async function scrape() {
  if (running) return running;
  running = (async () => {
    const t0 = Date.now();
    // Filings we already evaluated (kept or filtered) are not downloaded again; their earlier results are carried forward below
    const prevItems = new Map((state.report || []).map((r) => [r.id, r.items || []]));
    const knownLinks = new Set([...state.leads.map((l) => l.externalUrl), ...[...prevItems.values()].flat().map((i) => i.link)].filter(Boolean));
    const { leads, report: fresh } = await runScrape({ customSources: readJson(CUSTOM_FILE, []), crmData: await loadCrm(), knownLinks });
    const report = fresh.map((r) => {
      if (!r.ok || r.id !== 'edgar-form-d-ca') return r;
      const seen = new Set((r.items || []).map((i) => i.link));
      const items = [...(r.items || []), ...(prevItems.get(r.id) || []).filter((i) => !seen.has(i.link))].slice(0, 150);
      const signals = items.filter((i) => i.status === 'signal').length;
      return { ...r, items, fetched: items.length, signals, filtered: items.length - signals };
    });
    // Keep previously-seen leads that this run didn't return (feeds roll off), preserving firstSeen
    const prev = new Map(state.leads.map((l) => [l.id, l]));
    const merged = new Map(leads.map((l) => [l.id, { ...l, firstSeen: prev.get(l.id)?.firstSeen || l.firstSeen }]));
    const cutoff = Date.now() - 30 * 864e5;
    for (const [id, l] of prev) if (!merged.has(id) && new Date(l.publishedAt || l.firstSeen) > cutoff) merged.set(id, l);
    state = { updatedAt: new Date().toISOString(), durationMs: Date.now() - t0, leads: [...merged.values()].sort((a, b) => b.intentScore - a.intentScore), report };
    writeJson(SIGNALS_FILE, state);
    console.log(`[scraper] ${state.leads.length} leads · ${report.filter((r) => r.ok).length}/${report.length} sources ok · ${state.durationMs}ms`);
    return state;
  })().finally(() => { running = null; });
  return running;
}

const lean = (report = []) => report.map(({ items, ...r }) => r);
const countBy = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); m[k] = (m[k] || 0) + 1; return m; }, {});

/** Totals across every source plus a per-URL breakdown of what each one found. */
function buildOverview() {
  const report = state.report || [];
  const scraped = new Set(report.map((r) => r.id));
  const pending = readJson(CUSTOM_FILE, []).filter((s) => !scraped.has(s.id))
    .map((s) => ({ id: s.id, name: s.name, category: s.category, url: s.url, custom: true, ok: null, items: [] }));

  const sources = [...report, ...pending].map((r) => {
    const items = r.items || [];
    const signals = items.filter((i) => i.status === 'signal');
    return {
      ...r,
      avgScore: signals.length ? Math.round(signals.reduce((a, i) => a + i.score, 0) / signals.length) : 0,
      topScore: signals.reduce((m, i) => Math.max(m, i.score), 0),
      dealTotal: signals.reduce((a, i) => a + (i.amount || 0), 0),
      reasons: countBy(items.filter((i) => i.status === 'filtered'), (i) => i.reason),
      types: countBy(signals, (i) => i.type),
    };
  });

  const allItems = report.flatMap((r) => r.items || []);
  const seen = new Set();
  let dealValue = 0;
  for (const i of allItems) {
    if (i.status !== 'signal' || seen.has(i.title)) continue;
    seen.add(i.title);
    dealValue += i.amount || 0;
  }
  const leads = state.leads || [];
  return {
    updatedAt: state.updatedAt,
    durationMs: state.durationMs,
    totals: {
      sources: sources.length,
      live: report.filter((r) => r.ok).length,
      failing: report.filter((r) => r.ok === false).length,
      scanned: report.reduce((a, r) => a + (r.fetched || 0), 0),
      signals: report.reduce((a, r) => a + (r.signals || 0), 0),
      filtered: report.reduce((a, r) => a + (r.filtered || 0), 0),
      leads: leads.length,
      avgScore: leads.length ? Math.round(leads.reduce((a, l) => a + l.intentScore, 0) / leads.length) : 0,
      hotLeads: leads.filter((l) => l.intentScore >= 70).length,
      crmMatches: leads.filter((l) => l.crmMatch).length,
      dealValue,
    },
    byType: countBy(leads, (l) => l.primarySignalType),
    rejectReasons: countBy(allItems.filter((i) => i.status === 'filtered'), (i) => i.reason),
    sources,
  };
}

const send = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
  res.end(JSON.stringify(body));
};
const readBody = (req) => new Promise((resolve) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } }); });

// Lead-acquisition pipeline (permission-gated sources, consent, review). Routes live under /acq (proxied as /api/acq).
const acqCtx = createContext({ customSources: () => readJson(CUSTOM_FILE, []), crmData: await loadCrm() });
const acqApi = createApi(acqCtx);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (await acqApi(req, res, url)) return;
  if (req.method === 'OPTIONS') return send(res, 204, {});
  try {
    if (url.pathname === '/health') return send(res, 200, { ok: true, updatedAt: state.updatedAt, scraping: !!running });
    if (url.pathname === '/leads' && req.method === 'GET') {
      const min = Number(url.searchParams.get('min') || 40);
      const leads = state.leads.filter((l) => l.intentScore >= min);
      return send(res, 200, { success: true, source: 'VGT Intent Scraper', updatedAt: state.updatedAt, count: leads.length, sources: lean(state.report), leads });
    }
    if (url.pathname === '/overview' && req.method === 'GET') return send(res, 200, buildOverview());
    if (url.pathname === '/refresh' && req.method === 'POST') {
      const s = await scrape();
      return send(res, 200, { success: true, updatedAt: s.updatedAt, count: s.leads.length, sources: lean(s.report) });
    }
    if (url.pathname === '/sources' && req.method === 'GET') {
      return send(res, 200, { builtin: BUILTIN_SOURCES.map(({ id, name, category, url }) => ({ id, name, category, url })), custom: readJson(CUSTOM_FILE, []), lastRun: (state.report || []).map(({ items, ...r }) => r), updatedAt: state.updatedAt });
    }
    if (url.pathname === '/sources' && req.method === 'POST') {
      const { url: u, name } = await readBody(req);
      if (!isSafeUrl(u)) return send(res, 400, { error: 'A public http(s) URL is required' });
      const list = readJson(CUSTOM_FILE, []);
      const id = 'custom-' + createHash('sha1').update(u).digest('hex').slice(0, 8);
      if (!list.some((s) => s.id === id)) list.push({ id, name: name || new URL(u).hostname, url: u, kind: 'auto', category: 'Custom', reliability: 0.7, region: 'CA', enabled: true });
      writeJson(CUSTOM_FILE, list);
      return send(res, 201, { custom: list });
    }
    if (url.pathname.startsWith('/sources/') && req.method === 'DELETE') {
      const id = url.pathname.split('/')[2];
      const list = readJson(CUSTOM_FILE, []).filter((s) => s.id !== id);
      writeJson(CUSTOM_FILE, list);
      return send(res, 200, { custom: list });
    }
    send(res, 404, { error: 'Not found' });
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

if (process.argv.includes('--once')) {
  const s = await scrape();
  s.leads.slice(0, 15).forEach((l) => console.log(`${String(l.intentScore).padStart(3)}  ${l.primarySignalType.padEnd(48)} ${l.company.slice(0, 40).padEnd(40)} ${l.dealSize}`));
  s.report.forEach((r) => console.log(r.ok ? `✓ ${r.name}: ${r.signals}/${r.fetched}` : `✗ ${r.name}: ${r.error}`));
} else {
  server.listen(PORT, () => {
    console.log(`[scraper] Intent service on http://localhost:${PORT} (refresh every ${INTERVAL_MIN} min)`);
    scrape().catch((e) => console.error('[scraper] initial scrape failed:', e));
    startScheduler(acqCtx);
    setInterval(() => scrape().catch((e) => console.error('[scraper] scrape failed:', e)), INTERVAL_MIN * 60 * 1000);
  });
}
