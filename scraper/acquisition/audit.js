// Append-only audit trail. Personal fields are redacted from `detail`; link back to the lead by id instead.
const PII_KEY = /^(business_)?(email|phone)$|^(first_name|last_name|display_name|name|token)$/i;

export const maskEmail = (e) => {
  const m = String(e || '').match(/^(.)[^@]*@(.)[^.]*(\..+)$/);
  return m ? `${m[1]}***@${m[2]}***${m[3]}` : e ? '***' : null;
};
export const maskPhone = (p) => (p ? String(p).replace(/\d(?=\d{2})/g, '*') : null);

function scrub(v, depth = 0) {
  if (v == null || depth > 3) return v;
  if (typeof v === 'string') return v.length > 300 ? `${v.slice(0, 300)}…` : v;
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => scrub(x, depth + 1));
  if (typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, PII_KEY.test(k) ? '[redacted]' : scrub(x, depth + 1)]));
  }
  return v;
}

export function audit(store, { actor = 'system', action, entity = null, entityId = null, detail = {} }, now = Date.now()) {
  const log = store.get('audit', []);
  log.push({ id: log.length + 1, at: new Date(now).toISOString(), actor, action, entity, entity_id: entityId, detail: scrub(detail) });
  store.save('audit');
}

export function readAudit(store, { entityId, limit = 200 } = {}) {
  const log = store.get('audit', []);
  const rows = entityId ? log.filter((r) => r.entity_id === entityId) : log;
  return rows.slice(-limit).reverse();
}
