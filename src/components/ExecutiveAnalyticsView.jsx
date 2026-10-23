import React from 'react';
import { Award, TrendingUp, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function ExecutiveAnalyticsView() {
  const channels = [
    { label: "Commercial Banking Inflows & M&A", value: "$68.2M AUM", percent: 48, color: "var(--accent-gold)" },
    { label: "Corporate Intelligence & Licensed Registries", value: "$39.5M AUM", percent: 28, color: "var(--accent-indigo)" },
    { label: "Retail Branch Maturing Fixed Income", value: "$21.4M AUM", percent: 15, color: "var(--accent-emerald)" },
    { label: "Digital Advice+ Portal & Webinar Registrations", value: "$13.7M AUM", percent: 9, color: "var(--accent-cyan)" }
  ];

  return (
    <div>
      {/* KPI Cards */}
      <div className="kpi-metrics-grid">
        <div className="kpi-card gold">
          <div className="kpi-header"><span className="kpi-label">Quarterly Won AUM</span><Award size={18} className="text-amber-400" /></div>
          <div className="kpi-value">$38.4M</div>
          <div className="kpi-delta"><span className="delta-positive">↑ 114%</span> of Q4 target</div>
        </div>
        <div className="kpi-card indigo">
          <div className="kpi-header"><span className="kpi-label">Active Wealth Pipeline</span><TrendingUp size={18} className="text-indigo-400" /></div>
          <div className="kpi-value">$142.8M</div>
          <div className="kpi-delta"><span className="delta-positive">28 active mandates</span></div>
        </div>
        <div className="kpi-card emerald">
          <div className="kpi-header"><span className="kpi-label">AI Signal Precision</span><CheckCircle2 size={18} className="text-emerald-400" /></div>
          <div className="kpi-value">94.8%</div>
          <div className="kpi-delta"><span className="delta-positive">Zero false-positive flags</span></div>
        </div>
        <div className="kpi-card cyan">
          <div className="kpi-header"><span className="kpi-label">OSFI B-13 & CIRO Audit</span><ShieldCheck size={18} className="text-cyan-400" /></div>
          <div className="kpi-value">100% Compliant</div>
          <div className="kpi-delta"><span className="delta-positive">Complete audit logging</span></div>
        </div>
      </div>

      {/* Attribution & Audit */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="drawer-section-card">
          <div className="drawer-section-title">
            <TrendingUp size={18} className="text-indigo-400" />
            Lead Intent Acquisition Attribution by Bank Channel
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {channels.map((ch, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '5px' }}>
                  <span>{ch.label}</span>
                  <span style={{ fontWeight: 700, color: ch.color }}>{ch.value} ({ch.percent}%)</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ background: ch.color, width: `${ch.percent}%`, height: '100%', borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="drawer-section-card">
          <div className="drawer-section-title">
            <ShieldCheck size={18} className="text-emerald-400" />
            Canadian Banking Regulatory & Governance Audit Trail
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
              <strong style={{ color: '#34D399' }}>OSFI B-13 Security Log:</strong> Multi-factor authentication & role-based data masking active for Catherine Sinclair (Senior VP).
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
              <strong style={{ color: '#34D399' }}>PIPEDA Consent Verification:</strong> All intent signals cross-referenced against client opt-in records and public corporate registries.
            </div>
            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
              <strong style={{ color: '#34D399' }}>CIRO Suitability Guardrail:</strong> AI Copilot operates in advisor-support mode only. Suitability and discretionary approvals reserved exclusively for licensed advisors.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
