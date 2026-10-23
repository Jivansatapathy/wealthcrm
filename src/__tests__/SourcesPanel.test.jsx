import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SourcesPanel from '../components/SourcesPanel';

const json = (body, ok = true, status = 200) => Promise.resolve({ ok, status, json: () => Promise.resolve(body) });

describe('SourcesPanel', () => {
  let custom;
  let lastRun;

  beforeEach(() => {
    custom = [];
    lastRun = [];
    global.fetch = vi.fn((url, opts = {}) => {
      if (url === '/api/intent/sources' && opts.method === 'POST') {
        const { url: u } = JSON.parse(opts.body);
        custom = [{ id: 'custom-1', name: new URL(u).hostname, url: u }];
        lastRun = [{ id: 'custom-1', ok: true, fetched: 12, signals: 3 }];
        return json({ custom }, true, 201);
      }
      if (url === '/api/intent/sources') return json({ builtin: [{ id: 'b1', name: 'GlobeNewswire Canada', category: 'Press Wire' }], custom, lastRun });
      return json({});
    });
  });

  afterEach(() => { delete global.fetch; });

  it('adds a pasted URL, triggers a scrape, and reports the result', async () => {
    const onScrape = vi.fn().mockResolvedValue();
    render(<SourcesPanel onScrape={onScrape} />);

    fireEvent.change(screen.getByLabelText(/website url to scrape/i), { target: { value: 'example.com/news' } });
    fireEvent.click(screen.getByRole('button', { name: /add & scrape/i }));

    await waitFor(() => expect(onScrape).toHaveBeenCalledTimes(1));
    const post = global.fetch.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(JSON.parse(post[1].body).url).toBe('https://example.com/news');
    expect(await screen.findByText(/scraped 12 items from this page; 3 matched/i)).toBeInTheDocument();
  });

  it('shows an error when the server rejects the URL', async () => {
    global.fetch = vi.fn((url, opts = {}) =>
      opts.method === 'POST' ? json({ error: 'A public http(s) URL is required' }, false, 400) : json({ builtin: [], custom: [], lastRun: [] }));
    render(<SourcesPanel onScrape={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/website url to scrape/i), { target: { value: 'http://127.0.0.1/admin' } });
    fireEvent.click(screen.getByRole('button', { name: /add & scrape/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/public http\(s\) url is required/i);
  });

  it('tells the user when the scraper service is not running', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('connection refused')));
    render(<SourcesPanel onScrape={vi.fn()} />);
    expect(await screen.findByText(/npm run scraper/i)).toBeInTheDocument();
  });
});
