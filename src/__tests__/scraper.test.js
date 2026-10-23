import { describe, it, expect } from 'vitest';
import { scoreItem, evaluateItem, extractAmount, formatAmount } from '../../scraper/score.js';
import { extractCompany, extractPerson, cleanTitle } from '../../scraper/extract.js';
import { parseFeed } from '../../scraper/parse.js';
import { buildCrmIndex, matchCrm } from '../../scraper/match.js';
import { WEALTH_DATA } from '../data/wealthData';

const wire = { reliability: 1, region: 'CA' };
const news = { reliability: 0.8, region: 'any' };
const now = Date.parse('2026-10-22T12:00:00Z');
const item = (title, date = '2026-10-22T08:00:00Z', summary = '') => ({ title, summary, date });

describe('scraper scoring', () => {
  it('scores a fresh Canadian sale highly and extracts deal size', () => {
    const s = scoreItem(item('Maple Industries Inc. to be acquired by Northern Capital for $450 million'), wire, now);
    expect(s.primary.type).toMatch(/M&A/);
    expect(s.amount).toBe(450e6);
    expect(s.score).toBeGreaterThan(75);
  });

  it('drops commentary, residential real estate, and debt issuance', () => {
    expect(scoreItem(item('Should investors buy this stock after the acquisition?'), wire, now)).toBeNull();
    expect(scoreItem(item('Riverdale home sells $326,000 over asking'), wire, now)).toBeNull();
    expect(scoreItem(item('CIBC sells $1 billion limited recourse capital notes'), wire, now)).toBeNull();
  });

  it('explains why an item was rejected', () => {
    expect(evaluateItem(item('Should investors buy this stock after the acquisition?'), wire, now).reject).toMatch(/Opinion/);
    expect(evaluateItem(item('Riverdale home sells $326,000 over asking'), wire, now).reject).toMatch(/Residential/);
    expect(evaluateItem(item('CIBC sells $1 billion limited recourse capital notes'), wire, now).reject).toMatch(/Debt/);
    expect(evaluateItem(item('Ten tips for your pitch deck'), wire, now).reject).toMatch(/No wealth-intent/);
    expect(evaluateItem(item('Acme Corp acquires Widget Co for $50 million'), news, now).reject).toMatch(/No Canadian link/);
    expect(evaluateItem(item('Maple Inc. acquired for $50 million'), wire, now).reject).toBeUndefined();
  });

  it('requires a Canadian link for non-wire sources', () => {
    expect(scoreItem(item('Acme Corp acquires Widget Co for $50 million'), news, now)).toBeNull();
    expect(scoreItem(item('Toronto-based Acme Corp acquires Widget Co for $50 million'), news, now)).not.toBeNull();
  });

  it('decays old signals', () => {
    const fresh = scoreItem(item('Maple Inc. closes $20 million private placement'), wire, now);
    const old = scoreItem(item('Maple Inc. closes $20 million private placement', '2026-09-20T00:00:00Z'), wire, now);
    expect(old.score).toBeLessThan(fresh.score);
  });

  it('does not size a personal mandate for mega-cap deals', () => {
    expect(scoreItem(item('Canadian giant acquires rival in $12 billion deal'), wire, now).mandate).toBeNull();
  });

  it('parses and formats amounts', () => {
    expect(extractAmount('raises C$15.1 Million and US$2 billion')).toBe(2.7e9);
    expect(formatAmount(15.1e6)).toBe('$15.1M');
    expect(formatAmount(null)).toBe('Undisclosed');
  });
});

describe('scraper extraction & parsing', () => {
  it('extracts company and person without inventing', () => {
    expect(extractCompany('Saturn Oil & Gas Inc. Continues Strategic Core Area Expansion')).toBe('Saturn Oil & Gas Inc.');
    expect(extractCompany('Anthropic Is Targeting an IPO as Soon as Mid-November')).toBeNull();
    expect(extractPerson('Coveris CEO Gary Masse Steps Down')?.name).toBe('Gary Masse');
    expect(extractPerson('Nothing about people here')).toBeNull();
    expect(cleanTitle('Founder sells firm - The Globe and Mail')).toBe('Founder sells firm');
  });

  it('parses RSS and Atom', () => {
    const rss = '<rss><channel><item><title><![CDATA[A &amp; B sells]]></title><link>http://x/1</link><pubDate>Thu, 22 Oct 2026 10:00:00 GMT</pubDate><description>desc</description></item></channel></rss>';
    const atom = '<feed><entry><title>Filing</title><link href="http://x/2"/><updated>2026-10-22T10:00:00Z</updated></entry></feed>';
    expect(parseFeed(rss)[0]).toMatchObject({ title: 'A & B sells', link: 'http://x/1' });
    expect(parseFeed(atom)[0]).toMatchObject({ title: 'Filing', link: 'http://x/2' });
  });
});

describe('CRM matching', () => {
  const idx = buildCrmIndex(WEALTH_DATA);

  it('flags signals about existing clients and their entities', () => {
    const m = matchCrm('Vance Global Holdings Inc. announces sale of subsidiary', idx);
    expect(m?.relation).toMatch(/Existing client/);
  });

  it('does not match unrelated headlines', () => {
    expect(matchCrm('Random Mining Corp closes financing', idx)).toBeNull();
  });
});
