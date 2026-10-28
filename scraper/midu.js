// Midu (midu.si) funding rounds, Canadian companies only. Internal research use: the API terms forbid resale, sublicensing and
// bulk redistribution, and require "Data: Midu (midu.si)" wherever the data is shown. Free tier: 1,000 requests/day, 60/minute.
// Returns feed-shaped items so the normal parse -> score -> CRM-match pipeline handles them unchanged.
const BASE = 'https://midu.si/api/v1';
// Midu has no country filter, so search Canadian place names and keep only rows whose own country says Canada.
const TERMS = ['canada', 'toronto', 'vancouver', 'montreal', 'calgary', 'ottawa', 'ontario', 'quebec', 'alberta', 'british columbia', 'waterloo'];
const isCanada = (r) => /^(CA|CAN|CANADA)$/i.test(String(r.country || '').trim()) || /\bCANADA$/i.test(String(r.country || '').trim());
const usd = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const day = (ms) => new Date(ms).toISOString().slice(0, 10);

export async function fetchMidu({ key, days = 21, isKnown, fetchImpl = fetch, now = Date.now() } = {}) {
  if (!key) throw new Error('Midu is not configured: set MIDU_API_KEY');
  const seen = new Map();
  for (const q of TERMS) {
    const res = await fetchImpl(`${BASE}/rounds?limit=100&from=${day(now - days * 864e5)}&q=${encodeURIComponent(q)}`,
      { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000) });
    if (res.status === 401) throw new Error('Midu rejected the API key (401)');
    if (res.status === 429) throw new Error(`Midu rate limit reached; retry after ${res.headers.get('retry-after') || 'later'}`);
    if (!res.ok) throw new Error(`Midu HTTP ${res.status}`);
    for (const r of (await res.json()).data || []) if (isCanada(r) && !seen.has(r.id)) seen.set(r.id, r);
  }
  const rows = [...seen.values()];
  const fresh = isKnown ? rows.filter((r) => !isKnown(r.url)) : rows;
  const items = fresh.map((r) => {
    const place = [r.city, 'Canada'].filter(Boolean).join(', ');
    const amount = r.amount_usd ? ` ${usd(r.amount_usd)} (USD)` : '';
    return {
      // Lead the title with Midu's own company name so extraction cannot mistake a headline subject for the company
      title: !r.headline ? `${r.company} raises${amount}` : r.headline.toLowerCase().startsWith(r.company.toLowerCase()) ? r.headline : `${r.company} announces financing: ${r.headline}`,
      link: r.url,
      date: new Date(r.date).toISOString(),
      summary: `${r.company} of ${place}${amount ? `,${amount}` : ''}. ${r.ai?.summary || ''} Data: Midu (midu.si)`.slice(0, 400),
    };
  });
  return Object.assign(items, { skippedKnown: rows.length - fresh.length });
}
