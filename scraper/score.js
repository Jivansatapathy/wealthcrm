// Rule-based intent scoring: transparent and auditable (no model, no API key).
// score = (strongest signal weight + 20% of up to two secondary signals + deal-size bonus
//          + recency adjustment + Canadian-nexus adjustment) x source-reliability factor.

export const SIGNAL_RULES = [
  { type: 'M&A: Business Sale / Acquisition', weight: 62, division: 'ScotiaMcLeod & Private Banking', urgency: 'Immediate (<7 Days)', hot: true,
    re: /\b(acqui(?:res?|red|sition)|to be acquired|sells?|sold|sale of|merger|merge[sd]?|take-?private|buyout|definitive agreement|plan of arrangement)\b/i,
    rationale: 'A sale or acquisition creates a personal liquidity event for founders and shareholders: proceeds need tax-efficient structuring.',
    strategy: 'Post-liquidity wealth plan: holdco/trust structuring, tax-efficient discretionary portfolio, and estate freeze.' },
  { type: 'Liquidity Event: IPO / Public Listing', weight: 58, division: 'ScotiaMcLeod & Private Banking', urgency: 'Immediate (<7 Days)', hot: true,
    re: /\b(ipo|initial public offering|going public|direct listing|graduat\w+ to (?:the )?tsx|begins trading|prospectus)\b/i,
    rationale: 'A listing or offering unlocks founder and insider equity and often brings lock-up expiries and diversification needs.',
    strategy: 'Concentrated-position and lock-up diversification plan with hedging and charitable-giving options.' },
  { type: 'Corporate Liquidity: Financing / Private Placement', weight: 50, division: 'Commercial Wealth Advisory', urgency: 'Urgent (<14 Days)', hot: true,
    re: /\b(private placement|bought deal|financing|raises?|raised|closes? (?:\$|c\$)|capital raise|credit facility|secondary offering|non-brokered)\b/i,
    rationale: 'Fresh capital raises corporate treasury balances; surplus cash retained in a holdco can trigger passive-income tax drag.',
    strategy: 'Corporate treasury and holdco investment mandate using corporate-class / tax-sheltered structures.' },
  { type: 'Succession & Retirement Trigger', weight: 52, division: 'ScotiaMcLeod & Private Banking', urgency: 'Urgent (<14 Days)', hot: false,
    re: /\b(retire[sd]?|retirement|succession|steps? down|stepping down|successor|passes? away|transition(?:s|ing)? (?:the )?(?:leadership|ownership)|family business)\b/i,
    rationale: 'Leadership and ownership transitions trigger retirement-income, estate and succession-planning needs.',
    strategy: 'Retirement decumulation plan, intergenerational wealth transfer and Scotiatrust estate planning.' },
  { type: 'Executive Equity & Insider Activity', weight: 40, division: 'Commercial Wealth Advisory', urgency: 'Review Required (<30 Days)', hot: false,
    re: /\b(stock options?|option grants?|equity incentive|rsus?|insider (?:selling|buying|sale)|early warning|13d|beneficial ownership)\b/i,
    rationale: 'Equity compensation and large holder changes signal concentrated wealth and upcoming tax events.',
    strategy: 'Equity-compensation planning, exercise/tax scheduling and diversification of concentrated holdings.' },
  { type: 'Executive Appointment', weight: 28, division: 'Commercial Wealth Advisory', urgency: 'Review Required (<30 Days)', hot: false,
    re: /\b(appoints?|appointed|names?|named|joins? as|promoted to)\b.{0,60}\b(ceo|chief|president|chair|director|partner)\b/i,
    rationale: 'New senior roles bring compensation packages, relocation and equity grants that warrant a planning conversation.',
    strategy: 'New-executive wealth onboarding: compensation, equity and cash-flow planning.' },
  { type: 'Dividend / Distribution Windfall', weight: 30, division: 'Commercial Wealth Advisory', urgency: 'Review Required (<30 Days)', hot: false,
    re: /\b(special dividend|return of capital|distribution to shareholders|buyback)\b/i,
    rationale: 'Special distributions put cash in the hands of owners and shareholders.',
    strategy: 'Income-and-reinvestment plan for distribution proceeds.' },
];

// Low-value announcements (events, calls, legal notices) unless a hard deal word is present too
const NOISE_RE = /\b(webinar|conference call|to host|will host|class action|investor presentation|reminds|annual general meeting|announces (?:date|timing)|earnings call|trading halt)\b/i;
// Commentary / stock-tip / residential-real-estate headlines are not deal signals
const COMMENTARY_RE = /(\?\s*$|^(why|how|can|will|should|is|are|forget|here|what)\b|\b(stocks? to|worth watching|here.s what|should (?:you|investors)|growth catalyst|could be worth|investors? should|buy or sell)\b)/i;
const RESIDENTIAL_RE = /\b(over asking|home|house|condo|bungalow|townhouse|detached)\b.{0,40}\b(sells?|sold|listed|asking)\b|\b(sells?|sold)\b.{0,40}\b(over asking|home|house|condo)\b/i;
const DEBT_OR_ROUNDUP_RE = /\b(bonds?|notes|debentures?|news of the day|morning (?:brief|roundup)|stock market today)\b/i;
const OWNER_RE =/\b(founder|co-founder|owner|family-owned|privately[- ]held|private company|family business|shareholders?)\b/i;
const US_ONLY_RE = /\b(nasdaq|nyse|u\.s\.)/i;
const US_STATES = 'alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|wisconsin|wyoming';
// A state counts only in location phrasing (", Iowa" / "in Texas"), so "Nevada Copper" or "a Delaware corporation" are not misread as US
export const US_RE = new RegExp(`\\b(?:u\\.s\\.|united states|usa|nyse|nasdaq|chicago|boston|san francisco|los angeles|seattle|washington,? d\\.?c\\.?)\\b|(?:,\\s*|\\b(?:in|of|from|throughout)\\s+)(?:${US_STATES})\\b`, 'i');
/** Cross-border legend ("not for distribution to U.S. news wire services…") says nothing about where a company is. */
export const stripDisclaimers = (text) => text.replace(/not for (?:distribution|dissemination|release)[^.]*?(?:united states|u\.s\.)[^.]*\.?/gi, ' ');
export const CANADA_RE = /\b(canad\w*|tsx|tsxv|tsx-v|cse|neo exchange|toronto|vancouver|calgary|montr[eé]al|ottawa|edmonton|winnipeg|halifax|ontario|alberta|british columbia|quebec|québec|manitoba|saskatchewan|nova scotia|c\$|cad)\b/i;

/** Largest dollar amount in the text, as CAD-equivalent dollars (US$ x1.35, rough). */
export function extractAmount(text) {
  const re = /(c\$|us\$|\$)\s?([0-9][0-9,]*(?:\.[0-9]+)?)\s?(billion|million|bn|mm|m|b|k)?\b/gi;
  let best = 0, m;
  while ((m = re.exec(text))) {
    let n = parseFloat(m[2].replace(/,/g, ''));
    const u = (m[3] || '').toLowerCase();
    if (u === 'billion' || u === 'bn' || u === 'b') n *= 1e9;
    else if (u === 'million' || u === 'mm' || u === 'm') n *= 1e6;
    else if (u === 'k') n *= 1e3;
    else if (n < 10000) continue;
    if (m[1].toLowerCase() === 'us$') n *= 1.35;
    if (n > best) best = n;
  }
  return best || null;
}

export function formatAmount(n) {
  if (!n) return 'Undisclosed';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n >= 1e8 ? 0 : 1)}M`;
  return `$${Math.round(n / 1e3)}K`;
}

const sizeBonus = (amt) => (!amt ? 0 : amt >= 1e9 ? 14 : amt >= 1e8 ? 11 : amt >= 2.5e7 ? 8 : amt >= 5e6 ? 5 : 2);
// Rough investable wealth mandate: a fraction of the deal that plausibly becomes personal/holdco wealth.
// Mega-cap deals (>$5B) are institutional, not a personal mandate: leave unsized.
const mandateFrom = (amt, rule) => (amt && amt < 5e9 ? amt * (rule.hot ? 0.15 : 0.08) : null);

function recency(dateIso, now) {
  if (!dateIso) return -6;
  const days = (now - new Date(dateIso)) / 864e5;
  if (days <= 1) return 6;
  if (days <= 3) return 3;
  if (days <= 7) return 0;
  if (days <= 14) return -6;
  if (days <= 30) return -14;
  return -30;
}

/**
 * @returns null if the item carries no usable intent, else
 *   { score, signalTypes, primary, amount, mandate, reasons: [{label, points}], canadian }
 */
export function scoreItem(item, source, now = Date.now()) {
  const r = evaluateItem(item, source, now);
  return r.reject ? null : r;
}

/** Same as scoreItem, but a rejected item returns { reject: 'why' } so the UI can explain it. */
export function evaluateItem(item, source, now = Date.now(), opts = {}) {
  const text = `${item.title}. ${item.summary || ''}`;
  if (NOISE_RE.test(item.title) && !/acqui|sale|financing|placement/i.test(item.title)) return { reject: 'Event or notice announcement' };
  if (COMMENTARY_RE.test(item.title.trim())) return { reject: 'Opinion / stock-tip headline' };
  if (RESIDENTIAL_RE.test(item.title)) return { reject: 'Residential real estate' };
  if (DEBT_OR_ROUNDUP_RE.test(item.title)) return { reject: 'Debt issuance or news roundup' };

  const hits = SIGNAL_RULES.filter((r) => r.re.test(text)).sort((a, b) => b.weight - a.weight);
  if (!hits.length) return { reject: 'No wealth-intent keywords' };

  const reasons = [];
  const primary = hits[0];
  let raw = primary.weight;
  reasons.push({ label: `${primary.type} (headline match)`, points: primary.weight });

  hits.slice(1, 3).forEach((h) => {
    const pts = Math.round(h.weight * 0.2);
    raw += pts;
    reasons.push({ label: `Secondary: ${h.type}`, points: pts });
  });

  const amount = extractAmount(text);
  const sb = sizeBonus(amount);
  if (sb) { raw += sb; reasons.push({ label: `Deal size ${formatAmount(amount)}`, points: sb }); }

  const rc = recency(item.date, now);
  if (rc) { raw += rc; reasons.push({ label: rc > 0 ? 'Fresh (<3 days)' : 'Aging signal', points: rc }); }

  const textCa = CANADA_RE.test(text);
  const canadian = textCa || source.region === 'CA';
  // Canadian relevance gate: only Canadian wires get a pass; everything else must show a Canadian link in the text
  // opts.allowUS widens the market gate to the US (used by the acquisition pipeline; the Intent Engine stays Canada-only)
  const usOk = opts.allowUS && (US_RE.test(text) || source.region === 'US');
  if (!canadian && !usOk) return { reject: 'No Canadian link' };
  if (canadian) {
    if (!textCa && !opts.allowUS && US_ONLY_RE.test(text)) { raw -= 14; reasons.push({ label: 'US-listed, no Canadian nexus', points: -14 }); }
    else if (source.region !== 'CA') { raw += 4; reasons.push({ label: 'Canadian nexus in text', points: 4 }); }
  }

  if (OWNER_RE.test(text)) { raw += 8; reasons.push({ label: 'Owner / founder / private-company language', points: 8 }); }

  const score = Math.round(raw * (0.85 + 0.15 * source.reliability));
  return {
    score: Math.max(0, Math.min(100, score)),
    signalTypes: hits.map((h) => h.type),
    primary,
    amount,
    mandate: mandateFrom(amount, primary),
    reasons,
    canadian,
  };
}
