// Consent wording/versioning and the do-not-contact suppression list (stored as hashes, so it survives deletion requests).
import { sha } from './normalize.js';
import { normEmail, normPhone } from './dedupe.js';

export const CONSENT_VERSION = 'v2';

export function consentCopy(business) {
  return {
    version: CONSENT_VERSION,
    share: `I agree that ${business} may use the details I provide here to contact me about my request for financial advice or wealth-management services. Only the ${business} representatives who handle my request will see them; they are not given to any other firm to contact me. I can withdraw this consent at any time.`,
    marketing: `Optional: I also agree to receive occasional news, events and offers from ${business}.`,
    purpose: `Respond to my request for an advisor introduction or consultation`,
  };
}

const hashes = ({ email, phone }) => [
  normEmail(email) && `e:${sha(normEmail(email))}`,
  normPhone(phone) && `p:${sha(normPhone(phone))}`,
].filter(Boolean);

export function isSuppressed(ctx, contact) {
  const list = ctx.store.get('suppressions', {});
  return hashes(contact).some((h) => list[h]);
}

export function addSuppression(ctx, contact, reason) {
  const list = ctx.store.get('suppressions', {});
  hashes(contact).forEach((h) => { list[h] = { at: new Date(ctx.now()).toISOString(), reason }; });
  ctx.store.save('suppressions');
}
