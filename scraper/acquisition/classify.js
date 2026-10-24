// Stage: EVENT AND INTENT CLASSIFICATION.
//   confirmed       - the person asked for an advisor / consultation (only via first-party form or authorised provider records)
//   strong_inferred - public event suggesting a wealth-planning need (sale, IPO, succession); stays INFERRED until confirmed
//   weak_inferred   - background signal; research only
//   disqualified    - rejected, with a recorded reason
export const INTENT_CLASSES = ['confirmed', 'strong_inferred', 'weak_inferred', 'disqualified'];

const CATEGORY = [
  [/^M&A/, 'business_sale_or_acquisition', true],
  [/^Liquidity Event/, 'ipo_or_listing', true],
  [/^Succession/, 'succession_or_retirement', true],
  [/^Corporate Liquidity/, 'corporate_financing', false],
  [/^Executive Equity/, 'executive_equity_activity', false],
  [/^Executive Appointment/, 'executive_appointment', false],
  [/^Dividend/, 'distribution_windfall', false],
];

export function classifyInferred(ev, rec, reliability) {
  const type = ev.primary.type;
  const [, category, strong] = CATEGORY.find(([re]) => re.test(type)) || [null, 'other_public_signal', false];
  // Heuristic confidence in the *classification* (not in the person's wealth or willingness to invest)
  const base = 0.35 + 0.35 * reliability + (rec.company_name ? 0.1 : 0) + (rec.event_date ? 0.1 : 0) + (rec.original_source_url ? 0.1 : 0);
  return {
    intent_class: strong ? 'strong_inferred' : 'weak_inferred',
    intent_category: category,
    intent_description: ev.primary.rationale,
    signal_weight: ev.primary.weight,
    intent_confidence: Math.round(Math.min(0.95, strong ? base : base * 0.75) * 100) / 100,
  };
}

export const ENQUIRY_CATEGORIES = ['financial_advisor', 'retirement_planning', 'wealth_management', 'estate_planning', 'liquidity_event_planning', 'investment_information'];
