// Bearer-token authentication with role-based permissions, plus a small in-memory rate limiter.
// Tokens come from ACQ_TOKENS="admin:<token>,advisor:<token>,compliance:<token>,viewer:<token>" (>=16 chars each).
// Outside production, if none are configured, random dev tokens are generated into <data dir>/dev-tokens.json.
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const ROLE_PERMS = {
  admin: ['sources.read', 'sources.manage', 'leads.read', 'leads.contact', 'leads.review', 'leads.suppress', 'leads.verify',
    'leads.assign', 'leads.export', 'leads.import', 'consent.manage', 'audit.read', 'metrics.read'],
  compliance: ['sources.read', 'leads.read', 'leads.contact', 'leads.review', 'leads.suppress', 'leads.verify', 'leads.export',
    'consent.manage', 'audit.read', 'metrics.read'],
  advisor: ['sources.read', 'leads.read', 'leads.contact', 'leads.review', 'leads.assign', 'leads.export', 'metrics.read'],
  viewer: ['sources.read', 'leads.read', 'metrics.read'],
};

const sha = (s) => createHash('sha256').update(s).digest('hex');

export function loadTokens(env, dir) {
  const tokens = new Map();
  const add = (role, token) => {
    if (!ROLE_PERMS[role]) return console.warn(`[acq] ignoring token for unknown role "${role}"`);
    if (String(token).length < 16) return console.warn(`[acq] ignoring ${role} token: must be at least 16 characters`);
    tokens.set(sha(token), { role });
  };
  (env.ACQ_TOKENS || '').split(',').map((p) => p.trim()).filter(Boolean).forEach((p) => {
    const i = p.indexOf(':');
    if (i > 0) add(p.slice(0, i), p.slice(i + 1));
  });
  if (tokens.size || env.NODE_ENV === 'production') return { tokens, devFile: null };

  const devFile = path.join(dir, 'dev-tokens.json');
  let dev;
  try { dev = JSON.parse(fs.readFileSync(devFile, 'utf8')); } catch { dev = null; }
  if (!dev) {
    dev = Object.fromEntries(Object.keys(ROLE_PERMS).map((r) => [r, randomBytes(18).toString('base64url')]));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(devFile, JSON.stringify(dev, null, 2));
  }
  Object.entries(dev).forEach(([role, token]) => add(role, token));
  return { tokens, devFile };
}

/** @returns {{role, actor, perms:Set<string>} | null} */
export function authenticate(req, tokens) {
  const h = req.headers.authorization || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const hash = sha(m[1].trim());
  const hit = tokens.get(hash);
  return hit ? { role: hit.role, actor: `${hit.role}:${hash.slice(0, 6)}`, perms: new Set(ROLE_PERMS[hit.role]) } : null;
}

export function createLimiter() {
  const hits = new Map();
  return function limited(key, max, windowMs, now = Date.now()) {
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    arr.push(now);
    hits.set(key, arr);
    return arr.length > max;
  };
}
