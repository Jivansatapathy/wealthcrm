// SEC EDGAR Form D (Canadian issuers): private placements with the real dollar amount raised.
// Returns feed-shaped items so the normal parse -> score -> CRM-match pipeline handles them unchanged.
const PROVINCE = { A0: 'AB', A1: 'BC', A2: 'MB', A3: 'NB', A4: 'NL', A5: 'NS', A6: 'ON', A7: 'PE', A8: 'QC', A9: 'SK', B0: 'YT' };
const SEC_UA = `VGT-WealthCRM-IntentEngine ${process.env.SCRAPER_CONTACT || 'contact@example.com'}`; // SEC requires a contact in the UA
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const day = (d) => d.toISOString().slice(0, 10);

const tag = (xml, name) => (xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'))?.[1] || '').trim();
const num = (s) => parseFloat(String(s).replace(/[^\d.]/g, '')) || 0;

async function sec(url, json) {
  const res = await fetch(url, { headers: { 'User-Agent': SEC_UA }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return json ? res.json() : res.text();
}

const baseOf = (h) => `https://www.sec.gov/Archives/edgar/data/${String(parseInt(h._source.ciks[0], 10))}/${h._id.split(':')[0].replace(/-/g, '')}/`;

/**
 * @param isKnown  optional (link) => boolean: filings we already hold are never downloaded again
 * The returned array carries `skippedKnown` (count not re-fetched) and `unusable` (filings read but carrying no size signal,
 * so the caller can remember them and not download them again either).
 */
export async function fetchFormD({ days = 21, limit = 60, isKnown } = {}) {
  const url = `https://efts.sec.gov/LATEST/search-index?forms=D&locationType=biz&locationCodes=${Object.keys(PROVINCE).join(',')}` +
    `&dateRange=custom&startdt=${day(new Date(Date.now() - days * 864e5))}&enddt=${day(new Date())}`;
  const all = (await sec(url, true)).hits.hits;
  const fresh = isKnown ? all.filter((h) => !isKnown(baseOf(h))) : all;
  const hits = fresh.slice(0, limit);
  const items = [];
  const unusable = [];
  for (const h of hits) {
    const base = baseOf(h);
    try {
      await sleep(150); // SEC limit is 10 req/s
      const xml = await sec(`${base}primary_doc.xml`);
      const issuer = tag(xml, 'primaryIssuer');
      const name = tag(issuer, 'entityName');
      const amount = num(tag(xml, 'totalAmountSold')) || num(tag(xml, 'totalOfferingAmount'));
      if (!name || !amount) { unusable.push(base); continue; } // an undisclosed or indefinite offering carries no size signal
      const place = `${tag(issuer, 'city')}, ${PROVINCE[tag(issuer, 'stateOrCountry')] || 'Canada'}`;
      // Structured facts for the acquisition pipeline (names and roles only: street addresses in the filing are never kept)
      const persons = [...xml.matchAll(/<relatedPersonInfo>([\s\S]*?)<\/relatedPersonInfo>/gi)].map((m) => {
        const nm = tag(m[1], 'relatedPersonName');
        const name = ['firstName', 'middleName', 'lastName'].map((t) => tag(nm, t)).filter(Boolean).join(' ');
        const roles = [...m[1].matchAll(/<relationship>([^<]*)<\/relationship>/gi)].map((r) => r[1].trim());
        return { name, roles };
      }).filter((p) => p.name && /^[A-Za-z][A-Za-z.'\- ]+$/.test(p.name) && p.name.split(' ').length >= 2);
      const industry = tag(xml, 'industryGroupType');
      const meta = {
        formD: true, amount, entityType: tag(xml, 'entityType'), industryGroup: industry,
        isFund: /pooled investment fund/i.test(industry) || /<investmentFundInfo>/i.test(xml), persons,
      };
      items.push({
        meta,
        title: `${name} closes $${Math.round(amount).toLocaleString('en-US')} private placement`,
        link: base,
        date: new Date(h._source.file_date).toISOString(),
        summary: `${name} of ${place}, Canada filed SEC Form D reporting a $${Math.round(amount).toLocaleString('en-US')} private placement financing.`,
      });
    } catch { /* an unreadable filing is not remembered, so it is retried next run */ }
  }
  return Object.assign(items, { skippedKnown: all.length - fresh.length, unusable });
}
