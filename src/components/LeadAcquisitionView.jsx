import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck, Database, Users, ClipboardCheck, BarChart3, FileUp, Lock, RefreshCw, Play, Pause, PlugZap,
  ExternalLink, CheckCircle2, XCircle, AlertTriangle, ChevronLeft, ChevronRight, Download, KeyRound, Inbox
} from 'lucide-react';

const API = '/api/acq';
const TOKEN_KEY = 'acqToken';

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'never');
const label = (s) => (s ? String(s).replace(/_/g, ' ') : '—');
const num = (v, suffix = '') => (v == null ? 'n/a' : `${v}${suffix}`);

const getToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
const setToken = (t) => { try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } };

async function api(path, { method = 'GET', body, raw } = {}) {
  const headers = { Authorization: `Bearer ${getToken()}` };
  if (body !== undefined && !raw) headers['Content-Type'] = 'application/json';
  if (raw) headers['Content-Type'] = 'text/csv';
  const res = await fetch(`${API}${path}`, { method, headers, body: raw ? body : body !== undefined ? JSON.stringify(body) : undefined });
  if (res.status === 401) { const e = new Error('Authentication required'); e.status = 401; throw e; }
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('json') ? await res.json() : await res.text();
  if (!res.ok) { const e = new Error(data?.error || `HTTP ${res.status}`); e.status = res.status; throw e; }
  return data;
}

function Pill({ tone = 'muted', children, title }) {
  return <span className={`acq-pill ${tone}`} title={title}>{children}</span>;
}

const CLASS_TONE = { confirmed: 'good', strong_inferred: 'warn', weak_inferred: 'muted', disqualified: 'bad' };
const SEG_TONE = { sales_ready_enquiry: 'good', research_qualified: 'info', watchlist: 'muted', needs_manual_review: 'warn', suppressed: 'bad' };
const HEALTH_TONE = { healthy: 'good', degraded: 'warn', failing: 'bad', blocked: 'bad', paused: 'muted', never_run: 'muted' };
const PERM_TONE = { approved: 'good', approved_with_restrictions: 'warn', pending_review: 'muted', prohibited: 'bad', expired: 'bad' };

const TAG_TONE = { source: 'info', channel: 'good', type: 'muted', geo: 'muted', run: 'muted', trigger: 'muted', batch: 'warn', status: 'muted', class: 'warn', category: 'muted', segment: 'info' };

/** Origin tags: where a record was received and which run brought it in. Click to filter when onTag is given. */
function Tags({ tags = [], onTag, limit = 99 }) {
  return (
    <span className="acq-tags">
      {tags.slice(0, limit).map((t) => {
        const tone = TAG_TONE[t.split(':')[0]] || 'muted';
        return onTag
          ? <button key={t} type="button" className={`acq-pill ${tone} acq-tag-btn`} title={`Filter by ${t}`} onClick={(e) => { e.stopPropagation(); onTag(t); }}>{t}</button>
          : <span key={t} className={`acq-pill ${tone}`}>{t}</span>;
      })}
      {tags.length > limit && <span className="acq-muted">+{tags.length - limit}</span>}
    </span>
  );
}

function Kpi({ title, value, sub }) {
  return (
    <div className="acq-kpi"><div className="acq-kpi-label">{title}</div><div className="acq-kpi-value">{value}</div>{sub && <div className="acq-kpi-sub">{sub}</div>}</div>
  );
}

/* ---------------- token gate ---------------- */
function TokenGate({ onAuthed, error }) {
  const [value, setValue] = useState('');
  return (
    <div className="acq-gate">
      <KeyRound size={28} />
      <h2>Sign in to the Lead Acquisition Console</h2>
      <p>This console shows personal data and controls what the bank may contact. Enter your access token. Tokens are configured by an administrator (see docs/ACQUISITION.md).</p>
      <form onSubmit={(e) => { e.preventDefault(); setToken(value.trim()); onAuthed(); }}>
        <input type="password" aria-label="Access token" placeholder="Access token" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" />
        <button className="btn btn-primary" type="submit" disabled={!value.trim()}>Sign in</button>
      </form>
      {error && <div className="acq-error" role="alert">{error}</div>}
    </div>
  );
}

/* ---------------- sources ---------------- */
function PermissionForm({ source, onSaved, onCancel, setMsg }) {
  const p = source.permission || {};
  const [f, setF] = useState({
    status: p.status === 'expired' ? 'pending_review' : p.status || 'pending_review', commercial_use_status: p.commercial_use_status || '',
    permitted_purpose: p.permitted_purpose || '', permitted_geographies: p.permitted_geographies || [], licence_reference: p.licence_reference || '',
    contact_permission_status: p.contact_permission_status || '', redistribution_status: p.redistribution_status || '',
    consent_basis: p.consent_basis || 'row_evidence', permitted_recipient: p.permitted_recipient || '',
    expiry_date: p.expiry_date ? p.expiry_date.slice(0, 10) : '', permitted_retention_days: p.permitted_retention_days || 90,
    permitted_refresh_minutes: p.permitted_refresh_minutes || '', review_required: !!p.review_required, personal_data_processing_allowed: p.personal_data_processing_allowed ?? false,
  });
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggleGeo = (g) => set('permitted_geographies', f.permitted_geographies.includes(g) ? f.permitted_geographies.filter((x) => x !== g) : [...f.permitted_geographies, g]);
  const save = async (e) => {
    e.preventDefault();
    try {
      await api(`/sources/${source.source_id}/permission`, { method: 'PUT', body: { ...f, expiry_date: f.expiry_date || null } });
      setMsg(`Permission recorded for ${source.source_name}`); onSaved();
    } catch (err) { setMsg(err.message, true); }
  };
  return (
    <form className="acq-form" onSubmit={save} aria-label="Source permission">
      <div className="acq-note"><AlertTriangle size={14} /> Record only what the licence or terms of use actually allow. Public availability is not permission to collect, enrich, contact or resell personal data.</div>
      <label>Status
        <select value={f.status} onChange={(e) => set('status', e.target.value)}>
          {['approved', 'approved_with_restrictions', 'pending_review', 'prohibited'].map((s) => <option key={s} value={s}>{label(s)}</option>)}
        </select>
      </label>
      {(() => { const needed = f.status.startsWith('approved'); return (<>
        <label>Commercial use{needed && ' *'}<input required={needed} value={f.commercial_use_status} onChange={(e) => set('commercial_use_status', e.target.value)} placeholder="e.g. yes: confirmed in ToS section 4" /></label>
        <label>Permitted purpose{needed && ' *'}<input required={needed} value={f.permitted_purpose} onChange={(e) => set('permitted_purpose', e.target.value)} placeholder="e.g. identify wealth-planning prospects" /></label>
        <label>Licence reference{needed && ' *'}<input required={needed} value={f.licence_reference} onChange={(e) => set('licence_reference', e.target.value)} placeholder="contract / ToS URL / ticket" /></label>
      </>); })()}
      <fieldset><legend>Permitted geographies</legend>
        {['CA', 'US'].map((g) => <label key={g} className="acq-inline"><input type="checkbox" checked={f.permitted_geographies.includes(g)} onChange={() => toggleGeo(g)} /> {g}</label>)}
      </fieldset>
      {source.access_method === 'csv' && (
        <>
          <label>Consent basis
            <select aria-label="Consent basis" value={f.consent_basis} onChange={(e) => set('consent_basis', e.target.value)}>
              <option value="row_evidence">Each row carries its own consent proof (strict)</option>
              <option value="provider_attested">Provider's contract warrants consumer opt-in (advisor-matching leads)</option>
            </select>
          </label>
          {f.consent_basis === 'provider_attested' && (
            <>
              <label>Permitted recipient *<input required value={f.permitted_recipient} onChange={(e) => set('permitted_recipient', e.target.value)} placeholder="the advisor or firm named in the contract" /></label>
              <div className="acq-note"><AlertTriangle size={14} /> Choose this only if the provider contract states that each person asked to be contacted by the recipient above. These leads will be labelled "provider-attested": there is no per-person proof in our records, so keep the contract on file and verify contacts before outreach.</div>
            </>
          )}
        </>
      )}
      <label>Contact permission{f.consent_basis === 'provider_attested' && ' *'}<input required={f.consent_basis === 'provider_attested'} value={f.contact_permission_status} onChange={(e) => set('contact_permission_status', e.target.value)} placeholder="e.g. none: research only" /></label>
      <label>Redistribution<input value={f.redistribution_status} onChange={(e) => set('redistribution_status', e.target.value)} placeholder="e.g. no" /></label>
      <label>Retention (days)<input type="number" min="1" value={f.permitted_retention_days} onChange={(e) => set('permitted_retention_days', e.target.value)} /></label>
      <label>Min refresh (minutes)<input type="number" min="5" value={f.permitted_refresh_minutes} onChange={(e) => set('permitted_refresh_minutes', e.target.value)} placeholder="source default" /></label>
      <label>Expiry date<input type="date" value={f.expiry_date} onChange={(e) => set('expiry_date', e.target.value)} /></label>
      <label className="acq-inline"><input type="checkbox" checked={f.review_required} onChange={(e) => set('review_required', e.target.checked)} /> Leads need manual review (restrictions apply)</label>
      <label className="acq-inline"><input type="checkbox" checked={!!f.personal_data_processing_allowed} onChange={(e) => set('personal_data_processing_allowed', e.target.checked)} /> Personal-data processing allowed</label>
      <div className="acq-actions"><button className="btn btn-primary btn-sm" type="submit">Save permission</button><button className="btn btn-secondary btn-sm" type="button" onClick={onCancel}>Cancel</button></div>
    </form>
  );
}

function RunsPanel({ source }) {
  const [runs, setRuns] = useState(null);
  const [rej, setRej] = useState([]);
  useEffect(() => {
    api(`/sources/${source.source_id}/runs`).then((d) => setRuns(d.runs)).catch(() => setRuns([]));
    api(`/rejections?source_id=${source.source_id}`).then((d) => setRej(d.rejections)).catch(() => {});
  }, [source.source_id]);
  if (!runs) return <div className="acq-muted">Loading ingestion logs…</div>;
  return (
    <div className="acq-runs">
      {runs.length === 0 && <div className="acq-muted">No ingestion runs yet.</div>}
      {runs.map((r) => (
        <div key={r.run_id} className="acq-run">
          <Pill tone={r.status === 'success' ? 'good' : r.status === 'failed' || r.status === 'blocked' ? 'bad' : 'muted'}>{label(r.status)}</Pill>
          <span>{fmtDate(r.started_at)}</span><span>{r.run_id}</span>
          <span>received {r.received} · accepted {r.accepted} · rejected {r.rejected} · duplicates {r.duplicates}</span>
          {r.error && <span className="acq-err-text">{r.error}</span>}
        </div>
      ))}
      {rej.length > 0 && (
        <details><summary>Recent rejections ({rej.length})</summary>
          {rej.slice(0, 30).map((x, i) => <div key={i} className="acq-run"><span>{x.reason}</span><span className="acq-trunc">{x.title}</span></div>)}
        </details>
      )}
    </div>
  );
}

function SourcesTab({ perms, setMsg, tick }) {
  const [sources, setSources] = useState(null);
  const [open, setOpen] = useState({});
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ source_name: '', access_method: 'rss', source_url: '', geographic_coverage: ['CA'] });
  const manage = perms.includes('sources.manage');
  const load = useCallback(() => api('/sources').then((d) => setSources(d.sources)).catch((e) => setMsg(e.message, true)), [setMsg]);
  useEffect(() => { load(); }, [load, tick]);

  const act = async (id, action, okMsg) => {
    try { const r = await api(`/sources/${id}/${action}`, { method: 'POST' }); setMsg(typeof okMsg === 'function' ? okMsg(r) : okMsg); } catch (e) { setMsg(e.message, true); }
    load();
  };
  const [running, setRunning] = useState(false);
  const runAll = async () => {
    setRunning(true);
    try {
      const r = await api('/sources/run-all', { method: 'POST' });
      const ok = r.runs.filter((x) => x.status === 'success');
      setMsg(`Ran ${r.runs.length} source(s): ${ok.reduce((a, x) => a + x.accepted, 0)} leads, ${ok.reduce((a, x) => a + x.received, 0)} records received${r.runs.some((x) => x.status !== 'success') ? ` (${r.runs.filter((x) => x.status !== 'success').length} skipped or failed, see Logs)` : ''}`, r.runs.some((x) => x.status === 'failed'));
    } catch (e) { setMsg(e.message, true); }
    setRunning(false);
    load();
  };
  const addSource = async (e) => {
    e.preventDefault();
    try { await api('/sources', { method: 'POST', body: draft }); setMsg('Source added as pending review'); setAdding(false); load(); } catch (err) { setMsg(err.message, true); }
  };

  if (!sources) return <div className="acq-muted">Loading sources…</div>;
  const approved = sources.filter((s) => s.permission.allowed);
  return (
    <div>
      <div className="acq-summary">
        <Pill tone="good">{approved.length} approved</Pill>
        <Pill tone="muted">{sources.length - approved.length} pending / blocked</Pill>
        <Pill tone="info">{sources.filter((s) => s.connected).length} connected (real fetch succeeded)</Pill>
        {manage && <button className="btn btn-primary btn-sm" disabled={approved.length === 0 || running} title={approved.length ? '' : 'Approve at least one source first'} onClick={runAll}><RefreshCw size={13} /> {running ? 'Running…' : 'Run all approved sources'}</button>}
        {manage && <button className="btn btn-secondary btn-sm" onClick={() => setAdding((a) => !a)}>{adding ? 'Close' : 'Add source'}</button>}
      </div>
      {approved.length === 0 && <div className="acq-empty">No source is approved yet, so nothing will be ingested. Review a source below and record its permission to switch it on.</div>}
      {adding && (
        <form className="acq-form" onSubmit={addSource} aria-label="Add source">
          <label>Name<input required value={draft.source_name} onChange={(e) => setDraft({ ...draft, source_name: e.target.value })} /></label>
          <label>Access method
            <select value={draft.access_method} onChange={(e) => setDraft({ ...draft, access_method: e.target.value })}>
              <option value="rss">Public RSS / Atom feed</option><option value="html">Permitted public web page</option><option value="csv">Provider-authorised CSV import</option><option value="api">Licensed API (connector needed)</option>
            </select>
          </label>
          {draft.access_method !== 'csv' && <label>URL<input required type="url" value={draft.source_url} onChange={(e) => setDraft({ ...draft, source_url: e.target.value })} /></label>}
          <button className="btn btn-primary btn-sm" type="submit">Add as pending review</button>
        </form>
      )}
      <div className="acq-table" role="table">
        {sources.map((s) => (
          <div key={s.source_id} className="acq-row-wrap">
            <div className="acq-row">
              <div className="acq-cell grow"><strong>{s.source_name}</strong><span className="acq-muted">{label(s.source_type)} · {s.access_method} · {s.geographic_coverage.join('/')}</span></div>
              <div className="acq-cell">
                {!s.permission.allowed && ['approved', 'approved_with_restrictions'].includes(s.permission.status)
                  ? <Pill tone="warn" title={s.permission.reasons?.join('; ')}>incomplete: not active</Pill>
                  : <Pill tone={PERM_TONE[s.permission.status]} title={s.permission.reasons?.join('; ')}>{label(s.permission.status)}</Pill>}
              </div>
              <div className="acq-cell"><Pill tone={HEALTH_TONE[s.source_health]}>{label(s.source_health)}</Pill>{s.connected ? <span className="acq-ok"><CheckCircle2 size={13} /> connected</span> : <span className="acq-muted">not connected</span>}</div>
              <div className="acq-cell small"><span>Last success</span><strong>{fmtDate(s.last_successful_fetch)}</strong></div>
              <div className="acq-cell small"><span>In / ok / rejected</span><strong>{s.records_received} / {s.records_accepted} / {s.records_rejected}</strong></div>
              <div className="acq-cell acq-btns">
                <button className="btn btn-secondary btn-sm" onClick={() => setOpen({ ...open, [s.source_id]: open[s.source_id] === 'runs' ? null : 'runs' })}>Logs</button>
                {manage && !s.system && <button className="btn btn-secondary btn-sm" onClick={() => setOpen({ ...open, [s.source_id]: open[s.source_id] === 'perm' ? null : 'perm' })}>Permission</button>}
                {manage && s.connector === 'implemented' && <button className="btn btn-secondary btn-sm" aria-label={`Test ${s.source_name}`} onClick={() => act(s.source_id, 'test', (r) => (r.ok ? `Connection OK: ${r.items} items` : `Connection failed: ${r.error}`))}><PlugZap size={13} /> Test</button>}
                {manage && s.connector === 'implemented' && <button className="btn btn-primary btn-sm" aria-label={`Refresh ${s.source_name}`} disabled={!s.permission.allowed} title={s.permission.allowed ? '' : 'Blocked by permission gate'} onClick={() => act(s.source_id, 'refresh', (r) => `Run ${r.run.status}: ${r.run.accepted} accepted, ${r.run.rejected} rejected${r.run.error ? ` (${r.run.error})` : ''}`)}><RefreshCw size={13} /> Refresh</button>}
                {manage && s.connector === 'implemented' && <button className="btn btn-secondary btn-sm" onClick={() => act(s.source_id, s.paused ? 'resume' : 'pause', s.paused ? 'Resumed' : 'Paused')}>{s.paused ? <Play size={13} /> : <Pause size={13} />}</button>}
              </div>
            </div>
            {s.error_message && <div className="acq-err-text">Last error: {s.error_message}</div>}
            {!s.permission.allowed && <div className="acq-muted acq-reasons">Gate: {s.permission.reasons?.join('; ')}</div>}
            {open[s.source_id] === 'perm' && <PermissionForm source={s} setMsg={setMsg} onCancel={() => setOpen({ ...open, [s.source_id]: null })} onSaved={() => { setOpen({ ...open, [s.source_id]: null }); load(); }} />}
            {open[s.source_id] === 'runs' && <RunsPanel source={s} />}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- lead detail ---------------- */
function Gate({ ok, children }) {
  return <li className={ok ? 'ok' : 'no'}>{ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {children}</li>;
}

function LeadDetail({ id, perms, setMsg, onChanged, onPromoteLead }) {
  const [d, setD] = useState(null);
  const [note, setNote] = useState('');
  const [advisor, setAdvisor] = useState('');
  const [canonical, setCanonical] = useState('');
  const [matches, setMatches] = useState([]);
  const load = useCallback(() => api(`/leads/${id}`).then(setD).catch((e) => setMsg(e.message, true)), [id, setMsg]);
  useEffect(() => { setD(null); load(); }, [load]);
  const canMatch = perms.includes('leads.assign') && d?.lead?.intent_class === 'confirmed' && d?.lead?.review_status === 'approved';
  useEffect(() => { if (canMatch) api(`/leads/${id}/matches`).then((r) => setMatches(r.matches)).catch(() => setMatches([])); else setMatches([]); }, [id, canMatch]);
  if (!d) return <div className="acq-detail acq-muted">Loading lead…</div>;
  const l = d.lead;
  const run = async (path, body, okMsg) => {
    try { await api(path, { method: 'POST', body }); setMsg(okMsg); setNote(''); await load(); onChanged(); } catch (e) { setMsg(e.message, true); }
  };
  const review = (decision, extra = {}) => run(`/leads/${id}/review`, { decision, note, ...extra }, `Lead ${decision.replace(/_/g, ' ')} recorded`);
  const canReview = perms.includes('leads.review');
  const g = l.gates || {};
  const promote = async () => {
    try {
      const { leads } = await api('/crm-leads');
      const crm = leads.find((x) => x.id === l.lead_id);
      if (crm) onPromoteLead(crm);
    } catch (e) { setMsg(e.message, true); }
  };

  return (
    <div className="acq-detail" aria-label="Lead detail">
      <div className="acq-detail-head">
        <div><h3>{l.display_name}{l.redacted && ' (personal data deleted)'}</h3><div className="acq-muted">{l.professional_title || ''} {l.company_name ? `· ${l.company_name}` : ''} · {[l.city, l.state_or_province, l.country].filter(Boolean).join(', ')}</div></div>
        <div className="acq-score" title="Strength of evidence, not wealth">{l.intent_score}<span>/100</span></div>
      </div>
      <div className="acq-chips">
        <Pill tone={CLASS_TONE[l.intent_class]}>{l.intent_class === 'confirmed' ? 'CONFIRMED ENQUIRY' : label(l.intent_class).toUpperCase()}</Pill>
        <Pill tone={SEG_TONE[l.qualification_status]}>{label(l.qualification_status)}</Pill>
        <Pill tone="muted">review: {label(l.review_status)}</Pill>
        <Pill tone="muted">stage: {label(l.pipeline_stage)}</Pill>
        {l.intent_class !== 'confirmed' && <Pill tone="warn" title="A public event is not an enquiry">Inferred: no contact permission</Pill>}
      </div>

      <section><h4>Received via</h4>
        {l.received_via
          ? <div className="acq-muted">{l.received_via.source_name} · channel {l.received_via.channel} · {fmtDate(l.received_via.received_at)}{l.received_via.run_id ? ` · ${l.received_via.run_id}` : ''}{l.received_via.batch_id ? ` · ${l.received_via.batch_id}` : ''}</div>
          : <div className="acq-muted">No origin recorded.</div>}
        <Tags tags={l.tags} />
      </section>

      <section><h4>Intent evidence</h4>
        <p>{l.evidence_excerpt}</p>
        <div className="acq-muted">Event {fmtDate(l.event_date)} · discovered {fmtDate(l.discovery_date)} · source {l.original_source_id} · confidence {Math.round((l.intent_confidence || 0) * 100)}% · hash {String(l.evidence_hash || '').slice(0, 10)}</div>
        {l.original_source_url && <a href={l.original_source_url} target="_blank" rel="noreferrer">Original source <ExternalLink size={12} /></a>}
        {l.source_attributions?.length > 0 && <div className="acq-muted">Also reported by {l.source_attributions.length} other record(s)</div>}
      </section>

      {l.related_persons?.length > 0 && (
        <section><h4>Named in the filing</h4>
          {l.related_persons.map((p) => <div key={p.name} className="acq-muted">{p.name} · {p.roles.join(', ')}</div>)}
          <div className="acq-muted">Public SEC record. Names and roles only; no contact details, and nobody is contacted because of a filing.</div>
        </section>
      )}

      <section><h4>Contact &amp; verification</h4>
        <div>{l.business_email || 'No email'} · email: <Pill tone={l.email_verification_status === 'verified' ? 'good' : 'muted'}>{label(l.email_verification_status)}</Pill></div>
        <div>{l.business_phone || 'No phone'} · phone: <Pill tone={l.phone_verification_status === 'verified' ? 'good' : 'muted'}>{label(l.phone_verification_status)}</Pill></div>
        {l.contact_masked && <div className="acq-muted"><Lock size={12} /> Contact details are masked for your role.</div>}
        {perms.includes('leads.verify') && (l.business_email || l.business_phone) && !l.redacted && (
          <div className="acq-actions">
            <button className="btn btn-secondary btn-sm" onClick={() => run(`/leads/${id}/verify`, { method: 'mx_check' }, 'Format / domain check complete')}>Run domain check</button>
            {l.business_email && <button className="btn btn-secondary btn-sm" onClick={() => note.trim().length >= 5 ? run(`/leads/${id}/verify`, { method: 'manual_email_confirmation', note }, 'Email marked verified') : setMsg('Describe how the email was confirmed in the note field first', true)}>Mark email verified</button>}
            {l.business_phone && <button className="btn btn-secondary btn-sm" onClick={() => note.trim().length >= 5 ? run(`/leads/${id}/verify`, { method: 'manual_phone_confirmation', note }, 'Phone marked verified') : setMsg('Describe how the phone was confirmed in the note field first', true)}>Mark phone verified</button>}
          </div>
        )}
      </section>

      <section><h4>Consent &amp; licensing</h4>
        <div>Consent: <Pill tone={l.consent_status === 'granted' ? 'good' : l.consent_status === 'withdrawn' ? 'bad' : 'muted'}>{label(l.consent_status)}</Pill> {l.consent_timestamp && `· ${fmtDate(l.consent_timestamp)} · wording ${l.consent_text_version}`}
          {l.consent_basis === 'provider_attested' && <> <Pill tone="warn" title="The provider's contract warrants opt-in; our records hold no per-person proof">provider-attested</Pill></>}</div>
        <div className="acq-muted">Purpose: {l.permitted_purpose || '—'} · recipient: {l.permitted_recipient || '—'} · channels: {(l.permitted_channels || []).join(', ') || '—'}</div>
        <div className="acq-muted">Source licence: {label(l.licence_status)} · wealth status: {label(l.wealth_status)}{l.wealth_range ? ` (${label(l.wealth_range)}, self-reported)` : ''} · retention until {l.retention_expiry ? new Date(l.retention_expiry).toLocaleDateString('en-CA') : '—'}</div>
        {l.questionnaire && <div className="acq-muted">Self-reported answers: {Object.entries(l.questionnaire).filter(([, v]) => (Array.isArray(v) ? v.length : v)).map(([k, v]) => `${label(k)}: ${Array.isArray(v) ? v.map(label).join(', ') : label(v)}`).join(' · ')}</div>}
      </section>

      <section><h4>Qualification gates</h4>
        <ul className="acq-gates">
          <Gate ok={g.confirmed_enquiry}>Confirmed enquiry</Gate><Gate ok={g.inferred_signal}>Inferred public signal</Gate>
          <Gate ok={g.contact_verified}>Contact verified</Gate><Gate ok={g.consent_verified}>Consent verified</Gate>
          <Gate ok={g.commercial_rights_verified}>Commercial rights verified</Gate>
          <Gate ok={g.eligible_for_outreach}><strong>Eligible for outreach</strong></Gate>
        </ul>
        {!g.eligible_for_outreach && <div className="acq-muted">Why not: {g.failed?.join('; ')}</div>}
      </section>

      <section><h4>Score breakdown <span className="acq-muted">({l.scoring_rule_version}, {fmtDate(l.score_calculated_at)})</span></h4>
        <table className="acq-mini"><tbody>
          {(l.intent_score_reasons || []).map((r) => <tr key={r.component}><td>{r.component}. {r.label}</td><td>{r.points} / {r.max}</td></tr>)}
        </tbody></table>
      </section>

      <section><h4>Duplicate check</h4>
        {d.duplicates.length === 0 && <div className="acq-muted">No duplicate candidates.</div>}
        {d.duplicates.map((x) => (
          <div key={x.lead_id} className="acq-dupe">
            <span>{x.display_name} · {x.company_name || '—'} · {x.source} ({l.match_method}, {Math.round((l.match_confidence || 0) * 100)}%)</span>
            {canReview && <button className="btn btn-secondary btn-sm" onClick={() => review('mark_duplicate', { canonical_lead_id: x.lead_id })}>Merge into this one</button>}
          </div>
        ))}
      </section>

      {canReview && !l.redacted && (
        <section><h4>Review</h4>
          <textarea aria-label="Reviewer note" placeholder="Note (required for manual verification; kept in the audit trail)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          <div className="acq-actions">
            <button className="btn btn-primary btn-sm" onClick={() => review('approve')}>Approve</button>
            <button className="btn btn-secondary btn-sm" onClick={() => review('reject')}>Reject</button>
            <button className="btn btn-secondary btn-sm" onClick={() => review('request_verification')}>Request verification</button>
            <button className="btn btn-secondary btn-sm" onClick={() => review('escalate')}>Escalate to compliance</button>
            {perms.includes('leads.suppress') && <button className="btn btn-secondary btn-sm" onClick={() => run(`/leads/${id}/suppress`, { reason: note || 'suppressed_by_reviewer', do_not_contact: true }, 'Lead suppressed and added to do-not-contact')}>Suppress (DNC)</button>}
            {perms.includes('consent.manage') && l.consent_status === 'granted' && <button className="btn btn-secondary btn-sm" onClick={() => run(`/consent/${id}/withdraw`, { delete: false }, 'Consent withdrawal recorded')}>Withdraw consent</button>}
          </div>
        </section>
      )}

      {l.review_status === 'approved' && (
        <section><h4>Assignment &amp; CRM</h4>
          <div className="acq-muted">Owner: {l.assigned_advisor || 'unassigned'} · next action: {l.next_action || '—'}</div>
          {matches.length > 0 && (
            <div className="acq-muted">Suggested bank reps (up to 3, by location, assets and specialty): {matches.map((m) => (
              <button key={m.advisor_id} className="btn btn-secondary btn-sm" title={m.reasons.join('; ')} onClick={() => setAdvisor(m.name)}>{m.name}</button>
            ))}</div>
          )}
          {perms.includes('leads.assign') && (
            <div className="acq-actions">
              <input aria-label="Advisor name" placeholder="Advisor" value={advisor} onChange={(e) => setAdvisor(e.target.value)} />
              <button className="btn btn-secondary btn-sm" disabled={!advisor.trim()} onClick={() => run(`/leads/${id}/assign`, { assigned_advisor: advisor }, 'Assigned')}>Assign</button>
              <button className="btn btn-primary btn-sm" onClick={promote}>Add to Opportunity Pipeline</button>
            </div>
          )}
        </section>
      )}

      <section><h4>Audit history</h4>
        <div className="acq-audit">
          {d.audit.map((a) => <div key={a.id}><span>{fmtDate(a.at)}</span> <strong>{a.action}</strong> <span className="acq-muted">{a.actor}</span></div>)}
          {d.audit.length === 0 && <div className="acq-muted">No entries.</div>}
        </div>
      </section>
    </div>
  );
}

/* ---------------- leads list (explorer + review queue) ---------------- */
function LeadRows({ leads, selected, onSelect, onTag }) {
  if (!leads.length) return <div className="acq-empty">No leads match. Leads appear only after an approved source has been refreshed or an enquiry has been submitted.</div>;
  return (
    <div className="acq-table">
      {leads.map((l) => (
        <button key={l.lead_id} className={`acq-lead ${selected === l.lead_id ? 'active' : ''}`} onClick={() => onSelect(l.lead_id)} aria-label={`Open ${l.display_name}`}>
          <span className="acq-score sm">{l.intent_score}</span>
          <span className="acq-lead-main"><strong>{l.display_name}</strong><span className="acq-muted">{l.company_name || '—'} · {label(l.intent_category)} · {l.country || '?'} · {l.original_source_id}</span></span>
          <span className="acq-lead-tags">
            <Pill tone={CLASS_TONE[l.intent_class]}>{l.intent_class === 'confirmed' ? 'confirmed' : 'inferred'}</Pill>
            <Pill tone={SEG_TONE[l.qualification_status]}>{label(l.qualification_status)}</Pill>
            <Pill tone={l.gates?.contact_verified ? 'good' : 'muted'}>{l.gates?.contact_verified ? 'contact verified' : 'unverified'}</Pill>
          </span>
          <span className="acq-next"><Tags tags={(l.tags || []).filter((t) => /^(source|channel|run|batch):/.test(t))} onTag={onTag} /></span>
          <span className="acq-muted acq-next">{l.next_action || (l.gates?.eligible_for_outreach ? 'Eligible: assign an advisor' : 'Review evidence')}</span>
        </button>
      ))}
    </div>
  );
}

function Explorer({ perms, setMsg, onPromoteLead, tick }) {
  const [f, setF] = useState({ q: '', segment: '', country: '', kind: '', min_score: '', contact_verified: '', consent_status: '', source_id: '', review_status: '', from: '', to: '', owner: '', tag: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [sources, setSources] = useState([]);
  const [selected, setSelected] = useState(null);
  const query = useMemo(() => new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page: String(page), page_size: '25' }).toString(), [f, page]);
  const load = useCallback(() => api(`/leads?${query}`).then(setData).catch((e) => setMsg(e.message, true)), [query, setMsg]);
  useEffect(() => { load(); }, [load, tick]);
  useEffect(() => { api('/sources').then((d) => setSources(d.sources)).catch(() => {}); }, []);
  const set = (k, v) => { setPage(1); setF((x) => ({ ...x, [k]: v })); };
  return (
    <div className="acq-split">
      <div>
        <div className="acq-filters" aria-label="Lead filters">
          <input aria-label="Search" placeholder="Search name, company, signal" value={f.q} onChange={(e) => set('q', e.target.value)} />
          <select aria-label="Segment" value={f.segment} onChange={(e) => set('segment', e.target.value)}>
            <option value="">All segments</option><option value="sales_ready_enquiry">Sales-ready enquiries</option><option value="research_qualified">Research-qualified</option>
            <option value="watchlist">Watchlist</option><option value="needs_manual_review">Needs review</option>
          </select>
          <select aria-label="Country" value={f.country} onChange={(e) => set('country', e.target.value)}><option value="">All countries</option><option value="CA">Canada</option><option value="US">United States</option></select>
          <select aria-label="Intent type" value={f.kind} onChange={(e) => set('kind', e.target.value)}><option value="">Confirmed + inferred</option><option value="confirmed">Confirmed only</option><option value="inferred">Inferred only</option></select>
          <input aria-label="Minimum score" type="number" min="0" max="100" placeholder="Min score" value={f.min_score} onChange={(e) => set('min_score', e.target.value)} />
          <select aria-label="Contact verification" value={f.contact_verified} onChange={(e) => set('contact_verified', e.target.value)}><option value="">Any verification</option><option value="true">Contact verified</option><option value="false">Not verified</option></select>
          <select aria-label="Consent status" value={f.consent_status} onChange={(e) => set('consent_status', e.target.value)}><option value="">Any consent</option><option value="granted">Granted</option><option value="none">None</option><option value="withdrawn">Withdrawn</option></select>
          <select aria-label="Source" value={f.source_id} onChange={(e) => set('source_id', e.target.value)}><option value="">All sources</option>{sources.map((s) => <option key={s.source_id} value={s.source_id}>{s.source_name}</option>)}</select>
          <select aria-label="Review status" value={f.review_status} onChange={(e) => set('review_status', e.target.value)}><option value="">Any review status</option>{['pending', 'approved', 'rejected', 'verification_requested', 'escalated'].map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
          <input aria-label="From date" type="date" value={f.from} onChange={(e) => set('from', e.target.value)} />
          <input aria-label="To date" type="date" value={f.to} onChange={(e) => set('to', e.target.value)} />
          <input aria-label="Owner" placeholder="Assigned owner" value={f.owner} onChange={(e) => set('owner', e.target.value)} />
          <input aria-label="Tag" placeholder="Tag, e.g. channel:rss" value={f.tag} onChange={(e) => set('tag', e.target.value.trim())} />
        </div>
        {!data ? <div className="acq-muted">Loading leads…</div> : (
          <>
            <div className="acq-muted">{data.total} lead(s)</div>
            <LeadRows leads={data.leads} selected={selected} onSelect={setSelected} onTag={(t) => set('tag', t)} />
            <div className="acq-pager">
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={14} /></button>
              <span>Page {data.page} of {Math.max(1, Math.ceil(data.total / data.page_size))}</span>
              <button className="btn btn-secondary btn-sm" disabled={page * data.page_size >= data.total} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={14} /></button>
            </div>
          </>
        )}
      </div>
      {selected && <LeadDetail id={selected} perms={perms} setMsg={setMsg} onChanged={load} onPromoteLead={onPromoteLead} />}
    </div>
  );
}

function ReviewQueue({ perms, setMsg, onPromoteLead, tick }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const load = useCallback(() => api('/review-queue').then(setData).catch((e) => setMsg(e.message, true)), [setMsg]);
  useEffect(() => { load(); }, [load, tick]);
  if (!perms.includes('leads.review')) return <div className="acq-empty">Your role cannot review leads.</div>;
  return (
    <div className="acq-split">
      <div>{!data ? <div className="acq-muted">Loading queue…</div> : <><div className="acq-muted">{data.total} awaiting review</div><LeadRows leads={data.leads} selected={selected} onSelect={setSelected} /></>}</div>
      {selected && <LeadDetail id={selected} perms={perms} setMsg={setMsg} onChanged={load} onPromoteLead={onPromoteLead} />}
    </div>
  );
}

/* ---------------- received data archive ---------------- */
const STATUS_TONE = { accepted: 'good', rejected: 'bad', duplicate: 'muted' };

function RecordsTab({ setMsg, tick }) {
  const [f, setF] = useState({ q: '', source_id: '', status: '', tag: '' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [sources, setSources] = useState([]);
  const query = useMemo(() => new URLSearchParams({ ...Object.fromEntries(Object.entries(f).filter(([, v]) => v)), page: String(page), page_size: '25' }).toString(), [f, page]);
  useEffect(() => { api(`/records?${query}`).then(setData).catch((e) => setMsg(e.message, true)); }, [query, setMsg, tick]);
  useEffect(() => { api('/sources').then((d) => setSources(d.sources)).catch(() => {}); }, []);
  const set = (k, v) => { setPage(1); setF((x) => ({ ...x, [k]: v })); };
  const topTags = Object.entries(data?.tag_counts || {}).filter(([t]) => /^(source|channel|run):/.test(t)).sort((a, b) => b[1] - a[1]).slice(0, 12);
  return (
    <div>
      <div className="acq-muted">Every item received from a source is archived here, whether it became a lead or was rejected (with the reason). Repeat sightings update one row.</div>
      <div className="acq-filters" aria-label="Record filters">
        <input aria-label="Search records" placeholder="Search title or reason" value={f.q} onChange={(e) => set('q', e.target.value)} />
        <select aria-label="Record source" value={f.source_id} onChange={(e) => set('source_id', e.target.value)}><option value="">All sources</option>{sources.map((s) => <option key={s.source_id} value={s.source_id}>{s.source_name}</option>)}</select>
        <select aria-label="Record status" value={f.status} onChange={(e) => set('status', e.target.value)}><option value="">Any status</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="duplicate">Duplicate</option></select>
        <input aria-label="Record tag" placeholder="Tag, e.g. channel:rss" value={f.tag} onChange={(e) => set('tag', e.target.value.trim())} />
      </div>
      {topTags.length > 0 && <div className="acq-tags" style={{ marginBottom: 8 }}>{topTags.map(([t, n]) => <button key={t} className="acq-pill info acq-tag-btn" onClick={() => set('tag', t)}>{t} · {n}</button>)}</div>}
      {!data ? <div className="acq-muted">Loading records…</div> : data.records.length === 0 ? (
        <div className="acq-empty">Nothing received yet. Approve a source in the Sources tab, then use "Run all approved sources".</div>
      ) : (
        <div className="acq-table">
          {data.records.map((r) => (
            <div key={r.record_key} className="acq-rec">
              <div className="acq-rec-top">
                <Pill tone={STATUS_TONE[r.status]}>{r.status}</Pill>
                {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="acq-rec-title">{r.title} <ExternalLink size={11} /></a> : <span className="acq-rec-title">{r.title}</span>}
              </div>
              {r.reason && <div className="acq-muted">{r.reason}</div>}
              <Tags tags={r.tags.filter((t) => !t.startsWith('status:'))} onTag={(t) => set('tag', t)} />
              <div className="acq-muted">first seen {fmtDate(r.first_seen)} · last seen {fmtDate(r.last_seen)} · seen {r.seen_count}× {r.lead_id ? `· lead ${r.lead_id}` : ''}</div>
            </div>
          ))}
        </div>
      )}
      {data && (
        <div className="acq-pager">
          <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous records page"><ChevronLeft size={14} /></button>
          <span>{data.total} record(s) · page {data.page} of {Math.max(1, Math.ceil(data.total / data.page_size))}</span>
          <button className="btn btn-secondary btn-sm" disabled={page * data.page_size >= data.total} onClick={() => setPage(page + 1)} aria-label="Next records page"><ChevronRight size={14} /></button>
        </div>
      )}
    </div>
  );
}

/* ---------------- analytics ---------------- */
function Analytics({ tick }) {
  const [m, setM] = useState(null);
  useEffect(() => { api('/metrics').then(setM).catch(() => setM(false)); }, [tick]);
  if (m === false) return <div className="acq-empty">Metrics are unavailable for your role.</div>;
  if (!m) return <div className="acq-muted">Loading metrics…</div>;
  return (
    <div>
      <div className="acq-kpis">
        <Kpi title="Leads" value={m.totals.leads} sub={`${m.new_last_30_days} new in 30 days`} />
        <Kpi title="Qualified" value={m.totals.qualified} sub={`${m.totals.sales_ready} sales-ready enquiries`} />
        <Kpi title="Eligible for outreach" value={m.totals.eligible_for_outreach} />
        <Kpi title="Confirmed intent" value={num(m.confirmed_intent_pct, '%')} />
        <Kpi title="Contact verification" value={num(m.contact_verification_rate_pct, '%')} />
        <Kpi title="Duplicate rate" value={num(m.duplicate_rate_pct, '%')} />
        <Kpi title="Rejection rate" value={num(m.rejection_rate_pct, '%')} />
        <Kpi title="Consent failures" value={m.consent_failures} />
        <Kpi title="Cost / qualified lead" value={m.cost_per_qualified_lead == null ? 'n/a' : `$${m.cost_per_qualified_lead}`} sub="needs source costs" />
        <Kpi title="Cost / booked meeting" value={m.cost_per_booked_meeting == null ? 'n/a' : `$${m.cost_per_booked_meeting}`} sub={`${m.booked_meetings} meetings`} />
        <Kpi title="Conversion rate" value={num(m.conversion_rate_pct, '%')} sub="of confirmed enquiries" />
        <Kpi title="Awaiting review" value={m.review_queue_size} />
      </div>
      <div className="acq-two">
        <div className="acq-card"><h4>Leads by source</h4>{Object.keys(m.leads_by_source).length === 0 && <div className="acq-muted">None yet.</div>}{Object.entries(m.leads_by_source).map(([k, v]) => <div key={k} className="acq-bar"><span>{k}</span><strong>{v}</strong></div>)}</div>
        <div className="acq-card"><h4>Source freshness</h4>{m.source_freshness.map((s) => <div key={s.source_id} className="acq-bar"><span>{s.source_name}</span><strong>{s.age_hours == null ? 'never fetched' : `${s.age_hours} h ago`}</strong></div>)}</div>
      </div>
      <div className="acq-muted">Metrics are computed from stored records only. Values shown as n/a have no data behind them yet.</div>
    </div>
  );
}

/* ---------------- import / export ---------------- */
function DataTab({ perms, setMsg }) {
  const [sources, setSources] = useState([]);
  const [sid, setSid] = useState('');
  const [summary, setSummary] = useState(null);
  useEffect(() => { api('/sources').then((d) => { const csv = d.sources.filter((s) => s.access_method === 'csv'); setSources(csv); setSid(csv[0]?.source_id || ''); }).catch(() => {}); }, []);
  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setSummary(await api(`/import?source_id=${sid}`, { method: 'POST', raw: true, body: await file.text() })); setMsg('Import finished'); } catch (err) { setMsg(err.message, true); }
    e.target.value = '';
  };
  const TEMPLATES = {
    provider_attested: 'provider_record_id,first_name,last_name,business_email,business_phone,country,state_or_province,city,event_date,intent_category,investable_assets',
    row_evidence: 'provider_record_id,first_name,last_name,company_name,business_email,business_phone,country,intent_category,event_date,intent_class,consent_status,consent_timestamp,consent_text_version,permitted_purpose,permitted_recipient,preferred_contact_channel,permitted_channels',
  };
  const downloadTemplate = () => {
    const basis = sources.find((s) => s.source_id === sid)?.permission?.consent_basis || 'row_evidence';
    const url = URL.createObjectURL(new Blob([`${TEMPLATES[basis]}\r\n`], { type: 'text/csv' }));
    Object.assign(document.createElement('a'), { href: url, download: `import-template-${basis}.csv` }).click();
    URL.revokeObjectURL(url);
  };
  const exportAll = async () => {
    try {
      const csv = await api('/export', { method: 'POST', body: {} });
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: 'leads.csv' });
      a.click(); URL.revokeObjectURL(url);
    } catch (err) { setMsg(err.message, true); }
  };
  return (
    <div className="acq-two">
      <div className="acq-card"><h4><FileUp size={14} /> Provider CSV import</h4>
        <p className="acq-muted">Only for a registered CSV source whose permission is approved. Required columns: provider_record_id, company_name, country, intent_category, event_date. A row can only be "confirmed" with full consent evidence.</p>
        {!perms.includes('leads.import') ? <div className="acq-muted">Your role cannot import.</div> : sources.length === 0 ? <div className="acq-empty">No CSV source registered. Add one in Sources (access method: Provider-authorised CSV) and record its permission.</div> : (
          <>
            <select aria-label="CSV source" value={sid} onChange={(e) => setSid(e.target.value)}>{sources.map((s) => <option key={s.source_id} value={s.source_id}>{s.source_name} ({s.permission.consent_basis === 'provider_attested' ? 'provider-attested' : 'per-row proof'})</option>)}</select>
            <button className="btn btn-secondary btn-sm" onClick={downloadTemplate}>Download column template</button>
            <p className="acq-muted">Provider export headers such as "Email", "First Name", "Zip" or "Created At" are recognised automatically.</p>
            <input type="file" accept=".csv,text/csv" aria-label="CSV file" onChange={upload} />
          </>
        )}
        {summary && <div className="acq-summary-box">Batch {summary.batch_id}: {summary.accepted} accepted · {summary.rejected} rejected · {summary.duplicates} duplicates of {summary.total}{summary.rejections.slice(0, 8).map((r, i) => <div key={i} className="acq-muted">row {r.row}: {r.reason}</div>)}</div>}
      </div>
      <div className="acq-card"><h4><Download size={14} /> Export</h4>
        <p className="acq-muted">Suppressed, merged and expired records are never exported. Contact columns are included only if your role may see contact details. Every export is audited.</p>
        {perms.includes('leads.export') ? <button className="btn btn-primary btn-sm" onClick={exportAll}>Export leads (CSV)</button> : <div className="acq-muted">Your role cannot export.</div>}
        <h4 style={{ marginTop: 18 }}>Website enquiry form</h4>
        <p className="acq-muted">The opt-in page that creates confirmed enquiries: <a href="/enquiry.html" target="_blank" rel="noreferrer">/enquiry.html</a></p>
      </div>
    </div>
  );
}

/* ---------------- one-click collection ---------------- */
function CollectBar({ perms, setMsg, onCollected, tick }) {
  const [info, setInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState(false);
  const [ack, setAck] = useState(false);
  const manage = perms.includes('sources.manage');

  const load = useCallback(() => {
    api('/quickstart').then(setInfo).catch(() => {});
    Promise.all([api('/metrics'), api('/sources')]).then(([m, s]) => {
      const last = s.sources.map((x) => x.last_successful_fetch).filter(Boolean).sort().pop() || null;
      setStats({ leads: m.totals.leads, records: m.records_archived, last, approved: s.sources.filter((x) => x.permission.allowed && !x.system).length });
    }).catch(() => {});
  }, []);
  useEffect(() => { load(); }, [load, tick]);

  const summarize = (r) => {
    const ok = r.runs.filter((x) => x.status === 'success');
    const failed = r.runs.filter((x) => x.status === 'failed');
    setMsg(`Collected from ${ok.length} source(s): ${ok.reduce((a, x) => a + x.received, 0)} records received, ${ok.reduce((a, x) => a + x.accepted, 0)} new leads${failed.length ? `; ${failed.length} failed (see Sources > Logs)` : ''}`, failed.length > 0 && ok.length === 0);
  };
  const collect = async () => {
    if (!stats?.approved) { setPanel(true); return; }
    setBusy(true);
    try { summarize(await api('/sources/run-all', { method: 'POST' })); onCollected(); } catch (e) { setMsg(e.message, true); }
    setBusy(false); load();
  };
  const approveAndCollect = async () => {
    setBusy(true);
    try { const r = await api('/quickstart', { method: 'POST', body: { confirm: true, reviewed_terms: true } }); summarize(r); setPanel(false); setAck(false); onCollected(); } catch (e) { setMsg(e.message, true); }
    setBusy(false); load();
  };
  const unapproved = info?.sources.filter((s) => !s.approved) || [];

  return (
    <div className="acq-collect">
      <div className="acq-collect-row">
        {manage
          ? <button className="btn btn-primary" onClick={collect} disabled={busy}><RefreshCw size={14} /> {busy ? 'Collecting…' : 'Collect intent data now'}</button>
          : <span className="acq-muted">Ask an administrator to collect new data.</span>}
        <span className="acq-muted">
          {stats ? `${stats.leads} leads · ${stats.records} records archived · last collected ${stats.last ? fmtDate(stats.last) : 'never'} · ` : ''}
          approved sources also refresh automatically every 30–60 minutes while the service runs
        </span>
        {manage && stats?.approved > 0 && unapproved.length > 0 && <button className="btn btn-secondary btn-sm" onClick={() => setPanel((p) => !p)}>{unapproved.length} recommended source(s) not approved</button>}
      </div>
      {panel && info && (
        <div className="acq-collect-panel" role="dialog" aria-label="Approve recommended sources">
          <strong>Approve the recommended public sources</strong>
          <ul>{info.sources.map((s) => <li key={s.source_id}>{s.source_name} <span className="acq-muted">({s.geographic_coverage.join('/')}) {s.approved ? '· already approved' : ''}</span></li>)}</ul>
          <label className="acq-inline"><input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} /> {info.attestation}</label>
          <div className="acq-muted">Your approval is recorded with your name, the date and each source's URL. Sources not listed here (for example Google News search feeds) are not included and need their own review.</div>
          <div className="acq-actions">
            <button className="btn btn-primary btn-sm" disabled={!ack || busy} onClick={approveAndCollect}>{busy ? 'Working…' : 'Approve and collect'}</button>
            <button className="btn btn-secondary btn-sm" onClick={() => { setPanel(false); setAck(false); }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- shell ---------------- */
const TABS = [
  { id: 'sources', label: 'Sources', icon: Database }, { id: 'explorer', label: 'Lead Explorer', icon: Users },
  { id: 'review', label: 'Review Queue', icon: ClipboardCheck }, { id: 'records', label: 'Received Data', icon: Inbox }, { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'data', label: 'Import / Export', icon: FileUp },
];

export default function LeadAcquisitionView({ onPromoteLead, showToast }) {
  const [me, setMe] = useState(null);
  const [authError, setAuthError] = useState('');
  const [checking, setChecking] = useState(!!getToken());
  const [tab, setTab] = useState('explorer');
  const [tick, setTick] = useState(0);
  // Pull fresh data into every tab once a minute so new collections appear without clicking
  useEffect(() => {
    if (!me) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, [me]);

  const setMsg = useCallback((m, bad) => showToast?.(m, bad ? 'alert' : 'success'), [showToast]);
  const check = useCallback(() => {
    setChecking(true);
    api('/whoami').then((d) => { setMe(d); setAuthError(''); }).catch((e) => {
      setMe(null); setToken('');
      setAuthError(e.status === 401 ? 'That token was not accepted.' : `Cannot reach the acquisition service: ${e.message}. Is "npm run scraper" running?`);
    }).finally(() => setChecking(false));
  }, []);
  useEffect(() => { if (getToken()) check(); }, [check]);

  if (checking) return <div className="acq-muted">Checking access…</div>;
  if (!me) return <TokenGate onAuthed={check} error={authError} />;

  const perms = me.permissions;
  return (
    <div className="acq-root">
      <div className="acq-top">
        <div><h2><ShieldCheck size={20} /> Lead Acquisition Console</h2>
          <div className="acq-muted">Every lead carries its source, evidence, intent class and permission status. Public events are inferred intent only.</div></div>
        <div className="acq-top-right"><Pill tone="info">{me.role}</Pill><button className="btn btn-secondary btn-sm" onClick={() => { setToken(''); setMe(null); }}>Sign out</button></div>
      </div>
      <CollectBar perms={perms} setMsg={setMsg} tick={tick} onCollected={() => { setTab('explorer'); setTick((n) => n + 1); }} />
      <div className="acq-tabs" role="tablist">
        {TABS.map(({ id, label: l, icon: Icon }) => <button key={id} role="tab" aria-selected={tab === id} className={`acq-tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}><Icon size={14} /> {l}</button>)}
      </div>
      {tab === 'sources' && <SourcesTab perms={perms} setMsg={setMsg} tick={tick} />}
      {tab === 'explorer' && <Explorer perms={perms} setMsg={setMsg} onPromoteLead={onPromoteLead} tick={tick} />}
      {tab === 'review' && <ReviewQueue perms={perms} setMsg={setMsg} onPromoteLead={onPromoteLead} tick={tick} />}
      {tab === 'records' && <RecordsTab setMsg={setMsg} tick={tick} />}
      {tab === 'analytics' && <Analytics tick={tick} />}
      {tab === 'data' && <DataTab perms={perms} setMsg={setMsg} />}
    </div>
  );
}
