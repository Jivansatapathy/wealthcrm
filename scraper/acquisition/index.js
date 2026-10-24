// Wiring: builds the shared context (store, clock, network, DNS) so every module is testable with fakes.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from './store.js';
import { fetchSource as realFetchSource } from '../pipeline.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DATA_DIR = path.join(DIR, '..', 'data', 'acq');

const UA = `Mozilla/5.0 (compatible; VGT-WealthCRM-IntentEngine/1.0; +${process.env.SCRAPER_CONTACT || 'vgt-wealthcrm-intent-engine'})`;

async function realFetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.text();
}

async function realFetchJson(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(() => ({}));
}

export function createContext(overrides = {}) {
  const env = overrides.env || process.env;
  const store = overrides.store || createStore(env.ACQ_DATA_DIR || DEFAULT_DATA_DIR);
  return {
    env, store,
    now: () => Date.now(),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    fetchSource: realFetchSource,
    fetchText: realFetchText,
    fetchJson: realFetchJson,
    resolveMx: undefined, // default: node:dns
    customSources: () => [],
    crmData: null,
    ...overrides,
  };
}

export { createApi } from './api.js';
export { startScheduler } from './runner.js';
