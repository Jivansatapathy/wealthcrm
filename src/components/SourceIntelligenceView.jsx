import React, { useState, useEffect, useCallback } from 'react';
import {
  Database, Layers, Zap, Target, Gauge, DollarSign, Link2, Filter, ChevronDown, ChevronUp,
  ExternalLink, AlertCircle, CheckCircle2, Clock, Inbox
} from 'lucide-react';
import SourcesPanel from './SourcesPanel';

const hostOf = (u) => {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u || ''; }
};

const money = (n) => {
  if (!n) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M`;
  return `$${Math.round(n / 1e3)}K`;
};

const timeAgo = (iso) => {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso)) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : 'No date');

const SHOW_STEP = 25;

function Kpi({ icon, label, value, sub, tone }) {
  return (
    <div className={`kpi-card ${tone}`}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        {icon}
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-delta" style={{ color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  );
}

function BarList({ title, hint, data, tone }) {
  const rows = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] || 1;
  return (
    <div className="srcx-card">
      <div className="srcx-card-title">{title}</div>
      <div className="srcx-card-hint">{hint}</div>
      {rows.length === 0 && <div className="src-empty">Nothing yet. Run a scrape.</div>}
      {rows.map(([label, n]) => (
        <div key={label} className="srcx-bar-row">
          <div className="srcx-bar-label"><span title={label}>{label}</span><strong>{n}</strong></div>
          <div className="src-meter"><div className={tone} style={{ width: `${Math.max(3, (n / max) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function ItemRow({ item }) {
  const isSignal = item.status === 'signal';
  const Tag = item.link ? 'a' : 'div';
  const props = item.link ? { href: item.link, target: '_blank', rel: 'noreferrer' } : {};
  return (
    <Tag className="srcx-item" {...props}>
      <span className={`srcx-score ${isSignal ? (item.score >= 70 ? 'hot' : 'ok') : 'off'}`}>{isSignal ? item.score : '—'}</span>
      <span className="srcx-item-body">
        <span className="srcx-item-title">{item.title}</span>
        <span className="srcx-item-meta">
          <span>{fmtDate(item.date)}</span>
          {isSignal ? (
            <>
              <span className="srcx-pill good">{item.type}</span>
              {item.company && item.company !== 'Company not identified' && <span>{item.company}</span>}
              {item.amount > 0 && <span>Deal {item.dealSize}</span>}
              {item.crm && <span className="srcx-pill crm">In CRM: {item.crm}</span>}
            </>
          ) : (
            <span className="srcx-pill muted">Filtered: {item.reason}</span>
          )}
        </span>
      </span>
      {item.link && <ExternalLink size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 4 }} />}
    </Tag>
  );
}

function SourceRow({ source, open, onToggle }) {
  const [tab, setTab] = useState('signals');
  const [limit, setLimit] = useState(SHOW_STEP);
  const pending = source.ok === null;
  const failed = source.ok === false;

  const items = source.items || [];
  const shown = items.filter((i) => (tab === 'all' ? true : tab === 'signals' ? i.status === 'signal' : i.status === 'filtered'));
  const reasons = Object.entries(source.reasons || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className={`srcx-row ${open ? 'open' : ''} ${failed ? 'failed' : ''}`}>
      <button className="srcx-row-main" onClick={onToggle} aria-expanded={open} aria-label={`${source.name} details`}>
        <span className="srcx-source">
          <span className={`src-dot ${pending ? '' : failed ? 'bad' : 'ok'}`} />
          <span style={{ minWidth: 0 }}>
            <span className="srcx-source-name">{source.name}</span>
            <span className="srcx-source-host">{hostOf(source.url)}</span>
          </span>
          <span className={`src-tag ${source.custom ? 'custom' : ''}`}>{source.custom ? 'Yours' : source.category}</span>
        </span>
        {failed ? (
          <span className="srcx-error"><AlertCircle size={13} /> {source.error}</span>
        ) : pending ? (
          <span className="srcx-error" style={{ color: 'var(--text-muted)' }}><Clock size={13} /> Waiting for first scrape</span>
        ) : (
          <>
            <span className="srcx-num" data-label="Scanned">{source.fetched}</span>
            <span className="srcx-num strong" data-label="Signals">{source.signals}</span>
            <span className="srcx-num" data-label="Filtered">{source.filtered}</span>
            <span className="srcx-num" data-label="Avg score">{source.avgScore || '—'}</span>
            <span className="srcx-num" data-label="Top score">{source.topScore || '—'}</span>
            <span className="srcx-num" data-label="Deal value">{money(source.dealTotal)}</span>
          </>
        )}
        <span className="srcx-chevron">{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
      </button>

      {open && (
        <div className="srcx-detail">
          <div className="srcx-detail-meta">
            <a href={source.url} target="_blank" rel="noreferrer" className="src-link-btn"><Link2 size={12} /> {source.url}</a>
            {!pending && !failed && <span>Scraped in {source.ms} ms</span>}
          </div>

          {failed && <div className="src-banner error"><AlertCircle size={16} /><span>This source could not be read: {source.error}. It may block automated requests, or the URL may be wrong.</span></div>}
          {!pending && !failed && source.fetched === 0 && (
            <div className="src-banner warn"><AlertCircle size={16} /><span>The page returned no headlines. It may load its content with JavaScript. Try the site&apos;s RSS feed link instead.</span></div>
          )}

          {!pending && !failed && source.fetched > 0 && (
            <>
              {reasons.length > 0 && (
                <div className="srcx-reasons">
                  <span className="src-suggest-label">Why items were filtered</span>
                  {reasons.map(([r, n]) => <span key={r} className="srcx-pill muted">{r} · {n}</span>)}
                </div>
              )}

              <div className="srcx-tabs" role="tablist">
                {[['signals', `Signals (${source.signals})`], ['filtered', `Filtered out (${source.filtered})`], ['all', `All scanned (${items.length})`]].map(([id, label]) => (
                  <button key={id} role="tab" aria-selected={tab === id} className={`srcx-tab ${tab === id ? 'active' : ''}`} onClick={() => { setTab(id); setLimit(SHOW_STEP); }}>{label}</button>
                ))}
              </div>

              <div className="srcx-items">
                {shown.length === 0 && <div className="src-empty">{tab === 'signals' ? 'No intent signals in this source right now.' : 'Nothing to show.'}</div>}
                {shown.slice(0, limit).map((it, i) => <ItemRow key={`${it.link}-${i}`} item={it} />)}
              </div>
              {shown.length > limit && (
                <button className="src-link-btn" style={{ marginTop: 10 }} onClick={() => setLimit((l) => l + SHOW_STEP)}>
                  Show {Math.min(SHOW_STEP, shown.length - limit)} more ({shown.length - limit} remaining)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Everything the scraper found, in total and per URL.
export default function SourceIntelligenceView({ onFetchLiveMarketData }) {
  const [data, setData] = useState(null);
  const [down, setDown] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/intent/overview');
      if (!res.ok) throw new Error('bad response');
      setData(await res.json());
      setDown(false);
    } catch {
      setDown(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const t = data?.totals;

  return (
    <div>
      <SourcesPanel onScrape={onFetchLiveMarketData} onChanged={load} />

      {down && (
        <div className="src-banner warn" role="alert" style={{ marginTop: 0, marginBottom: 20 }}>
          <AlertCircle size={16} />
          <span>Can&apos;t reach the scraper service. Start it with <strong>npm run scraper</strong>, then reload this page.</span>
        </div>
      )}

      {t && (
        <>
          <div className="srcx-heading">
            <div>
              <div className="srcx-h-title">Scrape results: all sources combined</div>
              <div className="srcx-h-sub">
                Last scrape {timeAgo(data.updatedAt)}{data.durationMs ? ` · took ${(data.durationMs / 1000).toFixed(1)}s` : ''} · refreshes automatically every 15 minutes
              </div>
            </div>
          </div>

          <div className="srcx-kpis">
            <Kpi tone="indigo" icon={<Database size={16} />} label="Sources" value={`${t.live}/${t.sources}`} sub={t.failing ? `${t.failing} failing` : 'all live'} />
            <Kpi tone="cyan" icon={<Layers size={16} />} label="Items scanned" value={t.scanned.toLocaleString()} sub="headlines read" />
            <Kpi tone="emerald" icon={<Zap size={16} />} label="Intent signals" value={t.signals} sub={`${t.filtered.toLocaleString()} filtered out`} />
            <Kpi tone="gold" icon={<Target size={16} />} label="Leads created" value={t.leads} sub={`${t.hotLeads} hot (score 70+)`} />
            <Kpi tone="indigo" icon={<Gauge size={16} />} label="Average score" value={t.avgScore || '—'} sub="across all leads" />
            <Kpi tone="gold" icon={<DollarSign size={16} />} label="Deal value seen" value={money(t.dealValue)} sub="disclosed in headlines" />
            <Kpi tone="emerald" icon={<CheckCircle2 size={16} />} label="CRM matches" value={t.crmMatches} sub="signals on your clients" />
            <Kpi tone="cyan" icon={<Filter size={16} />} label="Signal rate" value={t.scanned ? `${((t.signals / t.scanned) * 100).toFixed(1)}%` : '—'} sub="of items are intent" />
          </div>

          <div className="srcx-two">
            <BarList title="What kind of signals were found" hint="Leads by primary signal type" data={data.byType} tone="" />
            <BarList title="Why items were thrown away" hint="Filtered items across all sources" data={data.rejectReasons} tone="warn" />
          </div>

          <div className="srcx-heading" style={{ marginTop: 26 }}>
            <div>
              <div className="srcx-h-title">What each URL found</div>
              <div className="srcx-h-sub">Click a source to see every headline it returned, which ones became signals, and why the rest were filtered.</div>
            </div>
          </div>

          <div className="srcx-table">
            <div className="srcx-thead">
              <span>Source</span><span>Scanned</span><span>Signals</span><span>Filtered</span><span>Avg score</span><span>Top score</span><span>Deal value</span><span />
            </div>
            {data.sources.length === 0 && (
              <div className="srcx-emptystate"><Inbox size={22} /> No sources yet. Add one above.</div>
            )}
            {data.sources
              .slice()
              .sort((a, b) => (b.custom - a.custom) || ((b.signals || 0) - (a.signals || 0)))
              .map((s) => (
                <SourceRow key={s.id} source={s} open={openId === s.id} onToggle={() => setOpenId(openId === s.id ? null : s.id)} />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
