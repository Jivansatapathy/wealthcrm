// Stage: CONTACT AND IDENTITY VERIFICATION.
// "domain_valid" only proves the address is well-formed and its domain accepts mail. It does NOT prove the person owns it,
// so it never satisfies the contact-verified gate. Only `verified` does: set by email-link confirmation or a logged human check.
import dns from 'node:dns/promises';
import { normEmail, normPhone } from './dedupe.js';

const EMAIL_RE = /^[a-z0-9._%+-]{1,64}@([a-z0-9-]+\.)+[a-z]{2,}$/i;
const DISPOSABLE = new Set(['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'yopmail.com', 'trashmail.com']);

export const isValidEmailFormat = (email) => {
  const e = normEmail(email);
  return !!e && EMAIL_RE.test(e) && !DISPOSABLE.has(e.split('@')[1]);
};

export async function checkEmail(email, resolveMx = (d) => dns.resolveMx(d)) {
  const e = normEmail(email);
  if (!e || !EMAIL_RE.test(e)) return 'invalid_format';
  const domain = e.split('@')[1];
  if (DISPOSABLE.has(domain)) return 'disposable';
  try {
    const mx = await resolveMx(domain);
    return mx?.length ? 'domain_valid' : 'invalid_domain';
  } catch (err) {
    return err?.code === 'ENOTFOUND' || err?.code === 'ENODATA' ? 'invalid_domain' : 'unverifiable';
  }
}

export function checkPhone(phone) {
  return normPhone(phone) ? 'format_valid' : 'invalid_format';
}
