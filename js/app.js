// VGT Wealth AI CRM - Prototype Application Logic
// Flagship Focus: AI Wealth Intent Engine & Client Acquisition for Canadian Banks

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    currentView: 'intent_stream',
    activeFilter: 'all',
    searchQuery: '',
    selectedLead: null,
    leads: [...WEALTH_DATA.intentLeads],
    pipeline: [...WEALTH_DATA.pipelineOpportunities],
    referrals: [...WEALTH_DATA.referrals],
    kpi: { ...WEALTH_DATA.kpiMetrics },
    simulatedCount: 0
  };

  // DOM Elements
  const mainContent = document.getElementById('mainContentArea');
  const viewTitle = document.getElementById('pageContextTitle');
  const quickSearchInput = document.getElementById('quickSearchInput');
  const btnSimulateIntent = document.getElementById('btnSimulateIntent');
  const leadDrawer = document.getElementById('leadDetailDrawer');
  const drawerBackdrop = document.getElementById('drawerBackdrop');
  const drawerCloseBtn = document.getElementById('drawerCloseBtn');
  const navItems = document.querySelectorAll('.nav-item[data-view]');
  const toastContainer = document.getElementById('toastContainer');

  // Initialize App
  init();

  function init() {
    setupNavigation();
    setupSearch();
    setupSimulateButton();
    setupDrawerHandlers();
    renderCurrentView();
  }

  // Navigation Logic
  function setupNavigation() {
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.getAttribute('data-view');
        if (targetView && targetView !== state.currentView) {
          navItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          state.currentView = targetView;
          renderCurrentView();
        }
      });
    });
  }

  // Search Logic
  function setupSearch() {
    if (quickSearchInput) {
      quickSearchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        if (state.currentView === 'intent_stream') {
          renderIntentStreamView();
        } else if (state.currentView === 'pipeline') {
          renderPipelineView();
        }
      });
    }
  }

  // Simulate Live Inbound Intent Lead Trigger
  function setupSimulateButton() {
    if (btnSimulateIntent) {
      btnSimulateIntent.addEventListener('click', () => {
        simulateNewIntentLead();
      });
    }
  }

  function simulateNewIntentLead() {
    if (WEALTH_DATA.simulatedIncomingLeads.length === 0) {
      showToast("All simulated intent scenarios have already been triggered.", "info");
      return;
    }

    const newLead = WEALTH_DATA.simulatedIncomingLeads.shift();
    newLead.isNewSimulation = true;
    state.leads.unshift(newLead);

    // Update KPI
    state.kpi.intentLeadsDetectedThisMonth += 1;
    state.kpi.totalPipelineAUM = "$151.7M";
    state.simulatedCount++;

    // Update UI Badge
    const intentBadge = document.getElementById('intentCountBadge');
    if (intentBadge) {
      intentBadge.innerText = `${state.leads.length} Signals`;
    }

    showToast(`⚡ High Intent Trigger Detected: ${newLead.name} ($8.9M AUM Potential - ${newLead.primarySignalType})`, "alert");

    // If on intent stream, refresh with animation
    if (state.currentView === 'intent_stream') {
      renderIntentStreamView();
      // Auto open detail drawer after 300ms for high-impact demo
      setTimeout(() => {
        openLeadDrawer(newLead.id);
      }, 400);
    }
  }

  // View Router
  function renderCurrentView() {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    switch (state.currentView) {
      case 'intent_stream':
        viewTitle.innerHTML = `AI Wealth Intent Engine`;
        renderIntentStreamView();
        break;

      case 'pipeline':
        viewTitle.innerHTML = `Wealth Opportunity Pipeline <span class="compliance-status-tag"><span class="pulse-dot"></span> Canadian Banking AUM Inflow</span>`;
        renderPipelineView();
        break;

      case 'client360':
        viewTitle.innerHTML = `Client 360° & Household Relationship Map <span class="compliance-status-tag"><span class="pulse-dot"></span> Multi-Entity Governance</span>`;
        renderClient360View();
        break;

      case 'referrals':
        viewTitle.innerHTML = `Cross-Division Referral Hub <span class="compliance-status-tag"><span class="pulse-dot"></span> Commercial · Retail · Mortgage</span>`;
        renderReferralsView();
        break;

      case 'copilot':
        viewTitle.innerHTML = `AI Advisor Copilot Workspace <span class="compliance-status-tag"><span class="pulse-dot"></span> Powered by Venus Global Technology</span>`;
        renderCopilotView();
        break;

      case 'analytics':
        viewTitle.innerHTML = `Executive Wealth Management Analytics <span class="compliance-status-tag"><span class="pulse-dot"></span> OSFI B-13 & CIRO Audit Logs</span>`;
        renderAnalyticsView();
        break;

      default:
        renderIntentStreamView();
    }
  }

  // -------------------------------------------------------------
  // MODULE 1: AI WEALTH INTENT ENGINE (THE CORE FEATURE)
  // -------------------------------------------------------------
  function renderIntentStreamView() {
    let filteredLeads = state.leads.filter(lead => {
      // Filter tab
      if (state.activeFilter === 'liquidity' && !lead.primarySignalType.toLowerCase().includes('liquidity') && !lead.primarySignalType.toLowerCase().includes('sale')) return false;
      if (state.activeFilter === 'commercial' && !lead.signals.some(s => s.source.toLowerCase().includes('commercial'))) return false;
      if (state.activeFilter === 'urgent' && !lead.urgency.toLowerCase().includes('immediate') && !lead.urgency.toLowerCase().includes('critical')) return false;
      if (state.activeFilter === 'mdfinancial' && lead.targetDivision !== 'MD Financial Management') return false;

      // Search box
      if (state.searchQuery) {
        const q = state.searchQuery;
        const matchesName = lead.name.toLowerCase().includes(q);
        const matchesCompany = lead.company.toLowerCase().includes(q);
        const matchesSignal = lead.primarySignalType.toLowerCase().includes(q);
        const matchesDiv = lead.targetDivision.toLowerCase().includes(q);
        if (!matchesName && !matchesCompany && !matchesSignal && !matchesDiv) return false;
      }
      return true;
    });

    const html = `
      <!-- Global Top Metrics -->
      <div class="kpi-metrics-grid">
        <div class="kpi-card gold">
          <div class="kpi-header">
            <span class="kpi-label">Active Wealth Pipeline AUM</span>
            <span class="kpi-icon">💰</span>
          </div>
          <div class="kpi-value">${state.kpi.totalPipelineAUM}</div>
          <div class="kpi-delta"><span class="delta-positive">↑ +24.8%</span> vs last month</div>
        </div>

        <div class="kpi-card indigo">
          <div class="kpi-header">
            <span class="kpi-label">High-Value Intent Signals</span>
            <span class="kpi-icon">⚡</span>
          </div>
          <div class="kpi-value">${state.kpi.intentLeadsDetectedThisMonth} Detected</div>
          <div class="kpi-delta"><span class="delta-positive">91.4 Avg Score</span> · 98% Confidence</div>
        </div>

        <div class="kpi-card emerald">
          <div class="kpi-header">
            <span class="kpi-label">Intent &rarr; Meeting Conversion</span>
            <span class="kpi-icon">🎯</span>
          </div>
          <div class="kpi-value">${state.kpi.conversionToMeetingRate}</div>
          <div class="kpi-delta"><span class="delta-positive">2.4h</span> avg time to outreach</div>
        </div>

        <div class="kpi-card cyan">
          <div class="kpi-header">
            <span class="kpi-label">Cross-Division Inbound Referrals</span>
            <span class="kpi-icon">🔄</span>
          </div>
          <div class="kpi-value">${state.kpi.crossDivisionReferrals} Active</div>
          <div class="kpi-delta"><span class="delta-positive">100% OSFI B-13</span> Audit Cleared</div>
        </div>
      </div>

      <!-- Live Scanner Banner -->
      <div class="intent-stream-header">
        <div class="intent-headline-wrap">
          <div class="scanner-radar-ring">
            <span>📡</span>
          </div>
          <div>
            <div class="intent-stream-title">AI Intent Engine — Live Bank & Corporate Intelligence Feed</div>
            <div class="intent-stream-subtitle">
              Monitoring Canadian Corporate Registries, SEDAR+ M&A Filings, Commercial Banking Treasury Triggers, and Maturing Fixed-Income Pools.
            </div>
          </div>
        </div>
        <div class="intent-stream-actions">
          <button class="btn btn-simulate" id="btnTriggerNewSignal" title="Simulate a new incoming intent lead">
            <span>⚡</span> Simulate Live Intent Influx
          </button>
        </div>
      </div>

      <!-- Filters Toolbar -->
      <div class="section-toolbar">
        <div class="filter-pill-group">
          <button class="filter-pill ${state.activeFilter === 'all' ? 'active' : ''}" data-filter="all">All Intent Signals (${state.leads.length})</button>
          <button class="filter-pill ${state.activeFilter === 'liquidity' ? 'active' : ''}" data-filter="liquidity">M&A / Corporate Liquidity</button>
          <button class="filter-pill ${state.activeFilter === 'commercial' ? 'active' : ''}" data-filter="commercial">Commercial Banking Triggers</button>
          <button class="filter-pill ${state.activeFilter === 'urgent' ? 'active' : ''}" data-filter="urgent">Critical Urgency (&lt;10 Days)</button>
          <button class="filter-pill ${state.activeFilter === 'mdfinancial' ? 'active' : ''}" data-filter="mdfinancial">MD Financial (Physicians)</button>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted);">
          Displaying <strong>${filteredLeads.length}</strong> qualified acquisition opportunities
        </div>
      </div>

      <!-- Intent Cards Grid -->
      <div class="intent-cards-container">
        ${filteredLeads.map(lead => renderIntentLeadCard(lead)).join('')}
      </div>
    `;

    mainContent.innerHTML = html;

    // Attach local button listeners
    const triggerBtn = document.getElementById('btnTriggerNewSignal');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', simulateNewIntentLead);
    }

    // Attach filter listeners
    const filterPills = mainContent.querySelectorAll('.filter-pill');
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        state.activeFilter = pill.getAttribute('data-filter');
        renderIntentStreamView();
      });
    });

    // Attach card click listeners to open detail drawer
    const cards = mainContent.querySelectorAll('.intent-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        // Prevent opening if clicked a direct action button
        if (e.target.closest('.btn-card-action')) return;
        const leadId = card.getAttribute('data-lead-id');
        openLeadDrawer(leadId);
      });
    });

    // Attach direct action buttons
    const prepButtons = mainContent.querySelectorAll('.btn-prep-brief');
    prepButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const leadId = btn.getAttribute('data-lead-id');
        openLeadDrawer(leadId, 'brief');
      });
    });

    const routeButtons = mainContent.querySelectorAll('.btn-route-pipeline');
    routeButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const leadId = btn.getAttribute('data-lead-id');
        promoteLeadToPipeline(leadId);
      });
    });
  }

  function renderIntentLeadCard(lead) {
    const isUltra = lead.intentScore >= 95;
    const isNew = lead.isNewSimulation;

    return `
      <div class="intent-card ${isNew ? 'new-inflow' : ''}" data-lead-id="${lead.id}">
        <!-- Score Column -->
        <div class="intent-score-col">
          <div class="intent-score-radial ${isUltra ? 'score-ultra' : 'score-high'}">
            <span class="score-num">${lead.intentScore}</span>
            <span class="score-suffix">/100</span>
          </div>
          <span class="score-label">Intent Score</span>
        </div>

        <!-- Bio Column -->
        <div class="lead-bio-col">
          <div class="lead-header-row">
            <span class="lead-name">${lead.name}</span>
            <span class="lead-target-badge">${lead.targetDivision}</span>
          </div>
          <div class="lead-company">${lead.title} · ${lead.company}</div>
          <div class="lead-meta">
            <span>📍 ${lead.location}</span>
            <span>🕒 ${lead.dateDetected}</span>
          </div>
        </div>

        <!-- Signal & Rationale Column -->
        <div class="intent-signal-col">
          <div class="signal-trigger-pill">
            <span>⚡</span> ${lead.primarySignalType}
          </div>
          <div class="signal-brief-text">${lead.aiAnalysis.headline}</div>
          <div class="signal-source-tags">
            ${lead.signals.map(s => `<span class="source-tag">${s.source.split(' ')[0]}</span>`).join('')}
            <span class="source-tag" style="color: var(--accent-indigo);">Confidence ${lead.confidence}</span>
          </div>
        </div>

        <!-- Deal Value Column -->
        <div class="intent-deal-col">
          <span class="deal-val-label">Est. Wealth Mandate</span>
          <span class="deal-val-amount">${lead.estimatedAUM}</span>
          <div class="deal-urgency-tag">
            <span>⏳</span> ${lead.urgency}
          </div>
        </div>

        <!-- Action Column -->
        <div class="intent-action-col">
          <button class="btn btn-primary btn-sm btn-card-action btn-prep-brief" data-lead-id="${lead.id}">
            <span>✨</span> AI Outreach Brief
          </button>
          <button class="btn btn-secondary btn-sm btn-card-action btn-route-pipeline" data-lead-id="${lead.id}">
            <span>📌</span> Add to Pipeline
          </button>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // LEAD DETAIL DRAWER & AI COPILOT GENERATOR
  // -------------------------------------------------------------
  function setupDrawerHandlers() {
    if (drawerCloseBtn) {
      drawerCloseBtn.addEventListener('click', closeLeadDrawer);
    }
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', closeLeadDrawer);
    }
  }

  function openLeadDrawer(leadId, defaultTab = 'email') {
    const lead = state.leads.find(l => l.id === leadId);
    if (!lead) return;

    state.selectedLead = lead;

    // Render Drawer Content
    renderDrawerDetails(lead, defaultTab);

    drawerBackdrop.classList.add('active');
    leadDrawer.classList.add('active');
  }

  function closeLeadDrawer() {
    drawerBackdrop.classList.remove('active');
    leadDrawer.classList.remove('active');
  }

  function renderDrawerDetails(lead, activeTab = 'email') {
    const emailContent = WEALTH_DATA.copilotTemplates.outreachEmail(lead);
    const phoneContent = WEALTH_DATA.copilotTemplates.phoneScript(lead);
    const briefContent = WEALTH_DATA.copilotTemplates.meetingBrief(lead);

    document.getElementById('drawerLeadName').innerText = lead.name;
    document.getElementById('drawerLeadCompany').innerText = `${lead.title} · ${lead.company} (${lead.location})`;

    const drawerBody = document.getElementById('drawerBodyContent');
    drawerBody.innerHTML = `
      <!-- Intent Radar Summary Card -->
      <div class="drawer-section-card" style="border-left: 4px solid var(--accent-gold);">
        <div class="drawer-section-title">
          <span>⚡</span> AI Intent Radar & Detection Signals (Score: ${lead.intentScore}/100)
        </div>
        <div class="signal-breakdown-list">
          ${lead.signals.map(s => `
            <div class="signal-item">
              <div class="signal-weight-badge">+${s.weight} pts</div>
              <div>
                <div style="font-weight: 600; font-size: 0.84rem; color: var(--text-light);">${s.type} · <span style="color: var(--accent-cyan); font-size: 0.76rem;">${s.source}</span></div>
                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">${s.detail}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Strategic Opportunity & Canadian Banking Governance -->
      <div class="drawer-section-card">
        <div class="drawer-section-title">
          <span>🧠</span> AI Strategic Wealth Opportunity Rationale
        </div>
        <p style="font-size: 0.84rem; color: #E2E8F0; line-height: 1.6; margin-bottom: 12px;">
          ${lead.aiAnalysis.rationale}
        </p>
        <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: 8px; padding: 12px; font-size: 0.8rem;">
          <strong style="color: var(--accent-indigo);">Recommended Mandate:</strong> ${lead.aiAnalysis.recommendedStrategy}
        </div>
        <div style="margin-top: 10px; font-size: 0.72rem; color: var(--text-muted); display: flex; align-items: center; gap: 6px;">
          <span>🛡️</span> ${lead.aiAnalysis.complianceNotice}
        </div>
      </div>

      <!-- Household & Corporate Structure Snapshot -->
      <div class="drawer-section-card">
        <div class="drawer-section-title">
          <span>🏛️</span> Household & Entity Intelligence
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 0.82rem;">
          <div>
            <div style="color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase;">Spouse / Partner</div>
            <div style="color: var(--text-light); font-weight: 600;">${lead.householdPreview.spouse}</div>
          </div>
          <div>
            <div style="color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase;">Jurisdiction</div>
            <div style="color: var(--text-light); font-weight: 600;">${lead.householdPreview.jurisdiction}</div>
          </div>
          <div style="grid-column: span 2;">
            <div style="color: var(--text-muted); font-size: 0.72rem; text-transform: uppercase; margin-bottom: 4px;">Known Associated Corporate Entities</div>
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
              ${lead.householdPreview.entities.map(e => `<span style="background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem;">${e}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- AI Copilot Generator Tabbed Box -->
      <div class="drawer-section-card" style="border: 1px solid rgba(99, 102, 241, 0.35);">
        <div class="drawer-section-title" style="justify-content: space-between;">
          <span>🤖 AI Outreach & Advisory Copilot</span>
          <button class="btn btn-secondary btn-sm" id="btnCopyOutreachText">
            <span>📋</span> Copy to Clipboard
          </button>
        </div>

        <div class="outreach-tabs">
          <button class="outreach-tab-btn ${activeTab === 'email' ? 'active' : ''}" data-tab="email">Personalized Outreach Email</button>
          <button class="outreach-tab-btn ${activeTab === 'phone' ? 'active' : ''}" data-tab="phone">Commercial RM Intro Call Script</button>
          <button class="outreach-tab-btn ${activeTab === 'brief' ? 'active' : ''}" data-tab="brief">Advisor Pre-Meeting Briefing</button>
        </div>

        <div class="outreach-preview-box" id="outreachContentBox">
          ${activeTab === 'email' ? emailContent : activeTab === 'phone' ? phoneContent : briefContent}
        </div>
      </div>
    `;

    // Tab buttons handling inside drawer
    const tabButtons = drawerBody.querySelectorAll('.outreach-tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const box = document.getElementById('outreachContentBox');
        if (tab === 'email') box.innerText = emailContent;
        if (tab === 'phone') box.innerText = phoneContent;
        if (tab === 'brief') box.innerText = briefContent;
      });
    });

    // Copy to clipboard
    const copyBtn = document.getElementById('btnCopyOutreachText');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const text = document.getElementById('outreachContentBox').innerText;
        navigator.clipboard.writeText(text).then(() => {
          showToast("AI Outreach script copied to clipboard!", "success");
        }).catch(() => {
          showToast("Script ready for use.", "info");
        });
      });
    }

    // Drawer Footer Action
    const drawerFooter = document.getElementById('drawerFooterActions');
    drawerFooter.innerHTML = `
      <button class="btn btn-secondary" onclick="document.getElementById('drawerCloseBtn').click()">Close</button>
      <button class="btn btn-primary" id="btnDrawerPromote">
        <span>📌</span> Promote to Opportunity Pipeline (${lead.estimatedAUM})
      </button>
    `;

    const btnDrawerPromote = document.getElementById('btnDrawerPromote');
    if (btnDrawerPromote) {
      btnDrawerPromote.addEventListener('click', () => {
        promoteLeadToPipeline(lead.id);
        closeLeadDrawer();
      });
    }
  }

  function promoteLeadToPipeline(leadId) {
    const lead = state.leads.find(l => l.id === leadId);
    if (!lead) return;

    // Check if already in pipeline
    const existing = state.pipeline.find(p => p.leadId === leadId);
    if (existing) {
      showToast(`${lead.name} is already in the Wealth Opportunity Pipeline.`, "info");
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

    state.pipeline.unshift(newOpp);
    showToast(`🎉 ${lead.name} promoted to Wealth Opportunity Pipeline!`, "success");

    // Optional navigate to pipeline
    setTimeout(() => {
      const pipelineNav = document.querySelector('.nav-item[data-view="pipeline"]');
      if (pipelineNav) pipelineNav.click();
    }, 500);
  }

  // -------------------------------------------------------------
  // MODULE 2: WEALTH OPPORTUNITY PIPELINE (KANBAN & TRACKING)
  // -------------------------------------------------------------
  function renderPipelineView() {
    const stages = [
      { id: "intent_detected", label: "Intent Detected", color: "indigo" },
      { id: "advisor_qualified", label: "Advisor Qualified", color: "cyan" },
      { id: "discovery_scheduled", label: "Discovery Scheduled", color: "gold" },
      { id: "wealth_plan_presented", label: "Wealth Plan Presented", color: "amber" },
      { id: "kyc_onboarding", label: "KYC & Suitability", color: "emerald" },
      { id: "funded_active", label: "Funded & Active AUM", color: "rose" }
    ];

    const html = `
      <div class="section-toolbar">
        <div>
          <div style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; color: #FFFFFF;">
            Canadian Wealth Acquisition Pipeline: $142.8M Total Value
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
            Drag or click opportunities to advance stages across ScotiaMcLeod, Private Banking, and MD Financial.
          </div>
        </div>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary btn-sm" id="btnFilterPipelineMyDeals">Catherine Sinclair's Mandates</button>
          <button class="btn btn-primary btn-sm" id="btnSimulateNewDeal">+ Create Wealth Opportunity</button>
        </div>
      </div>

      <div class="kanban-board">
        ${stages.map(stage => {
          const deals = state.pipeline.filter(p => p.stage === stage.id);
          const totalAUM = deals.reduce((acc, d) => {
            const num = parseFloat(d.estimatedAUM.replace(/[^0-9.]/g, ''));
            return acc + (isNaN(num) ? 0 : num);
          }, 0);

          return `
            <div class="kanban-col" data-stage-id="${stage.id}">
              <div class="kanban-col-header">
                <div class="col-header-left">
                  <span class="col-title">${stage.label}</span>
                  <span class="col-count">${deals.length}</span>
                </div>
                <span class="col-total-value">$${totalAUM.toFixed(1)}M</span>
              </div>
              <div class="kanban-cards-wrap" id="stageCol-${stage.id}">
                ${deals.map(deal => renderKanbanCard(deal, stage.id)).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    mainContent.innerHTML = html;

    // Attach card advance handlers
    const advanceButtons = mainContent.querySelectorAll('.btn-advance-stage');
    advanceButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dealId = btn.getAttribute('data-deal-id');
        advanceDealStage(dealId);
      });
    });

    const createDealBtn = document.getElementById('btnSimulateNewDeal');
    if (createDealBtn) {
      createDealBtn.addEventListener('click', () => {
        showToast("New opportunity window opened. You can promote intent signals directly from the Intent Engine.", "info");
      });
    }
  }

  function renderKanbanCard(deal, stageId) {
    const isFunded = stageId === 'funded_active';

    return `
      <div class="kanban-card" data-deal-id="${deal.id}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <span style="font-size: 0.72rem; font-weight: 600; color: var(--accent-indigo);">${deal.id} · ${deal.division}</span>
          <span style="font-size: 0.72rem; color: var(--accent-emerald); font-weight: 600;">${deal.probability} Win</span>
        </div>
        <div class="kanban-card-title">${deal.name}</div>
        <div class="kanban-card-amount">${deal.estimatedAUM} AUM</div>
        <div style="font-size: 0.76rem; color: var(--text-secondary); line-height: 1.4;">
          <strong>Next Action:</strong> ${deal.nextAction}
        </div>
        <div class="kanban-meta-row">
          <span>Advisor: ${deal.assignedAdvisor.split(' ')[0]}</span>
          ${!isFunded ? `
            <button class="btn btn-secondary btn-sm btn-advance-stage" data-deal-id="${deal.id}" style="padding: 2px 7px; font-size: 0.7rem;">
              Advance &rarr;
            </button>
          ` : `
            <span style="color: var(--accent-emerald); font-weight: 600;">✓ Funded</span>
          `}
        </div>
      </div>
    `;
  }

  function advanceDealStage(dealId) {
    const stageOrder = [
      "intent_detected",
      "advisor_qualified",
      "discovery_scheduled",
      "wealth_plan_presented",
      "kyc_onboarding",
      "funded_active"
    ];

    const deal = state.pipeline.find(d => d.id === dealId);
    if (!deal) return;

    const currentIndex = stageOrder.indexOf(deal.stage);
    if (currentIndex >= 0 && currentIndex < stageOrder.length - 1) {
      deal.stage = stageOrder[currentIndex + 1];
      showToast(`Mandate "${deal.name}" advanced to next stage!`, "success");
      renderPipelineView();
    }
  }

  // -------------------------------------------------------------
  // MODULE 3: CLIENT 360° & HOUSEHOLD ENTITY MAP
  // -------------------------------------------------------------
  function renderClient360View() {
    const client = WEALTH_DATA.clients360[0]; // Marcus Vance

    const html = `
      <div class="client-360-container">
        <!-- Sidebar Profile -->
        <div class="client-profile-sidebar">
          <div class="client-identity-card">
            <div class="large-avatar-ring">MV</div>
            <div class="client-name-lg">${client.name}</div>
            <div class="client-title-lg">Founder & Majority Owner · ABC Advanced Mfg</div>
            <div style="margin-top: 8px; font-size: 0.78rem; color: var(--text-muted);">
              📍 ${client.location} · ${client.primaryPhone}
            </div>

            <div class="networth-badge-lg">
              <span class="networth-label">Total Household Net Worth</span>
              <span class="networth-num">${client.netWorth}</span>
              <span style="font-size: 0.72rem; color: #34D399; margin-top: 4px;">Liquid Surplus: ${client.liquidAssets}</span>
            </div>

            <div style="width: 100%; margin-top: 18px; text-align: left; font-size: 0.8rem; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Lead Advisor:</span>
                <span style="color: var(--text-light); font-weight: 600;">${client.assignedAdvisor}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">Risk Mandate:</span>
                <span style="color: var(--text-light); font-weight: 600;">${client.riskTolerance}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: var(--text-muted);">KYC Verification:</span>
                <span style="color: var(--accent-gold); font-weight: 600;">${client.kycStatus}</span>
              </div>
            </div>
          </div>

          <!-- Interaction Timeline -->
          <div class="drawer-section-card">
            <div class="drawer-section-title">
              <span>🕒</span> Relationship Interaction Log
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; font-size: 0.78rem;">
              ${client.interactionHistory.map(item => `
                <div style="border-left: 2px solid var(--accent-indigo); padding-left: 10px;">
                  <div style="color: var(--accent-gold); font-weight: 600;">${item.date} · ${item.channel}</div>
                  <div style="color: var(--text-secondary); margin-top: 2px;">${item.summary}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Household Entity Map & Proposed Portfolio -->
        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Household Graph Card -->
          <div class="household-graph-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div>
                <div style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; color: #FFFFFF;">
                  Household & Corporate Entity Relationship Architecture
                </div>
                <div style="font-size: 0.78rem; color: var(--text-secondary);">
                  Multi-entity beneficial ownership mapping under Canadian banking compliance standards.
                </div>
              </div>
              <span class="compliance-status-tag">CIRO & FINTRAC Compliant</span>
            </div>

            <div class="household-tree-diagram">
              <!-- Root Box -->
              <div class="household-root-box">
                <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--accent-gold); font-weight: 700; letter-spacing: 0.05em;">Family Household Apex</div>
                <div style="font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; color: #FFFFFF;">${client.household.familyName}</div>
                <div style="font-size: 0.76rem; color: var(--text-muted);">Jurisdiction: Ontario (Canada) · Tax Year 2026</div>
              </div>

              <!-- Branches -->
              <div class="tree-branches">
                ${client.household.members.map(m => `
                  <div class="tree-node-box">
                    <div style="font-size: 0.68rem; color: var(--accent-cyan); font-weight: 700; text-transform: uppercase;">${m.relationship}</div>
                    <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-light);">${m.name}</div>
                    <div style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 2px;">${m.role}</div>
                    <div style="font-size: 0.72rem; color: var(--accent-gold); margin-top: 4px;">Ownership: ${m.ownership}</div>
                  </div>
                `).join('')}
              </div>

              <!-- Corporate Entities Attached -->
              <div style="width: 100%; border-top: 1px dashed var(--border-medium); padding-top: 20px;">
                <div style="font-size: 0.76rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; margin-bottom: 12px; text-align: center;">
                  Holding Companies, Operating Trusts & Authorized Bank Accounts
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px;">
                  ${client.household.corporateEntities.map(ent => `
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px;">
                      <div style="font-weight: 600; font-size: 0.86rem; color: var(--text-light);">${ent.name}</div>
                      <div style="font-size: 0.74rem; color: var(--accent-indigo);">${ent.type}</div>
                      <div style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 4px;"><strong>Equity:</strong> ${ent.equityValue}</div>
                      <div style="font-size: 0.72rem; color: var(--accent-gold); margin-top: 2px;">${ent.accounts}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>

          <!-- Proposed Wealth Allocation Portfolio -->
          <div class="drawer-section-card">
            <div class="drawer-section-title">
              <span>📊</span> ScotiaMcLeod Discretionary Wealth Allocation Model ($12.5M Mandate)
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px;">
              ${client.recommendedPortfolioAllocation.map(p => `
                <div style="background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 14px;">
                  <div style="font-size: 0.72rem; color: var(--text-muted);">${p.assetClass}</div>
                  <div style="font-family: var(--font-display); font-size: 1.2rem; font-weight: 700; color: var(--accent-gold); margin: 4px 0;">${p.weight}</div>
                  <div style="font-size: 0.76rem; color: var(--text-light); font-weight: 600;">${p.value}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;
  }

  // -------------------------------------------------------------
  // MODULE 4: CROSS-DIVISION REFERRAL HUB
  // -------------------------------------------------------------
  function renderReferralsView() {
    const html = `
      <div class="section-toolbar">
        <div>
          <div style="font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; color: #FFFFFF;">
            Cross-Divisional Banking Referral Stream
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
            Inbound opportunities originating from Commercial Banking, Branch Retail Network, and Mortgages.
          </div>
        </div>
        <button class="btn btn-primary btn-sm" id="btnSubmitInternalReferral">+ Create Cross-Division Referral</button>
      </div>

      <div class="referrals-table-container">
        <table class="referral-table">
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
            ${state.referrals.map(ref => `
              <tr>
                <td>
                  <div style="font-weight: 700; color: var(--accent-indigo);">${ref.id}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${ref.referringDivision}</div>
                </td>
                <td>
                  <div style="font-weight: 600; color: var(--text-light);">${ref.referrerName}</div>
                  <div style="font-size: 0.72rem; color: var(--text-muted);">${ref.referrerRole}</div>
                </td>
                <td>
                  <div style="font-weight: 600; color: #FFFFFF;">${ref.clientName}</div>
                  <div style="font-size: 0.74rem; color: var(--text-secondary); max-width: 280px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                    ${ref.context}
                  </div>
                </td>
                <td>
                  <span style="font-family: var(--font-display); font-weight: 700; color: var(--accent-gold); font-size: 1.05rem;">
                    ${ref.estimatedValue}
                  </span>
                </td>
                <td>
                  <span class="compliance-status-tag" style="background: rgba(245, 158, 11, 0.15); border-color: rgba(245, 158, 11, 0.4); color: #FBBF24;">
                    ⏳ ${ref.slaHoursLeft}h remaining
                  </span>
                </td>
                <td>
                  <span class="lead-target-badge">${ref.targetSpecialist}</span>
                </td>
                <td>
                  <button class="btn btn-primary btn-sm btn-accept-ref" data-ref-id="${ref.id}">
                    Accept & Route
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    mainContent.innerHTML = html;

    const acceptButtons = mainContent.querySelectorAll('.btn-accept-ref');
    acceptButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const refId = btn.getAttribute('data-ref-id');
        showToast(`Referral ${refId} accepted! Internal attribution recorded for Commercial RM.`, "success");
        btn.innerText = "Accepted ✓";
        btn.disabled = true;
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
      });
    });

    const submitRefBtn = document.getElementById('btnSubmitInternalReferral');
    if (submitRefBtn) {
      submitRefBtn.addEventListener('click', () => {
        showToast("Internal bank referral intake modal ready for Commercial & Retail branch bankers.", "info");
      });
    }
  }

  // -------------------------------------------------------------
  // MODULE 5: AI ADVISOR COPILOT WORKSPACE
  // -------------------------------------------------------------
  function renderCopilotView() {
    const html = `
      <div class="copilot-workspace-grid">
        <!-- Chat / Copilot Assistant Panel -->
        <div class="copilot-panel">
          <div class="copilot-panel-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.4rem;">🤖</span>
              <div>
                <div style="font-family: var(--font-display); font-weight: 700; color: #FFFFFF; font-size: 1.05rem;">
                  VGT Wealth Advisor Copilot
                </div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">
                  Trained on Canadian Banking Wealth Workflows, CIRO Suitability & Tax Optimization
                </div>
              </div>
            </div>
            <span class="compliance-status-tag"><span class="pulse-dot"></span> Online</span>
          </div>

          <div class="copilot-chat-history" id="copilotChatHistory">
            <div class="chat-bubble assistant">
              <strong>Hello Catherine.</strong> I have analyzed your 64 active prospects and 84 intent signals detected this month across Scotiabank's network.<br><br>
              Top recommendation today: <strong>Marcus Vance (ABC Advanced Mfg)</strong> has an immediate 7-day window following an $18.5M asset purchase closing. Commercial account received $14.2M wire.<br><br>
              How can I assist you right now?
            </div>
          </div>

          <!-- Quick Action Prompts -->
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin: 12px 0;">
            <button class="btn btn-secondary btn-sm copilot-quick-prompt" data-prompt="Generate Executive Meeting Brief for Marcus Vance ($12.5M Mandate)">
              📄 Marcus Vance Meeting Brief
            </button>
            <button class="btn btn-secondary btn-sm copilot-quick-prompt" data-prompt="Explain Capital Gains Tax Drag on Corporate Operating Reserves in Ontario">
              📊 Explain Tax Drag on $14M Surplus
            </button>
            <button class="btn btn-secondary btn-sm copilot-quick-prompt" data-prompt="Run CIRO Suitability and KYC Checklist for Tech Founder Liquidity Mandate">
              🛡️ CIRO Suitability Checklist
            </button>
            <button class="btn btn-secondary btn-sm copilot-quick-prompt" data-prompt="Draft Private Banking Warm Outreach to Dr. Aris Thorne (MD Financial)">
              🩺 MD Financial Physician Outreach
            </button>
          </div>

          <div class="copilot-prompt-bar">
            <input type="text" class="copilot-input" id="copilotUserPromptInput" placeholder="Ask AI Copilot to draft briefs, research prospects, or verify suitability...">
            <button class="btn btn-primary" id="btnSendCopilotPrompt">
              <span>Send</span>
            </button>
          </div>
        </div>

        <!-- Real-Time AI Generation Sandbox Panel -->
        <div class="copilot-panel">
          <div class="copilot-panel-header">
            <div style="font-family: var(--font-display); font-weight: 700; color: #FFFFFF; font-size: 1.05rem;">
              Generated Advisory Document & Briefing
            </div>
            <button class="btn btn-secondary btn-sm" id="btnExportCopilotBrief">
              <span>📥</span> Export Document
            </button>
          </div>

          <div style="flex: 1; overflow-y: auto; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 20px; font-size: 0.85rem; line-height: 1.6; color: #E2E8F0;" id="copilotDocumentOutput">
            <div style="text-align: center; color: var(--text-muted); margin-top: 100px;">
              <span style="font-size: 2.2rem; display: block; margin-bottom: 10px;">✨</span>
              Click a quick prompt on the left or type an advisor inquiry to generate instant meeting briefs, talking points, and tax models.
            </div>
          </div>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;

    const chatHistory = document.getElementById('copilotChatHistory');
    const input = document.getElementById('copilotUserPromptInput');
    const sendBtn = document.getElementById('btnSendCopilotPrompt');
    const docOutput = document.getElementById('copilotDocumentOutput');

    function handleSendPrompt(promptText) {
      if (!promptText) return;

      // Add user bubble
      const userBubble = document.createElement('div');
      userBubble.className = 'chat-bubble user';
      userBubble.innerText = promptText;
      chatHistory.appendChild(userBubble);
      chatHistory.scrollTop = chatHistory.scrollHeight;

      // Simulate AI typing response
      const assistantBubble = document.createElement('div');
      assistantBubble.className = 'chat-bubble assistant';
      assistantBubble.innerHTML = `<span style="color: var(--accent-gold);">⚡ VGT AI Generating customized banking intelligence...</span>`;
      chatHistory.appendChild(assistantBubble);
      chatHistory.scrollTop = chatHistory.scrollHeight;

      setTimeout(() => {
        if (promptText.includes('Marcus Vance')) {
          assistantBubble.innerHTML = `I have compiled the comprehensive pre-meeting briefing for <strong>Marcus Vance</strong>, addressing the $18.5M asset transaction, commercial banking coordination with Geoff Reynolds, and corporate class tax shielding. See the generated document on the right.`;
          docOutput.innerHTML = `<pre style="font-family: var(--font-body); white-space: pre-wrap;">${WEALTH_DATA.copilotTemplates.meetingBrief(WEALTH_DATA.intentLeads[0])}</pre>`;
        } else if (promptText.includes('Tax Drag')) {
          assistantBubble.innerHTML = `Calculated tax liability: Leaving $14.2M in corporate reserves without holding company reorganization results in 50.17% passive corporate investment tax in Ontario. See details in the right pane.`;
          docOutput.innerHTML = `
            <h3 style="color: var(--accent-gold); margin-bottom: 12px;">Corporate Tax Drag Analysis: $14.2M Liquid Operating Surplus</h3>
            <p><strong>Jurisdiction:</strong> Ontario, Canada | Combined Federal/Provincial Tax Rate</p>
            <ul style="margin: 12px 0 16px 20px;">
              <li><strong>Passive Investment Income Rate:</strong> 50.17% (54.67% on foreign income)</li>
              <li><strong>Annual Tax Penalty on 6% Return ($852,000):</strong> $427,448 lost to tax drag annually without wealth structuring</li>
              <li><strong>Small Business Deduction Grind:</strong> Passive income exceeds $50,000, reducing SBD limit to $0</li>
            </ul>
            <h4 style="color: #34D399;">Proposed ScotiaMcLeod & Scotiatrust Shield:</h4>
            <p>Implement Section 85 rollover into Vance Global Holdings Inc. (HoldCo), establish an Inter Vivos Family Trust, and utilize Tax-Advantaged Corporate Class investment pools + Private Debt instruments.</p>
          `;
        } else if (promptText.includes('CIRO')) {
          assistantBubble.innerHTML = `CIRO Suitability checklist generated for discretionary management mandate. Ready for compliance audit.`;
          docOutput.innerHTML = `
            <h3 style="color: var(--accent-cyan); margin-bottom: 12px;">CIRO Suitability & Client Identification Checklist</h3>
            <p><strong>Regulatory Regime:</strong> Canadian Investment Regulatory Organization (CIRO) Rule 3200 & OSFI B-13</p>
            <ol style="margin: 12px 0 16px 20px;">
              <li><strong>Know Your Client (KYC):</strong> Investment horizon (10+ years), Risk capacity (High), Risk willingness (Moderate Balanced).</li>
              <li><strong>Beneficial Ownership:</strong> Identify all individuals holding 25%+ equity in corporate holding structures.</li>
              <li><strong>Conflict of Interest Disclosure:</strong> Banking division referral disclosure provided to client in writing.</li>
              <li><strong>Discretionary Authorization:</strong> Investment Policy Statement (IPS) signed by Marcus Vance & Elena Vance.</li>
            </ol>
          `;
        } else {
          assistantBubble.innerHTML = `I have analyzed the scenario and drafted the tailored wealth communication. Check the document editor on the right.`;
          docOutput.innerHTML = `<pre style="font-family: var(--font-body); white-space: pre-wrap;">${WEALTH_DATA.copilotTemplates.outreachEmail(WEALTH_DATA.intentLeads[0])}</pre>`;
        }
      }, 700);

      input.value = '';
    }

    sendBtn.addEventListener('click', () => handleSendPrompt(input.value.trim()));
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSendPrompt(input.value.trim());
    });

    const quickPrompts = mainContent.querySelectorAll('.copilot-quick-prompt');
    quickPrompts.forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.getAttribute('data-prompt');
        handleSendPrompt(p);
      });
    });

    const exportBtn = document.getElementById('btnExportCopilotBrief');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        showToast("Briefing exported as PDF / Scotia Advisory Memo format.", "success");
      });
    }
  }

  // -------------------------------------------------------------
  // MODULE 6: EXECUTIVE WEALTH MANAGEMENT ANALYTICS
  // -------------------------------------------------------------
  function renderAnalyticsView() {
    const html = `
      <div class="kpi-metrics-grid">
        <div class="kpi-card gold">
          <div class="kpi-header"><span class="kpi-label">Quarterly Won AUM</span><span>🏆</span></div>
          <div class="kpi-value">$38.4M</div>
          <div class="kpi-delta"><span class="delta-positive">↑ 114%</span> of Q4 target</div>
        </div>
        <div class="kpi-card indigo">
          <div class="kpi-header"><span class="kpi-label">Active Wealth Pipeline</span><span>📊</span></div>
          <div class="kpi-value">$142.8M</div>
          <div class="kpi-delta"><span class="delta-positive">28 active mandates</span></div>
        </div>
        <div class="kpi-card emerald">
          <div class="kpi-header"><span class="kpi-label">AI Signal Precision</span><span>🎯</span></div>
          <div class="kpi-value">94.8%</div>
          <div class="kpi-delta"><span class="delta-positive">Zero false-positive flags</span></div>
        </div>
        <div class="kpi-card cyan">
          <div class="kpi-header"><span class="kpi-label">OSFI B-13 & CIRO Audit</span><span>🛡️</span></div>
          <div class="kpi-value">100% Compliant</div>
          <div class="kpi-delta"><span class="delta-positive">Complete audit logging</span></div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        <div class="drawer-section-card">
          <div class="drawer-section-title">
            <span>📈</span> Lead Intent Acquisition Attribution by Bank Channel
          </div>
          <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 16px;">
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                <span>Commercial Banking Inflows & M&A</span>
                <span style="font-weight: 700; color: var(--accent-gold);">$68.2M AUM (48%)</span>
              </div>
              <div style="background: rgba(255,255,255,0.08); height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: var(--accent-gold); width: 48%; height: 100%;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                <span>Corporate Intelligence & Licensed Registries</span>
                <span style="font-weight: 700; color: var(--accent-indigo);">$39.5M AUM (28%)</span>
              </div>
              <div style="background: rgba(255,255,255,0.08); height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: var(--accent-indigo); width: 28%; height: 100%;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                <span>Retail Branch Maturing Fixed Income</span>
                <span style="font-weight: 700; color: var(--accent-emerald);">$21.4M AUM (15%)</span>
              </div>
              <div style="background: rgba(255,255,255,0.08); height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: var(--accent-emerald); width: 15%; height: 100%;"></div>
              </div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
                <span>Digital Advice+ Portal & Webinar Registrations</span>
                <span style="font-weight: 700; color: var(--accent-cyan);">$13.7M AUM (9%)</span>
              </div>
              <div style="background: rgba(255,255,255,0.08); height: 8px; border-radius: 4px; overflow: hidden;">
                <div style="background: var(--accent-cyan); width: 9%; height: 100%;"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="drawer-section-card">
          <div class="drawer-section-title">
            <span>🛡️</span> Canadian Banking Regulatory & Governance Audit Trail
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 0.78rem;">
            <div style="padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 6px;">
              <strong style="color: #34D399;">OSFI B-13 Security Log:</strong> Multi-factor authentication & role-based data masking active for Catherine Sinclair (Senior VP).
            </div>
            <div style="padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 6px;">
              <strong style="color: #34D399;">PIPEDA Consent Verification:</strong> All intent signals cross-referenced against client opt-in records and public corporate registries.
            </div>
            <div style="padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: 6px;">
              <strong style="color: #34D399;">CIRO Suitability Guardrail:</strong> AI Copilot operates in advisor-support mode only. Suitability and discretionary approvals reserved exclusively for licensed advisors.
            </div>
          </div>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;
  }

  // -------------------------------------------------------------
  // UI UTILITIES: TOAST NOTIFICATIONS
  // -------------------------------------------------------------
  function showToast(message, type = "info") {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'alert') icon = '⚡';

    toast.innerHTML = `
      <span style="font-size: 1.2rem;">${icon}</span>
      <div style="font-size: 0.84rem; font-weight: 500;">${message}</div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }
});
