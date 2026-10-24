// Stage: INTENT SCORING. Transparent 0-100 score of the strength and relevance of EVIDENCE.
// It is not a measure of a person's wealth or willingness to invest, and it never overrides a consent/rights gate.
export const SCORING_RULE_VERSION = 'acq-v1';

const MAX = { directIntent: 40, recency: 20, reliability: 15, contact: 10, relevance: 10, evidence: 5 };

const recencyPoints = (iso, now) => {
  if (!iso) return 0;
  const days = (now - new Date(iso)) / 864e5;
  return days <= 1 ? 20 : days <= 3 ? 16 : days <= 7 ? 12 : days <= 14 ? 8 : days <= 30 ? 4 : 0;
};

export function evidenceCompleteness(lead) {
  return [lead.original_source_url, lead.event_date, lead.evidence_excerpt, lead.display_name || lead.company_name, lead.original_source_record_id]
    .filter(Boolean).length;
}

/** Missing data earns zero: no invented positive points. */
export function scoreLead(lead, now = Date.now()) {
  const r = [];
  const add = (component, label, points, max, evidence) => r.push({ component, label, points, max, evidence_ref: evidence || null });

  const weightScale = Math.min(1, (lead.signal_weight || 0) / 62);
  const a = lead.intent_class === 'confirmed' ? 40
    : lead.intent_class === 'strong_inferred' ? Math.round(12 * weightScale)
      : lead.intent_class === 'weak_inferred' ? Math.round(5 * weightScale) : 0;
  add('A', lead.intent_class === 'confirmed' ? 'Directly expressed intent (submitted enquiry)' : `Inferred public signal (${lead.intent_category || 'n/a'})`, a, MAX.directIntent, lead.original_source_url);

  add('B', lead.event_date ? 'Event recency' : 'No event date', recencyPoints(lead.event_date, now), MAX.recency, lead.event_date);
  add('C', 'Source reliability', Math.round((lead.source_reliability || 0) * MAX.reliability), MAX.reliability, lead.original_source_id);

  const e = lead.email_verification_status === 'verified' ? 6 : lead.email_verification_status === 'domain_valid' ? 2 : 0;
  const p = lead.phone_verification_status === 'verified' ? 4 : lead.phone_verification_status === 'format_valid' ? 1 : 0;
  add('D', 'Contact verification', Math.min(MAX.contact, e + p), MAX.contact, null);

  const inMarket = ['CA', 'US'].includes(lead.country) ? 5 : 0;
  const service = lead.intent_class === 'confirmed' ? 5 : lead.intent_class === 'strong_inferred' ? 4 : lead.intent_class === 'weak_inferred' ? 1 : 0;
  add('E', 'Geographic and service relevance', inMarket + service, MAX.relevance, null);

  add('F', 'Evidence completeness', evidenceCompleteness(lead), MAX.evidence, lead.evidence_hash);

  const score = Math.max(0, Math.min(100, r.reduce((s, x) => s + x.points, 0)));
  return { intent_score: score, intent_score_reasons: r, scoring_rule_version: SCORING_RULE_VERSION, score_calculated_at: new Date(now).toISOString() };
}
