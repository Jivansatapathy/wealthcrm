// Acquisition analytics. Anything that cannot be computed from real records is null, never a made-up number.
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : null);

export function computeMetrics(ctx, sources) {
  const leads = Object.values(ctx.store.get('leads', {})).filter((l) => l.merge_status !== 'merged' && !l.redacted);
  const runs = ctx.store.get('runs', []);
  const byKey = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); m[k] = (m[k] || 0) + 1; return m; }, {});

  // Items we already held are not "new" records, so they stay out of the rejection / duplicate rates
  const received = runs.reduce((a, r) => a + r.received - (r.already_have || 0), 0);
  const rejected = runs.reduce((a, r) => a + r.rejected, 0);
  const dups = runs.reduce((a, r) => a + r.duplicates, 0);
  const accepted = runs.reduce((a, r) => a + r.accepted, 0);

  const contactable = leads.filter((l) => l.business_email || l.business_phone);
  const qualified = leads.filter((l) => ['sales_ready_enquiry', 'research_qualified'].includes(l.qualification_status));
  const meetings = leads.filter((l) => ['meeting_scheduled', 'qualified_opportunity', 'converted'].includes(l.pipeline_stage) || l.stages?.followup?.status === 'done');
  const converted = leads.filter((l) => l.conversion_status === 'converted');
  const totalCost = sources.reduce((a, s) => a + (s.monthly_cost || 0), 0);
  const day = 864e5;

  return {
    generated_at: new Date(ctx.now()).toISOString(),
    totals: { leads: leads.length, qualified: qualified.length, sales_ready: leads.filter((l) => l.qualification_status === 'sales_ready_enquiry').length, eligible_for_outreach: leads.filter((l) => l.gates.eligible_for_outreach).length },
    leads_by_source: byKey(leads, (l) => l.original_source_id),
    records_archived: Object.keys(ctx.store.get('records', {})).length,
    records_by_status: byKey(Object.values(ctx.store.get('records', {})), (r) => r.status),
    by_segment: byKey(leads, (l) => l.qualification_status),
    by_intent_class: byKey(leads, (l) => l.intent_class),
    confirmed_intent_pct: pct(leads.filter((l) => l.intent_class === 'confirmed').length, leads.length),
    contact_verification_rate_pct: pct(contactable.filter((l) => l.gates.contact_verified).length, contactable.length),
    duplicate_rate_pct: pct(dups, accepted + dups),
    rejection_rate_pct: pct(rejected, received),
    consent_failures: leads.filter((l) => l.intent_class === 'confirmed' && !l.gates.consent_verified).length,
    // Cost needs real inputs: with no cost recorded on any source these are null, not zero
    cost_per_qualified_lead: totalCost > 0 && qualified.length ? Math.round(totalCost / qualified.length) : null,
    cost_per_booked_meeting: totalCost > 0 && meetings.length ? Math.round(totalCost / meetings.length) : null,
    conversion_rate_pct: pct(converted.length, leads.filter((l) => l.intent_class === 'confirmed').length),
    booked_meetings: meetings.length,
    source_freshness: sources.filter((s) => !s.system).map((s) => ({
      source_id: s.source_id, source_name: s.source_name, last_successful_fetch: s.last_successful_fetch,
      age_hours: s.last_successful_fetch ? Math.round((ctx.now() - new Date(s.last_successful_fetch)) / 36e5 * 10) / 10 : null,
    })),
    review_queue_size: leads.filter((l) => l.qualification_status !== 'watchlist' && l.qualification_status !== 'suppressed' && (l.qualification_status === 'needs_manual_review' || l.review_status === 'pending')).length,
    new_last_30_days: leads.filter((l) => ctx.now() - new Date(l.created_at) <= 30 * day).length,
  };
}
