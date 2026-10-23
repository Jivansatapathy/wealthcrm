import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import SourceIntelligenceView from '../components/SourceIntelligenceView';

const overview = {
  updatedAt: new Date().toISOString(),
  durationMs: 1800,
  totals: { sources: 3, live: 2, failing: 1, scanned: 120, signals: 6, filtered: 114, leads: 5, avgScore: 64, hotLeads: 2, crmMatches: 1, dealValue: 450e6 },
  byType: { 'M&A: Business Sale / Acquisition': 3, 'Succession & Retirement Trigger': 2 },
  rejectReasons: { 'No Canadian link': 70, 'Opinion / stock-tip headline': 10 },
  sources: [
    {
      id: 'custom-1', name: 'betakit.com', category: 'Custom', url: 'https://betakit.com/feed/', custom: true, ok: true,
      fetched: 100, signals: 2, filtered: 98, avgScore: 70, topScore: 78, dealTotal: 450e6, ms: 420,
      reasons: { 'No wealth-intent keywords': 98 }, types: {},
      items: [
        { title: 'Maple Inc. to be acquired for $450 million', link: 'https://x/1', date: '2026-10-22T10:00:00Z', status: 'signal', score: 78, type: 'M&A: Business Sale / Acquisition', company: 'Maple Inc.', dealSize: '$450.0M', amount: 450e6, crm: 'Marcus Vance' },
        { title: 'Ten tips for your pitch deck', link: 'https://x/2', date: '2026-10-22T09:00:00Z', status: 'filtered', reason: 'No wealth-intent keywords' }
      ]
    },
    { id: 'b1', name: 'GlobeNewswire Canada', category: 'Press Wire', url: 'https://globenewswire.com/rss', custom: false, ok: true, fetched: 20, signals: 4, filtered: 16, avgScore: 55, topScore: 60, dealTotal: 0, ms: 300, reasons: {}, types: {}, items: [] },
    { id: 'b2', name: 'Blocked Site', category: 'News', url: 'https://blocked.example/feed', custom: false, ok: false, error: 'HTTP 403', ms: 100, items: [] }
  ]
};

describe('SourceIntelligenceView', () => {
  beforeEach(() => {
    global.fetch = vi.fn((url) => {
      if (url === '/api/intent/overview') return Promise.resolve({ ok: true, json: () => Promise.resolve(overview) });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ builtin: [], custom: [], lastRun: [] }) });
    });
  });
  afterEach(() => { delete global.fetch; });

  it('shows combined totals across every source', async () => {
    render(<SourceIntelligenceView />);
    expect(await screen.findByText('Scrape results: all sources combined')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument(); // live / total sources
    expect(screen.getByText('120')).toBeInTheDocument(); // scanned
    expect(screen.getAllByText('$450M').length).toBeGreaterThan(0); // deal value seen (KPI and source row)
    expect(screen.getByText('1 failing')).toBeInTheDocument();
    expect(screen.getByText('No Canadian link')).toBeInTheDocument(); // rejection breakdown
  });

  it('lists each URL with its own numbers and error state', async () => {
    render(<SourceIntelligenceView />);
    await screen.findByText('What each URL found');
    expect(screen.getByRole('button', { name: /betakit\.com details/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /GlobeNewswire Canada details/i })).toBeInTheDocument();
    expect(screen.getByText(/HTTP 403/)).toBeInTheDocument();
  });

  it('expands a source to show which headlines became signals and why others were filtered', async () => {
    render(<SourceIntelligenceView />);
    fireEvent.click(await screen.findByRole('button', { name: /betakit\.com details/i }));

    expect(await screen.findByText('Maple Inc. to be acquired for $450 million')).toBeInTheDocument();
    expect(screen.getByText('In CRM: Marcus Vance')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /filtered out/i }));
    expect(screen.getByText('Ten tips for your pitch deck')).toBeInTheDocument();
    const filtered = screen.getByText('Ten tips for your pitch deck').closest('a');
    expect(within(filtered).getByText(/Filtered: No wealth-intent keywords/)).toBeInTheDocument();
  });

  it('warns when the scraper service is down', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('refused')));
    render(<SourceIntelligenceView />);
    expect((await screen.findAllByText(/npm run scraper/i)).length).toBeGreaterThan(0);
  });
});
