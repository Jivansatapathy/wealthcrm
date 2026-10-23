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

export async function fetchFormD({ days = 21, limit = 60 } = {}) {
  const url = `https://efts.sec.gov/LATEST/search-index?forms=D&locationType=biz&locationCodes=${Object.keys(PROVINCE).join(',')}` +
    `&dateRange=custom&startdt=${day(new Date(Date.now() - days * 864e5))}&enddt=${day(new Date())}`;
  const hits = (await sec(url, true)).hits.hits.slice(0, limit);
  const items = [];
  for (const h of hits) {
    const [adsh] = h._id.split(':');
    const cik = String(parseInt(h._source.ciks[0], 10));
    const base = `https://www.sec.gov/Archives/edgar/data/${cik}/${adsh.replace(/-/g, '')}/`;
    try {
      await sleep(150); // SEC limit is 10 req/s
      const xml = await sec(`${base}primary_doc.xml`);
      const issuer = tag(xml, 'primaryIssuer');
      const name = tag(issuer, 'entityName');
      const amount = num(tag(xml, 'totalAmountSold')) || num(tag(xml, 'totalOfferingAmount'));
      if (!name || !amount) continue; // an undisclosed or indefinite offering carries no size signal
      const place = `${tag(issuer, 'city')}, ${PROVINCE[tag(issuer, 'stateOrCountry')] || 'Canada'}`;
      items.push({
        title: `${name} closes $${Math.round(amount).toLocaleString('en-US')} private placement`,
        link: base,
        date: new Date(h._source.file_date).toISOString(),
        summary: `${name} of ${place}, Canada filed SEC Form D reporting a $${Math.round(amount).toLocaleString('en-US')} private placement financing.`,
      });
    } catch { /* skip an unreadable filing */ }
  }
  return items;
}
