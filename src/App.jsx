import React, { useState } from 'react';
import { WEALTH_DATA } from './data/wealthData';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import IntentEngineView from './components/IntentEngineView';
import SourceIntelligenceView from './components/SourceIntelligenceView';
import OpportunityPipelineView from './components/OpportunityPipelineView';
import Client360View from './components/Client360View';
import ReferralHubView from './components/ReferralHubView';
import AdvisorCopilotView from './components/AdvisorCopilotView';
import ExecutiveAnalyticsView from './components/ExecutiveAnalyticsView';
import LeadDetailDrawer from './components/LeadDetailDrawer';
import ToastContainer from './components/ToastContainer';
import { fetchCanadianMarketIntelligence } from './services/marketDataService';

export default function App() {
  // Deep link support, e.g. http://localhost:3000/#source_intel
  const [currentView, setCurrentView] = useState(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    return ['intent_stream', 'source_intel', 'pipeline', 'client360', 'referrals', 'copilot', 'analytics'].includes(hash) ? hash : 'intent_stream';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [leads, setLeads] = useState([...WEALTH_DATA.intentLeads]);
  const [pipeline, setPipeline] = useState([...WEALTH_DATA.pipelineOpportunities]);
  const [referrals, setReferrals] = useState([...WEALTH_DATA.referrals]);
  const [kpi, setKpi] = useState({ ...WEALTH_DATA.kpiMetrics });
  const [simulatedQueue, setSimulatedQueue] = useState([...WEALTH_DATA.simulatedIncomingLeads]);

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

  // Open Lead Drawer
  const handleOpenDrawer = (lead, defaultTab = 'email') => {
    setDrawerLead(lead);
    setDrawerTab(defaultTab);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  // Promote Lead to Pipeline
  const handlePromoteLead = (lead) => {
    const existing = pipeline.find(p => p.leadId === lead.id);
    if (existing) {
      showToast(`${lead.name} is already in the Wealth Opportunity Pipeline.`, 'info');
      return;
    }

    const newOpp = {
      id: `OPP-${Math.floor(300 + Math.random() * 699)}`,
      name: `${lead.name} - ${lead.targetDivision} Mandate`,
      leadId: lead.id,
      clientName: lead.name,
      company: lead.company,
      stage: "advisor_qualified",
      stageLabel: "Advisor Qualified",
      estimatedAUM: lead.estimatedAUM,
      probability: "50%",
      expectedRevenue: `$${Math.round(parseInt(lead.estimatedAUM.replace(/[^0-9]/g, '')) * 0.009 * 1000).toLocaleString()}/yr`,
      assignedAdvisor: WEALTH_DATA.currentUser.name,
      division: lead.targetDivision,
      nextAction: "Deliver AI customized corporate wealth briefing",
      targetCloseDate: "Nov 30, 2026",
      notes: `Promoted from AI Intent Engine (${lead.intentScore}/100 score). Trigger: ${lead.primarySignalType}`
    };

    setPipeline(prev => [newOpp, ...prev]);
    showToast(`🎉 ${lead.name} promoted to Wealth Opportunity Pipeline!`, 'success');
  };

  // Advance Pipeline Stage
  const handleAdvanceStage = (dealId) => {
    const stageOrder = [
      "intent_detected",
      "advisor_qualified",
      "discovery_scheduled",
      "wealth_plan_presented",
      "kyc_onboarding",
      "funded_active"
    ];

    setPipeline(prev => prev.map(deal => {
      if (deal.id === dealId) {
        const idx = stageOrder.indexOf(deal.stage);
        if (idx >= 0 && idx < stageOrder.length - 1) {
          const nextStage = stageOrder[idx + 1];
          showToast(`Mandate "${deal.name}" advanced to next stage!`, 'success');
          return { ...deal, stage: nextStage };
        }
      }
      return deal;
    }));
  };

  // Accept Cross-Division Referral
  const handleAcceptReferral = (refId) => {
    setReferrals(prev => prev.map(r => {
      if (r.id === refId) {
        showToast(`Referral ${refId} accepted! Internal attribution recorded for Commercial RM.`, 'success');
        return { ...r, status: 'Accepted' };
      }
      return r;
    }));
  };

  // Simulate Live Intent Influx
  const handleSimulateIntent = () => {
    if (simulatedQueue.length === 0) {
      showToast("All simulated intent scenarios have already been triggered.", "info");
      return;
    }

    const nextLead = simulatedQueue[0];
    setSimulatedQueue(prev => prev.slice(1));

    const enrichedLead = { ...nextLead, isNewSimulation: true };
    setLeads(prev => [enrichedLead, ...prev]);

    setKpi(prev => ({
      ...prev,
      intentLeadsDetectedThisMonth: prev.intentLeadsDetectedThisMonth + 1,
      totalPipelineAUM: "$151.7M"
    }));

    showToast(`⚡ High Intent Trigger Detected: ${enrichedLead.name} (${enrichedLead.estimatedAUM} AUM Potential - ${enrichedLead.primarySignalType})`, "alert");

    // Automatically open drawer if in intent stream for high-impact demo
    if (currentView === 'intent_stream') {
      setTimeout(() => {
        handleOpenDrawer(enrichedLead, 'brief');
      }, 400);
    }
  };

  // Live Canadian Market Data Ingestion
  const [isLiveLoading, setIsLiveLoading] = useState(false);

  const handleFetchLiveMarketData = async () => {
    setIsLiveLoading(true);
    showToast("Connecting to live Canadian Corporate Press Wire & Market Data feeds...", "info");
    try {
      const data = await fetchCanadianMarketIntelligence();
      if (data.leads?.length > 0) {
        setLeads(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          const newLeads = data.leads.filter(l => !existingIds.has(l.id));
          return [...newLeads, ...prev];
        });
        showToast(`⚡ Ingested ${data.leads.length} real Canadian corporate filings & signals from ${data.source || 'live feeds'}!`, "success");
      } else {
        showToast("Live feed active. No new filings detected at this second.", "info");
      }
    } catch (err) {
      showToast("Live feed request: " + err.message, "info");
    } finally {
      setIsLiveLoading(false);
    }
  };

  const pendingReferralCount = referrals.filter(r => r.status !== 'Accepted').length;

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        intentCount={leads.length}
        pendingReferralCount={pendingReferralCount}
        user={WEALTH_DATA.currentUser}
      />

      {/* Main App Area */}
      <main className="app-main">
        <Header
          currentView={currentView}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSimulateIntent={handleSimulateIntent}
        />

        <section className="page-viewport">
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
