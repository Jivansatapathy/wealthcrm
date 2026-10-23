import React, { useState, useEffect } from 'react';
import { WEALTH_DATA } from '../data/wealthData';
import { X, Copy, Zap, Brain, Building2, Bot, PlusCircle, Check, ShieldCheck, Clock, UserCheck } from 'lucide-react';

export default function LeadDetailDrawer({
  lead,
  isOpen,
  onClose,
  initialTab = 'email',
  onPromoteLead,
  showToast
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [copied, setCopied] = useState(false);
  const [targetDivision, setTargetDivision] = useState(lead?.targetDivision || 'ScotiaMcLeod & Scotiatrust');

  useEffect(() => {
    if (lead) {
      setTargetDivision(lead.targetDivision);
      setActiveTab(initialTab);
    }
  }, [lead, initialTab]);

  if (!isOpen || !lead) return null;

  const emailContent = WEALTH_DATA.copilotTemplates.outreachEmail(lead);
  const phoneContent = WEALTH_DATA.copilotTemplates.phoneScript(lead);
  const briefContent = WEALTH_DATA.copilotTemplates.meetingBrief(lead);

  const getCurrentContent = () => {
    if (activeTab === 'email') return emailContent;
    if (activeTab === 'phone') return phoneContent;
    return briefContent;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentContent());
    setCopied(true);
    showToast("AI Outreach script copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePromote = () => {
    const updatedLead = { ...lead, targetDivision };
    onPromoteLead(updatedLead);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose} />

      {/* Slide-over Drawer */}
      <aside className="detail-drawer" aria-label="Lead Details Drawer">
        {/* Header */}
        <div className="drawer-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '0.05em' }}>
                AI Wealth Acquisition Candidate
              </span>
              <span className="compliance-status-tag" style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                <Clock size={11} /> {lead.urgency}
              </span>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
              {lead.name}
            </h2>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {lead.title} · {lead.company} ({lead.location})
            </div>
            {lead.externalUrl && (
              <a
                href={lead.externalUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.74rem',
                  color: 'var(--accent-cyan)',
                  marginTop: '5px',
                  textDecoration: 'underline'
                }}
              >
                View Live Press Release / Regulatory Filing ↗
              </a>
            )}
          </div>
          <button className="drawer-close-btn" onClick={onClose} aria-label="Close Drawer">
            <X size={18} />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="drawer-content">
          {/* Section 1: Intent Radar Breakdown */}
          <div className="drawer-section-card" style={{ borderLeft: '4px solid var(--accent-gold)' }}>
            <div className="drawer-section-title">
              <Zap size={18} className="text-amber-400" />
              AI Intent Radar & Detection Signals (Score: {lead.intentScore}/100)
            </div>
            <div>
              {lead.signals.map((s, idx) => (
                <div key={idx} className="signal-item">
                  <div className="signal-weight-badge">+{s.weight} pts</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--text-light)' }}>
                      {s.type} · <span style={{ color: 'var(--accent-cyan)', fontSize: '0.76rem' }}>{s.source}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {s.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: AI Strategic Wealth Opportunity Rationale */}
          <div className="drawer-section-card">
            <div className="drawer-section-title">
              <Brain size={18} className="text-indigo-400" />
              AI Strategic Wealth Opportunity Rationale
            </div>
            <p style={{ fontSize: '0.84rem', color: '#E2E8F0', lineHeight: 1.6, marginBottom: '12px' }}>
              {lead.aiAnalysis.rationale}
            </p>
            <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '8px', padding: '12px', fontSize: '0.8rem' }}>
              <strong style={{ color: 'var(--accent-indigo)' }}>Recommended Strategy:</strong> {lead.aiAnalysis.recommendedStrategy}
            </div>
            <div style={{ marginTop: '10px', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} className="text-emerald-400" />
              {lead.aiAnalysis.complianceNotice}
            </div>
          </div>

          {/* Section 3: Household & Entity Snapshot */}
          <div className="drawer-section-card">
            <div className="drawer-section-title">
              <Building2 size={18} className="text-cyan-400" />
              Household & Entity Intelligence
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Spouse / Partner</div>
                <div style={{ color: 'var(--text-light)', fontWeight: 600 }}>{lead.householdPreview.spouse}</div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase' }}>Jurisdiction</div>
                <div style={{ color: 'var(--text-light)', fontWeight: 600 }}>{lead.householdPreview.jurisdiction}</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '6px' }}>Known Associated Corporate Entities</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {lead.householdPreview.entities.map((e, idx) => (
                    <span key={idx} style={{ background: 'rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid var(--border-subtle)' }}>
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Target Wealth Division Routing Selector */}
          <div className="drawer-section-card" style={{ border: '1px solid var(--border-medium)' }}>
            <div className="drawer-section-title">
              <UserCheck size={18} className="text-emerald-400" />
              Specialist Routing & Mandate Allocation
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Assign prospective opportunity to the appropriate banking division before promoting to CRM pipeline:
            </div>
            <select
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                color: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '9px 12px',
                fontSize: '0.84rem',
                outline: 'none',
                cursor: 'pointer'
              }}
              value={targetDivision}
              onChange={(e) => setTargetDivision(e.target.value)}
            >
              <option value="ScotiaMcLeod & Scotiatrust">ScotiaMcLeod & Scotiatrust (Discretionary Portfolio & Tax Freeze)</option>
              <option value="Private Banking & Scotia Wealth Family Office">Private Banking & Family Office (Bespoke Credit & Cash Sweep)</option>
              <option value="MD Financial Management">MD Financial Management (Physician Specialized Wealth)</option>
              <option value="Scotiatrust & Private Banking">Scotiatrust (Estate, Family Trust & Succession)</option>
              <option value="ScotiaMcLeod">ScotiaMcLeod (High-Quality Dividend Mandate)</option>
            </select>
          </div>

          {/* Section 5: AI Copilot Generator Box */}
          <div className="drawer-section-card" style={{ border: '1px solid rgba(99, 102, 241, 0.35)' }}>
            <div className="drawer-section-title" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Bot size={18} className="text-indigo-400" /> AI Outreach & Advisory Copilot
              </span>
              <button className="btn btn-secondary btn-sm" onClick={handleCopy}>
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy Text"}
              </button>
            </div>

            <div className="outreach-tabs">
              <button
                className={`outreach-tab-btn ${activeTab === 'email' ? 'active' : ''}`}
                onClick={() => setActiveTab('email')}
              >
                Personalized Outreach Email
              </button>
              <button
                className={`outreach-tab-btn ${activeTab === 'phone' ? 'active' : ''}`}
                onClick={() => setActiveTab('phone')}
              >
                Commercial RM Intro Call Script
              </button>
              <button
                className={`outreach-tab-btn ${activeTab === 'brief' ? 'active' : ''}`}
                onClick={() => setActiveTab('brief')}
              >
                Advisor Pre-Meeting Briefing
              </button>
            </div>

            <div className="outreach-preview-box">
              {getCurrentContent()}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="drawer-actions-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button
            className="btn btn-primary"
            onClick={handlePromote}
          >
            <PlusCircle size={16} /> Promote to Opportunity Pipeline ({lead.estimatedAUM})
          </button>
        </div>
      </aside>
    </>
  );
}
