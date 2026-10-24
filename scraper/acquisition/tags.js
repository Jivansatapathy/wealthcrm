// Origin tags: where a record was received (source, channel, type, geography) and which run brought it in.
// Derived tags (class / category / segment) are recomputed whenever a lead is re-qualified.
const DERIVED = /^(class|category|segment):/;
export const uniq = (arr) => [...new Set(arr.filter(Boolean))];

export const sourceTags = (source) => uniq([
  `source:${source.source_id}`, `channel:${source.access_method}`, `type:${source.source_type}`,
  ...(source.geographic_coverage || []).map((g) => `geo:${g}`),
]);

export const recordTags = (source, run, extra = []) => uniq([
  ...sourceTags(source), run?.run_id && `run:${run.run_id}`, run?.trigger && `trigger:${run.trigger}`, ...extra,
]);

export function syncTags(lead) {
  const keep = (lead.tags || []).filter((t) => !DERIVED.test(t));
  lead.tags = uniq([...keep, lead.intent_class && `class:${lead.intent_class}`, lead.intent_category && `category:${lead.intent_category}`,
    lead.qualification_status && `segment:${lead.qualification_status}`]);
}
