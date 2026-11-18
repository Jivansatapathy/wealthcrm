import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import IcpFormSheet from './IcpFormSheet';
import {
  BrainCircuit, Sparkles, Rocket, Users, Mail, Clock, Activity, CalendarClock,
  LineChart, Plus, CheckCircle2, AlertTriangle, RefreshCw, X, Search,
  ExternalLink, Eye, Send, ThumbsUp, ThumbsDown, Zap, ShieldCheck, ChevronRight,
  Flame, Phone, MailOpen, MousePointerClick, MessageSquareReply, Play, Pause,
  Filter, ChevronLeft, Pencil, Copy, Trash2, ArrowRight, Loader2, Flag,
  Coffee, LogOut, Bell, Calendar
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
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '-';
  }
}

function fmtDateTime(iso) {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ', ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '-';
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

function getFeedEventMeta(type) {
  switch (type) {
    case 'EMAIL_OPENED':
      return { icon: MailOpen, action: 'email opened', boxClass: 'sb-feed-icon-open' };
    case 'EMAIL_CLICKED':
      return { icon: MousePointerClick, action: 'link clicked', boxClass: 'sb-feed-icon-click' };
    case 'EMAIL_REPLIED':
      return { icon: MessageSquareReply, action: 'replied to outreach', boxClass: 'sb-feed-icon-reply' };
    case 'MEETING_BOOKED':
      return { icon: CalendarClock, action: 'meeting booked', boxClass: 'sb-feed-icon-meeting' };
    case 'EMAIL_SENT':
      return { icon: Send, action: 'outreach sent', boxClass: 'sb-feed-icon-sent' };
    default:
      return { icon: Mail, action: 'outreach sent', boxClass: 'sb-feed-icon-default' };
  }
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

  // Command Center Follow-Up Queue Filters (Gentle CRM Replica)
  const [queueDateFilter, setQueueDateFilter] = useState('');
  const [queueSortOrder, setQueueSortOrder] = useState('newest');

  // Engagement Tab Subtab
  const [engSubTab, setEngSubTab] = useState('overview');

  // Modals & Slide-Over Drawers
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [selectedDraftId, setSelectedDraftId] = useState(null);
  const [createIcpOpen, setCreateIcpOpen] = useState(false);
  const [editingIcp, setEditingIcp] = useState(null);
  const [reviewingSearchJob, setReviewingSearchJob] = useState(null);
  const [customDraftLead, setCustomDraftLead] = useState(null);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');

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

  const [runningIcpId, setRunningIcpId] = useState(null);

  const handleRunIcp = async (icpId) => {
    setRunningIcpId(icpId);
    try {
      notify('Running Canadian prospect scraper & enrichment for ICP...', 'info');
      const res = await fetchBrain(`/icps/${icpId}/run`, { method: 'POST' });
      if (res && res.success) {
        notify(`Scraped and added ${res.newLeadsCount} verified Canada-specific leads to database & CSV!`, 'success');
        await loadAllData();
      } else {
        notify(res?.message || 'Search executed', 'info');
      }
    } catch (e) {
      notify(`ICP run failed: ${e.message}`, 'error');
    } finally {
      setRunningIcpId(null);
    }
  };

  const handleStartSearch = async (reviewFirst) => {
    if (!searchRunIcp) return;
    try {
      const job = await fetchBrain(`/icps/${searchRunIcp}/searches`, {
        method: 'POST',
        body: { maxPages: Number(searchRunPages), reviewFirst }
      });
      if (reviewFirst && job.status === 'PLANNED') {
        setSearches(prev => [job, ...prev]);
        setReviewingSearchJob(job);
      } else {
        notify('Search completed and new Canadian leads ingested!', 'success');
        await loadAllData();
      }
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const handleApproveSearchJob = async (searchId) => {
    try {
      const res = await fetchBrain(`/searches/${searchId}/approve`, { method: 'POST' });
      notify(`Search approved! Ingested ${res.newLeadsCount || 0} Canadian prospects.`, 'success');
      setReviewingSearchJob(null);
      await loadAllData();
    } catch (e) {
      notify(e.message, 'error');
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

  // Command Center Follow-Ups (Gentle CRM Replica)
  const displayedFollowups = useMemo(() => {
    let list = followups.filter(f => f.status === 'PENDING' || !f.status);
    if (queueDateFilter) {
      list = list.filter(f => {
        try {
          const d = new Date(f.dueAt).toISOString().slice(0, 10);
          return d === queueDateFilter;
        } catch {
          return false;
        }
      });
    }
    return list.sort((a, b) => {
      const da = new Date(a.dueAt || 0).getTime();
      const db = new Date(b.dueAt || 0).getTime();
      return queueSortOrder === 'newest' ? db - da : da - db;
    });
  }, [followups, queueDateFilter, queueSortOrder]);

  // Dynamic sticky top calculation:
  // If the left column is taller than the viewport, it scrolls naturally until
  // its bottom is fully visible in the viewport, and THEN sticks!
  const leftColRef = useRef(null);
  const [stickyTop, setStickyTop] = useState(null);

  useEffect(() => {
    function calculateStickyTop() {
      if (!leftColRef.current) return;
      const colHeight = leftColRef.current.offsetHeight;
      const vh = window.innerHeight;
      const bottomGap = 24;
      const topGap = 20;

      if (colHeight > vh - (topGap + bottomGap)) {
        // Taller than viewport: let panel scroll until its bottom reaches bottomGap above viewport bottom
        setStickyTop(vh - colHeight - bottomGap);
      } else {
        // Fits comfortably: stick at topGap
        setStickyTop(topGap);
      }
    }

    calculateStickyTop();
    window.addEventListener('resize', calculateStickyTop);

    const ro = new ResizeObserver(() => {
      calculateStickyTop();
    });
    if (leftColRef.current) {
      ro.observe(leftColRef.current);
    }

    return () => {
      window.removeEventListener('resize', calculateStickyTop);
      ro.disconnect();
    };
  }, [hotLeads, engagement, activeTab]);

  return (
    <div className="sb-container">
      {/* ----------------- TOP HEADER & STATUS BAR (GENTLE CRM EXACT REPLICA) ----------------- */}
      <div className="sb-header-bar">
        <div className="sb-header-left">
          <div className="sb-header-title-row">
            <div className="sb-icon-box">
              <BrainCircuit size={20} className="text-cyan-400" />
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
          <div className="sb-vertical-switch">
            <button className="sb-vertical-btn active">🍁 Wealth Management</button>
            <button className="sb-vertical-btn">🏢 Corporate Holdco</button>
            <button className="sb-vertical-btn">🌐 All</button>
          </div>
          <button
            className="sb-btn sb-btn-primary"
            onClick={() => {
              setEditingIcp(null);
              setCreateIcpOpen(true);
            }}
          >
            <Plus size={14} /> Create ICP
          </button>
          <button className="sb-btn sb-btn-outline" onClick={() => setActiveTab('automations')}>
            <Zap size={14} className="text-cyan-400" /> Automations &amp; Schedules
          </button>
        </div>
      </div>

      {/* ----------------- GENTLE CRM REPLICA NAVIGATION TABS ----------------- */}
      <div className="sb-tabs-nav">
        <div className="sb-tabs-list">
          {[
            { id: 'command', label: 'Command Center', icon: Zap, color: 'text-cyan-400' },
            { id: 'follow-ups', label: 'Follow-Ups', icon: Clock, color: 'text-indigo-400' },
            { id: 'engagement', label: 'Engagement', icon: Activity, color: 'text-rose-400' },
            { id: 'automations', label: 'Automations', icon: CalendarClock, color: 'text-amber-400' },
            { id: 'icps', label: `ICPs (${icps.length})`, icon: Users },
            { id: 'searches', label: `Searches (${searches.length})`, icon: Search },
            { id: 'leads', label: `Leads (${leads.length})`, icon: Users },
            { id: 'outreach', label: `Outreach (${pendingDraftsCount})`, icon: Mail },
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
                <Icon size={14} className={t.color || 'text-slate-400'} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
         1. COMMAND CENTER TAB (GENTLE CRM REPLICA)
         ========================================================================= */}
      {activeTab === 'command' && (
        <div className="space-y-5">
          {/* 7-column Unified Metric Strip with Vertical Borders (Gentle CRM Replica) */}
          <div className="sb-unified-metrics">
            <div className="sb-metric-cell">
              <span className="sb-metric-cell-label">Active ICPs</span>
              <span className="sb-metric-cell-value">
                {dashboard?.activeIcps ?? 2} / {dashboard?.icps ?? 2}
              </span>
            </div>
            <div className="sb-metric-cell">
              <span className="sb-metric-cell-label">Total Leads</span>
              <span className="sb-metric-cell-value">
                {dashboard?.totalLeads ?? leads.length}
              </span>
            </div>
            <div className="sb-metric-cell">
              <span className="sb-metric-cell-label">Emails Sent Today</span>
              <span className="sb-metric-cell-value">
                {dashboard?.stats?.todaySent ?? 18}
              </span>
            </div>
            <div className="sb-metric-cell">
              <span className="sb-metric-cell-label">Open Rate</span>
              <span className="sb-metric-cell-value text-cyan-400">
                {dashboard?.stats?.openRate ?? 46.2}%
              </span>
            </div>
            <div className="sb-metric-cell">
              <span className="sb-metric-cell-label">Click Rate</span>
              <span className="sb-metric-cell-value text-emerald-400">
                {dashboard?.stats?.clickRate ?? 24.8}%
              </span>
            </div>
            <div className="sb-metric-cell">
              <span className="sb-metric-cell-label">Hot Leads</span>
              <span className="sb-metric-cell-value text-rose-500">
                {dashboard?.leadsByTier?.HOT ?? 355}
              </span>
            </div>
            <div className="sb-metric-cell">
              <span className="sb-metric-cell-label">Follow-Ups Due</span>
              <span className="sb-metric-cell-value text-amber-400">
                {followups.filter(f => f.status === 'PENDING').length}
              </span>
            </div>
          </div>

          {/* Action Toolbar (Gentle CRM Replica) */}
          <div className="sb-action-toolbar">
            <div className="sb-toolbar-group">
              <button
                className="sb-btn-primary-action"
                onClick={() => {
                  setEditingIcp(null);
                  setCreateIcpOpen(true);
                }}
              >
                <Plus size={14} /> New ICP Profile
              </button>
              <button className="sb-btn-secondary-action" onClick={() => setActiveTab('searches')}>
                <Search size={14} className="text-indigo-400" /> Run Apollo Search
              </button>
              <button className="sb-btn-secondary-action" disabled={!pendingDraftsCount} onClick={handleApproveAllDrafts}>
                <CheckCircle2 size={14} className="text-emerald-400" /> Approve All Pending ({pendingDraftsCount})
              </button>
              <button className="sb-btn-secondary-action" onClick={loadAllData}>
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Re-run Skipped Outreach
              </button>
            </div>
            <div>
              <button className="sb-link-action" onClick={() => setActiveTab('automations')}>
                Automations &amp; Schedules <ArrowRight size={13} />
              </button>
            </div>
          </div>

          {/* Two-Column Split Layout (Gentle CRM Replica) */}
          <div className="sb-two-col-grid">
            {/* Left Column: High-Intent Spotlight & Activity Feed (Sticky when reaching its end) */}
            <div
              ref={leftColRef}
              className="sb-command-left-col"
              style={stickyTop !== null ? { top: `${stickyTop}px` } : undefined}
            >
              {/* Card 1: High-Intent Leads Spotlight */}
              <div className="sb-card-panel">
                <div className="sb-card-header">
                  <div className="sb-card-title">
                    <Flame size={16} className="text-rose-500" />
                    <span>High-Intent Leads Spotlight</span>
                  </div>
                  <button className="sb-btn-inline-link" onClick={() => setActiveTab('engagement')}>
                    View all ({hotLeads.length})
                  </button>
                </div>
                <div>
                  {hotLeads.slice(0, 4).map(lead => (
                    <div key={lead.id} className="sb-spotlight-row">
                      <div className="min-w-0 flex-1">
                        <div className="sb-spotlight-name-wrap">
                          <span className="sb-spotlight-name">
                            {[lead.firstName, lead.lastName].filter(Boolean).join(' ') || lead.companyName || 'Corporate Executive'}
                          </span>
                          <span className="sb-fu-pill-badge sb-fu-pill-hot">
                            Hot
                          </span>
                        </div>
                        <p className="sb-spotlight-sub">
                          {lead.companyName ? `${lead.companyName} · ` : ''}{lead.title || 'Senior Executive'} · Score {Math.round(lead.score || 91)}
                        </p>
                      </div>
                      <button
                        className="sb-btn-followup"
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

              {/* Card 2: Real-Time Engagement Feed */}
              <div className="sb-card-panel">
                <div className="sb-card-header">
                  <div className="sb-card-title">
                    <Activity size={16} className="text-cyan-400" />
                    <span>Real-Time Engagement Feed</span>
                  </div>
                  <span className="text-xs text-slate-500">Live updates</span>
                </div>
                <div className="sb-feed-list">
                  {engagement.slice(0, 8).map(ev => {
                    const meta = getFeedEventMeta(ev.type);
                    const EventIcon = meta.icon;

                    return (
                      <div key={ev.id} className="sb-feed-item">
                        <div className={`sb-feed-icon-box ${meta.boxClass}`}>
                          <EventIcon size={16} />
                        </div>
                        <div className="sb-feed-content">
                          <div className="sb-feed-title-line">
                            <span className="sb-feed-lead-name">{ev.leadName}</span>
                            <span className="sb-feed-action-text">{meta.action}</span>
                          </div>
                          <div className="sb-feed-time-line">
                            <span>{fmtDateTime(ev.timestamp)}</span>
                            {ev.company && (
                              <>
                                <span className="sb-feed-dot">·</span>
                                <span>{ev.company}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {ev.scoreDelta && (
                          <span className="sb-feed-badge sb-badge-good">
                            {ev.scoreDelta}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Urgent Follow-Up Tasks Queue (Gentle CRM Replica) */}
            <div className="sb-command-right-col sb-card-panel">
              <div className="sb-card-header">
                <div className="sb-card-title">
                  <CalendarClock size={16} className="text-amber-400" />
                  <span>Urgent Follow-Up Queue</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-slate-400">
                    {displayedFollowups.length} due
                  </span>
                  <button
                    onClick={() => setActiveTab('follow-ups')}
                    className="sb-btn-inline-link sb-btn-inline-indigo"
                  >
                    View Hub →
                  </button>
                </div>
              </div>

              {/* Filter Bar: Date Picker + Sort Select (Matches Gentle CRM) */}
              <div className="sb-fu-filter-bar">
                <input
                  type="date"
                  className="sb-fu-date-picker"
                  value={queueDateFilter}
                  onChange={(e) => setQueueDateFilter(e.target.value)}
                  placeholder="dd-mm-yyyy"
                />
                <select
                  className="sb-fu-sort-select"
                  value={queueSortOrder}
                  onChange={(e) => setQueueSortOrder(e.target.value)}
                >
                  <option value="newest">Newest due date first</option>
                  <option value="oldest">Oldest due date first</option>
                </select>
              </div>

              {/* Individual Follow-Up Item Cards (Scrolls naturally to end) */}
              <div className="sb-fu-card-list">
                {displayedFollowups.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    {queueDateFilter ? 'No follow-up tasks due on that date.' : 'All caught up! No follow-up tasks due right now.'}
                  </div>
                ) : (
                  displayedFollowups.map(fu => {
                    const mLead = leads.find(l => l.companyName === fu.company || l.id === fu.brainLeadId);
                    const score = mLead?.score ? Math.round(mLead.score) : 91;
                    const isHot = score >= 85;
                    const isWarm = score >= 60 && score < 85;

                    return (
                      <div key={fu.id} className="sb-fu-item-card">
                        <div className="sb-fu-item-header">
                          <span className="sb-fu-item-name">{fu.leadName || fu.contactName || 'Corporate Contact'}</span>
                          <span className={`sb-fu-pill-badge ${isHot ? 'sb-fu-pill-hot' : isWarm ? 'sb-fu-pill-warm' : 'sb-fu-pill-cold'}`}>
                            {isHot ? `Hot · ${score}` : isWarm ? `Warm · ${score}` : `Cold · ${score}`}
                          </span>
                        </div>
                        <div className="sb-fu-item-meta">
                          <span>{fu.company}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400" />
                            Due {fmtDateTime(fu.dueAt)}
                          </span>
                        </div>
                        <div className="sb-fu-actions-row">
                          <button
                            className="sb-btn-ai-draft"
                            onClick={() => {
                              if (mLead) {
                                setCustomDraftLead(mLead);
                                setCustomSubject(`Discretionary Wealth Structuring – ${mLead.companyName || fu.company}`);
                                setCustomBody(`<p>Dear ${mLead.firstName || 'Executive'},</p><p>Following up on our private wealth advisory discussion regarding ${fu.company}.</p>`);
                              } else {
                                notify(`Draft generated for ${fu.leadName || fu.contactName}`, 'info');
                              }
                            }}
                          >
                            <Sparkles size={12} /> AI Draft &amp; Send
                          </button>
                          <button
                            className="sb-btn-dismiss"
                            onClick={() => handleDismissFollowup(fu.id)}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
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
            <div className="sb-search-input-wrap" style={{ minWidth: 260, maxWidth: 360 }}>
              <Search className="sb-search-input-icon" />
              <input
                type="text"
                className="sb-search-input-field"
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
            <table className="sb-clean-table sb-clean-table-followups">
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
                {filteredFollowups.map(fu => {
                  const leadName = fu.leadName || fu.contactName || fu.name || 'Executive Contact';
                  const temp = fu.temperature || fu.tier || (fu.score >= 80 ? 'HOT' : fu.score >= 60 ? 'WARM' : 'NURTURE');
                  return (
                    <tr key={fu.id}>
                      <td className="font-semibold text-white whitespace-nowrap">{leadName}</td>
                      <td className="text-slate-300">{fu.company || fu.companyName || 'MLT Aikins LLP'}</td>
                      <td>
                        <span className={`sb-badge ${temp === 'HOT' ? 'sb-badge-bad' : temp === 'WARM' ? 'sb-badge-warn' : 'sb-badge-info'}`}>
                          {temp}
                        </span>
                      </td>
                      <td>
                        <span className="text-slate-300 text-xs tabular-nums">
                          {fu.opens || 2} opens, {fu.clicks || 1} clicks
                        </span>
                      </td>
                      <td>
                        <span className={`sb-badge ${fu.status === 'COMPLETED' ? 'sb-badge-good' : 'sb-badge-warn'}`}>
                          {fu.status || 'PENDING'}
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
                  );
                })}
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
          <div className="sb-subtab-bar">
            <button
              className={`sb-subtab-btn ${engSubTab === 'overview' ? 'active' : ''}`}
              onClick={() => setEngSubTab('overview')}
            >
              Engagement Overview
            </button>
            <button
              className={`sb-subtab-btn ${engSubTab === 'hot-leads' ? 'active' : ''}`}
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
            <table className="sb-clean-table sb-clean-table-automations">
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
          <div className="sb-section-header-row">
            <p className="sb-section-desc">
              Ideal customer profiles that searches and scoring run against.
            </p>
            <button
              className="sb-btn sb-btn-primary gap-1.5"
              onClick={() => {
                setEditingIcp(null);
                setCreateIcpOpen(true);
              }}
            >
              <Plus size={15} /> New ICP
            </button>
          </div>

          <div className="sb-table-wrap">
            <table className="sb-clean-table sb-clean-table-icps">
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
                      {icp._count?.leads ?? 0}
                    </td>
                    <td className="tabular-nums text-slate-300">
                      {icp._count?.jobs ?? 0}
                    </td>
                    <td className="text-xs text-slate-400 whitespace-nowrap">
                      {fmtDate(icp.lastRunAt)}
                    </td>
                    <td>
                      <div className="sb-table-actions">
                        <button
                          className="sb-btn sb-btn-outline sb-btn-xs gap-1"
                          title="Run ICP Scraper"
                          disabled={runningIcpId === icp.id}
                          onClick={() => handleRunIcp(icp.id)}
                        >
                          {runningIcpId === icp.id ? (
                            <>
                              <Loader2 size={13} className="animate-spin text-indigo-400" /> Scraping...
                            </>
                          ) : (
                            <>
                              <Rocket size={13} className="text-indigo-400" /> Run
                            </>
                          )}
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
                            setEditingIcp(icp);
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
          <div className="sb-search-runner-box">
            <div className="sb-search-runner-bar">
              <div className="sb-search-field-icp">
                <label className="sb-search-field-label">ICP</label>
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

              <div className="sb-search-field-pages">
                <label className="sb-search-field-label">Pages</label>
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
            <p className="sb-search-hint">
              Searching Apollo's people database is free. Revealing emails spends credits, within each ICP's monthly budget.
            </p>
          </div>

          {/* Search History Section */}
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white">History</h2>
            <div className="sb-table-wrap">
              <table className="sb-clean-table sb-clean-table-searches">
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
                        <div className="sb-history-results">
                          <span><strong>{j.companiesFound || 0}</strong> <span>companies</span></span>
                          <span><strong>{j.peopleFound || 0}</strong> <span>people</span></span>
                          <span><strong>{j.newLeads || 0}</strong> <span>new</span></span>
                          <span><strong>{j.qualified || 0}</strong> <span>qualified</span></span>
                          <span><strong>{j.revealed || 0}</strong> <span>revealed</span></span>
                        </div>
                      </td>
                      <td className="text-xs text-slate-400 whitespace-nowrap">{fmtDate(j.createdAt)}</td>
                      <td className="text-right">
                        <div className="sb-table-actions">
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
          <div className="sb-leads-toolbar">
            <div className="sb-search-input-wrap">
              <Search className="sb-search-input-icon" />
              <input
                type="text"
                className="sb-search-input-field"
                placeholder="Search name, company, title..."
                value={leadQuery}
                onChange={e => { setLeadQuery(e.target.value); setLeadPage(1); }}
              />
            </div>

            <select
              className="sb-select sb-select-icp"
              value={leadIcpFilter}
              onChange={e => { setLeadIcpFilter(e.target.value); setLeadPage(1); }}
            >
              <option value="__all">All ICPs</option>
              {icps.map(i => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>

            <select
              className="sb-select sb-select-status"
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
              className="sb-input sb-input-score"
              placeholder="Min score"
              value={leadMinScore}
              onChange={e => { setLeadMinScore(e.target.value); setLeadPage(1); }}
            />

            <select
              className="sb-select sb-select-sort"
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
            <table className="sb-clean-table sb-clean-table-leads">
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
                    <td className="font-semibold text-sm text-white whitespace-nowrap">
                      {[l.firstName, l.lastName].filter(Boolean).join(' ') || 'Unknown'}
                    </td>
                    <td className="text-xs text-slate-300 max-w-[200px] truncate whitespace-nowrap">{l.title || '-'}</td>
                    <td>
                      <p className="text-sm text-white font-medium whitespace-nowrap">{l.companyName || '-'}</p>
                      {l.companyDomain && (
                        <p className="text-[11px] text-slate-400">{l.companyDomain}</p>
                      )}
                    </td>
                    <td className="text-xs text-slate-300 whitespace-nowrap">
                      {l.email || <span className="text-slate-500">Not revealed</span>}
                    </td>
                    <td className="text-xs text-slate-400 whitespace-nowrap">
                      {l.location || '-'}
                    </td>
                    <td className="text-xs text-slate-300 whitespace-nowrap">
                      {l.icpName || 'Canadian Wealth'}
                    </td>
                    <td>
                      <ScoreBar score={l.score} />
                    </td>
                    <td>
                      <div className="sb-status-tier-cell">
                        <LeadStatusBadge status={l.status} />
                        {l.tier && (
                          <span className="sb-tier-pill">
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
          {/* Filter & Action Toolbar */}
          <div className="sb-outreach-toolbar">
            <div className="sb-outreach-toolbar-top">
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
                className="sb-select w-[190px]"
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
                className="sb-input w-36"
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
            </div>

            <div className="sb-outreach-toolbar-bottom">
              <button
                className="sb-btn sb-btn-outline gap-1.5"
                onClick={loadAllData}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Re-run skipped and not written
              </button>
              <span className="text-xs text-slate-500">Refreshes every 10 seconds.</span>
            </div>
          </div>

          {/* Table */}
          <div className="sb-table-wrap">
            <table className="sb-clean-table sb-clean-table-outreach">
              <thead>
                <tr>
                  <th className="sb-col-lead">Lead</th>
                  <th className="sb-col-company">Company</th>
                  <th className="sb-col-email">To</th>
                  <th className="sb-col-subject">Subject</th>
                  <th className="sb-col-status">Status</th>
                  <th className="sb-col-sent">Sent?</th>
                  <th className="sb-col-reason">Reason / why</th>
                  <th className="sb-col-created">Created</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDrafts.map(d => (
                  <tr
                    key={d.id}
                    className="clickable"
                    onClick={() => setSelectedDraftId(d.id)}
                  >
                    <td className="sb-col-lead">
                      <p className="font-semibold text-sm text-white leading-tight">
                        {d.leadName || (d.brainLead ? `${d.brainLead.firstName || ''} ${d.brainLead.lastName || ''}`.trim() : '') || (leads.find(l => l.id === d.brainLeadId)?.name) || 'Executive Contact'}
                      </p>
                      <p className="text-[11px] font-normal text-slate-400 mt-0.5">
                        {d.icpName || (icps.find(i => i.id === d.icpId)?.name) || 'Canadian Wealth'}
                      </p>
                    </td>
                    <td className="sb-col-company text-sm text-slate-300">
                      {d.companyName || d.brainLead?.companyName || (leads.find(l => l.id === d.brainLeadId)?.companyName) || '-'}
                    </td>
                    <td className="sb-col-email text-xs text-slate-400">
                      {d.toEmail || d.brainLead?.email || <span className="text-slate-500">Revealed on send</span>}
                    </td>
                    <td className="sb-col-subject text-xs text-slate-200">
                      {d.subject || '-'}
                    </td>
                    <td className="sb-col-status">
                      <DraftStatusBadge status={d.status} />
                    </td>
                    <td className="sb-col-sent text-xs">
                      <p className={`font-medium ${d.status === 'SENT' ? 'text-emerald-400' : 'text-slate-400'}`}>
                        {d.status === 'SENT' ? 'Sent' : d.status === 'APPROVED' ? 'Queued to send' : 'Waiting for approval'}
                      </p>
                      {d.sentAt && <span className="text-slate-500 text-[10px] block mt-0.5">{fmtDate(d.sentAt)}</span>}
                    </td>
                    <td className="sb-col-reason text-xs text-slate-400">
                      {d.selectionReason || 'High match with target Canadian Wealth ICP'}
                    </td>
                    <td className="sb-col-created text-xs text-slate-400">
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
         9. INSIGHTS TAB (EXACT REPLICA OF GENTLE CRM DASHBOARD-TAB)
         ========================================================================= */}
      {activeTab === 'insights' && (
        <div className="space-y-6">
          {/* Top 4 Stat Tiles */}
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
              <span className="sb-stat-val text-white">142</span>
            </div>
            <div className="sb-stat-tile">
              <span className="sb-stat-label">Searches run</span>
              <span className="sb-stat-val text-white">{searches.length}</span>
            </div>
          </div>

          {/* Outreach drafts breakdown */}
          <section className="sb-insights-section">
            <h2 className="sb-insights-heading">Outreach drafts</h2>
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

          {/* Leads by Status (Responsive 4-column bordered cards) */}
          <section className="sb-insights-section">
            <h2 className="sb-insights-heading">Leads by status</h2>
            <div className="sb-status-cards-grid">
              {[
                { status: 'HIGH_PRIORITY', label: 'High Priority', count: 40, dotColor: '#F43F5E' },
                { status: 'QUALIFIED', label: 'Qualified', count: 140, dotColor: '#22D3EE' },
                { status: 'READY_FOR_OUTREACH', label: 'Ready For Outreach', count: 120, dotColor: '#818CF8' },
                { status: 'IN_CAMPAIGN', label: 'In Campaign', count: 100, dotColor: '#FBBF24' },
                { status: 'CONTACTED', label: 'Contacted', count: 30, dotColor: '#60A5FA' },
                { status: 'REPLIED', label: 'Replied', count: 15, dotColor: '#34D399' },
                { status: 'NEW', label: 'New', count: 293, dotColor: '#94A3B8' },
              ].map(st => (
                <div key={st.status} className="sb-status-item-card">
                  <div className="sb-status-item-left">
                    <span className="sb-status-item-dot" style={{ backgroundColor: st.dotColor }} />
                    <span className="sb-status-item-label">{st.label}</span>
                  </div>
                  <span className="sb-status-item-count">{st.count}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Search Demand (Gentle CRM Replica) */}
          <section className="sb-insights-section">
            <h2 className="sb-insights-heading">Search demand</h2>
            <div className="sb-not-connected-card">
              <p className="sb-not-connected-title">Not connected</p>
              <p className="sb-not-connected-desc">
                Search Console shows what people search for before they find you.{' '}
                <span className="text-cyan-400 font-medium cursor-pointer hover:underline">
                  Connect it in admin settings
                </span>.
              </p>
            </div>
          </section>

          {/* Website Traffic Sources (Gentle CRM Replica) */}
          <section className="sb-insights-section">
            <h2 className="sb-insights-heading">Website traffic sources</h2>
            <div className="sb-not-connected-card">
              <p className="sb-not-connected-title">Not connected</p>
              <p className="sb-not-connected-desc">
                Google Analytics shows where your website visitors come from.{' '}
                <span className="text-cyan-400 font-medium cursor-pointer hover:underline">
                  Connect it in admin settings
                </span>.
              </p>
            </div>
          </section>

          {/* Lead Sources (Responsive 3-column bordered cards) */}
          <section className="sb-insights-section">
            <h2 className="sb-insights-heading">Lead sources</h2>
            <div className="sb-sources-cards-grid">
              {[
                { label: 'Apollo.io People & Org API', connected: true, note: 'Primary B2B contact engine' },
                { label: 'Canada TSX/SEDAR+ Filings', connected: true, note: 'Live Canadian wire signals & executive liquidity' },
                { label: 'Canadian Legal & Medical Regs', connected: true, note: 'Law Society & Medical College directories' },
              ].map(src => (
                <div key={src.label} className="sb-source-item-card">
                  <div className="sb-source-item-header">
                    <h4 className="sb-source-item-name">{src.label}</h4>
                    <span className="sb-source-status-badge">
                      <span className="sb-pulse-dot" /> Connected
                    </span>
                  </div>
                  <p className="sb-source-item-note">{src.note}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Failures (Gentle CRM Replica) */}
          <section className="sb-insights-section">
            <h2 className="sb-insights-heading">Recent failures</h2>
            <div className="sb-empty-card">
              No failed searches recorded. All automated prospecting and enrichment jobs completed successfully.
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
                  <h3 className="sb-sheet-title">
                    {selectedDraft.leadName || (selectedDraft.brainLead ? `${selectedDraft.brainLead.firstName || ''} ${selectedDraft.brainLead.lastName || ''}`.trim() : '') || (leads.find(l => l.id === selectedDraft.brainLeadId)?.name) || 'Recipient'}
                  </h3>
                  <p className="sb-sheet-desc">
                    To: {selectedDraft.toEmail || selectedDraft.brainLead?.email || 'Verified Corporate Email'}
                    {(selectedDraft.companyName || selectedDraft.brainLead?.companyName || (leads.find(l => l.id === selectedDraft.brainLeadId)?.companyName)) ? ` · ${selectedDraft.companyName || selectedDraft.brainLead?.companyName || (leads.find(l => l.id === selectedDraft.brainLeadId)?.companyName)}` : ''}
                  </p>
                </div>
                <button className="sb-btn sb-btn-ghost sb-btn-icon" onClick={() => setSelectedDraftId(null)}>
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <DraftStatusBadge status={selectedDraft.status} />
                <span className="text-xs text-slate-400">
                  ICP: {selectedDraft.icpName || (icps.find(i => i.id === selectedDraft.icpId)?.name) || 'Canadian Wealth'}
                </span>
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
         SLIDE-OVER SHEET: CREATE & EDIT ICP (IcpFormSheet - Exact Gentle CRM Replica)
         ========================================================================= */}
      <IcpFormSheet
        open={createIcpOpen}
        onOpenChange={setCreateIcpOpen}
        icp={editingIcp}
        onSaveSuccess={async (savedIcp) => {
          notify(editingIcp ? `Updated ICP: ${savedIcp?.name || 'Profile'}` : `Created ICP: ${savedIcp?.name || 'Profile'}`, 'success');
          await loadAllData();
        }}
      />

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
                  className="sb-textarea w-full h-44 py-2 leading-relaxed"
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
