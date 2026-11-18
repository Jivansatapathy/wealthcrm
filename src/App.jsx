import React, { useState } from 'react';
import { WEALTH_DATA } from './data/wealthData';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import IntentEngineView from './components/IntentEngineView';
import SourceIntelligenceView from './components/SourceIntelligenceView';
import LeadAcquisitionView from './components/LeadAcquisitionView';
import SalesBrainView from './components/SalesBrainView';
import OpportunityPipelineView from './components/OpportunityPipelineView';
import Client360View from './components/Client360View';
import ReferralHubView from './components/ReferralHubView';
import AdvisorCopilotView from './components/AdvisorCopilotView';
import ExecutiveAnalyticsView from './components/ExecutiveAnalyticsView';
import LeadDetailDrawer from './components/LeadDetailDrawer';
import ToastContainer from './components/ToastContainer';
import LoginView from './components/LoginView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ENABLED_VIEWS } from './views';
import { fetchCanadianMarketIntelligence } from './services/marketDataService';
import { ShieldAlert } from 'lucide-react';

const VIEW_PERMISSIONS = {
  intent_stream: ['admin', 'advisor', 'user'],
  pipeline: ['admin', 'advisor', 'user'],
  client360: ['admin', 'advisor', 'user'],
  source_intel: ['admin', 'advisor'],
  sales_brain: ['admin', 'advisor'],
  referrals: ['admin', 'advisor'],
  copilot: ['admin', 'advisor'],
  acquisition: ['admin'],
  analytics: ['admin']
};

function AccessRestricted({ viewId, userRole }) {
  return (
    <div className="access-denied-container">
      <div className="access-denied-icon-wrap">
        <ShieldAlert size={32} />
      </div>
      <h3>403 — Access Restricted</h3>
      <p>
        The <strong>{viewId.replace('_', ' ').toUpperCase()}</strong> module requires elevated permissions.
        Your current role is <strong>{userRole || 'standard user'}</strong>.
      </p>
      <div className="login-compliance-badge">
        <span>OSFI B-13 Role-Based Security Enforcement Active</span>
      </div>
    </div>
  );
}

function MainAppShell() {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Deep link support, e.g. http://localhost:3000/#source_intel
  const [currentView, setCurrentView] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    return ENABLED_VIEWS.includes(hash) ? hash : 'intent_stream';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [leads, setLeads] = useState([...WEALTH_DATA.intentLeads]);
  const [pipeline, setPipeline] = useState([...WEALTH_DATA.pipelineOpportunities]);
  const [referrals, setReferrals] = useState([...WEALTH_DATA.referrals]);
  const [kpi, setKpi] = useState({ ...WEALTH_DATA.kpiMetrics });
  const [simulatedQueue, setSimulatedQueue] = useState([...WEALTH_DATA.simulatedIncomingLeads]);
  const [isLiveLoading, setIsLiveLoading] = useState(false);

  // Drawer state
  const [drawerLead, setDrawerLead] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('email');

  // Toast state
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const handleOpenDrawer = (lead, defaultTab = 'email') => {
    setDrawerLead(lead);
    setDrawerTab(defaultTab);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  const handlePromoteLead = (lead) => {
    const newOpportunity = {
      id: `OPP-${Date.now()}`,
      clientName: lead.name,
      company: lead.company,
      title: lead.title,
      estimatedAUM: lead.estimatedAUM,
      stage: "Qualified Discovery",
      probability: 75,
      targetDivision: lead.targetDivision,
      primarySignal: lead.primarySignalType,
      leadSource: lead.signals?.[0]?.source || "AI Intent Engine",
      urgency: lead.urgency,
      assignedAdvisor: user?.fullName || WEALTH_DATA.currentUser.name,
      dateAdded: "Today",
      daysInStage: 1,
      householdId: `HH-${Date.now()}`,
      nextStep: "Schedule Discretionary Mandate Discovery Session",
      actionItems: [
        "Review Corporate Class Holding Company structure",
        "Prepare customized ScotiaMcLeod wealth proposition"
      ]
    };

    setPipeline(prev => [newOpportunity, ...prev]);
    setLeads(prev => prev.filter(l => l.id !== lead.id));
    showToast(`Opportunity created for ${lead.name} (${lead.estimatedAUM})`, 'success');
  };

  const handleAdvanceStage = (opportunityId, newStage, newProbability) => {
    setPipeline(prev => prev.map(opp => {
      if (opp.id === opportunityId) {
        return {
          ...opp,
          stage: newStage,
          probability: newProbability,
          daysInStage: 1
        };
      }
      return opp;
    }));
    showToast(`Opportunity advanced to ${newStage}`, 'success');
  };

  const handleAcceptReferral = (referralId) => {
    setReferrals(prev => prev.map(ref => {
      if (ref.id === referralId) {
        return { ...ref, status: "Accepted" };
      }
      return ref;
    }));
    showToast("Referral accepted! Notification dispatched to Commercial Banking RM.", 'success');
  };

  const handleSimulateIntent = () => {
    if (simulatedQueue.length === 0) {
      showToast("All simulated intent signals for today have been consumed.", 'info');
      return;
    }
    const nextLead = simulatedQueue[0];
    setSimulatedQueue(prev => prev.slice(1));
    setLeads(prev => [nextLead, ...prev]);
    showToast(`⚡ High Intent Alert: ${nextLead.name} (${nextLead.estimatedAUM})`, 'warn');
  };

  const handleFetchLiveMarketData = async () => {
    setIsLiveLoading(true);
    try {
      showToast('Connecting to Canadian GlobeNewswire & SEDAR+ live wire feed...', 'info');
      const data = await fetchCanadianMarketIntelligence();
      if (data && data.leads && data.leads.length > 0) {
        setLeads(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          const uniqueNewLeads = data.leads.filter(l => !existingIds.has(l.id));
          return [...uniqueNewLeads, ...prev];
        });
        showToast(`Ingested ${data.leads.length} real-time Canadian market disclosures`, 'success');
      } else {
        showToast('Live wire active. No new unread material disclosures.', 'info');
      }
    } catch (err) {
      showToast(`Market intelligence feed notice: ${err.message}`, 'error');
    } finally {
      setIsLiveLoading(false);
    }
  };

  // 1. Loading splash
  if (isLoading) {
    return (
      <div className="login-screen-wrapper">
        <div style={{ textAlign: 'center', color: '#FFFFFF' }}>
          <div className="login-logo-badge" style={{ marginBottom: 16 }}>
            <span className="login-logo-accent">VGT</span>
            <span className="login-logo-sub">AI</span>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', marginBottom: 8 }}>
            Initializing Banking Security Environment...
          </h3>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Verifying OSFI B-13 session token</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Guard -> Render LoginView
  if (!isAuthenticated) {
    return <LoginView />;
  }

  // 3. Role-Based View Guard
  const userRole = user?.role || 'user';
  const allowedRoles = VIEW_PERMISSIONS[currentView] || ['admin'];
  const isAuthorized = userRole === 'admin' || allowedRoles.includes(userRole);

  const pendingReferralCount = referrals.filter(r => r.status !== 'Accepted').length;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={(v) => { setCurrentView(v); setMenuOpen(false); }}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        intentCount={leads.length}
        pendingReferralCount={pendingReferralCount}
        user={user || WEALTH_DATA.currentUser}
      />

      {/* Main App Area */}
      <main className="app-main">
        {currentView !== 'sales_brain' && (
          <Header
            currentView={currentView}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSimulateIntent={handleSimulateIntent}
            onMenu={() => setMenuOpen(true)}
          />
        )}

        <section className="page-viewport">
          {!isAuthorized ? (
            <AccessRestricted viewId={currentView} userRole={userRole} />
          ) : (
            <>
              {currentView === 'intent_stream' && (
                <IntentEngineView
                  leads={leads}
                  kpi={kpi}
                  searchQuery={searchQuery}
                  onOpenDrawer={handleOpenDrawer}
                  onPromoteLead={handlePromoteLead}
                  onSimulateIntent={handleSimulateIntent}
                  onFetchLiveMarketData={handleFetchLiveMarketData}
                  isLiveLoading={isLiveLoading}
                  onOpenSources={() => setCurrentView('source_intel')}
                />
              )}

              {currentView === 'source_intel' && (
                <SourceIntelligenceView onFetchLiveMarketData={handleFetchLiveMarketData} />
              )}

              {currentView === 'acquisition' && (
                <LeadAcquisitionView onPromoteLead={handlePromoteLead} showToast={showToast} />
              )}

              {currentView === 'sales_brain' && (
                <SalesBrainView showToast={showToast} />
              )}

              {currentView === 'pipeline' && (
                <OpportunityPipelineView
                  pipeline={pipeline}
                  onAdvanceStage={handleAdvanceStage}
                  showToast={showToast}
                />
              )}

              {currentView === 'client360' && (
                <Client360View />
              )}

              {currentView === 'referrals' && (
                <ReferralHubView
                  referrals={referrals}
                  onAcceptReferral={handleAcceptReferral}
                  showToast={showToast}
                />
              )}

              {currentView === 'copilot' && (
                <AdvisorCopilotView
                  showToast={showToast}
                />
              )}

              {currentView === 'analytics' && (
                <ExecutiveAnalyticsView />
              )}
            </>
          )}
        </section>
      </main>

      {/* Slide-over Lead Detail & Copilot Drawer */}
      <LeadDetailDrawer
        lead={drawerLead}
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        initialTab={drawerTab}
        onPromoteLead={handlePromoteLead}
        showToast={showToast}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppShell />
    </AuthProvider>
  );
}
