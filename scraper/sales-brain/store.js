import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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

export const store = {
  getIcps: () => readJson('icps.json', []),
  saveIcps: (data) => writeJson('icps.json', data),

  getLeads: () => readJson('leads.json', []),
  saveLeads: (data) => writeJson('leads.json', data),

  getDrafts: () => readJson('drafts.json', []),
  saveDrafts: (data) => writeJson('drafts.json', data),

  getSearches: () => readJson('searches.json', []),
  saveSearches: (data) => writeJson('searches.json', data),

  getAutomations: () => readJson('automations.json', []),
  saveAutomations: (data) => writeJson('automations.json', data),

  getFollowups: () => readJson('followups.json', []),
  saveFollowups: (data) => writeJson('followups.json', data),

  getEngagement: () => readJson('engagement.json', []),
  saveEngagement: (data) => writeJson('engagement.json', data),
};
