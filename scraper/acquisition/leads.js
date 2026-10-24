// Lead model, qualification gates, segments, and every human/system action on a lead. All mutations are audited.
import { audit, maskEmail, maskPhone } from './audit.js';
import { scoreLead, evidenceCompleteness } from './scoring.js';
import { permissionGate, getSource, retentionDays, DAY_MS } from './registry.js';
import { addSuppression } from './consent.js';
import { checkEmail, checkPhone } from './verify.js';
import { syncTags } from './tags.js';

export const STAGES = ['ingestion', 'normalization', 'duplicate_detection', 'classification', 'verification', 'consent_rights',
  'scoring', 'qualification', 'human_review', 'crm_creation', 'advisor_assignment', 'outreach', 'followup'];
export const PIPELINE_STAGES = ['new', 'evidence_review', 'verification', 'consent_rights', 'advisor_approval', 'research_approved',
  'approved_contact', 'meeting_scheduled', 'qualified_opportunity', 'converted', 'closed'];
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'verification_requested', 'escalated', 'duplicate', 'suppressed'];
export const SEGMENTS = ['sales_ready_enquiry', 'research_qualified', 'watchlist', 'needs_manual_review', 'suppressed'];

const iso = (ms) => new Date(ms).toISOString();
const err = (message, status = 400) => Object.assign(new Error(message), { status });

export function markStage(lead, stage, status, now, error = null) {
  lead.stages = lead.stages || {};
  lead.stages[stage] = { status, at: iso(now), ...(error ? { error } : {}) };
}

export function newLead(f, now) {
  const stamp = iso(now);
  return {
    lead_id: null, first_name: null, last_name: null, display_name: null, professional_title: null, company_name: null,
    business_email: null, email_verification_status: 'unverified', business_phone: null, phone_verification_status: 'unverified',
    country: null, state_or_province: null, city: null, preferred_contact_channel: null,
    intent_class: null, intent_category: null, intent_description: null, original_source_url: null, original_source_id: null,
    original_source_record_id: null, event_date: null, discovery_date: stamp, evidence_excerpt: null, evidence_hash: null,
    source_reliability: 0, intent_confidence: 0, last_verified_at: null, signal_weight: 0,
    wealth_status: 'unknown', wealth_range: null, wealth_estimate_source: null, wealth_estimate_date: null, wealth_evidence_type: null,
    investment_interest_category: null, qualification_confidence: 0,
    consent_basis: null, consent_status: 'none', consent_timestamp: null, consent_source: null, consent_text_version: null, permitted_purpose: null,
    permitted_recipient: null, permitted_channels: [], opt_out_status: false, do_not_contact_status: false, licence_status: null,
    retention_expiry: null, marketing_consent: false,
    intent_score: 0, intent_score_reasons: [], scoring_rule_version: null, score_calculated_at: null,
    qualification_status: 'needs_manual_review', gates: {}, review_status: 'pending', assigned_advisor: null, lead_owner: null,
    pipeline_stage: 'new', next_action: null, next_action_due: null, last_contacted_at: null, contact_attempt_count: 0,
    conversion_status: 'open', canonical_lead_id: null, duplicate_candidate_ids: [], match_method: null, match_confidence: null,
    merge_status: 'none', merge_audit_record: [], source_attributions: [], suppression_reason: null, crm_match: null,
    tags: [], received_via: null, related_persons: [],
    stages: {}, history: [], created_at: stamp, updated_at: stamp,
    ...f,
  };
}

// ---------- gates, segments ----------

export function computeGates(ctx, lead) {
  const perm = permissionGate(ctx, lead.original_source_id);
  const confirmed = lead.intent_class === 'confirmed';
  const contactVerified = lead.email_verification_status === 'verified' || lead.phone_verification_status === 'verified';
  const consentVerified = lead.consent_status === 'granted' && !!lead.consent_timestamp && !!lead.consent_text_version && !lead.opt_out_status;
  const rights = perm.allowed && (!confirmed || !!lead.permitted_recipient);
  const suppressed = !!(lead.suppression_reason || lead.opt_out_status || lead.do_not_contact_status || lead.expired ||
    ['rejected', 'duplicate', 'suppressed'].includes(lead.review_status) || !perm.allowed);
  const channelOk = !!lead.preferred_contact_channel && (lead.permitted_channels || []).includes(lead.preferred_contact_channel);
  const gates = {
    confirmed_enquiry: confirmed,
    inferred_signal: ['strong_inferred', 'weak_inferred'].includes(lead.intent_class),
    contact_verified: contactVerified,
    consent_verified: consentVerified,
    commercial_rights_verified: rights,
    suppressed,
  };
  gates.eligible_for_outreach = confirmed && contactVerified && consentVerified && rights && channelOk && !suppressed && lead.review_status === 'approved';
  gates.failed = Object.entries({
    'Not a confirmed enquiry': !confirmed, 'Contact not verified': !contactVerified, 'Consent not verified': !consentVerified,
    'Commercial rights not verified': !rights, 'Contact channel not permitted': !channelOk, 'Suppressed': suppressed,
    'Advisor approval pending': lead.review_status !== 'approved',
  }).filter(([, bad]) => bad).map(([k]) => k);
  gates.permission_reasons = perm.reasons;
  return gates;
}

export function segmentOf(ctx, lead, gates) {
  if (gates.suppressed) return 'suppressed';
  const perm = permissionGate(ctx, lead.original_source_id);
  const restricted = getSource(ctx, lead.original_source_id)?.permission?.review_required;
  const unresolved = lead.duplicate_candidate_ids?.length > 0 && lead.merge_status === 'candidate';
  if (unresolved || lead.review_status === 'verification_requested' || lead.review_status === 'escalated' || (perm.allowed && restricted)) return 'needs_manual_review';
  if (gates.confirmed_enquiry) {
    const provenance = lead.original_source_id && lead.original_source_record_id && lead.event_date;
    const hasContact = !!(lead.business_email || lead.business_phone);
    const channelOk = !!lead.preferred_contact_channel && (lead.permitted_channels || []).includes(lead.preferred_contact_channel);
    return provenance && hasContact && gates.contact_verified && gates.consent_verified && gates.commercial_rights_verified && channelOk
      ? 'sales_ready_enquiry' : 'needs_manual_review';
  }
  if (gates.inferred_signal && lead.source_reliability >= 0.7 && evidenceCompleteness(lead) >= 4) {
    // Only a strong event (sale, IPO, succession) is research-qualified; background signals stay on the watchlist
    return lead.intent_class === 'strong_inferred' ? 'research_qualified' : 'watchlist';
  }
  return 'needs_manual_review';
}

/** Recompute score, gates and segment after any change. */
export function refreshLead(ctx, lead) {
  const now = ctx.now();
  Object.assign(lead, scoreLead(lead, now));
  markStage(lead, 'scoring', 'done', now);
  lead.gates = computeGates(ctx, lead);
  lead.licence_status = permissionGate(ctx, lead.original_source_id).status;
  lead.qualification_status = segmentOf(ctx, lead, lead.gates);
  lead.qualification_confidence = Math.round(lead.intent_confidence * (lead.qualification_status === 'suppressed' ? 0 : 1) * 100) / 100;
  markStage(lead, 'qualification', 'done', now);
  syncTags(lead);
  lead.updated_at = iso(now);
  return lead;
}

const note = (lead, now, actor, action, detail) => { lead.history.push({ at: iso(now), actor, action, ...(detail ? { detail } : {}) }); };

// ---------- actions ----------

function get(ctx, id) {
  const lead = ctx.store.get('leads', {})[id];
  if (!lead) throw err('Lead not found', 404);
  return lead;
}
const persist = (ctx) => ctx.store.save('leads');

export function reviewLead(ctx, id, input, actor) {
  const lead = get(ctx, id);
  const now = ctx.now();
  const decision = input.decision;
  const text = String(input.note || '').slice(0, 500);
  if (lead.redacted || lead.expired) throw err('Lead has been redacted or has expired');
  switch (decision) {
    case 'approve': {
      if (lead.gates?.suppressed) throw err('A suppressed lead cannot be approved');
      lead.review_status = 'approved';
      markStage(lead, 'human_review', 'done', now);
      createCrmLead(ctx, lead, actor);
      refreshLead(ctx, lead);
      lead.pipeline_stage = lead.gates.eligible_for_outreach ? 'approved_contact' : 'research_approved';
      break;
    }
    case 'reject': lead.review_status = 'rejected'; lead.suppression_reason = text || 'rejected_by_reviewer'; markStage(lead, 'human_review', 'rejected', now); break;
    case 'request_verification': lead.review_status = 'verification_requested'; lead.pipeline_stage = 'verification'; break;
    case 'escalate': lead.review_status = 'escalated'; lead.escalated_to_compliance = true; break;
    case 'mark_duplicate': {
      const canon = ctx.store.get('leads', {})[input.canonical_lead_id];
      if (!canon || canon.lead_id === lead.lead_id) throw err('A different, existing canonical_lead_id is required');
      lead.review_status = 'duplicate'; lead.merge_status = 'merged'; lead.canonical_lead_id = canon.lead_id;
      lead.merge_audit_record.push({ at: iso(now), by: actor, canonical_lead_id: canon.lead_id, note: text });
      canon.source_attributions.push({ source_id: lead.original_source_id, url: lead.original_source_url, record_id: lead.original_source_record_id, at: iso(now), via: 'manual_merge' });
      canon.updated_at = iso(now);
      break;
    }
    default: throw err('decision must be approve, reject, request_verification, escalate or mark_duplicate');
  }
  note(lead, now, actor, `review.${decision}`, text);
  refreshLead(ctx, lead);
  audit(ctx.store, { actor, action: `lead.review.${decision}`, entity: 'lead', entityId: id, detail: { note: text, segment: lead.qualification_status } }, now);
  persist(ctx);
  return lead;
}

export function suppressLead(ctx, id, input, actor) {
  const lead = get(ctx, id);
  const now = ctx.now();
  lead.suppression_reason = String(input.reason || 'suppressed_by_reviewer').slice(0, 200);
  lead.review_status = 'suppressed';
  if (input.do_not_contact) {
    lead.do_not_contact_status = true;
    addSuppression(ctx, { email: lead.business_email, phone: lead.business_phone }, lead.suppression_reason);
  }
  note(lead, now, actor, 'suppress', lead.suppression_reason);
  refreshLead(ctx, lead);
  audit(ctx.store, { actor, action: 'lead.suppress', entity: 'lead', entityId: id, detail: { reason: lead.suppression_reason, dnc: !!input.do_not_contact } }, now);
  persist(ctx);
  return lead;
}

export async function verifyLead(ctx, id, input, actor) {
  const lead = get(ctx, id);
  const now = ctx.now();
  const method = input.method;
  const text = String(input.note || '').trim();
  if (method === 'mx_check') {
    if (lead.business_email) lead.email_verification_status = await checkEmail(lead.business_email, ctx.resolveMx);
    if (lead.business_phone) lead.phone_verification_status = checkPhone(lead.business_phone);
  } else if (method === 'manual_email_confirmation' || method === 'manual_phone_confirmation') {
    if (text.length < 5) throw err('A note describing how the contact was confirmed is required');
    if (method === 'manual_email_confirmation') {
      if (!lead.business_email) throw err('Lead has no email');
      lead.email_verification_status = 'verified';
    } else {
      if (!lead.business_phone) throw err('Lead has no phone');
      lead.phone_verification_status = 'verified';
    }
  } else throw err('method must be mx_check, manual_email_confirmation or manual_phone_confirmation');
  lead.last_verified_at = iso(now);
  markStage(lead, 'verification', 'done', now);
  note(lead, now, actor, `verify.${method}`, text);
  refreshLead(ctx, lead);
  audit(ctx.store, { actor, action: 'lead.verify', entity: 'lead', entityId: id, detail: { method, email: lead.email_verification_status, phone: lead.phone_verification_status } }, now);
  persist(ctx);
  return lead;
}

export function confirmEmailByToken(ctx, id, token, sha) {
  const lead = ctx.store.get('leads', {})[id];
  if (!lead?.email_confirmation_token_hash || sha(String(token)) !== lead.email_confirmation_token_hash) throw err('Invalid or expired confirmation link', 400);
  const now = ctx.now();
  lead.email_verification_status = 'verified';
  lead.email_confirmation_token_hash = null;
  lead.last_verified_at = iso(now);
  note(lead, now, 'subject', 'verify.email_link');
  refreshLead(ctx, lead);
  audit(ctx.store, { actor: 'subject', action: 'lead.email_confirmed', entity: 'lead', entityId: id }, now);
  persist(ctx);
}

export function assignLead(ctx, id, input, actor) {
  const lead = get(ctx, id);
  const now = ctx.now();
  if (lead.review_status !== 'approved') throw err('Only an approved lead can be assigned');
  const advisor = String(input.assigned_advisor || '').trim().slice(0, 100);
  if (!advisor) throw err('assigned_advisor is required');
  lead.assigned_advisor = advisor;
  lead.lead_owner = advisor;
  lead.next_action = String(input.next_action || (lead.gates.eligible_for_outreach ? 'Review enquiry and make approved first contact' : 'Review public signal; no outreach without consent')).slice(0, 200);
  lead.next_action_due = input.next_action_due ? new Date(input.next_action_due).toISOString() : null;
  markStage(lead, 'advisor_assignment', 'done', now);
  note(lead, now, actor, 'assign', advisor);
  refreshLead(ctx, lead);
  audit(ctx.store, { actor, action: 'lead.assign', entity: 'lead', entityId: id, detail: { advisor, next_action: lead.next_action } }, now);
  persist(ctx);
  return lead;
}

const CONTACT_STAGES = ['approved_contact', 'meeting_scheduled', 'qualified_opportunity', 'converted'];
export function setStage(ctx, id, input, actor) {
  const lead = get(ctx, id);
  const now = ctx.now();
  const stage = input.stage;
  if (!PIPELINE_STAGES.includes(stage)) throw err(`stage must be one of ${PIPELINE_STAGES.join(', ')}`);
  if (CONTACT_STAGES.includes(stage) && !lead.gates.eligible_for_outreach) {
    throw err(`Lead is not eligible for outreach: ${lead.gates.failed.join('; ')}`, 409);
  }
  lead.pipeline_stage = stage;
  if (stage === 'meeting_scheduled') { lead.contact_attempt_count += 1; lead.last_contacted_at = iso(now); }
  if (stage === 'converted') lead.conversion_status = 'converted';
  if (stage === 'closed') lead.conversion_status = input.outcome === 'converted' ? 'converted' : 'closed_lost';
  if (input.next_action) lead.next_action = String(input.next_action).slice(0, 200);
  if (input.next_action_due) lead.next_action_due = new Date(input.next_action_due).toISOString();
  if (['meeting_scheduled', 'converted'].includes(stage)) markStage(lead, 'followup', 'done', now);
  if (stage === 'approved_contact') markStage(lead, 'outreach', 'authorised', now);
  note(lead, now, actor, `stage.${stage}`, input.note);
  lead.updated_at = iso(now);
  audit(ctx.store, { actor, action: 'lead.stage', entity: 'lead', entityId: id, detail: { stage } }, now);
  persist(ctx);
  return lead;
}

export function redactLead(lead) {
  Object.assign(lead, { first_name: null, last_name: null, business_email: null, business_phone: null, display_name: lead.company_name || '[deleted]', professional_title: null, related_persons: [], questionnaire: null, visit_attribution: null, redacted: true, email_confirmation_token_hash: null });
  lead.person_redacted_at = new Date().toISOString();
}

export function withdrawConsent(ctx, id, input, actor) {
  const lead = get(ctx, id);
  const now = ctx.now();
  addSuppression(ctx, { email: lead.business_email, phone: lead.business_phone }, 'consent_withdrawn');
  Object.assign(lead, { consent_status: 'withdrawn', opt_out_status: true, do_not_contact_status: true, marketing_consent: false, suppression_reason: 'consent_withdrawn' });
  if (input.delete) redactLead(lead);
  note(lead, now, actor, 'consent.withdrawn', input.delete ? 'with deletion' : null);
  refreshLead(ctx, lead);
  audit(ctx.store, { actor, action: 'consent.withdraw', entity: 'lead', entityId: id, detail: { deleted: !!input.delete } }, now);
  persist(ctx);
  return lead;
}

export function applyRetention(ctx) {
  const now = ctx.now();
  let n = 0;
  for (const lead of Object.values(ctx.store.get('leads', {}))) {
    if (lead.expired || !lead.retention_expiry || new Date(lead.retention_expiry).getTime() > now) continue;
    redactLead(lead);
    lead.expired = true;
    lead.suppression_reason = 'retention_expired';
    refreshLead(ctx, lead);
    audit(ctx.store, { actor: 'system', action: 'lead.expired', entity: 'lead', entityId: lead.lead_id }, now);
    n++;
  }
  if (n) persist(ctx);
  // Archived public records expire on the same per-source retention clock, counted from when they were last seen
  const records = ctx.store.get('records', {});
  let purged = 0;
  const days = {};
  for (const [key, r] of Object.entries(records)) {
    days[r.source_id] ??= retentionDays(ctx, r.source_id);
    if (now - new Date(r.last_seen).getTime() > days[r.source_id] * DAY_MS) { delete records[key]; purged++; }
  }
  if (purged) ctx.store.save('records');
  return n;
}

// ---------- CRM hand-off ----------

const DIVISION = { business_sale_or_acquisition: 'ScotiaMcLeod & Private Banking', ipo_or_listing: 'ScotiaMcLeod & Private Banking', succession_or_retirement: 'ScotiaMcLeod & Private Banking' };

export function toCrmLead(lead) {
  const confirmed = lead.intent_class === 'confirmed';
  return {
    id: lead.lead_id, name: lead.display_name || 'Unidentified', title: lead.professional_title || (confirmed ? 'Enquirer' : 'Decision-maker to be identified'),
    company: lead.company_name || 'Not identified', location: [lead.city, lead.state_or_province, lead.country].filter(Boolean).join(', ') || 'Not stated',
    industry: lead.original_source_id, targetDivision: DIVISION[lead.intent_category] || (confirmed ? 'ScotiaMcLeod & Private Banking' : 'Commercial Wealth Advisory'),
    intentScore: lead.intent_score, urgency: confirmed ? 'Respond promptly' : 'Research only', estimatedAUM: 'To be sized',
    primarySignalType: `${confirmed ? 'Confirmed enquiry' : 'Inferred'}: ${lead.intent_category}`, status: 'Approved for CRM',
    dateDetected: lead.event_date ? new Date(lead.event_date).toLocaleDateString('en-CA') : 'Date unknown',
    confidence: `${Math.round(lead.intent_confidence * 100)}% (${confirmed ? 'self-submitted' : 'inferred'})`,
    externalUrl: lead.original_source_url, isAcquisition: true, intentClass: lead.intent_class,
    signals: [{ source: lead.original_source_id, type: lead.intent_category, detail: lead.evidence_excerpt, weight: lead.intent_score }],
    scoreBreakdown: lead.intent_score_reasons.map((r) => ({ label: r.label, points: r.points })),
    aiAnalysis: {
      headline: lead.evidence_excerpt, rationale: lead.intent_description || 'Person submitted an enquiry requesting an advisor introduction.',
      recommendedStrategy: 'Advisor to review evidence and decide the approach; no suitability conclusion has been made.',
      suggestedOutreachChannel: lead.gates.eligible_for_outreach ? `Approved contact by ${lead.preferred_contact_channel}` : 'Outreach not permitted: no verified consent for this contact.',
      complianceNotice: lead.gates.eligible_for_outreach ? 'Contact permission recorded. Human review required before sending.' : `Not eligible for outreach: ${lead.gates.failed.slice(0, 3).join('; ')}.`,
    },
    householdPreview: { spouse: 'Not yet researched', entities: lead.company_name ? [lead.company_name] : [], jurisdiction: lead.country || 'Unknown' },
    actionTaken: false,
  };
}

function createCrmLead(ctx, lead, actor) {
  const crm = ctx.store.get('crm_leads', {});
  if (crm[lead.lead_id]) return;
  crm[lead.lead_id] = { created_at: iso(ctx.now()), created_by: actor };
  ctx.store.save('crm_leads');
  markStage(lead, 'crm_creation', 'done', ctx.now());
}

// ---------- reading ----------

export function serializeLead(lead, perms) {
  const { email_confirmation_token_hash, ...rest } = lead;
  if (perms.has('leads.contact')) return rest;
  return { ...rest, business_email: maskEmail(lead.business_email), business_phone: maskPhone(lead.business_phone), contact_masked: true };
}

export function listLeads(ctx, q, perms) {
  const all = Object.values(ctx.store.get('leads', {}));
  const needle = String(q.q || '').toLowerCase();
  const minScore = Number(q.min_score || 0);
  const from = q.from ? new Date(q.from).getTime() : null;
  const to = q.to ? new Date(q.to).getTime() : null;
  let rows = all.filter((l) => {
    if (l.review_status === 'duplicate' || l.merge_status === 'merged') return false;
    if (q.segment ? l.qualification_status !== q.segment : (q.include_suppressed !== 'true' && l.qualification_status === 'suppressed')) return false;
    if (needle && !`${l.display_name} ${l.company_name} ${l.intent_category} ${l.professional_title}`.toLowerCase().includes(needle)) return false;
    if (q.country && l.country !== q.country) return false;
    if (q.intent_class && l.intent_class !== q.intent_class) return false;
    if (q.kind === 'confirmed' && l.intent_class !== 'confirmed') return false;
    if (q.kind === 'inferred' && l.intent_class === 'confirmed') return false;
    if (q.intent_category && l.intent_category !== q.intent_category) return false;
    if (minScore && l.intent_score < minScore) return false;
    if (q.contact_verified && String(l.gates.contact_verified) !== q.contact_verified) return false;
    if (q.consent_status && l.consent_status !== q.consent_status) return false;
    if (q.source_id && l.original_source_id !== q.source_id) return false;
    if (q.tag && !(l.tags || []).includes(q.tag)) return false;
    if (q.review_status && l.review_status !== q.review_status) return false;
    if (q.owner && l.assigned_advisor !== q.owner) return false;
    const t = l.event_date ? new Date(l.event_date).getTime() : new Date(l.discovery_date).getTime();
    if (from && t < from) return false;
    if (to && t > to) return false;
    return true;
  });
  rows.sort((a, b) => b.intent_score - a.intent_score || b.created_at.localeCompare(a.created_at));
  const pageSize = Math.min(100, Math.max(1, Number(q.page_size) || 25));
  const page = Math.max(1, Number(q.page) || 1);
  const total = rows.length;
  rows = rows.slice((page - 1) * pageSize, page * pageSize);
  return { total, page, page_size: pageSize, leads: rows.map((l) => serializeLead(l, perms)) };
}
