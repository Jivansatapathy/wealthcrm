import React from 'react';
import { ENABLED_VIEWS } from '../views';
import { Zap, BarChart3, Building2, RefreshCw, Bot, TrendingUp, Radar, ShieldCheck, BrainCircuit, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ currentView, setCurrentView, open, onClose, intentCount, pendingReferralCount, user: defaultUser }) {
  const { user: authUser, logout } = useAuth();
  const activeUser = authUser || defaultUser || { fullName: 'Advisor', title: 'Wealth Advisory', role: 'advisor' };

  // Calculate Initials
  const nameToUse = activeUser.fullName || activeUser.name || 'User';
  const initials = nameToUse
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const allSections = [
    {
      title: "Client Acquisition Engine",
      items: [
        {
          id: "intent_stream",
          label: "AI Intent Engine",
          icon: <Zap size={18} className="text-amber-400" />,
          badge: `${intentCount} Signals`,
          isLive: true,
          roles: ['admin', 'advisor', 'user']
        },
        {
          id: "sales_brain",
          label: "AI Sales Brain",
          icon: <BrainCircuit size={18} className="text-purple-400" />,
          badge: "Autonomous",
          isLive: true,
          roles: ['admin', 'advisor']
        },
        {
          id: "source_intel",
          label: "Source Intelligence",
          icon: <Radar size={18} />,
          badge: "Scraper",
          roles: ['admin', 'advisor']
        },
        {
          id: "acquisition",
          label: "Lead Acquisition",
          icon: <ShieldCheck size={18} />,
          badge: "Verified",
          roles: ['admin'] // Restricted to admin
        },
        {
          id: "pipeline",
          label: "Opportunity Pipeline",
          icon: <BarChart3 size={18} />,
          badge: "$142.8M",
          roles: ['admin', 'advisor', 'user']
        }
      ]
    },
    {
      title: "Relationship Intelligence",
      items: [
        {
          id: "client360",
          label: "Client 360° & Households",
          icon: <Building2 size={18} />,
          roles: ['admin', 'advisor', 'user']
        },
        {
          id: "referrals",
          label: "Cross-Division Referrals",
          icon: <RefreshCw size={18} />,
          badge: `${pendingReferralCount} Pending`,
          badgeStyle: { background: "rgba(245, 158, 11, 0.2)", color: "#FBBF24" },
          roles: ['admin', 'advisor']
        }
      ]
    },
    {
      title: "Advisor Automation",
      items: [
        {
          id: "copilot",
          label: "AI Advisor Copilot",
          icon: <Bot size={18} />,
          roles: ['admin', 'advisor']
        },
        {
          id: "analytics",
          label: "Executive Analytics",
          icon: <TrendingUp size={18} />,
          roles: ['admin'] // Restricted to admin
        }
      ]
    }
  ];

  // Filter sections and items based on role
  const userRole = activeUser.role || 'user';
  const navSections = allSections
    .map((s) => ({
      ...s,
      items: s.items
        .filter((i) => ENABLED_VIEWS.includes(i.id))
        .filter((i) => !i.roles || i.roles.includes(userRole) || userRole === 'admin')
    }))
    .filter((s) => s.items.length);

  return (
    <>
    {open && <div className="sidebar-scrim" onClick={onClose} aria-hidden="true" />}
    <aside className={`app-sidebar ${open ? 'open' : ''}`} id="appSidebar">
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

      {/* User Profile & Sign Out Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">{initials}</div>
            <div className="sidebar-user-text">
              <div className="sidebar-user-name" title={nameToUse}>{nameToUse}</div>
              <span className={`sidebar-user-role-badge ${userRole}`}>
                {userRole === 'admin' ? 'Compliance Admin' : userRole === 'advisor' ? 'Wealth Advisor' : 'Standard User'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={logout}
            title="Sign Out of Session"
          >
            <LogOut size={13} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
