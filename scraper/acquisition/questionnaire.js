// Optional questionnaire answers on the public enquiry form (age, goals, income, etc.).
// Every field is optional and self-reported. We collect nothing passively (no ad IDs, no device fingerprinting) and buy no third-party data.
// Not collected on purpose: SSN/SIN, account numbers, credentials, payment details.
export const AGE_RANGES = ['under_30', '30_39', '40_49', '50_59', '60_69', '70_plus'];
export const MARITAL_STATUSES = ['single', 'married_or_partnered', 'divorced_or_separated', 'widowed'];
export const INCOME_RANGES = ['under_100k', '100k_250k', '250k_500k', '500k_plus'];
export const SAVINGS_RANGES = ['under_1k', '1k_5k', '5k_plus'];
export const HOME_OWNERSHIP = ['own', 'rent', 'other'];
export const GOALS = ['retire_comfortably', 'grow_investments', 'reduce_taxes', 'plan_estate', 'sell_or_transition_business', 'manage_windfall', 'protect_family'];
export const YES_NO = ['yes', 'no'];

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bad = (message) => Object.assign(new Error(message), { status: 400 });

const oneOf = (body, key, allowed, label) => {
  const v = clean(body[key], 40);
  if (!v) return null;
  if (!allowed.includes(v)) throw bad(`Invalid ${label}`);
  return v;
};

/** Returns the validated answers (null for anything unanswered), or null if nothing was answered. Rejects unknown values. */
export function parseQuestionnaire(body) {
  let goals = [];
  if (body.goals !== undefined && body.goals !== null) {
    if (!Array.isArray(body.goals) || body.goals.length > GOALS.length) throw bad('Invalid goals');
    goals = [...new Set(body.goals.map((g) => clean(g, 40)))];
    if (goals.some((g) => !GOALS.includes(g))) throw bad('Invalid goals');
  }
  const postal = clean(body.postal_code, 10).toUpperCase().replace(/\s+/g, '');
  if (postal && !/^(\d{5}|[A-Z]\d[A-Z]\d[A-Z]\d)$/.test(postal)) throw bad('Please enter a valid ZIP or Canadian postal code');
  const q = {
    age_range: oneOf(body, 'age_range', AGE_RANGES, 'age range'),
    marital_status: oneOf(body, 'marital_status', MARITAL_STATUSES, 'marital status'),
    household_income_range: oneOf(body, 'household_income_range', INCOME_RANGES, 'income range'),
    monthly_savings_range: oneOf(body, 'monthly_savings_range', SAVINGS_RANGES, 'savings range'),
    home_ownership: oneOf(body, 'home_ownership', HOME_OWNERSHIP, 'home ownership'),
    owns_business: oneOf(body, 'owns_business', YES_NO, 'business ownership answer'),
    goals,
    postal_code: postal || null,
  };
  const answered = Object.values(q).some((v) => (Array.isArray(v) ? v.length : v !== null));
  return answered ? q : null;
}

export const questionnaireOptions = () => ({
  age_ranges: AGE_RANGES, marital_statuses: MARITAL_STATUSES, income_ranges: INCOME_RANGES, savings_ranges: SAVINGS_RANGES,
  home_ownership: HOME_OWNERSHIP, goals: GOALS,
});
