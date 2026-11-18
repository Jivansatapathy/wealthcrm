import React, { useState, useEffect } from 'react';
import { X, Plus, Loader2, Sparkles, Check, ChevronDown, AlertCircle } from 'lucide-react';

export const SENIORITIES = [
  'owner',
  'founder',
  'c_suite',
  'partner',
  'vp',
  'head',
  'director',
  'manager',
  'senior',
  'entry',
  'intern',
];

export const QUALIFICATION_FIELDS = ['industry', 'size', 'location', 'title', 'seniority'];

export const DEFAULT_WEIGHTS = {
  industry: 20,
  size: 15,
  location: 10,
  title: 30,
  seniority: 15,
  dataQuality: 10,
  signals: 0,
};

export const WEIGHT_KEYS = [
  'industry',
  'size',
  'location',
  'title',
  'seniority',
  'dataQuality',
  'signals',
];

export function emptyCriteria() {
  return {
    segments: [],
    points: null,
    outreach: {
      aiWrite: true,
      senderName: 'Catherine Sinclair',
      senderCompany: 'ScotiaMcLeod & Private Banking',
      address: '44 King St W, Toronto, ON M5H 1H1',
      link: 'https://crm.venusglobaltech.com',
      sequenceDays: [3, 7, 14],
      useManualTemplate: false,
      manualSubject: '',
      manualBodyHtml: '',
      appendSignature: false,
    },
    limits: { perCompany: null, weeklyReveals: null },
    company: {
      industries: [],
      keywords: [],
      employeeMin: null,
      employeeMax: null,
      locations: [],
      targetDomains: [],
      excludedCompanies: [],
      excludedDomains: [],
      technologies: [],
      excludedTechnologies: [],
      industryCodes: [],
      excludedIndustryCodes: [],
      excludedIndustries: [],
      hiringTitles: [],
      hiringWithinDays: null,
      minHeadcountGrowth: null,
      revenueMin: null,
      revenueMax: null,
    },
    contact: { titles: [], seniorities: [], excludedTitles: [], locations: [] },
    qualification: { required: ['location', 'industry'], preferred: [], caslGuard: true },
  };
}

export const CANADIAN_WEALTH_PRESET = {
  id: 'canadian-wealth-management',
  name: 'Canadian Senior Professionals & Business Owners – Wealth Management',
  description:
    'Senior doctors, lawyers, business owners and entrepreneurs in Canada who may have a wealth planning need (retirement income, business exit/succession, tax-efficient investing, estate planning). The ICP identifies potential opportunities, NOT confirmed buying intent.',
  offer:
    'Comprehensive wealth management and advisory services tailored for Canadian high-earning professionals, clinic owners, law partners, and exiting business founders. Key focus areas include retirement income structuring (RRIF/IPP), corporate succession and business exit planning, tax-efficient portfolio investing, capital gains strategies, and generational estate planning. Advice is delivered strictly through authorized, licensed wealth advisers.',
  criteria: {
    ...emptyCriteria(),
    company: {
      industries: [
        'Medical Practice',
        'Health Care',
        'Clinics',
        'Dental',
        'Veterinary',
        'Law Practice',
        'Legal Services',
        'Professional Services',
        'Management Consulting',
        'Accounting',
        'Corporate Leadership',
      ],
      keywords: [
        'private wealth advisor',
        'high net worth financial advisor',
        'retirement income planning',
        'wealth planning after selling business',
        'business exit financial planning',
        'tax efficient investing Canada',
        'capital gains planning',
        'estate planning financial advisor',
        'financial advisor for doctors',
        'physician retirement planning',
        'RRIF withdrawal strategy',
      ],
      employeeMin: 1,
      employeeMax: 500,
      locations: [
        'Canada',
        'Ontario, Canada',
        'British Columbia, Canada',
        'Alberta, Canada',
        'Quebec, Canada',
      ],
      targetDomains: [],
      excludedCompanies: [],
      excludedDomains: [],
      technologies: [],
      excludedTechnologies: [],
      industryCodes: [],
      excludedIndustryCodes: [],
      excludedIndustries: [],
      hiringTitles: [],
      hiringWithinDays: null,
      minHeadcountGrowth: null,
      revenueMin: null,
      revenueMax: null,
    },
    contact: {
      titles: [
        'Partner',
        'Senior Partner',
        'Managing Partner',
        'Counsel',
        'Professor Emeritus',
        'Physician',
        'Doctor',
        'Owner',
        'Founder',
        'President',
      ],
      seniorities: ['owner', 'founder', 'partner', 'c_suite', 'senior', 'director'],
      excludedTitles: ['intern', 'student', 'assistant'],
      locations: ['Canada'],
    },
    qualification: {
      required: ['location', 'industry'],
      preferred: ['title'],
      caslGuard: true,
    },
    outreach: {
      aiWrite: true,
      senderName: 'Catherine Sinclair',
      senderCompany: 'ScotiaMcLeod & Private Banking',
      address: '44 King St W, Toronto, ON M5H 1H1',
      link: 'https://crm.venusglobaltech.com',
      sequenceDays: [3, 7, 14],
      useManualTemplate: false,
      manualSubject: '',
      manualBodyHtml: '',
      appendSignature: false,
    },
  },
  weights: { ...DEFAULT_WEIGHTS, title: 25, location: 20, seniority: 20, industry: 15, signals: 20 },
  minScore: 70,
};

export const ERP_PRESETS = [
  {
    id: 'p1-wholesale',
    name: 'P1: Wholesale & Distribution',
    description: 'NAICS 42 wholesalers and distributors with high transaction inventory.',
    offer: 'AP 3-way matching, inventory replenishment and demand forecasting.',
    industries: ['Wholesale', 'Distribution', 'Supply Chain'],
    keywords: ['wholesale', 'distribution', 'distributor', 'inventory management'],
    titles: ['Owner', 'CEO', 'CFO', 'VP Operations', 'Supply Chain Director'],
    minScore: 65,
  },
  {
    id: 'p1-manufacturing',
    name: 'P1: Manufacturing',
    description: 'NAICS 31-33 manufacturers (metal fabrication, machinery, plastics, food).',
    offer: 'Production planning, inventory costing, and demand forecasting.',
    industries: ['Manufacturing', 'Machinery', 'Fabrication', 'Food Processing'],
    keywords: ['manufacturing', 'job shop', 'fabrication', 'plastics'],
    titles: ['Owner', 'President', 'Plant Manager', 'Director of Operations'],
    minScore: 65,
  },
  {
    id: 'p1-ecommerce',
    name: 'P1: E-commerce & DTC',
    description: 'Online retail and DTC brands with physical inventory (NAICS 4541).',
    offer: 'Multi-channel inventory synchronization, demand forecasting and reorders.',
    industries: ['E-commerce', 'Online Retail', 'Direct to Consumer'],
    keywords: ['ecommerce', 'dtc', 'shopify', 'online retail'],
    titles: ['Founder', 'Co-Founder', 'CEO', 'Head of Supply Chain'],
    minScore: 65,
  },
  {
    id: 'p2-construction',
    name: 'P2: Construction & Trades',
    description: 'General contractors, commercial builders, and specialty trades.',
    offer: 'Job costing, subcontractor payment tracking and equipment inventory.',
    industries: ['Construction', 'Commercial Building', 'General Contracting'],
    keywords: ['general contractor', 'commercial construction', 'job costing'],
    titles: ['President', 'Owner', 'Managing Partner', 'VP Operations'],
    minScore: 60,
  },
  {
    id: 'p2-logistics',
    name: 'P2: Logistics, 3PL & Warehousing',
    description: 'Third-party logistics providers, freight forwarders, and warehouses.',
    offer: 'Warehouse management systems (WMS) AI automation and billing optimization.',
    industries: ['Logistics', 'Warehousing', 'Freight Forwarding', '3PL'],
    keywords: ['logistics', '3pl', 'warehousing', 'freight'],
    titles: ['Managing Director', 'COO', 'Director of Logistics'],
    minScore: 60,
  },
  {
    id: 'p2-retail',
    name: 'P2: Multi-location Retail',
    description: 'Regional retailers with 3 to 25 physical storefront locations.',
    offer: 'Cross-store inventory transfers, point-of-sale consolidation, and demand forecasting.',
    industries: ['Retail', 'Consumer Goods', 'Apparel & Footwear'],
    keywords: ['retail', 'multi-store', 'store operations'],
    titles: ['Founder', 'CEO', 'Director of Retail Operations'],
    minScore: 60,
  },
  {
    id: 'p3-consulting',
    name: 'P3: Consulting & Multi-location Clinics',
    description: 'Professional practices, specialized medical clinics, and management consultancies.',
    offer: 'Project billing, resource utilization tracking, and partner revenue allocation.',
    industries: ['Management Consulting', 'Medical Clinics', 'Specialized Healthcare'],
    keywords: ['clinic owner', 'consulting partner', 'practice director'],
    titles: ['Managing Partner', 'Clinic Director', 'Chief Medical Officer'],
    minScore: 70,
  },
];

export function TagInput({ value = [], onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const parts = draft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length) {
      onChange([...value, ...parts.filter((p) => !value.includes(p))]);
    }
    setDraft('');
  };

  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="sb-tag-input-box">
      {value.map((t) => (
        <span key={t} className="sb-tag-pill">
          <span>{t}</span>
          <button
            type="button"
            className="sb-tag-remove"
            onClick={() => onChange(value.filter((x) => x !== t))}
          >
            <X size={11} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKey}
        onBlur={commit}
        placeholder={value.length ? '' : placeholder || 'Type and press Enter'}
        className="sb-tag-input-text"
      />
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="sb-form-field">
      <label className="sb-form-label">{label}</label>
      {children}
      {hint && <p className="sb-form-hint">{hint}</p>}
    </div>
  );
}

function Group({ title, children }) {
  return (
    <section className="sb-form-group">
      <h3 className="sb-form-group-title">{title}</h3>
      {children}
    </section>
  );
}

function numOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function statusLabel(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function IcpFormSheet({ open, onOpenChange, icp, onSaveSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [offer, setOffer] = useState('');
  const [criteria, setCriteria] = useState(emptyCriteria());
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [minScore, setMinScore] = useState(70);
  const [searchMode, setSearchMode] = useState('REVIEW');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [budget, setBudget] = useState(100);
  const [autoSend, setAutoSend] = useState(false);
  const [cap, setCap] = useState(25);
  const [senderId, setSenderId] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = emptyCriteria();
    if (icp) {
      setName(icp.name || '');
      setDescription(icp.description || '');
      setOffer(icp.offer || '');
      setCriteria({
        ...base,
        ...icp.criteria,
        company: { ...base.company, ...(icp.criteria?.company || {}) },
        contact: { ...base.contact, ...(icp.criteria?.contact || {}) },
        qualification: { ...base.qualification, ...(icp.criteria?.qualification || {}) },
        outreach: { ...base.outreach, ...(icp.criteria?.outreach || {}) },
        limits: { ...base.limits, ...(icp.criteria?.limits || {}) },
      });
      setWeights({ ...DEFAULT_WEIGHTS, ...(icp.weights || {}) });
      setMinScore(icp.minScore ?? 70);
      setSearchMode(icp.searchMode || 'REVIEW');
      setScheduleTime(icp.scheduleTime || '09:00');
      setBudget(icp.monthlyRevealBudget ?? 100);
      setAutoSend(icp.autoSend ?? false);
      setCap(icp.dailySendCap ?? 25);
      setSenderId(icp.senderConnectionId || '');
    } else {
      setName('');
      setDescription('');
      setOffer('');
      setCriteria(base);
      setWeights(DEFAULT_WEIGHTS);
      setMinScore(70);
      setSearchMode('REVIEW');
      setScheduleTime('09:00');
      setBudget(100);
      setAutoSend(false);
      setCap(25);
      setSenderId('');
    }
  }, [open, icp]);

  const co = (patch) => setCriteria((c) => ({ ...c, company: { ...c.company, ...patch } }));
  const ct = (patch) => setCriteria((c) => ({ ...c, contact: { ...c.contact, ...patch } }));
  const ql = (patch) =>
    setCriteria((c) => ({ ...c, qualification: { ...c.qualification, ...patch } }));

  const applyPreset = (preset) => {
    setName(preset.name);
    setDescription(preset.description || '');
    setOffer(preset.offer || '');
    if (preset.criteria) {
      setCriteria(preset.criteria);
    } else {
      setCriteria((prev) => ({
        ...prev,
        company: {
          ...prev.company,
          industries: preset.industries || [],
          keywords: preset.keywords || [],
        },
        contact: {
          ...prev.contact,
          titles: preset.titles || [],
        },
      }));
    }
    if (preset.weights) setWeights(preset.weights);
    if (preset.minScore) setMinScore(preset.minScore);
  };

  const toggleSeniority = (s) => {
    const list = criteria.contact.seniorities || [];
    ct({
      seniorities: list.includes(s) ? list.filter((x) => x !== s) : [...list, s],
    });
  };

  const toggleQualField = (field, type) => {
    const qual = criteria.qualification || { required: [], preferred: [], caslGuard: true };
    const req = qual.required || [];
    const pref = qual.preferred || [];

    if (type === 'required') {
      const nextReq = req.includes(field) ? req.filter((x) => x !== field) : [...req, field];
      ql({ required: nextReq, preferred: pref.filter((x) => x !== field) });
    } else {
      const nextPref = pref.includes(field) ? pref.filter((x) => x !== field) : [...pref, field];
      ql({ preferred: nextPref, required: req.filter((x) => x !== field) });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Please give the ICP a name');
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        offer: offer.trim() || null,
        criteria,
        weights,
        minScore,
        searchMode,
        scheduleTime: scheduleTime || null,
        monthlyRevealBudget: budget,
        autoSend,
        dailySendCap: cap,
        senderConnectionId: senderId || null,
        vertical: 'WEALTH_MANAGEMENT',
      };

      const url = icp?.id ? `/api/sales-brain/icps/${icp.id}` : '/api/sales-brain/icps';
      const method = icp?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (onSaveSuccess) onSaveSuccess(data);
      onOpenChange(false);
    } catch (err) {
      alert(`Failed to save ICP: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const weightTotal = WEIGHT_KEYS.reduce((a, k) => a + (weights[k] || 0), 0);

  return (
    <div className="sb-sheet-backdrop" onClick={() => onOpenChange(false)}>
      <div className="sb-sheet-panel-wide" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sb-sheet-header">
          <div>
            <h2 className="sb-sheet-title">{icp ? 'Edit ICP' : 'New ICP'}</h2>
            <p className="sb-sheet-desc">
              Describe who you want to find. Leads are scored against this profile.
            </p>
          </div>
          <button
            type="button"
            className="sb-sheet-close-btn"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="sb-sheet-scroll-body">
          {/* Preset Buttons Bar (Only when creating a new ICP) */}
          {!icp && (
            <div className="sb-presets-container">
              <span className="sb-presets-label">Start from an ERP AI preset:</span>
              <button
                type="button"
                className="sb-preset-pill sb-preset-pill-highlight"
                onClick={() => applyPreset(CANADIAN_WEALTH_PRESET)}
                title="Canadian Wealth Management (Doctors, Partners, Emeriti)"
              >
                🍁 Canadian Senior Professionals &amp; Business Owners – Wealth Management
              </button>
              <div className="sb-presets-wrap">
                {ERP_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="sb-preset-pill"
                    onClick={() => applyPreset(p)}
                    title={p.description}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <Field label="Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. UK SaaS founders or Canadian Legal Partners"
              className="sb-input"
              required
            />
          </Field>

          {/* Description */}
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="sb-textarea"
              placeholder="Who are we targeting and why?"
            />
          </Field>

          {/* Our offer */}
          <Field
            label="Our offer"
            hint="What we sell to this audience. Used when the AI plans searches."
          >
            <textarea
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              rows={2}
              className="sb-textarea"
              placeholder="e.g. Comprehensive wealth advisory, corporate class tax sheltering, and IPP planning..."
            />
          </Field>

          {/* Group: Company criteria */}
          <Group title="Company criteria">
            <Field label="Industries">
              <TagInput
                value={criteria.company.industries}
                onChange={(v) => co({ industries: v })}
                placeholder="Type and press Enter"
              />
            </Field>

            <Field label="Keywords">
              <TagInput
                value={criteria.company.keywords}
                onChange={(v) => co({ keywords: v })}
                placeholder="Type and press Enter"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Min employees">
                <input
                  type="number"
                  min="0"
                  value={criteria.company.employeeMin ?? ''}
                  onChange={(e) => co({ employeeMin: numOrNull(e.target.value) })}
                  className="sb-input"
                />
              </Field>
              <Field label="Max employees">
                <input
                  type="number"
                  min="0"
                  value={criteria.company.employeeMax ?? ''}
                  onChange={(e) => co({ employeeMax: numOrNull(e.target.value) })}
                  className="sb-input"
                />
              </Field>
            </div>

            <Field label="Company locations">
              <TagInput
                value={criteria.company.locations}
                onChange={(v) => co({ locations: v })}
                placeholder="City, state, province or country"
              />
            </Field>

            <Field label="Target domains">
              <TagInput
                value={criteria.company.targetDomains}
                onChange={(v) => co({ targetDomains: v })}
                placeholder="example.com"
              />
            </Field>

            <Field label="Excluded companies">
              <TagInput
                value={criteria.company.excludedCompanies}
                onChange={(v) => co({ excludedCompanies: v })}
                placeholder="Excluded corporate names"
              />
            </Field>

            <Field label="Excluded domains">
              <TagInput
                value={criteria.company.excludedDomains}
                onChange={(v) => co({ excludedDomains: v })}
                placeholder="domain.com"
              />
            </Field>
          </Group>

          {/* Group: Contact criteria */}
          <Group title="Contact criteria">
            <Field label="Job titles">
              <TagInput
                value={criteria.contact.titles}
                onChange={(v) => ct({ titles: v })}
                placeholder="e.g. Partner, Managing Director, Senior Counsel"
              />
            </Field>

            <Field label="Seniorities">
              <div className="sb-seniorities-grid">
                {SENIORITIES.map((s) => (
                  <label key={s} className="sb-checkbox-label">
                    <input
                      type="checkbox"
                      checked={(criteria.contact.seniorities || []).includes(s)}
                      onChange={() => toggleSeniority(s)}
                      className="sb-checkbox"
                    />
                    <span>{statusLabel(s)}</span>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Excluded titles">
              <TagInput
                value={criteria.contact.excludedTitles}
                onChange={(v) => ct({ excludedTitles: v })}
                placeholder="e.g. Intern, Assistant, Student"
              />
            </Field>

            <Field label="Contact locations">
              <TagInput
                value={criteria.contact.locations}
                onChange={(v) => ct({ locations: v })}
                placeholder="City, province, country"
              />
            </Field>
          </Group>

          {/* Group: Qualification conditions */}
          <Group title="Qualification conditions">
            <p className="sb-form-hint">
              Required: a lead that fails one is disqualified. Preferred: failing one only lowers the score.
            </p>
            <div className="sb-qual-table">
              <div className="sb-qual-row sb-qual-header">
                <span>Condition</span>
                <span>Required</span>
                <span>Preferred</span>
              </div>
              {QUALIFICATION_FIELDS.map((f) => (
                <div key={f} className="sb-qual-row">
                  <span className="sb-qual-name">{statusLabel(f)}</span>
                  <div className="sb-qual-cell">
                    <input
                      type="checkbox"
                      checked={(criteria.qualification?.required || []).includes(f)}
                      onChange={() => toggleQualField(f, 'required')}
                      className="sb-checkbox"
                    />
                  </div>
                  <div className="sb-qual-cell">
                    <input
                      type="checkbox"
                      checked={(criteria.qualification?.preferred || []).includes(f)}
                      onChange={() => toggleQualField(f, 'preferred')}
                      className="sb-checkbox"
                    />
                  </div>
                </div>
              ))}
            </div>

            <label className="sb-checkbox-label mt-2">
              <input
                type="checkbox"
                checked={criteria.qualification?.caslGuard ?? true}
                onChange={(e) => ql({ caslGuard: e.target.checked })}
                className="sb-checkbox"
              />
              <span className="text-xs text-slate-300">
                Canada guard (CASL): do not auto-draft emails to Canadian leads. Confirm the
                business email is publicly published first, or reach them by LinkedIn or phone.
              </span>
            </label>
          </Group>

          {/* Group: Playbook & Outreach */}
          <Group title="Playbook: segments, points and outreach">
            <p className="sb-form-hint">
              Every email is written by AI (Groq, with Gemini as backup) for that company, its industry
              and the person's role, and says why it matters to them. No templates. Drafts wait for
              approval unless auto-send is on.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Sender name">
                <input
                  type="text"
                  value={criteria.outreach?.senderName || ''}
                  onChange={(e) =>
                    setCriteria((c) => ({
                      ...c,
                      outreach: { ...c.outreach, senderName: e.target.value },
                    }))
                  }
                  className="sb-input"
                />
              </Field>
              <Field label="Company name">
                <input
                  type="text"
                  value={criteria.outreach?.senderCompany || ''}
                  onChange={(e) =>
                    setCriteria((c) => ({
                      ...c,
                      outreach: { ...c.outreach, senderCompany: e.target.value },
                    }))
                  }
                  className="sb-input"
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Mailing address (in every email)">
                <input
                  type="text"
                  value={criteria.outreach?.address || ''}
                  onChange={(e) =>
                    setCriteria((c) => ({
                      ...c,
                      outreach: { ...c.outreach, address: e.target.value },
                    }))
                  }
                  className="sb-input"
                />
              </Field>
              <Field label="Only link allowed in email">
                <input
                  type="text"
                  value={criteria.outreach?.link || ''}
                  onChange={(e) =>
                    setCriteria((c) => ({
                      ...c,
                      outreach: { ...c.outreach, link: e.target.value },
                    }))
                  }
                  className="sb-input"
                />
              </Field>
            </div>

            <Field
              label="Follow-up days after email 1"
              hint="Comma separated, e.g. 3, 7, 14"
            >
              <input
                type="text"
                value={(criteria.outreach?.sequenceDays || [3, 7, 14]).join(', ')}
                onChange={(e) =>
                  setCriteria((c) => ({
                    ...c,
                    outreach: {
                      ...c.outreach,
                      sequenceDays: e.target.value
                        .split(',')
                        .map((x) => Number(x.trim()))
                        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 90)
                        .slice(0, 4),
                    },
                  }))
                }
                className="sb-input"
              />
            </Field>
          </Group>

          {/* Group: Score weights */}
          <Group title="Score weights">
            <div className="sb-weights-grid">
              {WEIGHT_KEYS.map((k) => (
                <Field key={k} label={k === 'dataQuality' ? 'Data quality' : statusLabel(k)}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weights[k] ?? 0}
                    onChange={(e) =>
                      setWeights((w) => ({
                        ...w,
                        [k]: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                      }))
                    }
                    className="sb-input"
                  />
                </Field>
              ))}
            </div>
            <p className="sb-form-hint">
              Weights total {weightTotal}. They are scaled to a 0–100 score.
            </p>

            <Field label={`Minimum score to qualify: ${minScore}`}>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="sb-range-slider flex-1"
                />
                <span className="text-sm font-bold text-white tabular-nums w-8 text-right">
                  {minScore}
                </span>
              </div>
            </Field>
          </Group>

          {/* Group: Search schedule and budget */}
          <Group title="Search schedule and budget">
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Search mode"
                hint={
                  searchMode === 'REVIEW'
                    ? 'Nothing runs on its own. You review and start each search.'
                    : 'Fully automatic: daily autonomous prospecting & enrichment.'
                }
              >
                <select
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value)}
                  className="sb-select w-full"
                >
                  <option value="REVIEW">Review first</option>
                  <option value="AUTOMATED">Automated</option>
                </select>
              </Field>

              <Field
                label="Daily run time (EST/EDT)"
                hint={
                  searchMode === 'AUTOMATED'
                    ? 'When the automatic search starts each day.'
                    : 'Only used in Automated mode.'
                }
              >
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="sb-input"
                />
              </Field>
            </div>

            <Field
              label="Monthly reveal budget (Apollo credits)"
              hint="Most credits this ICP may spend revealing emails each month."
            >
              <input
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(Math.max(0, Number(e.target.value) || 0))}
                className="sb-input"
              />
            </Field>
          </Group>

          {/* Group: Auto-send */}
          <Group title="Auto-send">
            <div className="flex items-center justify-between gap-3 py-1">
              <label className="text-xs font-semibold text-white">
                Send automatically to qualified leads
              </label>
              <input
                type="checkbox"
                checked={autoSend}
                onChange={(e) => setAutoSend(e.target.checked)}
                className="sb-checkbox"
              />
            </div>

            <Field label="Daily send cap">
              <input
                type="number"
                min="0"
                value={cap}
                onChange={(e) => setCap(Math.max(0, Number(e.target.value) || 0))}
                className="sb-input"
              />
            </Field>

            <div className="sb-alert-box">
              {autoSend
                ? "On: drafts are approved automatically and sent within this ICP's daily send cap, the mailbox's daily cap and standard Canadian business hours."
                : 'Off: every draft waits for human approval before anything is sent. Unsubscribed and bounced addresses are never emailed.'}
            </div>
          </Group>

          {/* Action Footer */}
          <div className="sb-sheet-footer">
            <button
              type="button"
              className="sb-btn sb-btn-outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button type="submit" className="sb-btn sb-btn-primary gap-1.5" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {icp ? 'Save changes' : 'Create ICP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
