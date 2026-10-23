import React from 'react';
import { DollarSign, Zap, Target, ArrowUpRight, ShieldCheck } from 'lucide-react';

export default function KPICards({ kpi }) {
  return (
    <div className="kpi-metrics-grid">
      <div className="kpi-card gold">
        <div className="kpi-header">
          <span className="kpi-label">Active Wealth Pipeline AUM</span>
          <DollarSign size={18} className="text-amber-400" />
        </div>
        <div className="kpi-value">{kpi.totalPipelineAUM}</div>
        <div className="kpi-delta">
          <span className="delta-positive">↑ +24.8%</span> vs last month
        </div>
      </div>

      <div className="kpi-card indigo">
        <div className="kpi-header">
          <span className="kpi-label">High-Value Intent Signals</span>
          <Zap size={18} className="text-indigo-400" />
        </div>
        <div className="kpi-value">{kpi.intentLeadsDetectedThisMonth} Detected</div>
        <div className="kpi-delta">
          <span className="delta-positive">{kpi.avgIntentScore} Avg Score</span> · 98% Confidence
        </div>
      </div>

      <div className="kpi-card emerald">
        <div className="kpi-header">
          <span className="kpi-label">Intent &rarr; Meeting Conversion</span>
          <Target size={18} className="text-emerald-400" />
        </div>
        <div className="kpi-value">{kpi.conversionToMeetingRate}</div>
        <div className="kpi-delta">
          <span className="delta-positive">{kpi.timeToFirstOutreach}</span> avg time to outreach
        </div>
      </div>

      <div className="kpi-card cyan">
        <div className="kpi-header">
          <span className="kpi-label">Cross-Division Inbound Referrals</span>
          <ShieldCheck size={18} className="text-cyan-400" />
        </div>
        <div className="kpi-value">{kpi.crossDivisionReferrals} Active</div>
        <div className="kpi-delta">
          <span className="delta-positive">{kpi.osfiComplianceStatus}</span>
        </div>
      </div>
    </div>
  );
}
