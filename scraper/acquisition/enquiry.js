// Opt-in website enquiry: the only path that creates CONFIRMED-intent leads from the public.
import { randomBytes } from 'node:crypto';
import { newLead, markStage } from './leads.js';
import { addLead, newRun, recordRejection } from './ingest.js';
import { consentCopy, CONSENT_VERSION } from './consent.js';
import { normEmail, normPhone } from './dedupe.js';
import { isValidEmailFormat, checkPhone } from './verify.js';
import { ENQUIRY_CATEGORIES } from './classify.js';
import { sha } from './normalize.js';
import { sourceTags } from './tags.js';
import { audit } from './audit.js';
import { getSource, ensureSystemPermissions } from './registry.js';
import { addSuppression } from './consent.js';
import { refreshLead } from './leads.js';
import { attributionFor } from './visitors.js';
import { parseQuestionnaire, questionnaireOptions } from './questionnaire.js';

export const ASSET_RANGES = ['under_250k', '250k_1m', '1m_5m', '5m_plus', 'prefer_not_to_say'];
export const TIMEFRAMES = ['this_week', 'this_month', 'next_3_months', 'just_exploring'];
const err = (message, status = 400) => Object.assign(new Error(message), { status });
const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function enquiryConfig(ctx) {
  const business = ctx.env.ACQ_BUSINESS_NAME;
  if (!business) return { configured: false, message: 'The enquiry form is not configured: set ACQ_BUSINESS_NAME to the legal name of the business receiving enquiries.' };
  return {
    configured: true, business, privacy_url: ctx.env.ACQ_PRIVACY_URL || null, consent: consentCopy(business),
    categories: ENQUIRY_CATEGORIES, asset_ranges: ASSET_RANGES, timeframes: TIMEFRAMES, captcha_site_key: ctx.env.ACQ_TURNSTILE_SITE_KEY || null, questionnaire: questionnaireOptions(),
  };
}

async function verifyCaptcha(ctx, token, ip) {
  const secret = ctx.env.ACQ_TURNSTILE_SECRET;
  if (!secret) return true; // honeypot + rate limit only; documented limitation
  if (!token) return false;
  try {
    const res = await ctx.fetchJson('https://challenges.cloudflare.com/turnstile/v0/siteverify', { secret, response: token, remoteip: ip });
    return !!res.success;
  } catch { return false; }
}

export async function submitEnquiry(ctx, body, ip) {
  const cfg = enquiryConfig(ctx);
  if (!cfg.configured) throw err(cfg.message, 503);
  ensureSystemPermissions(ctx);
  const now = ctx.now();
  const run = newRun(ctx, 'website-enquiry', 'form', 'form');

  // Anti-abuse: a filled honeypot gets a normal-looking success so bots learn nothing.
  if (clean(body.website, 200)) return { ok: true, message: 'Thank you. We will be in touch.' };
  if (!(await verifyCaptcha(ctx, body.captcha_token, ip))) throw err('CAPTCHA verification failed');

  const name = clean(body.name, 100);
  const email = normEmail(clean(body.email, 200));
  const phone = body.phone ? normPhone(clean(body.phone, 30)) : null;
  const country = clean(body.country, 2).toUpperCase();
  if (name.length < 2) throw err('Please enter your name');
  if (!isValidEmailFormat(email)) throw err('Please enter a valid email address');
  if (body.phone && !phone) throw err('Please enter a valid US or Canadian phone number');
  if (!['CA', 'US'].includes(country)) throw err('Country must be Canada or the United States');
  const category = clean(body.advice_type, 40);
  if (!ENQUIRY_CATEGORIES.includes(category)) throw err('Please choose the type of advice you want');
  const channel = clean(body.preferred_contact, 10);
  if (!['email', 'phone'].includes(channel) || (channel === 'phone' && !phone)) throw err('Please choose a contact method (phone requires a phone number)');
  const assets = clean(body.asset_range, 30);
  if (assets && !ASSET_RANGES.includes(assets)) throw err('Invalid asset range');
  const timeframe = clean(body.timeframe, 30);
  if (timeframe && !TIMEFRAMES.includes(timeframe)) throw err('Invalid timeframe');
  const questionnaire = parseQuestionnaire(body);
  // Consent must be an explicit boolean true, against the exact wording version currently shown.
  if (body.consent_share !== true) throw err('You must agree to share your enquiry with us to submit it');
  if (body.consent_text_version !== CONSENT_VERSION) throw err('The consent wording has changed; please reload the form');

  const [first, ...rest] = name.split(/\s+/);
  const recordId = 'ENQ-' + randomBytes(5).toString('hex').toUpperCase();
  const token = randomBytes(24).toString('base64url');
  const source = getSource(ctx, 'website-enquiry');
  const lead = newLead({
    lead_id: 'ACQ-' + sha(recordId, 'sha1').slice(0, 10).toUpperCase(),
    first_name: first, last_name: rest.join(' ') || null, display_name: name, business_email: email, business_phone: phone,
    email_verification_status: 'pending_confirmation', phone_verification_status: phone ? checkPhone(phone) : 'unverified',
    country, state_or_province: clean(body.state_or_province, 40) || null, city: clean(body.city, 60) || null, preferred_contact_channel: channel,
    intent_class: 'confirmed', intent_category: category, intent_description: 'Person submitted an enquiry asking for an advisor introduction.',
    original_source_id: 'website-enquiry', original_source_record_id: recordId, original_source_url: ctx.env.ACQ_PUBLIC_URL ? `${ctx.env.ACQ_PUBLIC_URL}/enquiry.html` : null,
    event_date: new Date(now).toISOString(), evidence_excerpt: `Self-submitted enquiry (${category}); timeframe: ${timeframe || 'not stated'}`,
    evidence_hash: sha(`${recordId}|${email}|${now}`), source_reliability: 1, intent_confidence: 0.9, signal_weight: 62,
    wealth_status: assets && assets !== 'prefer_not_to_say' ? 'self_reported' : 'unknown', wealth_range: assets && assets !== 'prefer_not_to_say' ? assets : null,
    wealth_estimate_source: assets && assets !== 'prefer_not_to_say' ? 'self_reported_on_form' : null, wealth_estimate_date: assets ? new Date(now).toISOString() : null,
    investment_interest_category: category, questionnaire, visit_attribution: attributionFor(ctx, body.visitor_id),
    consent_status: 'granted', consent_timestamp: new Date(now).toISOString(), consent_source: 'website-enquiry-form', consent_text_version: CONSENT_VERSION,
    permitted_purpose: consentCopy(cfg.business).purpose, permitted_recipient: cfg.business, permitted_channels: [channel],
    marketing_consent: body.consent_marketing === true, retention_expiry: new Date(now + (source.permitted_retention_period || 365) * 864e5).toISOString(),
    email_confirmation_token_hash: sha(token),
    tags: [...sourceTags(source), `trigger:form`, `geo:${country}`],
    received_via: { source_id: 'website-enquiry', source_name: source.source_name, channel: 'form', run_id: null, trigger: 'form', received_at: new Date(now).toISOString() },
  }, now);
  ['ingestion', 'normalization', 'classification', 'consent_rights'].forEach((s) => markStage(lead, s, 'done', now));
  markStage(lead, 'verification', 'pending_confirmation', now);

  const added = addLead(ctx, lead, { title: '[enquiry form submission]' }, run);
  ctx.store.save('leads');
  ctx.store.save('rejections');
  if (!added) return { ok: true, message: 'Thank you. We will be in touch.' }; // duplicates/suppressed look identical to the submitter
  await sendConfirmation(ctx, added, token);
  return { ok: true, message: 'Thank you. Please check your email to confirm your address; we will be in touch.' };
}

async function sendConfirmation(ctx, lead, token) {
  const hook = ctx.env.ACQ_MAIL_WEBHOOK;
  if (!hook || !ctx.env.ACQ_PUBLIC_URL) {
    audit(ctx.store, { actor: 'system', action: 'mail.not_configured', entity: 'lead', entityId: lead.lead_id, detail: { note: 'Set ACQ_MAIL_WEBHOOK and ACQ_PUBLIC_URL to send confirmation emails; a reviewer must verify manually until then.' } }, ctx.now());
    return;
  }
  try {
    await ctx.fetchJson(hook, { to: lead.business_email, template: 'enquiry_confirmation', link: `${ctx.env.ACQ_PUBLIC_URL}/api/acq/enquiry/confirm?id=${lead.lead_id}&token=${token}` });
    audit(ctx.store, { actor: 'system', action: 'mail.confirmation_sent', entity: 'lead', entityId: lead.lead_id }, ctx.now());
  } catch (e) {
    audit(ctx.store, { actor: 'system', action: 'mail.failed', entity: 'lead', entityId: lead.lead_id, detail: { error: e.message } }, ctx.now());
  }
}

/** Public opt-out: honoured immediately and uniformly, whether or not the address is known. */
export function requestWithdrawal(ctx, body) {
  const email = normEmail(clean(body.email, 200));
  if (!email) throw err('Please enter your email address');
  addSuppression(ctx, { email }, 'withdrawal_request');
  const leads = ctx.store.get('leads', {});
  let n = 0;
  for (const l of Object.values(leads)) {
    if (normEmail(l.business_email) !== email) continue;
    Object.assign(l, { consent_status: 'withdrawn', opt_out_status: true, do_not_contact_status: true, marketing_consent: false, suppression_reason: 'withdrawal_request', withdrawal_requested_at: new Date(ctx.now()).toISOString() });
    l.history.push({ at: new Date(ctx.now()).toISOString(), actor: 'subject', action: 'consent.withdrawal_requested' });
    refreshLead(ctx, l);
    audit(ctx.store, { actor: 'subject', action: 'consent.withdrawal_request', entity: 'lead', entityId: l.lead_id }, ctx.now());
    n++;
  }
  if (n) ctx.store.save('leads');
  return { ok: true, message: 'Your request has been recorded. You will not be contacted. To have your data deleted, reply to the contact address in our privacy notice.' };
}
