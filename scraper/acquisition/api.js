// HTTP routes for the acquisition pipeline, mounted under /acq by scraper/index.js (proxied as /api/acq).
// Public: /acq/health, /acq/enquiry*. Everything else needs a Bearer token whose role grants the route's permission.
import { randomBytes } from 'node:crypto';
import { authenticate, createLimiter, loadTokens } from './auth.js';
import { addSource, ensureSystemPermissions, getSource, listSources, setPermission, updateSourceState, quickstartApprove, QUICKSTART_ATTESTATION, QUICKSTART_SOURCES } from './registry.js';
import { fetchable, robotsAllows, replayBatch, runSource } from './runner.js';
import { assignLead, listLeads, reviewLead, serializeLead, setStage, suppressLead, toCrmLead, verifyLead, withdrawConsent, confirmEmailByToken } from './leads.js';
import { enquiryConfig, requestWithdrawal, submitEnquiry } from './enquiry.js';
import { recordVisit, recordVisitorConsent, visitorSummary } from './visitors.js';
import { listAdvisors, matchAdvisors, saveAdvisor } from './advisors.js';
import { exportCsv, importCsv } from './csv.js';
import { computeMetrics } from './metrics.js';
import { audit, readAudit } from './audit.js';
import { sha } from './normalize.js';

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const err = (message, status = 400) => Object.assign(new Error(message), { status });

export function createApi(ctx) {
  ensureSystemPermissions(ctx);
  const { tokens, devFile } = loadTokens(ctx.env, ctx.store.dir);
  const limited = createLimiter();
  if (!tokens.size) console.warn('[acq] no ACQ_TOKENS configured: all authenticated routes will return 401');
  else if (devFile) console.log(`[acq] dev tokens (non-production only) are in ${devFile}`);

  const origin = ctx.env.ACQ_ALLOWED_ORIGIN || '*';
  const baseHeaders = {
    'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
  };
  const json = (res, code, body) => { res.writeHead(code, { ...baseHeaders, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); };
  const readRaw = (req, max) => new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => { size += c.length; if (size > max) { reject(err('Request body too large', 413)); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
  const readJson = async (req) => { const raw = await readRaw(req, 1024 * 1024); try { return raw ? JSON.parse(raw) : {}; } catch { throw err('Body must be valid JSON'); } };
  const ipOf = (req) => (ctx.env.ACQ_TRUST_PROXY === '1' ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '') || req.socket.remoteAddress || 'unknown';

  return async function handle(req, res, url) {
    const path = url.pathname;
    if (!path.startsWith('/acq/')) return false;
    if (req.method === 'OPTIONS') { res.writeHead(204, baseHeaders); res.end(); return true; }
    const method = req.method;
    const m = (pattern) => { const r = path.match(new RegExp(`^/acq/${pattern}$`)); return r && r.slice(1); };

    try {
      // ---------- public ----------
      if (method === 'GET' && path === '/acq/health') return json(res, 200, { ok: true }), true;
      if (method === 'GET' && path === '/acq/enquiry/config') return json(res, 200, enquiryConfig(ctx)), true;
      if (method === 'POST' && path === '/acq/enquiry') {
        if (limited(`enq:${ipOf(req)}`, 5, 3600e3, ctx.now())) throw err('Too many submissions; please try again later', 429);
        return json(res, 201, await submitEnquiry(ctx, await readJson(req), ipOf(req))), true;
      }
      if (method === 'POST' && path === '/acq/visitor/consent') {
        if (limited(`vc:${ipOf(req)}`, 30, 3600e3, ctx.now())) throw err('Too many requests', 429);
        return json(res, 200, recordVisitorConsent(ctx, await readJson(req))), true;
      }
      if (method === 'POST' && path === '/acq/visitor/event') {
        if (limited(`ve:${ipOf(req)}`, 300, 3600e3, ctx.now())) throw err('Too many requests', 429);
        return json(res, 200, recordVisit(ctx, await readJson(req), req.headers['user-agent'])), true;
      }
      if (method === 'POST' && path === '/acq/enquiry/withdrawal-request') {
        if (limited(`wd:${ipOf(req)}`, 5, 3600e3, ctx.now())) throw err('Too many requests; please try again later', 429);
        return json(res, 200, requestWithdrawal(ctx, await readJson(req))), true;
      }
      if (method === 'GET' && path === '/acq/enquiry/confirm') {
        if (limited(`cf:${ipOf(req)}`, 20, 3600e3, ctx.now())) throw err('Too many requests', 429);
        const id = url.searchParams.get('id') || '';
        if (!ID.test(id)) throw err('Invalid link');
        confirmEmailByToken(ctx, id, url.searchParams.get('token') || '', sha);
        res.writeHead(200, { ...baseHeaders, 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<!doctype html><meta charset="utf-8"><title>Email confirmed</title><body style="font-family:sans-serif;max-width:32rem;margin:4rem auto"><h1>Thank you</h1><p>Your email address is confirmed.</p></body>');
        return true;
      }

      // ---------- authenticated ----------
      const user = authenticate(req, tokens);
      if (!user) return json(res, 401, { error: 'Authentication required' }), true;
      const need = (perm) => { if (!user.perms.has(perm)) throw err('Forbidden', 403); };
      const sensitive = (key, max = 10) => { if (limited(`${key}:${user.actor}`, max, 600e3, ctx.now())) throw err('Rate limit exceeded; slow down', 429); };
      let r;

      if (method === 'GET' && path === '/acq/whoami') return json(res, 200, { role: user.role, permissions: [...user.perms] }), true;

      // sources
      if (method === 'GET' && path === '/acq/sources') { need('sources.read'); return json(res, 200, { sources: listSources(ctx) }), true; }
      if (method === 'POST' && path === '/acq/sources') { need('sources.manage'); return json(res, 201, { source: addSource(ctx, await readJson(req), user.actor) }), true; }
      if ((r = method === 'PUT' && m('sources/([^/]+)/permission'))) {
        need('sources.manage'); if (!ID.test(r[0])) throw err('Invalid id');
        setPermission(ctx, r[0], await readJson(req), user.actor);
        return json(res, 200, { source: getSource(ctx, r[0]) }), true;
      }
      if ((r = method === 'PUT' && m('sources/([^/]+)/cost'))) {
        need('sources.manage'); if (!getSource(ctx, r[0])) throw err('Unknown source', 404);
        const cost = Number((await readJson(req)).monthly_cost);
        if (!(cost >= 0)) throw err('monthly_cost must be a number >= 0');
        updateSourceState(ctx, r[0], { monthly_cost: cost });
        audit(ctx.store, { actor: user.actor, action: 'source.cost_set', entity: 'source', entityId: r[0], detail: { monthly_cost: cost } }, ctx.now());
        return json(res, 200, { source: getSource(ctx, r[0]) }), true;
      }
      if ((r = method === 'POST' && m('sources/([^/]+)/(pause|resume)'))) {
        need('sources.manage'); if (!getSource(ctx, r[0])) throw err('Unknown source', 404);
        updateSourceState(ctx, r[0], { paused: r[1] === 'pause' });
        audit(ctx.store, { actor: user.actor, action: `source.${r[1]}`, entity: 'source', entityId: r[0] }, ctx.now());
        return json(res, 200, { source: getSource(ctx, r[0]) }), true;
      }
      if ((r = method === 'POST' && m('sources/([^/]+)/test'))) {
        need('sources.manage'); sensitive('test');
        const s = getSource(ctx, r[0]); if (!s) throw err('Unknown source', 404);
        if (s.connector !== 'implemented') throw err(`No connector is implemented for access method "${s.access_method}"`, 409);
        if (s.access_method === 'html' && !(await robotsAllows(s.source_url, ctx.fetchText))) throw err('robots.txt disallows (or could not be read for) this URL', 409);
        try {
          const items = await ctx.fetchSource(fetchable(s));
          return json(res, 200, { ok: true, items: items.length, sample: items.slice(0, 5).map((i) => i.title) }), true;
        } catch (e) { return json(res, 200, { ok: false, error: e.message }), true; }
      }
      if ((r = method === 'POST' && m('sources/([^/]+)/refresh'))) {
        need('sources.manage'); sensitive('refresh');
        return json(res, 200, { run: await runSource(ctx, r[0], { trigger: 'manual', actor: user.actor }) }), true;
      }
      if ((r = method === 'GET' && m('sources/([^/]+)/runs'))) {
        need('sources.read');
        return json(res, 200, { runs: ctx.store.get('runs', []).filter((x) => x.source_id === r[0]).slice(-50).reverse() }), true;
      }
      if ((r = method === 'POST' && m('sources/([^/]+)/runs/([^/]+)/replay'))) {
        need('sources.manage'); sensitive('replay');
        return json(res, 200, { run: replayBatch(ctx, r[0], r[1], user.actor) }), true;
      }
      const runAll = async () => {
        // Sequential on purpose: each source keeps its own permission gate, rate floor and retries
        const runs = [];
        for (const s of listSources(ctx)) {
          if (s.system || s.connector !== 'implemented' || !s.permission.allowed || s.paused) continue;
          runs.push(await runSource(ctx, s.source_id, { trigger: 'manual', actor: user.actor }));
        }
        const skipped = listSources(ctx).filter((s) => !s.system && s.connector === 'implemented' && !s.permission.allowed).map((s) => s.source_id);
        return { runs, not_run_unapproved: skipped };
      };
      if (method === 'POST' && path === '/acq/sources/run-all') { need('sources.manage'); sensitive('run-all', 3); return json(res, 200, await runAll()), true; }
      if (method === 'GET' && path === '/acq/quickstart') {
        need('sources.read');
        const all = listSources(ctx);
        return json(res, 200, { attestation: QUICKSTART_ATTESTATION, sources: QUICKSTART_SOURCES.map((id) => all.find((s) => s.source_id === id)).filter(Boolean)
          .map((s) => ({ source_id: s.source_id, source_name: s.source_name, source_url: s.source_url, approved: s.permission.allowed, geographic_coverage: s.geographic_coverage })) }), true;
      }
      if (method === 'POST' && path === '/acq/quickstart') {
        need('sources.manage'); sensitive('quickstart', 3);
        const body = await readJson(req);
        if (body.confirm !== true || body.reviewed_terms !== true) throw err('You must confirm that you reviewed the sources\' terms of use', 400);
        const approved = quickstartApprove(ctx, user.actor);
        return json(res, 200, { approved, ...(await runAll()) }), true;
      }
      if (method === 'GET' && path === '/acq/records') {
        need('leads.read');
        const q = Object.fromEntries(url.searchParams);
        const needle = String(q.q || '').toLowerCase();
        let rows = Object.values(ctx.store.get('records', {})).filter((r) =>
          (!q.source_id || r.source_id === q.source_id) && (!q.status || r.status === q.status) && (!q.run_id || r.run_id === q.run_id || r.first_run_id === q.run_id) &&
          (!q.tag || r.tags.includes(q.tag)) && (!needle || `${r.title} ${r.reason || ''}`.toLowerCase().includes(needle)));
        rows.sort((a, b) => b.last_seen.localeCompare(a.last_seen));
        const total = rows.length;
        const size = Math.min(100, Math.max(1, Number(q.page_size) || 25)); const page = Math.max(1, Number(q.page) || 1);
        const tagCounts = {};
        rows.forEach((r) => r.tags.forEach((t) => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));
        return json(res, 200, { total, page, page_size: size, records: rows.slice((page - 1) * size, page * size), tag_counts: tagCounts }), true;
      }
      if (method === 'GET' && path === '/acq/rejections') {
        need('sources.read');
        const sid = url.searchParams.get('source_id');
        return json(res, 200, { rejections: ctx.store.get('rejections', []).filter((x) => !sid || x.source_id === sid).slice(-200).reverse() }), true;
      }

      // leads
      if (method === 'GET' && path === '/acq/leads') { need('leads.read'); return json(res, 200, listLeads(ctx, Object.fromEntries(url.searchParams), user.perms)), true; }
      if (method === 'GET' && path === '/acq/review-queue') {
        need('leads.review');
        const all = listLeads(ctx, { page_size: '100', include_suppressed: 'false' }, user.perms);
        const queue = all.leads.filter((l) => l.qualification_status !== 'watchlist' && (l.qualification_status === 'needs_manual_review' || l.review_status === 'pending'));
        return json(res, 200, { total: queue.length, leads: queue }), true;
      }
      if (method === 'GET' && path === '/acq/crm-leads') {
        need('leads.read');
        const ids = Object.keys(ctx.store.get('crm_leads', {}));
        const leads = ctx.store.get('leads', {});
        return json(res, 200, { leads: ids.map((i) => leads[i]).filter((l) => l && l.review_status === 'approved' && !l.gates.suppressed).map(toCrmLead) }), true;
      }
      if ((r = method === 'GET' && m('leads/([^/]+)'))) {
        need('leads.read'); if (!ID.test(r[0])) throw err('Invalid id');
        const lead = ctx.store.get('leads', {})[r[0]]; if (!lead) throw err('Lead not found', 404);
        if (user.perms.has('leads.contact') && (lead.business_email || lead.business_phone)) audit(ctx.store, { actor: user.actor, action: 'lead.view_contact', entity: 'lead', entityId: lead.lead_id }, ctx.now());
        const dupes = (lead.duplicate_candidate_ids || []).map((i) => ctx.store.get('leads', {})[i]).filter(Boolean).map((d) => ({ lead_id: d.lead_id, display_name: d.display_name, company_name: d.company_name, source: d.original_source_id, url: d.original_source_url }));
        return json(res, 200, { lead: serializeLead(lead, user.perms), duplicates: dupes, audit: readAudit(ctx.store, { entityId: lead.lead_id, limit: 100 }) }), true;
      }
      if ((r = method === 'POST' && m('leads/([^/]+)/(review|suppress|verify|assign|stage)'))) {
        const [id, action] = r; if (!ID.test(id)) throw err('Invalid id');
        const need_ = { review: 'leads.review', suppress: 'leads.suppress', verify: 'leads.verify', assign: 'leads.assign', stage: 'leads.assign' }[action];
        need(need_); sensitive('lead-action', 60);
        const body = await readJson(req);
        const fn = { review: reviewLead, suppress: suppressLead, assign: assignLead, stage: setStage }[action];
        const lead = action === 'verify' ? await verifyLead(ctx, id, body, user.actor) : fn(ctx, id, body, user.actor);
        return json(res, 200, { lead: serializeLead(lead, user.perms) }), true;
      }

      // advisors and suggested matches (suggestions only; assignment stays a human action)
      if (method === 'GET' && path === '/acq/advisors') { need('leads.assign'); return json(res, 200, { advisors: listAdvisors(ctx) }), true; }
      if (method === 'POST' && path === '/acq/advisors') { need('sources.manage'); return json(res, 200, { advisor: saveAdvisor(ctx, await readJson(req), user.actor) }), true; }
      if ((r = method === 'GET' && m('leads/([^/]+)/matches'))) {
        need('leads.assign'); if (!ID.test(r[0])) throw err('Invalid id');
        const lead = ctx.store.get('leads', {})[r[0]]; if (!lead) throw err('Lead not found', 404);
        return json(res, 200, { matches: lead.gates?.suppressed ? [] : matchAdvisors(ctx, lead) }), true;
      }

      // consent / audit / metrics
      if ((r = method === 'GET' && m('consent/([^/]+)'))) {
        need('leads.read'); const l = ctx.store.get('leads', {})[r[0]]; if (!l) throw err('Lead not found', 404);
        const { consent_status, consent_timestamp, consent_source, consent_text_version, permitted_purpose, permitted_recipient, permitted_channels, opt_out_status, do_not_contact_status, marketing_consent, retention_expiry } = l;
        return json(res, 200, { consent: { consent_status, consent_timestamp, consent_source, consent_text_version, permitted_purpose, permitted_recipient, permitted_channels, opt_out_status, do_not_contact_status, marketing_consent, retention_expiry }, history: l.history.filter((h) => h.action.startsWith('consent')) }), true;
      }
      if ((r = method === 'POST' && m('consent/([^/]+)/withdraw'))) {
        need('consent.manage'); if (!ID.test(r[0])) throw err('Invalid id');
        return json(res, 200, { lead: serializeLead(withdrawConsent(ctx, r[0], await readJson(req), user.actor), user.perms) }), true;
      }
      if (method === 'GET' && path === '/acq/audit') { need('audit.read'); return json(res, 200, { audit: readAudit(ctx.store, { entityId: url.searchParams.get('entity_id') || undefined, limit: 300 }) }), true; }
      if (method === 'GET' && path === '/acq/visitors/summary') { need('metrics.read'); return json(res, 200, visitorSummary(ctx, Math.min(365, Math.max(1, Number(url.searchParams.get('days')) || 30)))), true; }
      if (method === 'GET' && path === '/acq/metrics') { need('metrics.read'); return json(res, 200, computeMetrics(ctx, listSources(ctx))), true; }

      // import / export
      if (method === 'POST' && path === '/acq/export') {
        need('leads.export'); sensitive('export', 20);
        const { csv, rows } = exportCsv(ctx, (await readJson(req)).ids, user.perms, user.actor);
        res.writeHead(200, { ...baseHeaders, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="leads.csv"', 'X-Row-Count': String(rows) });
        res.end(csv); return true;
      }
      if (method === 'POST' && path === '/acq/import') {
        need('leads.import'); sensitive('import', 10);
        const sid = url.searchParams.get('source_id') || '';
        if (!ID.test(sid)) throw err('source_id is required');
        return json(res, 200, await importCsv(ctx, sid, await readRaw(req, 2.2 * 1024 * 1024), user.actor)), true;
      }

      return json(res, 404, { error: 'Not found' }), true;
    } catch (e) {
      if (e.status) return json(res, e.status, { error: e.message }), true;
      const errorId = randomBytes(4).toString('hex');
      console.error(JSON.stringify({ level: 'error', error_id: errorId, route: `${method} ${path}`, message: e.message }));
      return json(res, 500, { error: 'Internal error', error_id: errorId }), true;
    }
  };
}
