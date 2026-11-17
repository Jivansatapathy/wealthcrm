import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const SALES_BRAIN_DATA_DIR = path.join(DIR, '..', 'data', 'sales-brain');

function readJson(filename, fallback) {
  const file = path.join(SALES_BRAIN_DATA_DIR, filename);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(filename, data) {
  fs.mkdirSync(SALES_BRAIN_DATA_DIR, { recursive: true });
  const file = path.join(SALES_BRAIN_DATA_DIR, filename);
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

// Background asynchronous synchronization with Railway PostgreSQL
async function syncToPostgres(table, rows) {
  if (!pool || !rows || !Array.isArray(rows)) return;
  try {
    for (const item of rows) {
      if (!item.id) continue;
      await pool.query(
        `INSERT INTO ${table} (id, raw_data) VALUES ($1, $2::jsonb)
         ON CONFLICT (id) DO UPDATE SET raw_data = EXCLUDED.raw_data`,
        [item.id, JSON.stringify(item)]
      );
    }
  } catch (err) {
    console.warn(`[PostgreSQL] Sync notice for ${table}:`, err.message);
  }
}

export const store = {
  getIcps: () => readJson('icps.json', []),
  saveIcps: (data) => {
    writeJson('icps.json', data);
    syncToPostgres('sales_brain_icps', data);
  },

  getLeads: () => readJson('leads.json', []),
  saveLeads: (data) => {
    writeJson('leads.json', data);
    syncToPostgres('sales_brain_leads', data);
  },

  getDrafts: () => readJson('drafts.json', []),
  saveDrafts: (data) => {
    writeJson('drafts.json', data);
    syncToPostgres('sales_brain_drafts', data);
  },

  getSearches: () => readJson('searches.json', []),
  saveSearches: (data) => {
    writeJson('searches.json', data);
    syncToPostgres('sales_brain_searches', data);
  },

  getAutomations: () => readJson('automations.json', []),
  saveAutomations: (data) => {
    writeJson('automations.json', data);
    syncToPostgres('sales_brain_automations', data);
  },

  getFollowups: () => readJson('followups.json', []),
  saveFollowups: (data) => {
    writeJson('followups.json', data);
    syncToPostgres('sales_brain_followups', data);
  },

  getEngagement: () => readJson('engagement.json', []),
  saveEngagement: (data) => {
    writeJson('engagement.json', data);
    syncToPostgres('sales_brain_engagement', data);
  },
};
