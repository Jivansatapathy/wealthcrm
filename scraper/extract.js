// Pull company / executive hints out of headlines. Conservative: never invents names or titles.
const VERBS = /\s+(?:announces?|provides?|reports?|completes?|closes?|closing|enters?|acquires?|to acquire|to be acquired|sells?|sold|raises?|appoints?|names?|receives?|signs?|files?|launches?|upsizes?|amends?|grants?|reaches?|retires?|steps?|secures?|prices?|plans?|begins?|commences?|expands?|obtains?|advances?|moves?|looks?|continues?|establishes?|gains?|examines?|highlights?|forms?|unveils?|joins?|completes|to establish|to launch|to raise|to sell|has|have|will|and)\b/i;
const ROLE_NAME_RE = /\b(?:[Ff]ounder|[Cc]o-[Ff]ounder|[Cc]hairman|[Cc]hair|[Pp]resident|CEO|[Cc]hief [Ee]xecutive [Oo]fficer|[Mm]anaging [Pp]artner|[Oo]wner)[\s,]+([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z'-]+)/;
const NAME_ROLE_RE = /([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z'-]+),?\s+(?:the\s+)?(founder|co-founder|chairman|chair|president|ceo|chief executive officer|managing partner|owner)\b/i;
const NOT_NAMES = /^(The|Our|New|Canadian|Global|Chief|Executive|Board|Vice|Senior|Chair|Former)\b/;

const titleCase = (s) => (/^ceo$/i.test(s) ? 'CEO' : s.replace(/\b\w/g, (c) => c.toUpperCase()));

/** Google News appends " - Publisher" to titles. */
export function cleanTitle(title) {
  return title.replace(/\s+[-–|]\s+[^-–|]{3,40}$/, '').trim();
}

export function extractCompany(title) {
  const t = cleanTitle(title);
  const suffixed = t.match(/([A-Z][\w&.' -]{2,50}?\s(?:Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|Holdings|Group|Capital|Partners|Resources|Technologies|Energy|Mining)(?:\s\((?:TSX|TSXV|TSX-V|CSE|NEO|NYSE|NASDAQ)[^)]*\))?)/);
  if (suffixed) return suffixed[1].trim();
  const parts = t.split(VERBS);
  // No verb found => the "head" is the whole sentence, not a company name
  if (parts.length < 2) return null;
  const head = parts[0].replace(/'s$|’s$/, '').replace(/^[\W_]+/, '').trim();
  return head.length >= 3 && head.length <= 50 && head.split(/\s+/).length <= 6 ? head : null;
}

export function extractPerson(text) {
  const a = text.match(NAME_ROLE_RE);
  if (a && !NOT_NAMES.test(a[1])) return { name: a[1], title: titleCase(a[2]) };
  const b = text.match(ROLE_NAME_RE);
  if (b && !NOT_NAMES.test(b[1])) return { name: b[1], title: null };
  return null;
}

export function extractLocation(text) {
  const m = text.match(/\b(Toronto|Vancouver|Calgary|Montr[eé]al|Ottawa|Edmonton|Winnipeg|Halifax|Mississauga|Victoria|Quebec City|Waterloo|Kelowna)\b(?:,\s*(ON|AB|BC|QC|MB|NS|SK|NB))?/);
  return m ? m[0] : null;
}
