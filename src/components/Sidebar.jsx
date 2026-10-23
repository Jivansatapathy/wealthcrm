import React from 'react';
import { Zap, BarChart3, Building2, RefreshCw, Bot, TrendingUp, Radar } from 'lucide-react';

export default function Sidebar({ currentView, setCurrentView, intentCount, pendingReferralCount, user }) {
  const navSections = [
    {
      title: "Client Acquisition Engine",
      items: [
        {
          id: "intent_stream",
          label: "AI Intent Engine",
          icon: <Zap size={18} className="text-amber-400" />,
          badge: `${intentCount} Signals`,
          isLive: true
        },
        {
          id: "source_intel",
          label: "Source Intelligence",
          icon: <Radar size={18} />,
          badge: "Scraper"
        },
        {
          id: "pipeline",
          label: "Opportunity Pipeline",
          icon: <BarChart3 size={18} />,
          badge: "$142.8M"
        }
      ]
    },
    {
      title: "Relationship Intelligence",
      items: [
        {
          id: "client360",
          label: "Client 360° & Households",
          icon: <Building2 size={18} />
        },
        {
          id: "referrals",
          label: "Cross-Division Referrals",
          icon: <RefreshCw size={18} />,
          badge: `${pendingReferralCount} Pending`,
          badgeStyle: { background: "rgba(245, 158, 11, 0.2)", color: "#FBBF24" }
        }
      ]
    },
    {
      title: "Advisor Automation",
      items: [
        {
          id: "copilot",
          label: "AI Advisor Copilot",
          icon: <Bot size={18} />
        },
        {
          id: "analytics",
          label: "Executive Analytics",
          icon: <TrendingUp size={18} />
        }
      ]
    }
  ];

  return (
    <aside className="app-sidebar" id="appSidebar">
      {/* Brand Header */}
      <div className="brand-header">
        <div className="brand-logo-badge">VGT</div>
        <div className="brand-text-wrap">
          <div className="brand-title">Wealth Growth</div>
          <div className="brand-subtitle">Bank AI Intelligence</div>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="nav-menu">
        {navSections.map((section, idx) => (
          <div key={idx}>
            <div className="nav-section-title">{section.title}</div>
            {section.items.map(item => (
              <button
                key={item.id}
                className={`nav-item ${currentView === item.id ? 'active' : ''}`}
                onClick={() => setCurrentView(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`nav-badge ${item.isLive ? 'live-glow' : ''}`}
                    style={item.badgeStyle}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Advisor Profile Footer */}
      <div className="sidebar-footer">
        <div className="advisor-pill">
          <div className="advisor-avatar">CS</div>
          <div className="advisor-info">
            <div className="advisor-name">{user.name}</div>
            <div className="advisor-role">{user.title}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
