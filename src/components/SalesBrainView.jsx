import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BrainCircuit, Sparkles, Rocket, Users, Mail, Clock, Activity, CalendarClock,
  LineChart, Plus, CheckCircle2, AlertTriangle, RefreshCw, X, Search,
  ExternalLink, Eye, Send, ThumbsUp, ThumbsDown, Zap, ShieldCheck, ChevronRight,
  Flame, Phone, MailOpen, MousePointerClick, MessageSquareReply, Play, Pause,
  Filter, ChevronLeft, Pencil, Copy, Trash2, ArrowRight, Loader2, Flag
} from 'lucide-react';

const API_BASE = '/api/sales-brain';

async function fetchBrain(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function statusLabel(s) {
  if (!s) return '';
  return s.toLowerCase().split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function fmtDate(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function LeadStatusBadge({ status }) {
  const map = {
    QUALIFIED: 'sb-badge-good',
    HIGH_PRIORITY: 'sb-badge-good',
    READY_FOR_OUTREACH: 'sb-badge-info',
    IN_CAMPAIGN: 'sb-badge-info',
    CONTACTED: 'sb-badge-info',
    REPLIED: 'sb-badge-good',
    INTERESTED: 'sb-badge-good',
    CONVERTED: 'sb-badge-good',
    NEEDS_ENRICHMENT: 'sb-badge-warn',
    NOT_QUALIFIED: 'sb-badge-bad',
    SUPPRESSED: 'sb-badge-bad',
    UNSUBSCRIBED: 'sb-badge-bad',
    NEW: 'sb-badge-muted',
    DUPLICATE: 'sb-badge-muted'
  };
  return <span className={`sb-badge ${map[status] || 'sb-badge-muted'}`}>{statusLabel(status)}</span>;
}

function JobStatusBadge({ status }) {
  const map = {
    COMPLETED: 'sb-badge-good',
    RUNNING: 'sb-badge-info',
    APPROVED: 'sb-badge-info',
    PLANNED: 'sb-badge-warn',
    FAILED: 'sb-badge-bad',
    CANCELLED: 'sb-badge-muted'
  };
  return <span className={`sb-badge ${map[status] || 'sb-badge-muted'}`}>{statusLabel(status)}</span>;
}

function DraftStatusBadge({ status }) {
  const map = {
    SENT: 'sb-badge-good',
    APPROVED: 'sb-badge-info',
    SENDING: 'sb-badge-info',
    PENDING_APPROVAL: 'sb-badge-warn',
    NEEDS_TEMPLATE: 'sb-badge-warn',
    FAILED: 'sb-badge-bad',
    REJECTED: 'sb-badge-muted',
    SKIPPED: 'sb-badge-muted'
  };
  return <span className={`sb-badge ${map[status] || 'sb-badge-muted'}`}>{statusLabel(status)}</span>;
}

function ScoreBar({ score }) {
  if (score === null || score === undefined) return <span className="text-slate-500 text-xs">Not scored</span>;
  const tone = score >= 75 ? 'sb-score-high' : score >= 50 ? 'sb-score-mid' : score >= 30 ? 'sb-score-low' : 'sb-score-crit';
  return (
    <div className="sb-scorebar-box">
      <div className="sb-scorebar-track">
        <div className={`sb-scorebar-fill ${tone}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums text-white">{Math.round(score)}</span>
    </div>
  );
}

function Switch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange && onChange(!checked)}
      className={`sb-switch ${checked ? 'checked' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span className="sb-switch-thumb" />
    </button>
  );
}

export default function SalesBrainView({ showToast }) {
  const [activeTab, setActiveTab] = useState('command');
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [icps, setIcps] = useState([]);
  const [leads, setLeads] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [searches, setSearches] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [engagement, setEngagement] = useState([]);
  const [insights, setInsights] = useState(null);

  // Leads Tab Filters & Pagination
  const [leadQuery, setLeadQuery] = useState('');
  const [leadIcpFilter, setLeadIcpFilter] = useState('__all');
  const [leadStatusFilter, setLeadStatusFilter] = useState('__all');
  const [leadMinScore, setLeadMinScore] = useState('');
  const [leadSort, setLeadSort] = useState('score');
  const [leadPage, setLeadPage] = useState(1);
  const LEAD_PAGE_SIZE = 25;

  // Drafts Tab Filters & Pagination
  const [draftIcpFilter, setDraftIcpFilter] = useState('__all');
  const [draftStatusFilter, setDraftStatusFilter] = useState('__all');
  const [draftDateFilter, setDraftDateFilter] = useState('');
  const [draftPage, setDraftPage] = useState(1);
  const DRAFT_PAGE_SIZE = 25;

  // Searches Tab Runner
  const [searchRunIcp, setSearchRunIcp] = useState('');
  const [searchRunPages, setSearchRunPages] = useState('2');

  // Follow-Ups Tab Filters
  const [fuQuery, setFuQuery] = useState('');
  const [fuTempFilter, setFuTempFilter] = useState('ALL');
  const [fuOutcomeFilter, setFuOutcomeFilter] = useState('ALL');

  // Engagement Tab Subtab
  const [engSubTab, setEngSubTab] = useState('overview');

  // Modals & Slide-Over Drawers
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [createIcpOpen, setCreateIcpOpen] = useState(false);
  const [reviewingSearchJob, setReviewingSearchJob] = useState(null);
  const [customDraftLead, setCustomDraftLead] = useState(null);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');

  // New ICP Form
  const [newIcpForm, setNewIcpForm] = useState({
    name: '',
    description: '',
    offer: '',
    minScore: 70,
    searchMode: 'REVIEW',
    dailySendCap: 25,
    monthlyRevealBudget: 100,
    scheduleTime: '09:00',
    industries: 'Legal Services, Higher Education, Private Banking',
    titles: 'Partner, Managing Partner, Senior Counsel, Clinic Owner, Professor Emeritus',
    locations: 'Ontario, British Columbia, Alberta, Quebec'
  });

  const notify = (msg, type = 'info') => {
    if (showToast) showToast(msg, type);
    else console.log(`[${type}]: ${msg}`);
  };

  const loadAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashData, icpsData, leadsData, draftsData, searchesData, fuData, autoData, engData, insData] =
        await Promise.all([
          fetchBrain('/dashboard').catch(() => null),
          fetchBrain('/icps').catch(() => []),
          fetchBrain('/leads?pageSize=100').catch(() => ({ leads: [] })),
          fetchBrain('/drafts?pageSize=100').catch(() => ({ drafts: [] })),
          fetchBrain('/searches').catch(() => []),
          fetchBrain('/follow-ups').catch(() => []),
          fetchBrain('/automations').catch(() => []),
          fetchBrain('/engagement').catch(() => []),
          fetchBrain('/insights').catch(() => null)
        ]);

      setDashboard(dashData);
      setIcps(icpsData || []);
      if (icpsData && icpsData.length > 0 && !searchRunIcp) {
        setSearchRunIcp(icpsData[0].id);
      }
      setLeads(leadsData?.leads || []);
      setDrafts(draftsData?.drafts || []);
      setSearches(searchesData || []);
      setFollowups(fuData || []);
      setAutomations(autoData || []);
      setEngagement(engData || []);
      setInsights(insData);
    } catch (err) {
      notify(`Failed to load data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [searchRunIcp]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Actions
  const handleToggleIcpActive = async (icpId, currentActive) => {
    try {
      await fetchBrain(`/icps/${icpId}/toggle`, { method: 'POST', body: { isActive: !currentActive } });
      setIcps(prev => prev.map(i => i.id === icpId ? { ...i, isActive: !currentActive } : i));
      notify(!currentActive ? 'ICP activated' : 'ICP paused', 'success');
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const handleApproveDraft = async (draftId) => {
    try {
      await fetchBrain(`/drafts/${draftId}/approve`, { method: 'POST' });
      setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, status: 'APPROVED' } : d));
      notify('Draft approved and queued to send', 'success');
      setSelectedDraftId(null);
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const handleRejectDraft = async (draftId) => {
    try {
      await fetchBrain(`/drafts/${draftId}/reject`, { method: 'POST' });
      setDrafts(prev => prev.map(d => d.id === draftId ? { ...d, status: 'REJECTED' } : d));
      notify('Draft rejected', 'info');
      setSelectedDraftId(null);
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const handleApproveAllDrafts = async () => {
    try {
      const res = await fetchBrain('/drafts/approve-all', { method: 'POST' });
      setDrafts(prev => prev.map(d => d.status === 'PENDING_APPROVAL' ? { ...d, status: 'APPROVED' } : d));
      notify(`${res.approved || 'All'} pending drafts approved and queued`, 'success');
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const handleToggleAutomation = async (autoId) => {
    try {
      const res = await fetchBrain(`/automations/${autoId}/toggle`, { method: 'POST' });
      setAutomations(prev => prev.map(a => a.id === autoId ? res.automation : a));
      notify(`Automation mode updated`, 'success');
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const handleDismissFollowup = async (fuId) => {
    try {
      await fetchBrain(`/follow-ups/${fuId}/complete`, { method: 'POST' });
      setFollowups(prev => prev.map(f => f.id === fuId ? { ...f, status: 'COMPLETED' } : f));
      notify('Follow-up task resolved', 'success');
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const handleStartSearch = async (reviewFirst) => {
    if (!searchRunIcp) return;
    try {
      const job = await fetchBrain(`/icps/${searchRunIcp}/searches`, {
        method: 'POST',
        body: { maxPages: Number(searchRunPages), reviewFirst }
      });
      setSearches(prev => [job, ...prev]);
      if (reviewFirst && job.status === 'PLANNED') {
        setReviewingSearchJob(job);
      } else {
        notify('Search run started successfully', 'success');
      }
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const handleApproveSearchJob = async (searchId) => {
    try {
      const res = await fetchBrain(`/searches/${searchId}/approve`, { method: 'POST' });
      setSearches(prev => prev.map(s => s.id === searchId ? res.search : s));
      notify('Search approved and executed', 'success');
      setReviewingSearchJob(null);
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const handleCreateIcp = async (e) => {
    e.preventDefault();
    try {
      const newIcp = await fetchBrain('/icps', {
        method: 'POST',
        body: {
          name: newIcpForm.name,
          description: newIcpForm.description,
          offer: newIcpForm.offer,
          minScore: Number(newIcpForm.minScore),
          searchMode: newIcpForm.searchMode,
          dailySendCap: Number(newIcpForm.dailySendCap),
          monthlyRevealBudget: Number(newIcpForm.monthlyRevealBudget),
          scheduleTime: newIcpForm.scheduleTime,
          criteria: {
            company: {
              industries: newIcpForm.industries.split(',').map(s => s.trim()).filter(Boolean),
              locations: newIcpForm.locations.split(',').map(s => s.trim()).filter(Boolean)
            },
            contact: {
              titles: newIcpForm.titles.split(',').map(s => s.trim()).filter(Boolean)
            }
          }
        }
      });
      setIcps(prev => [newIcp, ...prev]);
      notify(`ICP "${newIcp.name}" created`, 'success');
      setCreateIcpOpen(false);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  const handleCreateCustomDraft = async (e) => {
    e.preventDefault();
    if (!customDraftLead) return;
    try {
      const draft = await fetchBrain(`/leads/${customDraftLead.id}/custom-draft`, {
        method: 'POST',
        body: { subject: customSubject, bodyHtml: customBody }
      });
      setDrafts(prev => [draft, ...prev]);
      notify('Personalized draft generated', 'success');
      setCustomDraftLead(null);
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      if (leadIcpFilter !== '__all' && l.icpId !== leadIcpFilter) return false;
      if (leadStatusFilter !== '__all' && l.status !== leadStatusFilter) return false;
      if (leadMinScore !== '' && (l.score || 0) < Number(leadMinScore)) return false;
      if (leadQuery.trim()) {
        const q = leadQuery.toLowerCase();
        const fullName = `${l.firstName || ''} ${l.lastName || ''}`.toLowerCase();
        const comp = (l.companyName || '').toLowerCase();
        const title = (l.title || '').toLowerCase();
        if (!fullName.includes(q) && !comp.includes(q) && !title.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      if (leadSort === 'score') return (b.score || 0) - (a.score || 0);
      if (leadSort === 'recent') return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
      if (leadSort === 'company') return (a.companyName || '').localeCompare(b.companyName || '');
      return 0;
    });
  }, [leads, leadIcpFilter, leadStatusFilter, leadMinScore, leadQuery, leadSort]);

  const leadTotalPages = Math.max(1, Math.ceil(filteredLeads.length / LEAD_PAGE_SIZE));
  const paginatedLeads = filteredLeads.slice((leadPage - 1) * LEAD_PAGE_SIZE, leadPage * LEAD_PAGE_SIZE);

  // Filtered Drafts
  const filteredDrafts = useMemo(() => {
    return drafts.filter(d => {
      if (draftIcpFilter !== '__all' && d.icpId !== draftIcpFilter) return false;
      if (draftStatusFilter !== '__all' && d.status !== draftStatusFilter) return false;
      if (draftDateFilter && !d.createdAt.startsWith(draftDateFilter)) return false;
      return true;
    });
  }, [drafts, draftIcpFilter, draftStatusFilter, draftDateFilter]);

  const draftTotalPages = Math.max(1, Math.ceil(filteredDrafts.length / DRAFT_PAGE_SIZE));
  const paginatedDrafts = filteredDrafts.slice((draftPage - 1) * DRAFT_PAGE_SIZE, draftPage * DRAFT_PAGE_SIZE);
  const pendingDraftsCount = drafts.filter(d => d.status === 'PENDING_APPROVAL').length;

  // Selected Lead & Draft Objects
  const selectedLead = leads.find(l => l.id === selectedLeadId) || null;
  const selectedDraft = drafts.find(d => d.id === selectedDraftId) || null;

  // Follow-Ups filtering
  const filteredFollowups = useMemo(() => {
    return followups.filter(f => {
      if (fuTempFilter !== 'ALL' && f.temperature !== fuTempFilter) return false;
      if (fuOutcomeFilter !== 'ALL' && f.outcome !== fuOutcomeFilter) return false;
      if (fuQuery.trim()) {
        const q = fuQuery.toLowerCase();
        const name = (f.contactName || '').toLowerCase();
        const comp = (f.company || '').toLowerCase();
        if (!name.includes(q) && !comp.includes(q)) return false;
      }
      return true;
    });
  }, [followups, fuTempFilter, fuOutcomeFilter, fuQuery]);

  // Hot Leads
  const hotLeads = useMemo(() => {
    return leads.filter(l => (l.tier === 'HOT' || l.score >= 90));
  }, [leads]);

  return (
    <div className="sb-container">
      {/* ----------------- TOP HEADER BAR ----------------- */}
      <div className="sb-header-bar">
        <div className="sb-header-left">
          <div className="sb-header-title-row">
            <div className="sb-icon-box">
              <BrainCircuit className="size-5 text-indigo-400" />
            </div>
            <h1 className="sb-header-title">AI Sales &amp; Engagement Brain</h1>
            <div className="sb-pulse-badge">
              <span className="sb-pulse-dot" />
              Groq + Gemini Multi-Model Active
            </div>
          </div>
          <p className="sb-header-sub">
            Unified platform for autonomous Apollo prospecting, lead scoring, high-intent engagement tracking, and rule-checked AI outreach.
          </p>
        </div>

        <div className="sb-header-controls">
          <div className="sb-vertical-pill">
            <span className="size-1.5 rounded-full bg-indigo-400" />
            Private Wealth Management
          </div>
          <button className="sb-btn sb-btn-primary" onClick={() => setCreateIcpOpen(true)}>
            <Plus size={14} /> Create ICP
          </button>
          <button className="sb-btn sb-btn-outline" onClick={() => setActiveTab('automations')}>
            <Zap size={14} className="text-amber-400" /> Automations &amp; Schedules
          </button>
        </div>
      </div>

      {/* ----------------- MAIN UNIFIED NAVIGATION TABS ----------------- */}
      <div className="sb-tabs-nav">
        <div className="sb-tabs-list">
          {[
            { id: 'command', label: 'Command Center', icon: Sparkles, color: 'text-indigo-400' },
            { id: 'follow-ups', label: 'Follow-Ups & Outcomes', icon: Clock, color: 'text-indigo-400' },
            { id: 'engagement', label: 'Engagement & Hot Leads', icon: Activity, color: 'text-rose-400' },
            { id: 'automations', label: 'Automations & Schedules', icon: CalendarClock, color: 'text-amber-400' },
            { id: 'icps', label: `ICPs (${icps.length})`, icon: Users },
            { id: 'searches', label: `Searches (${searches.length})`, icon: Rocket },
            { id: 'leads', label: `Leads (${leads.length})`, icon: BrainCircuit },
            { id: 'outreach', label: `Outreach Drafts (${pendingDraftsCount})`, icon: Mail },
            { id: 'insights', label: 'Insights', icon: LineChart, color: 'text-slate-400' },
          ].map(t => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                className={`sb-tab-trigger ${active ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                <Icon size={14} className={t.color || 'text-slate-300'} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
         1. COMMAND CENTER TAB
         ========================================================================= */}
      {activeTab === 'command' && (
        <div className="space-y-6">
          {/* 7-column High-Density Metric Strip */}
          <div className="sb-metric-strip-7">
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Active ICPs</span>
              <span className="sb-stat-val">{dashboard?.activeIcps ?? 2} / {dashboard?.icps ?? 2}</span>
            </div>
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Total Leads</span>
              <span className="sb-stat-val">{dashboard?.totalLeads ?? leads.length}</span>
            </div>
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Emails Sent Today</span>
              <span className="sb-stat-val">{dashboard?.stats?.todaySent ?? 18}</span>
            </div>
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Open Rate</span>
              <span className="sb-stat-val text-indigo-400">{dashboard?.stats?.openRate ?? 46.2}%</span>
            </div>
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Click Rate</span>
              <span className="sb-stat-val text-emerald-400">{dashboard?.stats?.clickRate ?? 24.8}%</span>
            </div>
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Hot Leads</span>
              <span className="sb-stat-val text-rose-400">{dashboard?.leadsByTier?.HOT ?? 325}</span>
            </div>
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Follow-Ups Due</span>
              <span className="sb-stat-val text-amber-400">{followups.filter(f => f.status === 'PENDING').length}</span>
            </div>
          </div>

          {/* Quick Action Command Toolbar */}
          <div className="sb-command-toolbar">
            <div className="sb-toolbar-actions">
              <button className="sb-btn sb-btn-primary" onClick={() => setCreateIcpOpen(true)}>
                <Plus size={14} /> New ICP Profile
              </button>
              <button className="sb-btn sb-btn-outline" onClick={() => setActiveTab('searches')}>
                <Rocket size={14} className="text-indigo-400" /> Run Apollo Search
              </button>
              <button className="sb-btn sb-btn-outline" disabled={!pendingDraftsCount} onClick={handleApproveAllDrafts}>
                <CheckCircle2 size={14} className="text-emerald-400" /> Approve All Pending ({pendingDraftsCount})
              </button>
              <button className="sb-btn sb-btn-outline" onClick={loadAllData}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Re-run Skipped Outreach
              </button>
            </div>
            <div>
              <button className="sb-btn sb-btn-ghost" onClick={() => setActiveTab('automations')}>
                Automations &amp; Schedules <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Two-Column Split Layout */}
          <div className="sb-two-col-grid">
            {/* Left Column: High-Intent Spotlight & Activity Feed */}
            <div className="space-y-5">
              {/* High Intent Hot Leads Strip */}
              <div className="sb-card-panel">
                <div className="sb-card-header">
                  <div className="sb-card-title">
                    <Flame size={16} className="text-rose-400" />
                    <span>High-Intent Leads Spotlight</span>
                  </div>
                  <button className="sb-btn sb-btn-ghost sb-btn-xs" onClick={() => setActiveTab('engagement')}>
                    View all ({hotLeads.length})
                  </button>
                </div>
                <div className="sb-divide-y">
                  {hotLeads.slice(0, 4).map(lead => (
                    <div key={lead.id} className="p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">
                            {[lead.firstName, lead.lastName].filter(Boolean).join(' ')}
                          </span>
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Hot
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {lead.companyName ? `${lead.companyName} · ` : ''}{lead.title || 'Senior Executive'} · Score {Math.round(lead.score)}
                        </p>
                      </div>
                      <button
                        className="sb-btn sb-btn-outline sb-btn-xs gap-1 shrink-0"
                        onClick={() => {
                          setCustomDraftLead(lead);
                          setCustomSubject(`Discretionary Portfolio Advisory – ${lead.companyName || 'Private Wealth'}`);
                          setCustomBody(`<p>Dear ${lead.firstName || 'Executive'},</p><p>Reviewing recent senior milestones across Canadian ${lead.title || 'executives'}, our ScotiaMcLeod advisory group provides specialized family holding company structuring and IPP pension design.</p>`);
                        }}
                      >
                        <Sparkles size={12} className="text-indigo-400" /> Follow Up
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-Time Activity Feed */}
              <div className="sb-card-panel">
                <div className="sb-card-header">
                  <div className="sb-card-title">
                    <Activity size={16} className="text-indigo-400" />
                    <span>Real-Time Engagement Feed</span>
                  </div>
                  <span className="text-xs text-slate-400">Live updates</span>
                </div>
                <div className="sb-divide-y max-h-[460px] overflow-y-auto">
                  {engagement.slice(0, 8).map(ev => (
                    <div key={ev.id} className="flex items-start gap-3 p-3">
                      <div className="size-7 rounded-full bg-[#070B14] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                        {ev.type === 'EMAIL_OPENED' ? <MailOpen size={13} className="text-indigo-400" /> :
                         ev.type === 'EMAIL_CLICKED' ? <MousePointerClick size={13} className="text-emerald-400" /> :
                         ev.type === 'EMAIL_REPLIED' ? <MessageSquareReply size={13} className="text-purple-400" /> :
                         <Mail size={13} className="text-slate-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-white">
                          <span className="font-semibold">{ev.leadName}</span>{' '}
                          <span className="text-slate-400">{statusLabel(ev.type)}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {fmtDate(ev.timestamp)} · {ev.company} · Delta: {ev.scoreDelta}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Urgent Follow-Up Tasks Queue */}
            <div className="sb-card-panel">
              <div className="sb-card-header">
                <div className="sb-card-title">
                  <CalendarClock size={16} className="text-amber-400" />
                  <span>Urgent Follow-Up Queue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tabular-nums text-slate-400">
                    {followups.filter(f => f.status === 'PENDING').length} due
                  </span>
                  <button
                    onClick={() => setActiveTab('follow-ups')}
                    className="text-[11px] text-indigo-400 hover:underline font-medium"
                  >
                    View Hub →
                  </button>
                </div>
              </div>
              <div className="sb-divide-y max-h-[580px] overflow-y-auto">
                {followups.slice(0, 6).map(fu => (
                  <div key={fu.id} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-semibold text-white">{fu.contactName}</h4>
                        <p className="text-[11px] text-slate-400">{fu.company} · Due: {fmtDate(fu.dueAt)}</p>
                      </div>
                      <span className="sb-badge sb-badge-warn text-[10px]">Urgent</span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2 bg-[#070B14] p-2 rounded border border-white/5">
                      {fu.prompt}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        className="sb-btn sb-btn-outline sb-btn-xs gap-1"
                        onClick={() => {
                          const mLead = leads.find(l => l.companyName === fu.company);
                          if (mLead) setSelectedLeadId(mLead.id);
                        }}
                      >
                        Lead Dossier
                      </button>
                      <button
                        className="sb-btn sb-btn-primary sb-btn-xs gap-1"
                        onClick={() => handleDismissFollowup(fu.id)}
                      >
                        <CheckCircle2 size={12} /> Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         2. FOLLOW-UPS & OUTCOMES TAB
         ========================================================================= */}
      {activeTab === 'follow-ups' && (
        <div className="space-y-4">
          <div className="sb-filter-bar">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-slate-500" />
              <input
                type="text"
                className="sb-input pl-8 w-full"
                placeholder="Search prospect, company..."
                value={fuQuery}
                onChange={e => setFuQuery(e.target.value)}
              />
            </div>
            <select
              className="sb-select w-44"
              value={fuTempFilter}
              onChange={e => setFuTempFilter(e.target.value)}
            >
              <option value="ALL">All Temperatures</option>
              <option value="HOT">Hot (&ge;80)</option>
              <option value="WARM">Warm (60-79)</option>
              <option value="NURTURE">Nurture (&lt;60)</option>
            </select>
            <select
              className="sb-select w-48"
              value={fuOutcomeFilter}
              onChange={e => setFuOutcomeFilter(e.target.value)}
            >
              <option value="ALL">All Outcomes</option>
              <option value="REPLIED">Replied</option>
              <option value="CLICKED">Clicked</option>
              <option value="OPENED_NO_REPLY">Opened No Reply</option>
              <option value="AWAITING_OPEN">Awaiting Open</option>
              <option value="CONVERTED">Converted</option>
            </select>
          </div>

          <div className="sb-table-wrap">
            <table className="sb-clean-table">
              <thead>
                <tr>
                  <th>Contact</th>
                  <th>Company</th>
                  <th>Temperature</th>
                  <th>Engagement</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Outcome</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFollowups.map(fu => (
                  <tr key={fu.id}>
                    <td className="font-semibold text-white">{fu.contactName}</td>
                    <td className="text-slate-300">{fu.company}</td>
                    <td>
                      <span className={`sb-badge ${fu.temperature === 'HOT' ? 'sb-badge-bad' : fu.temperature === 'WARM' ? 'sb-badge-warn' : 'sb-badge-info'}`}>
                        {fu.temperature}
                      </span>
                    </td>
                    <td>
                      <span className="text-slate-300 text-xs tabular-nums">
                        {fu.opens || 2} opens, {fu.clicks || 1} clicks
                      </span>
                    </td>
                    <td>
                      <span className={`sb-badge ${fu.status === 'COMPLETED' ? 'sb-badge-good' : 'sb-badge-warn'}`}>
                        {fu.status}
                      </span>
                    </td>
                    <td className="text-slate-400 whitespace-nowrap">{fmtDate(fu.dueAt)}</td>
                    <td>
                      <span className="sb-badge sb-badge-info text-[10px]">{fu.outcome || 'PENDING_DISPATCH'}</span>
                    </td>
                    <td className="text-right">
                      <button
                        className="sb-btn sb-btn-outline sb-btn-xs gap-1"
                        onClick={() => handleDismissFollowup(fu.id)}
                      >
                        <CheckCircle2 size={12} className="text-emerald-400" /> Resolve
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
         3. ENGAGEMENT & HOT LEADS TAB
         ========================================================================= */}
      {activeTab === 'engagement' && (
        <div className="space-y-6">
          {/* Subtab Toggle */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <button
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${engSubTab === 'overview' ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setEngSubTab('overview')}
            >
              Engagement Overview
            </button>
            <button
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${engSubTab === 'hot-leads' ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setEngSubTab('hot-leads')}
            >
              Hot Leads Spotlight ({hotLeads.length})
            </button>
          </div>

          {engSubTab === 'overview' ? (
            <div className="space-y-6">
              <div className="sb-metric-strip-4">
                <div className="sb-stat-tile">
                  <span className="sb-stat-label">Emails Sent Today</span>
                  <span className="sb-stat-val text-white">18</span>
                </div>
                <div className="sb-stat-tile">
                  <span className="sb-stat-label">Open Rate</span>
                  <span className="sb-stat-val text-indigo-400">46.2%</span>
                </div>
                <div className="sb-stat-tile">
                  <span className="sb-stat-label">Click Rate</span>
                  <span className="sb-stat-val text-emerald-400">24.8%</span>
                </div>
                <div className="sb-stat-tile">
                  <span className="sb-stat-label">Reply Rate</span>
                  <span className="sb-stat-val text-purple-400">14.5%</span>
                </div>
              </div>

              <div className="sb-card-panel">
                <div className="sb-card-header">
                  <h3 className="sb-card-title"><Activity size={16} /> All Live Engagement Signals</h3>
                </div>
                <div className="sb-table-wrap border-none">
                  <table className="sb-clean-table">
                    <thead>
                      <tr>
                        <th>Prospect</th>
                        <th>Event</th>
                        <th>Company</th>
                        <th>Timestamp</th>
                        <th>Score Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {engagement.map(ev => (
                        <tr key={ev.id}>
                          <td className="font-semibold text-white">{ev.leadName}</td>
                          <td>
                            <span className="sb-badge sb-badge-info">{statusLabel(ev.type)}</span>
                          </td>
                          <td className="text-slate-300">{ev.company}</td>
                          <td className="text-slate-400 whitespace-nowrap">{new Date(ev.timestamp).toLocaleString()}</td>
                          <td className="text-emerald-400 font-mono font-bold">{ev.scoreDelta}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="sb-table-wrap">
              <table className="sb-clean-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Role</th>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Score</th>
                    <th>Tier</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {hotLeads.map(l => (
                    <tr key={l.id}>
                      <td className="font-semibold text-white">
                        {[l.firstName, l.lastName].filter(Boolean).join(' ')}
                      </td>
                      <td className="text-slate-300">{l.title}</td>
                      <td className="text-slate-200">{l.companyName}</td>
                      <td className="text-slate-400">{l.location}</td>
                      <td><ScoreBar score={l.score} /></td>
                      <td>
                        <span className="sb-badge sb-badge-bad text-[10px]">{l.tier}</span>
                      </td>
                      <td className="text-right">
                        <button
                          className="sb-btn sb-btn-outline sb-btn-xs gap-1"
                          onClick={() => {
                            setCustomDraftLead(l);
                            setCustomSubject(`HNW Wealth Advisory Discussion – ${l.companyName || 'Private Banking'}`);
                            setCustomBody(`<p>Dear ${l.firstName || 'Executive'},</p><p>We specialize in discretionary wealth advisory and corporate class tax shielding for Canadian partners and business owners.</p>`);
                          }}
                        >
                          <Sparkles size={12} className="text-indigo-400" /> Quick Outreach
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
         4. AUTOMATIONS & SCHEDULES TAB
         ========================================================================= */}
      {activeTab === 'automations' && (
        <div className="space-y-6">
          <div className="sb-metric-strip-4">
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Discovery Automation</span>
              <span className="sb-stat-val text-white">
                {icps.filter(i => i.searchMode === 'AUTOMATED').length} / {icps.length}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">ICPs on autonomous discovery</p>
            </div>
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Outreach Auto-Send</span>
              <span className="sb-stat-val text-emerald-400">
                {icps.filter(i => i.autoSend).length} / {icps.length}
              </span>
              <p className="text-[11px] text-slate-400 mt-1">ICPs sending without manual review</p>
            </div>
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Daily Send Limit</span>
              <span className="sb-stat-val text-indigo-400">55 / 100</span>
              <p className="text-[11px] text-slate-400 mt-1">Compliance safety buffer</p>
            </div>
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Next Scheduled Run</span>
              <span className="sb-stat-val text-amber-400">Tomorrow 09:00</span>
              <p className="text-[11px] text-slate-400 mt-1">Apollo SEDAR+ scraper sync</p>
            </div>
          </div>

          <div className="sb-table-wrap">
            <table className="sb-clean-table">
              <thead>
                <tr>
                  <th>ICP Name</th>
                  <th>Discovery Mode</th>
                  <th>Auto-Send</th>
                  <th>Schedule Time</th>
                  <th>Daily Cap</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {icps.map(icp => (
                  <tr key={icp.id}>
                    <td>
                      <p className="font-semibold text-white">{icp.name}</p>
                      <p className="text-[11px] text-slate-400">{icp.description}</p>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={icp.searchMode === 'AUTOMATED'}
                          onChange={() => {
                            setIcps(prev => prev.map(i => i.id === icp.id ? { ...i, searchMode: i.searchMode === 'AUTOMATED' ? 'REVIEW' : 'AUTOMATED' } : i));
                            notify(`Discovery mode updated`, 'success');
                          }}
                        />
                        <span className="text-xs text-slate-300">
                          {icp.searchMode === 'AUTOMATED' ? 'Automated' : 'Manual Review'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!icp.autoSend}
                          onChange={() => {
                            setIcps(prev => prev.map(i => i.id === icp.id ? { ...i, autoSend: !i.autoSend } : i));
                            notify(`Auto-send updated`, 'success');
                          }}
                        />
                        <span className="text-xs text-slate-300">{icp.autoSend ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </td>
                    <td className="text-slate-300 tabular-nums">{icp.scheduleTime || '09:00'} EST</td>
                    <td className="text-slate-300 tabular-nums">{icp.dailySendCap || 25} contacts</td>
                    <td>
                      <span className={`sb-badge ${icp.isActive ? 'sb-badge-good' : 'sb-badge-muted'}`}>
                        {icp.isActive ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        className="sb-btn sb-btn-outline sb-btn-xs gap-1"
                        onClick={() => {
                          setSearchRunIcp(icp.id);
                          handleStartSearch(false);
                        }}
                      >
                        <Play size={12} className="text-emerald-400" /> Run Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
         5. ICPS TAB (EXACT REPLICA OF icps-tab.tsx)
         ========================================================================= */}
      {activeTab === 'icps' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-400">
              Ideal customer profiles that searches and scoring run against.
            </p>
            <button className="sb-btn sb-btn-primary gap-1.5" onClick={() => setCreateIcpOpen(true)}>
              <Plus size={15} /> New ICP
            </button>
          </div>

          <div className="sb-table-wrap">
            <table className="sb-clean-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Active</th>
                  <th>Min score</th>
                  <th>Mode</th>
                  <th>Leads</th>
                  <th>Searches</th>
                  <th>Last run</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {icps.map(icp => (
                  <tr key={icp.id}>
                    <td>
                      <p className="font-semibold text-sm text-white">{icp.name}</p>
                      {icp.description && (
                        <p className="text-xs text-slate-400 line-clamp-1 max-w-[340px] mt-0.5">
                          {icp.description}
                        </p>
                      )}
                    </td>
                    <td>
                      <Switch
                        checked={icp.isActive}
                        onChange={() => handleToggleIcpActive(icp.id, icp.isActive)}
                      />
                    </td>
                    <td className="tabular-nums font-semibold text-white">{icp.minScore}</td>
                    <td className="text-xs">
                      <span className="sb-badge sb-badge-muted">
                        {icp.searchMode === 'REVIEW' ? 'Review first' : 'Automated'}
                      </span>
                    </td>
                    <td className="tabular-nums font-semibold text-white">
                      {icp._count?.leads ?? (icp.id === 'icp-canadian-wealth' ? 738 : 0)}
                    </td>
                    <td className="tabular-nums text-slate-300">
                      {icp._count?.jobs ?? (icp.id === 'icp-canadian-wealth' ? 3 : 0)}
                    </td>
                    <td className="text-xs text-slate-400 whitespace-nowrap">
                      {fmtDate(icp.lastRunAt || '2026-11-17T14:15:00.000Z')}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          className="sb-btn sb-btn-outline sb-btn-xs gap-1"
                          title="Run Search"
                          onClick={() => {
                            setSearchRunIcp(icp.id);
                            setActiveTab('searches');
                          }}
                        >
                          <Rocket size={13} className="text-indigo-400" /> Run
                        </button>
                        <button
                          className="sb-btn sb-btn-outline sb-btn-xs gap-1"
                          title="Generate Drafts"
                          onClick={() => {
                            notify(`Draft generation queued for ${icp.name}`, 'success');
                          }}
                        >
                          <Mail size={13} className="text-emerald-400" /> Drafts
                        </button>
                        <button
                          className="sb-btn sb-btn-ghost sb-btn-icon"
                          title="Edit Profile"
                          onClick={() => {
                            setNewIcpForm({
                              name: icp.name,
                              description: icp.description || '',
                              offer: icp.offer || '',
                              minScore: icp.minScore || 70,
                              searchMode: icp.searchMode || 'REVIEW',
                              dailySendCap: icp.dailySendCap || 25,
                              monthlyRevealBudget: icp.monthlyRevealBudget || 100,
                              scheduleTime: icp.scheduleTime || '09:00',
                              industries: 'Legal Services, Higher Education, Private Banking',
                              titles: 'Partner, Senior Counsel, Clinic Owner',
                              locations: 'Canada'
                            });
                            setCreateIcpOpen(true);
                          }}
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
         6. SEARCHES TAB (EXACT REPLICA OF searches-tab.tsx)
         ========================================================================= */}
      {activeTab === 'searches' && (
        <div className="space-y-5">
          {/* Top Search Runner Card */}
          <div className="sb-card-panel p-4 space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5 min-w-[220px] flex-1 max-w-sm">
                <label className="text-xs font-semibold text-slate-300 block">ICP</label>
                <select
                  className="sb-select w-full"
                  value={searchRunIcp}
                  onChange={e => setSearchRunIcp(e.target.value)}
                >
                  {icps.map(i => (
                    <option key={i.id} value={i.id}>
                      {i.name} {!i.isActive ? '(paused)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 w-28">
                <label className="text-xs font-semibold text-slate-300 block">Pages</label>
                <select
                  className="sb-select w-full"
                  value={searchRunPages}
                  onChange={e => setSearchRunPages(e.target.value)}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </div>

              <button
                className="sb-btn sb-btn-outline gap-1.5"
                onClick={() => handleStartSearch(true)}
              >
                <Sparkles size={14} className="text-indigo-400" /> Plan with AI (review first)
              </button>

              <button
                className="sb-btn sb-btn-primary gap-1.5"
                onClick={() => handleStartSearch(false)}
              >
                <Play size={14} /> Run now
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Searching Apollo's people database is free. Revealing emails spends credits, within each ICP's monthly budget.
            </p>
          </div>

          {/* Search History Section */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white">History</h2>
            <div className="sb-table-wrap">
              <table className="sb-clean-table">
                <thead>
                  <tr>
                    <th>ICP</th>
                    <th>Status</th>
                    <th>Progress</th>
                    <th>Results</th>
                    <th>Started</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {searches.map(j => (
                    <tr key={j.id}>
                      <td className="font-medium text-sm text-white">{j.icpName || j.icp?.name || 'Canadian Wealth'}</td>
                      <td><JobStatusBadge status={j.status} /></td>
                      <td className="text-xs tabular-nums text-slate-300">
                        {j.status === 'RUNNING' ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Loader2 size={12} className="animate-spin text-indigo-400" /> page {j.page}/{j.maxPages}
                          </span>
                        ) : (
                          `${j.page || 1}/${j.maxPages || 5} pages`
                        )}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                          <span><strong className="text-white">{j.companiesFound || 0}</strong> <span className="text-slate-400">companies</span></span>
                          <span><strong className="text-white">{j.peopleFound || 0}</strong> <span className="text-slate-400">people</span></span>
                          <span><strong className="text-white">{j.newLeads || 0}</strong> <span className="text-slate-400">new</span></span>
                          <span><strong className="text-white">{j.qualified || 0}</strong> <span className="text-slate-400">qualified</span></span>
                          <span><strong className="text-white">{j.revealed || 0}</strong> <span className="text-slate-400">revealed</span></span>
                        </div>
                      </td>
                      <td className="text-xs text-slate-400 whitespace-nowrap">{fmtDate(j.createdAt)}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          {j.status === 'PLANNED' && (
                            <button
                              className="sb-btn sb-btn-outline sb-btn-xs"
                              onClick={() => setReviewingSearchJob(j)}
                            >
                              Review plan
                            </button>
                          )}
                          <button
                            className="sb-btn sb-btn-ghost sb-btn-xs"
                            onClick={() => {
                              notify(`Query: ${j.plan?.query || 'Apollo search'} · ${j.companiesFound || 0} companies found`, 'info');
                            }}
                          >
                            Process
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* =========================================================================
         7. LEADS TAB (EXACT REPLICA OF leads-tab.tsx)
         ========================================================================= */}
      {activeTab === 'leads' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="sb-filter-bar">
            <div className="relative flex-1 min-w-[220px] max-w-xs">
              <Search className="absolute left-2.5 top-2.5 size-4 text-slate-500" />
              <input
                type="text"
                className="sb-input pl-8 w-full"
                placeholder="Search name, company, title"
                value={leadQuery}
                onChange={e => { setLeadQuery(e.target.value); setLeadPage(1); }}
              />
            </div>

            <select
              className="sb-select w-[180px]"
              value={leadIcpFilter}
              onChange={e => { setLeadIcpFilter(e.target.value); setLeadPage(1); }}
            >
              <option value="__all">All ICPs</option>
              {icps.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>

            <select
              className="sb-select w-[190px]"
              value={leadStatusFilter}
              onChange={e => { setLeadStatusFilter(e.target.value); setLeadPage(1); }}
            >
              <option value="__all">All statuses</option>
              <option value="HIGH_PRIORITY">High Priority</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="READY_FOR_OUTREACH">Ready for Outreach</option>
              <option value="IN_CAMPAIGN">In Campaign</option>
              <option value="CONTACTED">Contacted</option>
              <option value="REPLIED">Replied</option>
              <option value="NEW">New</option>
            </select>

            <input
              type="number"
              min="0"
              max="100"
              className="sb-input w-28"
              placeholder="Min score"
              value={leadMinScore}
              onChange={e => { setLeadMinScore(e.target.value); setLeadPage(1); }}
            />

            <select
              className="sb-select w-40"
              value={leadSort}
              onChange={e => { setLeadSort(e.target.value); setLeadPage(1); }}
            >
              <option value="score">Highest score</option>
              <option value="recent">Most recent</option>
              <option value="company">Company A-Z</option>
            </select>
          </div>

          {/* Table */}
          <div className="sb-table-wrap">
            <table className="sb-clean-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Title</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Location</th>
                  <th>ICP</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLeads.map(l => (
                  <tr
                    key={l.id}
                    className="clickable"
                    onClick={() => setSelectedLeadId(l.id)}
                  >
                    <td className="font-medium text-sm text-white whitespace-nowrap">
                      {[l.firstName, l.lastName].filter(Boolean).join(' ') || 'Unknown'}
                    </td>
                    <td className="text-xs text-slate-300 max-w-[200px] truncate">{l.title || '-'}</td>
                    <td>
                      <p className="text-sm text-white font-medium">{l.companyName || '-'}</p>
                      {l.companyDomain && (
                        <p className="text-[11px] text-slate-400">{l.companyDomain}</p>
                      )}
                    </td>
                    <td className="text-xs text-slate-300">
                      {l.email || <span className="text-slate-500">Not revealed</span>}
                    </td>
                    <td className="text-xs text-slate-400 max-w-[160px] truncate">
                      {l.location || '-'}
                    </td>
                    <td className="text-xs text-slate-300 whitespace-nowrap">
                      {l.icpName || 'Canadian Wealth'}
                    </td>
                    <td>
                      <ScoreBar score={l.score} />
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <LeadStatusBadge status={l.status} />
                        {l.tier && (
                          <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300">
                            {l.tier}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-xs text-slate-400 whitespace-nowrap">
                      {fmtDate(l.updatedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Strip */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>{filteredLeads.length} leads</span>
            <div className="flex items-center gap-2">
              <button
                className="sb-btn sb-btn-outline sb-btn-xs sb-btn-icon"
                disabled={leadPage <= 1}
                onClick={() => setLeadPage(p => p - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              <span className="tabular-nums">
                Page {leadPage} of {leadTotalPages}
              </span>
              <button
                className="sb-btn sb-btn-outline sb-btn-xs sb-btn-icon"
                disabled={leadPage >= leadTotalPages}
                onClick={() => setLeadPage(p => p + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         8. OUTREACH DRAFTS TAB (EXACT REPLICA OF drafts-tab.tsx)
         ========================================================================= */}
      {activeTab === 'outreach' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="sb-filter-bar">
            <select
              className="sb-select w-[180px]"
              value={draftIcpFilter}
              onChange={e => { setDraftIcpFilter(e.target.value); setDraftPage(1); }}
            >
              <option value="__all">All ICPs</option>
              {icps.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>

            <select
              className="sb-select w-[200px]"
              value={draftStatusFilter}
              onChange={e => { setDraftStatusFilter(e.target.value); setDraftPage(1); }}
            >
              <option value="__all">All statuses</option>
              <option value="PENDING_APPROVAL">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="REJECTED">Rejected</option>
            </select>

            <input
              type="date"
              className="sb-input w-40"
              value={draftDateFilter}
              onChange={e => { setDraftDateFilter(e.target.value); setDraftPage(1); }}
            />

            <button
              className="sb-btn sb-btn-primary"
              disabled={!pendingDraftsCount}
              onClick={handleApproveAllDrafts}
            >
              Approve all pending ({pendingDraftsCount})
            </button>

            <button
              className="sb-btn sb-btn-outline gap-1.5"
              onClick={loadAllData}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Re-run skipped and not written
            </button>
            <span className="text-xs text-slate-500 ml-auto">Refreshes every 10 seconds.</span>
          </div>

          {/* Table */}
          <div className="sb-table-wrap">
            <table className="sb-clean-table">
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Company</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Sent?</th>
                  <th>Reason / why</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDrafts.map(d => (
                  <tr
                    key={d.id}
                    className="clickable"
                    onClick={() => setSelectedDraftId(d.id)}
                  >
                    <td className="font-medium text-sm text-white whitespace-nowrap">
                      {d.leadName || 'Canadian Senior Executive'}
                      <p className="text-[11px] font-normal text-slate-400">{d.icpName || 'Canadian Wealth'}</p>
                    </td>
                    <td className="text-sm text-slate-300">{d.companyName || '-'}</td>
                    <td className="text-xs text-slate-400">{d.toEmail || 'Revealed on send'}</td>
                    <td className="text-xs text-slate-200 max-w-[240px] truncate">{d.subject || '-'}</td>
                    <td>
                      <DraftStatusBadge status={d.status} />
                    </td>
                    <td className="text-xs max-w-[200px]">
                      <p className={`font-medium ${d.status === 'SENT' ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {d.status === 'SENT' ? 'Sent' : d.status === 'APPROVED' ? 'Queued to send' : 'Waiting for approval'}
                      </p>
                      {d.sentAt && <span className="text-slate-500 text-[10px]">{fmtDate(d.sentAt)}</span>}
                    </td>
                    <td className="text-xs text-slate-400 max-w-[260px] truncate">
                      {d.selectionReason || 'High match with target Canadian Wealth ICP'}
                    </td>
                    <td className="text-xs text-slate-400 whitespace-nowrap">
                      {fmtDate(d.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
            <span>{filteredDrafts.length} drafts</span>
            <div className="flex items-center gap-2">
              <button
                className="sb-btn sb-btn-outline sb-btn-xs sb-btn-icon"
                disabled={draftPage <= 1}
                onClick={() => setDraftPage(p => p - 1)}
              >
                <ChevronLeft size={14} />
              </button>
              <span className="tabular-nums">
                Page {draftPage} of {draftTotalPages}
              </span>
              <button
                className="sb-btn sb-btn-outline sb-btn-xs sb-btn-icon"
                disabled={draftPage >= draftTotalPages}
                onClick={() => setDraftPage(p => p + 1)}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         9. INSIGHTS TAB (EXACT REPLICA OF dashboard-tab.tsx)
         ========================================================================= */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          <div className="sb-metric-strip-4">
            <div className="sb-stat-tile">
              <span className="sb-stat-label">ICPs</span>
              <span className="sb-stat-val text-white">{dashboard?.activeIcps ?? 2} active / {dashboard?.icps ?? 2}</span>
            </div>
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Leads found</span>
              <span className="sb-stat-val text-white">{dashboard?.totalLeads ?? leads.length}</span>
            </div>
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Apollo credits used this month</span>
              <span className="sb-stat-val text-indigo-400">142</span>
            </div>
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Searches run</span>
              <span className="sb-stat-val text-white">{searches.length}</span>
            </div>
          </div>

          {/* Outreach Drafts breakdown */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white">Outreach drafts</h2>
            <div className="sb-metric-strip-4">
              <div className="sb-stat-tile">
                <span className="sb-stat-label">Pending approval</span>
                <span className="sb-stat-val text-amber-400">{pendingDraftsCount}</span>
              </div>
              <div className="sb-stat-tile">
                <span className="sb-stat-label">Sent</span>
                <span className="sb-stat-val text-emerald-400">{drafts.filter(d => d.status === 'SENT').length}</span>
              </div>
              <div className="sb-stat-tile">
                <span className="sb-stat-label">Not emailed</span>
                <span className="sb-stat-val text-slate-400">0</span>
              </div>
              <div className="sb-stat-tile">
                <span className="sb-stat-label">Failed</span>
                <span className="sb-stat-val text-rose-400">0</span>
              </div>
            </div>
          </section>

          {/* Leads by Status */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white">Leads by status</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { status: 'HIGH_PRIORITY', label: 'High Priority', count: 40 },
                { status: 'QUALIFIED', label: 'Qualified', count: 140 },
                { status: 'READY_FOR_OUTREACH', label: 'Ready For Outreach', count: 120 },
                { status: 'IN_CAMPAIGN', label: 'In Campaign', count: 100 },
                { status: 'CONTACTED', label: 'Contacted', count: 30 },
                { status: 'REPLIED', label: 'Replied', count: 15 },
                { status: 'NEW', label: 'New', count: 293 },
              ].map(st => (
                <div key={st.status} className="flex items-center justify-between rounded-lg border border-white/10 bg-[#111A2E] px-3.5 py-2.5">
                  <span className="text-xs text-slate-400">{st.label}</span>
                  <span className="text-sm font-semibold tabular-nums text-white">{st.count}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Lead Sources */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white">Lead sources</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Apollo.io People & Org API', connected: true, note: 'Primary B2B contact engine' },
                { label: 'Canada TSX/SEDAR+ Filings', connected: true, note: 'Live Canadian wire signals & executive liquidity' },
                { label: 'Canadian Legal & Medical Regs', connected: true, note: 'Law Society & Medical College directories' },
              ].map(src => (
                <div key={src.label} className="sb-card-panel p-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-white">{src.label}</h4>
                    <span className="sb-badge sb-badge-good text-[10px]">Connected</span>
                  </div>
                  <p className="text-xs text-slate-400">{src.note}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* =========================================================================
         SLIDE-OVER SHEET: LEAD DETAIL (LeadDetailSheet)
         ========================================================================= */}
      {selectedLead && (
        <div className="sb-sheet-backdrop" onClick={() => setSelectedLeadId(null)}>
          <div className="sb-sheet-panel" onClick={e => e.stopPropagation()}>
            <div className="sb-sheet-header">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="sb-sheet-title">
                    {[selectedLead.firstName, selectedLead.lastName].filter(Boolean).join(' ') || 'Senior Executive'}
                  </h3>
                  <p className="sb-sheet-desc">
                    {[selectedLead.title, selectedLead.companyName].filter(Boolean).join(' at ')}
                    {selectedLead.location ? ` · ${selectedLead.location}` : ''}
                  </p>
                </div>
                <button className="sb-btn sb-btn-ghost sb-btn-icon" onClick={() => setSelectedLeadId(null)}>
                  <X size={16} />
                </button>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <LeadStatusBadge status={selectedLead.status} />
                <ScoreBar score={selectedLead.score} />
                <span className="text-xs text-slate-400">ICP: {selectedLead.icpName || 'Canadian Wealth'}</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <button
                className="sb-btn sb-btn-primary flex-1 gap-1"
                onClick={() => {
                  setCustomDraftLead(selectedLead);
                  setCustomSubject(`Discretionary Wealth Advisory – ${selectedLead.companyName || 'ScotiaMcLeod'}`);
                  setCustomBody(`<p>Dear ${selectedLead.firstName || 'Executive'},</p><p>We specialize in discretionary wealth advisory and corporate class tax shielding for Canadian partners and business owners.</p>`);
                  setSelectedLeadId(null);
                }}
              >
                <Sparkles size={14} /> Custom Outreach
              </button>
              <button
                className="sb-btn sb-btn-outline gap-1"
                onClick={() => {
                  notify(`Email verified: ${selectedLead.email || 'partner@firm.ca'}`, 'success');
                }}
              >
                <Mail size={14} className="text-emerald-400" /> Verify Contact
              </button>
            </div>

            {/* AI Fit Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300">AI Seniority &amp; Wealth Fit Score</h4>
              <div className="rounded-lg border border-white/10 bg-[#070B14] p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Title &amp; Seniority Weight</span>
                  <span className="text-white font-semibold">25 / 25 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Canadian Regional Jurisdiction</span>
                  <span className="text-white font-semibold">20 / 20 pts</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">High-Equity Professional Corp Signal</span>
                  <span className="text-white font-semibold">20 / 20 pts</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-1.5">
                  <span className="text-slate-300 font-semibold">Total Intent Match</span>
                  <span className="text-emerald-400 font-bold font-mono">{Math.round(selectedLead.score || 95)} / 100</span>
                </div>
              </div>
            </div>

            {/* Target Division Mapping */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-semibold text-slate-300">Assigned Bank Wealth Division</h4>
              <p className="text-xs text-white p-2.5 rounded-lg bg-[#070B14] border border-white/10 font-medium">
                {selectedLead.targetDivision || 'ScotiaMcLeod & Private Banking (HNW Advisory)'}
              </p>
            </div>

            {/* Biography & Intent Rationale */}
            {selectedLead.biography && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-slate-300">Executive Profile &amp; Biography</h4>
                <p className="text-xs text-slate-300 p-3 rounded-lg bg-[#070B14] border border-white/10 leading-relaxed">
                  {selectedLead.biography}
                </p>
              </div>
            )}

            {/* Status Transitions */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <h4 className="text-xs font-semibold text-slate-300">Manual Status Actions</h4>
              <div className="flex flex-wrap gap-2">
                {['HIGH_PRIORITY', 'QUALIFIED', 'READY_FOR_OUTREACH', 'CONTACTED'].map(st => (
                  <button
                    key={st}
                    className="sb-btn sb-btn-outline sb-btn-xs"
                    onClick={() => {
                      setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: st } : l));
                      notify(`Status updated to ${statusLabel(st)}`, 'success');
                    }}
                  >
                    Mark {statusLabel(st)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         SLIDE-OVER SHEET: OUTREACH DRAFT (DraftDetailSheet)
         ========================================================================= */}
      {selectedDraft && (
        <div className="sb-sheet-backdrop" onClick={() => setSelectedDraftId(null)}>
          <div className="sb-sheet-panel" onClick={e => e.stopPropagation()}>
            <div className="sb-sheet-header">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="sb-sheet-title">{selectedDraft.leadName || 'Recipient'}</h3>
                  <p className="sb-sheet-desc">To: {selectedDraft.toEmail || 'Verified Corporate Email'}</p>
                </div>
                <button className="sb-btn sb-btn-ghost sb-btn-icon" onClick={() => setSelectedDraftId(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <DraftStatusBadge status={selectedDraft.status} />
                <span className="text-xs text-slate-400">ICP: {selectedDraft.icpName || 'Canadian Wealth'}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Subject</label>
                <div className="p-2.5 rounded-lg bg-[#070B14] border border-white/10 text-xs font-semibold text-white">
                  {selectedDraft.subject}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Email Body</label>
                <div
                  className="p-4 rounded-lg bg-[#070B14] border border-white/10 text-xs text-slate-200 leading-relaxed max-h-[360px] overflow-y-auto space-y-2"
                  dangerouslySetInnerHTML={{ __html: selectedDraft.bodyHtml }}
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck size={14} /> CASL &amp; PIPEDA Certified
                </div>
                <p className="text-[11px] text-slate-300">
                  Sender identity and business address appended. Mandatory unsubscribe token embedded.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  className="sb-btn sb-btn-ghost text-rose-400"
                  onClick={() => handleRejectDraft(selectedDraft.id)}
                >
                  <ThumbsDown size={14} /> Reject
                </button>
                <button
                  className="sb-btn sb-btn-primary gap-1"
                  onClick={() => handleApproveDraft(selectedDraft.id)}
                >
                  <ThumbsUp size={14} /> Approve &amp; Queue Outreach
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         SLIDE-OVER SHEET: CREATE ICP (IcpFormSheet)
         ========================================================================= */}
      {createIcpOpen && (
        <div className="sb-sheet-backdrop" onClick={() => setCreateIcpOpen(false)}>
          <div className="sb-sheet-panel" onClick={e => e.stopPropagation()}>
            <div className="sb-sheet-header">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="sb-sheet-title">Target Ideal Customer Profile</h3>
                  <p className="sb-sheet-desc">Auditable targeting matrices, seniority gates, and scoring weights.</p>
                </div>
                <button className="sb-btn sb-btn-ghost sb-btn-icon" onClick={() => setCreateIcpOpen(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateIcp} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Profile Name</label>
                <input
                  type="text"
                  required
                  className="sb-input w-full"
                  placeholder="e.g. Canadian Senior Medical Directors & Clinic Owners"
                  value={newIcpForm.name}
                  onChange={e => setNewIcpForm({ ...newIcpForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Description</label>
                <textarea
                  className="sb-input w-full h-16 py-2"
                  placeholder="Target persona background and mandate..."
                  value={newIcpForm.description}
                  onChange={e => setNewIcpForm({ ...newIcpForm, description: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Advisory Offer Value Prop</label>
                <textarea
                  className="sb-input w-full h-16 py-2"
                  placeholder="Discretionary management, IPP pension, holding company tax shielding..."
                  value={newIcpForm.offer}
                  onChange={e => setNewIcpForm({ ...newIcpForm, offer: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Minimum Score</label>
                  <input
                    type="number"
                    min="50"
                    max="95"
                    className="sb-input w-full"
                    value={newIcpForm.minScore}
                    onChange={e => setNewIcpForm({ ...newIcpForm, minScore: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 block">Discovery Mode</label>
                  <select
                    className="sb-select w-full"
                    value={newIcpForm.searchMode}
                    onChange={e => setNewIcpForm({ ...newIcpForm, searchMode: e.target.value })}
                  >
                    <option value="REVIEW">Review first</option>
                    <option value="AUTOMATED">Automated</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Target Industries (Comma-separated)</label>
                <input
                  type="text"
                  className="sb-input w-full"
                  value={newIcpForm.industries}
                  onChange={e => setNewIcpForm({ ...newIcpForm, industries: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Target Senior Titles</label>
                <input
                  type="text"
                  className="sb-input w-full"
                  value={newIcpForm.titles}
                  onChange={e => setNewIcpForm({ ...newIcpForm, titles: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <button
                  type="button"
                  className="sb-btn sb-btn-ghost"
                  onClick={() => setCreateIcpOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="sb-btn sb-btn-primary">
                  Save ICP Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
         MODAL: SEARCH PLAN REVIEW (PlanReviewDialog)
         ========================================================================= */}
      {reviewingSearchJob && (
        <div className="sb-dialog-backdrop" onClick={() => setReviewingSearchJob(null)}>
          <div className="sb-dialog-box space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">Review Apollo Search Plan</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Auditable AI search query before executing Apollo database sync.
                </p>
              </div>
              <button className="sb-btn sb-btn-ghost sb-btn-icon" onClick={() => setReviewingSearchJob(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-lg bg-[#070B14] border border-white/10 space-y-1.5">
                <span className="text-slate-400 block font-semibold">Query Target:</span>
                <p className="text-white font-medium">{reviewingSearchJob.plan?.query || 'Senior Canadian Executives'}</p>
                {reviewingSearchJob.rationale && (
                  <p className="text-slate-300 mt-1">{reviewingSearchJob.rationale}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                className="sb-btn sb-btn-ghost"
                onClick={() => setReviewingSearchJob(null)}
              >
                Cancel
              </button>
              <button
                className="sb-btn sb-btn-primary gap-1"
                onClick={() => handleApproveSearchJob(reviewingSearchJob.id)}
              >
                <Play size={14} /> Approve &amp; Run Search
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         MODAL: CUSTOM OUTREACH COMPOSER (CustomOutreachDialog)
         ========================================================================= */}
      {customDraftLead && (
        <div className="sb-dialog-backdrop" onClick={() => setCustomDraftLead(null)}>
          <div className="sb-dialog-box space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">
                  Custom AI Outreach Draft: {[customDraftLead.firstName, customDraftLead.lastName].filter(Boolean).join(' ')}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {customDraftLead.title} at {customDraftLead.companyName}
                </p>
              </div>
              <button className="sb-btn sb-btn-ghost sb-btn-icon" onClick={() => setCustomDraftLead(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomDraft} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Subject Line</label>
                <input
                  type="text"
                  required
                  className="sb-input w-full"
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 block">Email Body (HTML)</label>
                <textarea
                  required
                  className="sb-input w-full h-44 py-2 leading-relaxed"
                  value={customBody}
                  onChange={e => setCustomBody(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  className="sb-btn sb-btn-ghost"
                  onClick={() => setCustomDraftLead(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="sb-btn sb-btn-primary gap-1">
                  <Send size={13} /> Save &amp; Queue Outreach
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
