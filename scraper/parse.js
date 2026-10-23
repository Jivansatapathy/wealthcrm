// Dependency-free feed / HTML parsing helpers.
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', ndash: '-', mdash: '-' };

export function decode(s = '') {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

export const stripTags = (s = '') => decode(decode(s).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : '';
};

/** Parse RSS 2.0 (<item>) or Atom (<entry>) into [{title, link, summary, date}] */
export function parseFeed(xml) {
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];
  return blocks.map((b) => {
    let link = stripTags(tag(b, 'link'));
    if (!link) link = (b.match(/<link[^>]*href=["']([^"']+)["']/i) || [])[1] || '';
    const rawDate = stripTags(tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published') || tag(b, 'dc:date'));
    const d = new Date(rawDate);
    return {
      title: stripTags(tag(b, 'title')),
      link: decode(link).trim(),
      summary: stripTags(tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')).slice(0, 600),
      date: isNaN(d) ? null : d.toISOString(),
    };
  }).filter((i) => i.title);
}

/** Generic article extractor for custom pages: headline-like links. */
export function parseHtmlLinks(html, baseUrl) {
  const out = [];
  const seen = new Set();
  const re = /<a\s[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html))) {
    const text = stripTags(m[2]);
    if (text.length < 35 || text.length > 220 || text.split(' ').length < 5) continue;
    let href;
    try { href = new URL(decode(m[1]), baseUrl).href; } catch { continue; }
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ title: text, link: href, summary: '', date: null });
  }
  // Prefer the page's own publish date for single-article pages
  return out.slice(0, 60);
}

export function pageText(html) {
  return stripTags(html.replace(/<(script|style|nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')).slice(0, 1500);
}
