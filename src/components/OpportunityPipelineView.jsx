import React from 'react';
import { ArrowRight, CheckCircle2, Plus } from 'lucide-react';

export default function OpportunityPipelineView({ pipeline, onAdvanceStage, showToast }) {
  const stages = [
    { id: "intent_detected", label: "Intent Detected", color: "indigo" },
    { id: "advisor_qualified", label: "Advisor Qualified", color: "cyan" },
    { id: "discovery_scheduled", label: "Discovery Scheduled", color: "gold" },
    { id: "wealth_plan_presented", label: "Wealth Plan Presented", color: "amber" },
    { id: "kyc_onboarding", label: "KYC & Suitability", color: "emerald" },
    { id: "funded_active", label: "Funded & Active AUM", color: "rose" }
  ];

  return (
    <div>
      {/* Toolbar */}
      <div className="section-toolbar">
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
            Canadian Wealth Acquisition Pipeline: $142.8M Total Value
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Advance opportunities through regulatory stages across ScotiaMcLeod, Private Banking, and MD Financial.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => showToast("Showing all advisor mandates in Toronto Financial District.", "info")}
          >
            Catherine Sinclair's Mandates
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => showToast("Create new opportunity manually or promote directly from the AI Intent Engine.", "info")}
          >
            <Plus size={14} /> Create Wealth Opportunity
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {stages.map(stage => {
          const deals = pipeline.filter(p => p.stage === stage.id);
          const totalAUM = deals.reduce((acc, d) => {
            const num = parseFloat(d.estimatedAUM.replace(/[^0-9.]/g, ''));
            return acc + (isNaN(num) ? 0 : num);
          }, 0);

          return (
            <div key={stage.id} className="kanban-col">
              <div className="kanban-col-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-light)' }}>
                    {stage.label}
                  </span>
                  <span style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '2px 7px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {deals.length}
                  </span>
                </div>
                <span style={{ fontSize: '0.74rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                  ${totalAUM.toFixed(1)}M
                </span>
              </div>

              <div className="kanban-cards-wrap">
                {deals.map(deal => {
                  const isFunded = stage.id === 'funded_active';

                  return (
                    <div key={deal.id} className="kanban-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-indigo)' }}>
                          {deal.id} · {deal.division}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                          {deal.probability} Win
                        </span>
                      </div>

                      <div className="kanban-card-title">{deal.name}</div>
                      <div className="kanban-card-amount">{deal.estimatedAUM} AUM</div>

                      <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        <strong>Next Action:</strong> {deal.nextAction}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        <span>Advisor: {deal.assignedAdvisor.split(' ')[0]}</span>
                        {!isFunded ? (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 7px', fontSize: '0.7rem' }}
                            onClick={() => onAdvanceStage(deal.id)}
                          >
                            Advance <ArrowRight size={12} style={{ display: 'inline' }} />
                          </button>
                        ) : (
                          <span style={{ color: 'var(--accent-emerald)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={12} /> Funded
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
