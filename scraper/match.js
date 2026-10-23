// Match scraped signals against CRM entities (clients, their holding entities, pipeline, known prospects).
const SUFFIX = /\b(inc|incorporated|corp|corporation|ltd|limited|holdings?|group|co|company|llc|lp|ulc|the|md|frcpc)\b\.?/gi;
export const norm = (s = '') =>
  s.toLowerCase().replace(/\(.*?\)/g, ' ').replace(SUFFIX, ' ').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export function buildCrmIndex(data) {
  const idx = [];
  const add = (label, relation, id) => {
    const key = norm(label);
    // Require >=2 tokens or >=8 chars so generic single words never match
    if (key && (key.split(' ').length >= 2 || key.length >= 8)) idx.push({ key, label, relation, id });
  };

  (data.clients360 || []).forEach((c) => {
    add(c.name, 'Existing client', c.id);
    // Holding / operating entities nested anywhere under the client record
    const walk = (o) => {
      if (!o || typeof o !== 'object') return;
      if (Array.isArray(o)) { o.forEach(walk); return; }
      if (o.type && o.name && o.equityValue) add(o.name, `Existing client entity (${c.name})`, c.id);
      Object.values(o).forEach(walk);
    };
    walk(c);
  });
  (data.pipelineOpportunities || []).forEach((p) => add((p.name || '').split(' - ')[0], 'Active pipeline opportunity', p.id));
  (data.intentLeads || []).forEach((l) => {
    add(l.name, 'Known prospect', l.id);
    add(l.company, 'Known prospect', l.id);
  });
  return idx;
}

export function matchCrm(text, idx) {
  const hay = ` ${norm(text)} `;
  const hit = idx.find((e) => hay.includes(` ${e.key} `));
  return hit ? { relation: hit.relation, label: hit.label, id: hit.id } : null;
}
