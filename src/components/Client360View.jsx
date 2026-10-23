import React, { useState } from 'react';
import { WEALTH_DATA } from '../data/wealthData';
import { ShieldCheck, PieChart, Clock, Building2, User, Users, CheckCircle2 } from 'lucide-react';

export default function Client360View() {
  const [selectedClientId, setSelectedClientId] = useState(WEALTH_DATA.clients360[0].id);

  const client = WEALTH_DATA.clients360.find(c => c.id === selectedClientId) || WEALTH_DATA.clients360[0];

  return (
    <div>
      {/* Client Switcher Toolbar */}
      <div className="section-toolbar" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Select Client 360 Profile:</span>
          <div className="filter-pill-group">
            {WEALTH_DATA.clients360.map(c => (
              <button
                key={c.id}
                className={`filter-pill ${c.id === selectedClientId ? 'active' : ''}`}
                onClick={() => setSelectedClientId(c.id)}
              >
                {c.name} ({c.netWorth})
              </button>
            ))}
          </div>
        </div>

        <span className="compliance-status-tag">
          <ShieldCheck size={14} /> CIRO & FINTRAC Ownership Verified
        </span>
      </div>

      <div className="client-360-container">
        {/* Sidebar Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="client-identity-card">
            <div className="large-avatar-ring">
              {client.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: '#FFFFFF' }}>
              {client.name}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {client.household.members[0].role}
            </div>
            <div style={{ marginTop: '8px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              📍 {client.location} · {client.primaryPhone}
            </div>

            <div className="networth-badge-lg">
              <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>
                Total Household Net Worth
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                {client.netWorth}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#34D399', marginTop: '4px' }}>
                Liquid Surplus: {client.liquidAssets}
              </span>
            </div>

            <div style={{ width: '100%', marginTop: '18px', textAlign: 'left', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Lead Advisor:</span>
                <span style={{ color: 'var(--text-light)', fontWeight: 600 }}>{client.assignedAdvisor}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Risk Mandate:</span>
                <span style={{ color: 'var(--text-light)', fontWeight: 600 }}>{client.riskTolerance}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>KYC Verification:</span>
                <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>{client.kycStatus}</span>
              </div>
            </div>
          </div>

          {/* Interaction Timeline */}
          <div className="drawer-section-card">
            <div className="drawer-section-title">
              <Clock size={16} className="text-indigo-400" /> Relationship Interaction Log
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.78rem' }}>
              {client.interactionHistory.map((item, idx) => (
                <div key={idx} style={{ borderLeft: '2px solid var(--accent-indigo)', paddingLeft: '10px' }}>
                  <div style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                    {item.date} · {item.channel}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {item.summary}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Household Entity Map & Proposed Portfolio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Household Graph Card */}
          <div className="household-graph-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                  Household & Corporate Entity Relationship Architecture
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Multi-entity beneficial ownership mapping under Canadian banking compliance standards.
                </div>
              </div>
              <span className="compliance-status-tag">
                <CheckCircle2 size={14} /> Structure Audit Cleared
              </span>
            </div>

            <div className="household-tree-diagram">
              {/* Root Box */}
              <div className="household-root-box">
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Family Household Apex
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {client.household.familyName}
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Jurisdiction: Ontario (Canada) · Scotia Wealth Private Banking Mandate
                </div>
              </div>

              {/* Branches */}
              <div className="tree-branches">
                {client.household.members.map((m, idx) => (
                  <div key={idx} className="tree-node-box">
                    <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {m.relationship}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-light)' }}>
                      {m.name}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {m.role}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', marginTop: '4px' }}>
                      Ownership: {m.ownership}
                    </div>
                  </div>
                ))}
              </div>

              {/* Corporate Entities */}
              <div style={{ width: '100%', borderTop: '1px dashed var(--border-medium)', paddingTop: '20px' }}>
                <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '12px', textAlign: 'center' }}>
                  Holding Companies, Operating Trusts & Authorized Bank Accounts
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px' }}>
                  {client.household.corporateEntities.map((ent, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-light)' }}>
                        {ent.name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--accent-indigo)' }}>
                        {ent.type}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        <strong>Equity:</strong> {ent.equityValue}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', marginTop: '2px' }}>
                        {ent.accounts}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Wealth Allocation Portfolio */}
          <div className="drawer-section-card">
            <div className="drawer-section-title">
              <PieChart size={18} className="text-emerald-400" />
              ScotiaMcLeod Discretionary Wealth Allocation Model
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
              {client.recommendedPortfolioAllocation.map((p, idx) => (
                <div key={idx} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.assetClass}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-gold)', margin: '4px 0' }}>
                    {p.weight}
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-light)', fontWeight: 600 }}>
                    {p.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
