import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2, Plus, CheckCircle2, AlertCircle, AlertTriangle, Loader2, RefreshCw, Radar, Sparkles
} from 'lucide-react';

const API = '/api/intent';

// One-click sources. Each URL was tested against the scraper and returns dated, parseable items.
const SUGGESTED = [
  { name: 'Betakit', url: 'https://betakit.com/feed/' },
  { name: 'Globe & Mail Business', url: 'https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/business/' },
  { name: 'Financial Post', url: 'https://financialpost.com/feed' },
  { name: 'Northern Miner', url: 'https://www.northernminer.com/feed/' },
  { name: 'Calgary Herald Business', url: 'https://calgaryherald.com/category/business/feed' },
  { name: 'Vancouver Sun Business', url: 'https://vancouversun.com/category/business/feed' }
];

async function api(path, options) {
  const res = await fetch(`${API}${path}`, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body;
}

// Paste a URL -> saved -> scraped immediately -> leads appear in the stream.
// onScrape pulls the scraped leads into the CRM; onChanged tells the parent to reload its results.
export default function SourcesPanel({ onScrape, onChanged }) {
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState(null); // { kind: 'success'|'warn'|'error', text }
  const [custom, setCustom] = useState([]);
  const [serviceDown, setServiceDown] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api('/sources');
      setCustom(data.custom);
      setServiceDown(false);
    } catch {
      setServiceDown(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const known = new Set(custom.map((s) => s.url));
  const suggestions = SUGGESTED.filter((s) => !known.has(s.url));

  const addSource = async (rawUrl, name) => {
    let value = rawUrl.trim();
    if (!value) return;
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;

    setBanner(null);
    setBusy(true);
    try {
      const saved = await api('/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(name ? { url: value, name } : { url: value })
      });
      setUrl('');
      // Scrape right away and pull the resulting leads into the stream
      if (onScrape) await onScrape();
      const fresh = await api('/sources');
      setCustom(fresh.custom);
      if (onChanged) await onChanged();
      const added = saved.custom.find((s) => s.url === value) || saved.custom[saved.custom.length - 1];
      const run = fresh.lastRun.find((r) => r.id === added?.id);
      if (!run) setBanner({ kind: 'warn', text: 'Source saved. It will be scraped on the next refresh.' });
      else if (!run.ok) setBanner({ kind: 'error', text: `Saved, but the page could not be read: ${run.error}` });
      else if (run.fetched === 0) setBanner({ kind: 'warn', text: "Saved, but no headlines were found. The page may load its content with JavaScript, so try the site's RSS feed link." });
      else setBanner({ kind: 'success', text: `Scraped ${run.fetched} items from this page; ${run.signals} matched wealth-intent signals. Details are in the table below.` });
    } catch (err) {
      setBanner({ kind: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setBanner(null);
    setBusy(true);
    try {
      if (onScrape) await onScrape();
      if (onChanged) await onChanged();
      await load();
    } catch (err) {
      setBanner({ kind: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const BannerIcon = banner?.kind === 'success' ? CheckCircle2 : banner?.kind === 'warn' ? AlertTriangle : AlertCircle;

  return (
    <div className="src-panel" data-testid="sources-panel">
      <div className="src-head">
        <div className="src-title-wrap">
          <div className="src-icon"><Radar size={19} /></div>
          <div>
            <div className="src-title">Add a source to scrape</div>
            <div className="src-sub">Paste any website or RSS link. The engine scrapes it for client intent signals on its own.</div>
          </div>
        </div>
        <div className="src-head-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleRefresh} disabled={busy} title="Scrape every source now">
            <RefreshCw size={13} className={busy ? 'animate-spin' : ''} /> Scrape all now
          </button>
        </div>
      </div>

      <form className="src-add" onSubmit={(e) => { e.preventDefault(); addSource(url); }}>
        <div className="src-input-wrap">
          <Link2 size={16} />
          <input
            className="src-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/news  or  an RSS feed link"
            aria-label="Website URL to scrape"
            disabled={busy}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy || !url.trim()}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          {busy ? 'Scraping...' : 'Add & Scrape'}
        </button>
      </form>
      <div className="src-hint">Tip: an RSS or feed link (usually /feed or /rss) gives dated headlines and scores higher than a plain web page.</div>

      {suggestions.length > 0 && (
        <div className="src-suggest">
          <span className="src-suggest-label"><Sparkles size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: '-1px' }} />Quick add</span>
          {suggestions.map((s) => (
            <button key={s.url} className="src-suggest-btn" disabled={busy} onClick={() => addSource(s.url, s.name)} title={s.url}>
              <Plus size={11} /> {s.name}
            </button>
          ))}
        </div>
      )}

      {serviceDown && (
        <div className="src-banner warn" role="alert">
          <AlertTriangle size={16} />
          <span>The scraper service isn&apos;t running. Start it with <strong>npm run scraper</strong>, then try again.</span>
        </div>
      )}
      {banner && (
        <div className={`src-banner ${banner.kind}`} role={banner.kind === 'error' ? 'alert' : 'status'}>
          <BannerIcon size={16} />
          <span>{banner.text}</span>
        </div>
      )}
    </div>
  );
}
