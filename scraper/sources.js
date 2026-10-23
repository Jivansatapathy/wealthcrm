// Built-in intent sources. Custom URLs added from the CRM are stored in data/custom-sources.json.
const gnews = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-CA&gl=CA&ceid=CA:en`;

export const BUILTIN_SOURCES = [
  // Press wires
  { id: 'globenewswire-ca', name: 'GlobeNewswire Canada', kind: 'rss', category: 'Press Wire', reliability: 1.0, region: 'CA',
    url: 'https://www.globenewswire.com/RssFeed/country/Canada/feedTitle/GlobeNewswire%20-%20Canada' },
  { id: 'newswire-ca', name: 'Newswire.ca (CNW)', kind: 'rss', category: 'Press Wire', reliability: 1.0, region: 'CA',
    url: 'https://www.newswire.ca/rss/news-releases-list.rss' },

  // News sites (via Google News RSS, scoped to publisher / topic)
  { id: 'news-globe', name: 'The Globe and Mail', kind: 'rss', category: 'News', reliability: 0.9, region: 'any',
    url: gnews('site:theglobeandmail.com (sells OR acquired OR acquisition OR IPO OR "private placement" OR retires OR succession)') },
  { id: 'news-fp', name: 'Financial Post', kind: 'rss', category: 'News', reliability: 0.9, region: 'any',
    url: gnews('site:financialpost.com (sells OR acquired OR acquisition OR IPO OR "private placement" OR retires OR succession)') },
  { id: 'news-founder-exits', name: 'News: Founder exits & business sales', kind: 'rss', category: 'News', reliability: 0.8, region: 'any',
    url: gnews('Canadian founder sells company OR "business sale" OR "sold to" OR "management buyout"') },
  { id: 'news-exec-change', name: 'News: Executive transitions', kind: 'rss', category: 'News', reliability: 0.8, region: 'any',
    url: gnews('Canada CEO retires OR "steps down" OR "successor named" OR "family business succession"') },

  // Regulatory filings
  { id: 'edgar-form-d-ca', name: 'SEC EDGAR: Form D (Canadian private placements)', kind: 'edgar-formd', category: 'Regulatory', reliability: 1.0, region: 'CA',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=D' },
  // SEDAR+ has no public feed and its search UI is a JS app behind bot protection, so it is not scraped
  // directly; material-change disclosures reach us through the wires above. EDGAR is public.
  { id: 'edgar-13d', name: 'SEC EDGAR: Schedule 13D (activist / large holders)', kind: 'atom', category: 'Regulatory', reliability: 0.7, region: 'US',
    url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=SC+13D&company=&dateb=&owner=include&start=0&count=40&output=atom' },
];
