import React from 'react';
import { Plus, Check, Clock, UserCheck } from 'lucide-react';

export default function ReferralHubView({ referrals, onAcceptReferral, showToast }) {
  return (
    <div>
      <div className="section-toolbar">
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF' }}>
            Cross-Divisional Banking Referral Stream
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Inbound opportunities originating from Commercial Banking, Branch Retail Network, and Mortgages.
          </div>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => showToast("Internal bank referral intake modal ready for Commercial & Retail branch bankers.", "info")}
        >
          <Plus size={14} /> Create Cross-Division Referral
        </button>
      </div>

      <div className="referrals-table-container">
        <table className="referral-table">
          <thead>
            <tr>
              <th>Referral ID & Division</th>
              <th>Referrer Details</th>
              <th>Prospective Wealth Client</th>
              <th>Est. AUM Potential</th>
              <th>SLA Response Clock</th>
              <th>Target Wealth Arm</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map(ref => {
              const isAccepted = ref.status === 'Accepted';

              return (
                <tr key={ref.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--accent-indigo)' }}>{ref.id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ref.referringDivision}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-light)' }}>{ref.referrerName}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{ref.referrerRole}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#FFFFFF' }}>{ref.clientName}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', maxWidth: '280px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {ref.context}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-gold)', fontSize: '1.05rem' }}>
                      {ref.estimatedValue}
                    </span>
                  </td>
                  <td>
                    <span
                      className="compliance-status-tag"
                      style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.4)', color: '#FBBF24' }}
                    >
                      <Clock size={12} /> {ref.slaHoursLeft}h remaining
                    </span>
                  </td>
                  <td>
                    <span className="lead-target-badge">{ref.targetSpecialist}</span>
                  </td>
                  <td>
                    {!isAccepted ? (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onAcceptReferral(ref.id)}
                      >
                        Accept & Route
                      </button>
                    ) : (
                      <button className="btn btn-secondary btn-sm" disabled style={{ opacity: 0.8, color: '#34D399' }}>
                        <Check size={14} /> Accepted ✓
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
