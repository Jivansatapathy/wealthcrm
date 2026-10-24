import React, { useState } from 'react';
import { Menu, Search, Zap, Bell, Check, Building, AlertCircle } from 'lucide-react';

export default function Header({ currentView, searchQuery, setSearchQuery, onSimulateIntent, onMenu }) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  const notifications = [
    {
      id: 1,
      title: "Commercial Banking Liquidity Inflow",
      detail: "$14.2M wire distribution deposited into corporate reserve (Marcus Vance / ABC Mfg).",
      time: "9m ago",
      type: "alert"
    },
    {
      id: 2,
      title: "M&A Regulatory SEDAR+ Filing",
      detail: "ABC Advanced Mfg closed definitive agreement for $18.5M asset acquisition.",
      time: "24m ago",
      type: "info"
    },
    {
      id: 3,
      title: "Retail Branch Term Deposit Alert",
      detail: "$2.8M GIC maturing Oct 28 without rollover instructions (Priya Nair).",
      time: "1h ago",
      type: "info"
    }
  ];

  const titles = {
    intent_stream: {
      title: "AI Wealth Intent Engine",
      tag: null
    },
    source_intel: {
      title: "Source Intelligence",
      tag: "Per-URL Scrape Results"
    },
    acquisition: {
      title: "Lead Acquisition Console",
      tag: "Permissioned · Consent-Gated · Audited"
    },
    pipeline: {
      title: "Wealth Opportunity Pipeline",
      tag: "Canadian Banking AUM Inflow"
    },
    client360: {
      title: "Client 360° & Household Relationship Map",
      tag: "Multi-Entity Governance"
    },
    referrals: {
      title: "Cross-Division Referral Hub",
      tag: "Commercial · Retail · Mortgage"
    },
    copilot: {
      title: "AI Advisor Copilot Workspace",
      tag: "Powered by Venus Global Technology"
    },
    analytics: {
      title: "Executive Wealth Analytics",
      tag: "OSFI B-13 & CIRO Audit Logs"
    }
  };

  const current = titles[currentView] || titles.intent_stream;

  return (
    <header className="top-navbar">
      <div className="nav-left-group">
        <button type="button" className="btn btn-secondary btn-sm mobile-menu-btn" onClick={onMenu} aria-label="Open menu" aria-controls="appSidebar"><Menu size={18} /></button>
        <h1 className="page-context-title">
          {current.title}
          {current.tag && (
            <span className="compliance-status-tag">
              <span className="pulse-dot"></span> {current.tag}
            </span>
          )}
        </h1>
      </div>

      <div className="nav-right-group">
        {/* Search */}
        <div className="quick-search-box">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search intent leads, companies, or triggers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Notification Bell Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            className="btn btn-secondary btn-sm"
            style={{ width: '38px', height: '38px', padding: 0, position: 'relative' }}
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (unreadCount > 0) setUnreadCount(0);
            }}
            title="Banking Intelligence Alerts"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: 'var(--scotia-red)',
                color: '#FFFFFF',
                fontSize: '0.65rem',
                fontWeight: 800,
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 8px rgba(236,17,26,0.6)'
              }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Popover */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '46px',
              right: '0',
              width: '340px',
              background: '#0D1424',
              border: '1px solid var(--border-medium)',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#FFFFFF' }}>Real-Time Bank Triggers</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)' }}>Live Stream</span>
              </div>
              {notifications.map(n => (
                <div key={n.id} style={{ display: 'flex', gap: '10px', fontSize: '0.78rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.type === 'alert' ? 'var(--accent-gold)' : 'var(--accent-cyan)', marginTop: '5px' }} />
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-light)' }}>{n.title}</div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: '2px', lineHeight: 1.35 }}>{n.detail}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Simulate Live Intent Button */}
        <button
          className="btn btn-simulate"
          onClick={onSimulateIntent}
          title="Simulate a new incoming intent lead"
        >
          <Zap size={16} /> Simulate Live Intent
        </button>
      </div>
    </header>
  );
}
