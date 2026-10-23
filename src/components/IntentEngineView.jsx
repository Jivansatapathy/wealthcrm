import React, { useState } from 'react';
import KPICards from './KPICards';
import { Zap, Radio, Sparkles, PlusCircle, Clock, MapPin, Building, ChevronRight, Globe, Radar } from 'lucide-react';

const TIERS = [
  { id: 'Small', label: 'Small ($10K–$250K)' },
  { id: 'Medium', label: 'Medium ($250K–$2M)' },
  { id: 'High', label: 'High ($2M+)' },
];

function parseMoney(s = '') {
  const m = String(s).replace(/,/g, '').match(/\$\s?([\d.]+)\s?([BMK])?/i);
  if (!m) return null;
  const mult = { B: 1e9, M: 1e6, K: 1e3 }[(m[2] || '').toUpperCase()] || 1;
  return parseFloat(m[1]) * mult;
}

// Scraped leads carry a tier from the pipeline; demo leads fall back to their estimated mandate.
function tierOf(lead) {
  if (lead.tier) return lead.tier.split(' ')[0];
  const amount = parseMoney(lead.estimatedAUM) ?? parseMoney(lead.dealSize);
  if (amount == null) return 'Unsized';
  return amount >= 2e6 ? 'High' : amount >= 2.5e5 ? 'Medium' : amount >= 1e4 ? 'Small' : 'Unsized';
}

export default function IntentEngineView({
  leads,
  kpi,
  searchQuery,
  onOpenDrawer,
  onPromoteLead,
  onSimulateIntent,
  onFetchLiveMarketData,
  isLiveLoading,
  onOpenSources
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  const tierCounts = leads.reduce((acc, l) => {
    const t = tierOf(l);
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const filteredLeads = leads.filter(lead => {
    if (tierFilter !== 'all' && tierOf(lead) !== tierFilter) return false;

    // Filter by tab
    if (activeFilter === 'liquidity' && !lead.primarySignalType.toLowerCase().includes('liquidity') && !lead.primarySignalType.toLowerCase().includes('sale')) {
      return false;
    }
    if (activeFilter === 'commercial' && !lead.signals.some(s => s.source.toLowerCase().includes('commercial'))) {
      return false;
    }
    if (activeFilter === 'urgent' && !lead.urgency.toLowerCase().includes('immediate') && !lead.urgency.toLowerCase().includes('critical')) {
      return false;
    }
    if (activeFilter === 'mdfinancial' && lead.targetDivision !== 'MD Financial Management') {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = lead.name.toLowerCase().includes(q);
      const matchCompany = lead.company.toLowerCase().includes(q);
      const matchSignal = lead.primarySignalType.toLowerCase().includes(q);
      const matchDivision = lead.targetDivision.toLowerCase().includes(q);
      if (!matchName && !matchCompany && !matchSignal && !matchDivision) return false;
    }

    return true;
  });

  return (
    <div>
      {/* KPI Cards */}
      <KPICards kpi={kpi} />

      {/* Live Scanner Banner */}
      <div className="intent-stream-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="scanner-radar-ring">
            <Radio size={24} className="text-indigo-400" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
              AI Intent Engine — Live Bank & Corporate Intelligence Feed
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Monitoring Canadian Corporate Registries, SEDAR+ M&A Filings, Commercial Banking Treasury Triggers, and Maturing Fixed-Income Pools.
            </div>
          </div>
        </div>
        <div style={{ zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={onFetchLiveMarketData}
            disabled={isLiveLoading}
            style={{
              borderColor: 'var(--accent-cyan)',
              color: 'var(--accent-cyan)',
              background: 'rgba(6, 182, 212, 0.12)',
              gap: '6px'
            }}
            title="Ingest real-time Canadian corporate liquidity events from GlobeNewswire and SEDAR+ feeds"
          >
            <Globe size={15} className={isLiveLoading ? 'animate-spin' : ''} />
            {isLiveLoading ? 'Ingesting Live Feed...' : 'Fetch Live Market Feed (Canada)'}
          </button>
          {onOpenSources && (
            <button className="btn btn-secondary btn-sm" onClick={onOpenSources} title="Add URLs to scrape and see what each source found">
              <Radar size={15} /> Manage Sources
            </button>
          )}
          <button className="btn btn-simulate" onClick={onSimulateIntent}>
            <Zap size={16} /> Simulate Live Intent Influx
          </button>
        </div>
      </div>

      {/* Section Toolbar */}
      <div className="section-toolbar">
        <div className="filter-pill-group">
          <button
            className={`filter-pill ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            All Intent Signals ({leads.length})
          </button>
          <button
            className={`filter-pill ${activeFilter === 'liquidity' ? 'active' : ''}`}
            onClick={() => setActiveFilter('liquidity')}
          >
            M&A / Corporate Liquidity
          </button>
          <button
            className={`filter-pill ${activeFilter === 'commercial' ? 'active' : ''}`}
            onClick={() => setActiveFilter('commercial')}
          >
            Commercial Banking Triggers
          </button>
          <button
            className={`filter-pill ${activeFilter === 'urgent' ? 'active' : ''}`}
            onClick={() => setActiveFilter('urgent')}
          >
            Critical Urgency (&lt;10 Days)
          </button>
          <button
            className={`filter-pill ${activeFilter === 'mdfinancial' ? 'active' : ''}`}
            onClick={() => setActiveFilter('mdfinancial')}
          >
            MD Financial (Physicians)
          </button>
        </div>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Displaying <strong>{filteredLeads.length}</strong> high-probability client acquisition signals
        </div>
      </div>

      {/* Investable-size tier filter */}
      <div className="filter-pill-group" style={{ marginBottom: '14px', alignItems: 'center' }} role="group" aria-label="Filter by deal size tier">
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '4px' }}>Deal size:</span>
        <button className={`filter-pill ${tierFilter === 'all' ? 'active' : ''}`} onClick={() => setTierFilter('all')}>
          All sizes
        </button>
        {TIERS.map(t => (
          <button
            key={t.id}
            className={`filter-pill ${tierFilter === t.id ? 'active' : ''}`}
            onClick={() => setTierFilter(t.id)}
          >
            {t.label} ({tierCounts[t.id] || 0})
          </button>
        ))}
        {tierCounts.Unsized > 0 && (
          <button className={`filter-pill ${tierFilter === 'Unsized' ? 'active' : ''}`} onClick={() => setTierFilter('Unsized')}>
            Unsized ({tierCounts.Unsized})
          </button>
        )}
      </div>

      {/* Intent Cards Stream */}
      <div className="intent-cards-container">
        {filteredLeads.map(lead => {
          const isUltra = lead.intentScore >= 95;
          const isNew = lead.isNewSimulation;

          return (
            <div
              key={lead.id}
              className={`intent-card ${isNew ? 'new-inflow' : ''}`}
              onClick={() => onOpenDrawer(lead, 'email')}
            >
              {/* Score Column */}
              <div className="intent-score-col">
                <div className={`intent-score-radial ${isUltra ? 'score-ultra' : 'score-high'}`}>
                  <span className="score-num">{lead.intentScore}</span>
                  <span className="score-suffix">/100</span>
                </div>
                <span className="score-label">Intent Score</span>
              </div>

              {/* Bio Column */}
              <div className="lead-bio-col">
                <div className="lead-header-row">
                  <span className="lead-name">{lead.name}</span>
                  <span className="lead-target-badge">{lead.targetDivision}</span>
                  {tierOf(lead) !== 'Unsized' && (
                    <span className="source-tag" title="Size of the disclosed event, not an assumption about any person's wealth">
                      {tierOf(lead)} tier
                    </span>
                  )}
                  {lead.crmMatch && (
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      background: 'rgba(16, 185, 129, 0.18)',
                      color: '#34D399',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      padding: '1px 6px',
                      borderRadius: '4px'
                    }}>
                      IN CRM: {lead.crmMatch.relation.toUpperCase()}
                    </span>
                  )}
                  {lead.isLiveRealData && (
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      background: 'rgba(6, 182, 212, 0.18)',
                      color: '#22D3EE',
                      border: '1px solid rgba(6, 182, 212, 0.4)',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22D3EE' }}></span>
                      LIVE CANADIAN FILING
                    </span>
                  )}
                </div>
                <div className="lead-company">
                  {lead.title} · {lead.company}
                </div>
                <div className="lead-meta">
                  <span><MapPin size={12} style={{ display: 'inline', marginRight: '3px' }} />{lead.location}</span>
                  <span><Clock size={12} style={{ display: 'inline', marginRight: '3px' }} />{lead.dateDetected}</span>
                </div>
              </div>

              {/* Signal & AI Rationale Column */}
              <div className="intent-signal-col">
                <div className="signal-trigger-pill">
                  <Zap size={13} /> {lead.primarySignalType}
                </div>
                <div className="signal-brief-text">{lead.aiAnalysis.headline}</div>
                <div className="signal-source-tags">
                  {lead.signals.map((s, idx) => (
                    <span key={idx} className="source-tag">
                      {s.source.split(' ')[0]}
                    </span>
                  ))}
                  <span className="source-tag" style={{ color: 'var(--accent-indigo)' }}>
                    Confidence {lead.confidence}
                  </span>
                </div>
              </div>

              {/* Deal Potential Column */}
              <div className="intent-deal-col">
                <span className="deal-val-label">Est. Wealth Mandate</span>
                <span className="deal-val-amount">{lead.estimatedAUM}</span>
                <div className="deal-urgency-tag">
                  <Clock size={12} /> {lead.urgency}
                </div>
              </div>

              {/* Action Column */}
              <div className="intent-action-col" onClick={(e) => e.stopPropagation()}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onOpenDrawer(lead, 'brief')}
                >
                  <Sparkles size={14} /> AI Outreach Brief
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onPromoteLead(lead)}
                >
                  <PlusCircle size={14} /> Add to Pipeline
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
