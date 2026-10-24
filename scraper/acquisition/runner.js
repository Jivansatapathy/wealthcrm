// Scheduled/manual ingestion: permission gate, no overlapping runs, bounded retries with backoff, robots.txt for scraped
// HTML, rate-limit floor, replayable batches, failure alerts.
import { audit } from './audit.js';
import { getSource, listSources, permissionGate, updateSourceState } from './registry.js';
import { processItems, newRun, recordRejection, archiveRecord } from './ingest.js';
import { sha } from './normalize.js';
import { DAY_MS } from './registry.js';
import { applyRetention } from './leads.js';
import { purgeVisitors } from './visitors.js';

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [1000, 4000];
const MIN_MANUAL_INTERVAL_MIN = 5; // floor so manual refreshes cannot hammer a source
const MAX_RUNS = 500;
const MAX_BATCHES = 20;
const UA_TOKEN = 'VGT-WealthCRM-IntentEngine';
const err = (message, status = 400) => Object.assign(new Error(message), { status });
const running = new Set();

/** Minimal robots.txt check for the `*` and our own group. Fails closed if robots.txt cannot be read. */
export async function robotsAllows(url, fetchText) {
  const u = new URL(url);
  let body;
  try { body = await fetchText(`${u.origin}/robots.txt`); } catch (e) { if (e.status === 404) return true; return false; }
  let applies = false, any = false;
  const disallow = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^(user-agent|disallow|allow)\s*:\s*(.*)$/i);
    if (!m) continue;
    const k = m[1].toLowerCase();
    if (k === 'user-agent') { applies = m[2] === '*' || m[2].toLowerCase().includes(UA_TOKEN.toLowerCase()); any = any || applies; }
    else if (applies && k === 'disallow' && m[2]) disallow.push(m[2]);
  }
  return !any || !disallow.some((p) => (u.pathname + u.search).startsWith(p));
}

/** The legacy fetcher in pipeline.js expects { id, url, kind }; the registry exposes source_id / source_url. */
export const fetchable = (s) => ({ ...s, id: s.source_id, url: s.source_url, name: s.source_name });

async function fetchWithRetry(ctx, source, run, hints) {
  let last;
  for (let a = 1; a <= MAX_ATTEMPTS; a++) {
    run.attempts = a;
    try { return await ctx.fetchSource(fetchable(source), hints); } catch (e) {
      last = e;
      if (a < MAX_ATTEMPTS) await ctx.sleep(BACKOFF_MS[a - 1]);
    }
  }
  throw last;
}

export async function runSource(ctx, sourceId, { trigger = 'manual', actor = 'system' } = {}) {
  const source = getSource(ctx, sourceId);
  if (!source) throw err('Unknown source', 404);
  if (source.system || source.access_method === 'csv' || source.access_method === 'form') throw err('This source is not fetched on a schedule (enquiry form / CSV import only)');
  const run = newRun(ctx, sourceId, trigger);
  const runs = ctx.store.get('runs', []);
  const finish = (status, error = null) => {
    run.status = status; run.error = error; run.finished_at = new Date(ctx.now()).toISOString();
    runs.push(run);
    if (runs.length > MAX_RUNS) runs.splice(0, runs.length - MAX_RUNS);
    ctx.store.save('runs');
    return run;
  };

  if (running.has(sourceId)) return finish('skipped_overlap', 'A run for this source is already in progress');

  const gate = permissionGate(ctx, sourceId);
  if (!gate.allowed) {
    audit(ctx.store, { actor, action: 'source.run_blocked', entity: 'source', entityId: sourceId, detail: { reasons: gate.reasons } }, ctx.now());
    return finish('blocked', `Blocked by permission gate: ${gate.reasons.join('; ')}`);
  }
  if (source.paused) return finish('skipped_paused', 'Source is paused');
  if (source.connector !== 'implemented') return finish('failed', `No connector is implemented for access method "${source.access_method}"`);

  const last = source.last_attempted_fetch ? new Date(source.last_attempted_fetch).getTime() : 0;
  const minMin = trigger === 'manual' ? MIN_MANUAL_INTERVAL_MIN : source.permitted_refresh_frequency;
  if (last && ctx.now() - last < minMin * 60000) return finish('skipped_rate_limit', `Respecting rate limit: wait ${minMin} minutes between fetches`);

  running.add(sourceId);
  const nowIso = () => new Date(ctx.now()).toISOString();
  updateSourceState(ctx, sourceId, { last_attempted_fetch: nowIso() });
  try {
    if (source.access_method === 'html') {
      const ok = await robotsAllows(source.source_url, ctx.fetchText);
      if (!ok) throw new Error('robots.txt disallows (or could not be read for) this URL');
    }
    // Never re-fetch what we already hold: ask only for the window since the last success, send the feed's validators
    // (unchanged feed -> 304), and let the connector skip filings/items that are already stored.
    const st0 = ctx.store.get('source_state', {})[sourceId] || {};
    const lastOk = st0.last_successful_fetch ? new Date(st0.last_successful_fetch).getTime() : 0;
    const days = lastOk ? Math.min(21, Math.max(2, Math.ceil((ctx.now() - lastOk) / DAY_MS) + 1)) : 21;
    const known = ctx.store.get('records', {});
    const hints = { days, validators: st0.validators, isKnown: (link) => !!known[`${sourceId}:${sha(link, 'sha1').slice(0, 16)}`] };

    const items = await fetchWithRetry(ctx, source, run, hints);
    run.skipped_known = items.skippedKnown || 0;
    if (items.notModified) run.not_modified = true;
    else {
      saveBatch(ctx, run.run_id, sourceId, items);
      // Filings we read but could not use (no offering amount) are remembered so they are not downloaded again either
      for (const base of items.unusable || []) {
        const rec = { source_record_id: sha(base, 'sha1').slice(0, 16), country: null };
        const reason = 'Undisclosed or indefinite offering amount';
        run.received++;
        recordRejection(ctx, run, { title: 'SEC Form D filing', original_source_url: base }, reason);
        archiveRecord(ctx, source, run, { title: 'SEC Form D filing without a usable offering amount', link: base, summary: '', date: null }, rec, 'rejected', reason);
      }
      processItems(ctx, source, items, run);
    }
    applyRetention(ctx);
    purgeVisitors(ctx);
    const st = ctx.store.get('source_state', {})[sourceId] || {};
    const validators = items.validators && (items.validators.etag || items.validators.last_modified) ? items.validators : st.validators;
    updateSourceState(ctx, sourceId, {
      validators, last_successful_fetch: nowIso(), consecutive_failures: 0, error_message: null,
      records_received: (st.records_received || 0) + run.received, records_accepted: (st.records_accepted || 0) + run.accepted,
      records_rejected: (st.records_rejected || 0) + run.rejected,
    });
    audit(ctx.store, { actor, action: 'source.run', entity: 'source', entityId: sourceId, detail: { run_id: run.run_id, received: run.received, accepted: run.accepted, rejected: run.rejected, duplicates: run.duplicates } }, ctx.now());
    return finish('success');
  } catch (e) {
    const st = updateSourceState(ctx, sourceId, { consecutive_failures: (ctx.store.get('source_state', {})[sourceId]?.consecutive_failures || 0) + 1, error_message: e.message });
    if (st.consecutive_failures >= 3) console.error(JSON.stringify({ level: 'alert', msg: 'source failing repeatedly', source_id: sourceId, failures: st.consecutive_failures, error: e.message }));
    audit(ctx.store, { actor, action: 'source.run_failed', entity: 'source', entityId: sourceId, detail: { run_id: run.run_id, error: e.message } }, ctx.now());
    return finish('failed', e.message);
  } finally {
    running.delete(sourceId);
  }
}

function saveBatch(ctx, runId, sourceId, items) {
  const batches = ctx.store.get('batches', {});
  batches[runId] = { source_id: sourceId, items: items.map(({ title, link, summary, date }) => ({ title, link, summary, date })) };
  const ids = Object.keys(batches);
  ids.slice(0, Math.max(0, ids.length - MAX_BATCHES)).forEach((id) => delete batches[id]);
  ctx.store.save('batches');
}

/** Re-process a stored batch (dedupe makes this idempotent), e.g. after fixing a rule or approving a source. */
export function replayBatch(ctx, sourceId, runId, actor) {
  const source = getSource(ctx, sourceId);
  const batch = ctx.store.get('batches', {})[runId];
  if (!source || !batch || batch.source_id !== sourceId) throw err('Batch not found (only the last 20 batches are kept)', 404);
  const gate = permissionGate(ctx, sourceId);
  if (!gate.allowed) throw err(`Blocked by permission gate: ${gate.reasons.join('; ')}`, 409);
  const run = newRun(ctx, sourceId, 'replay', 'replay');
  run.attempts = 1;
  processItems(ctx, source, batch.items, run);
  run.status = 'success'; run.finished_at = new Date(ctx.now()).toISOString(); run.replay_of = runId;
  const runs = ctx.store.get('runs', []);
  runs.push(run);
  ctx.store.save('runs');
  audit(ctx.store, { actor, action: 'source.replay', entity: 'source', entityId: sourceId, detail: { run_id: run.run_id, replay_of: runId } }, ctx.now());
  return run;
}

export function startScheduler(ctx, tickMs = 60000) {
  const tick = async () => {
    for (const s of listSources(ctx)) {
      if (!s.permission.allowed || s.paused || s.connector !== 'implemented' || s.system) continue;
      const last = s.last_attempted_fetch ? new Date(s.last_attempted_fetch).getTime() : 0;
      const backoff = 2 ** Math.min(ctx.store.get('source_state', {})[s.source_id]?.consecutive_failures || 0, 4);
      if (ctx.now() - last >= s.permitted_refresh_frequency * 60000 * backoff) {
        await runSource(ctx, s.source_id, { trigger: 'scheduled' }).catch((e) => console.error('[acq] scheduled run failed', s.source_id, e.message));
      }
    }
  };
  tick().catch(() => {});
  return setInterval(() => tick().catch(() => {}), tickMs);
}
