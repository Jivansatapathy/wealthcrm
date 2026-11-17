// PostgreSQL Database Connection & Query Client for VGT Wealth CRM
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:VoHEfHgKpWESwnKKWUZLnwJOTyLlQrhp@metro.proxy.rlwy.net:52123/railway';

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected idle client error:', err.message);
});

// Test connection on boot
(async () => {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() as current_time, COUNT(*) as lead_count FROM sales_brain_leads');
    console.log(`[PostgreSQL] Connected to Railway DB successfully. Verified ${res.rows[0].lead_count} sales brain leads.`);
    client.release();
  } catch (err) {
    console.warn('[PostgreSQL] Database connection notice:', err.message);
  }
})();

export const db = {
  query: (text, params) => pool.query(text, params),

  // Sales Brain Leads
  async getLeads(limit = 1000) {
    const res = await pool.query('SELECT raw_data FROM sales_brain_leads ORDER BY score DESC LIMIT $1', [limit]);
    return res.rows.map(r => r.raw_data);
  },

  async updateLeadStatus(id, status) {
    await pool.query(
      `UPDATE sales_brain_leads 
       SET status = $2, 
           updated_at = NOW(),
           raw_data = jsonb_set(raw_data, '{status}', to_jsonb($2::text))
       WHERE id = $1`,
      [id, status]
    );
  },

  // ICPs
  async getIcps() {
    const res = await pool.query('SELECT raw_data FROM sales_brain_icps ORDER BY created_at ASC');
    return res.rows.map(r => r.raw_data);
  },

  // Drafts
  async getDrafts() {
    const res = await pool.query('SELECT brain_lead as "brainLead", * FROM sales_brain_drafts ORDER BY created_at DESC');
    return res.rows.map(r => ({
      id: r.id,
      brainLeadId: r.brain_lead_id,
      brainLead: r.brainLead,
      icpId: r.icp_id,
      step: r.step,
      subject: r.subject,
      bodyHtml: r.body_html,
      status: r.status,
      toEmail: r.to_email,
      attempts: r.attempts,
      openCount: r.open_count,
      clickCount: r.click_count,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  },

  // Canada Prospects (from CSV)
  async getCanadaProspects(limit = 1000) {
    const res = await pool.query('SELECT * FROM canada_prospects ORDER BY id ASC LIMIT $1', [limit]);
    return res.rows;
  },

  // Wealth Signals
  async getWealthSignals(limit = 1000) {
    const res = await pool.query('SELECT raw_data FROM wealth_signals ORDER BY intent_score DESC LIMIT $1', [limit]);
    return res.rows.map(r => r.raw_data);
  },

  // Automations
  async getAutomations() {
    const res = await pool.query('SELECT raw_data FROM sales_brain_automations');
    return res.rows.map(r => r.raw_data);
  },

  // Followups
  async getFollowups() {
    const res = await pool.query('SELECT raw_data FROM sales_brain_followups ORDER BY due_at ASC');
    return res.rows.map(r => r.raw_data);
  },

  // Engagement
  async getEngagement() {
    const res = await pool.query('SELECT raw_data FROM sales_brain_engagement ORDER BY timestamp DESC');
    return res.rows.map(r => r.raw_data);
  },

  // Searches
  async getSearches() {
    const res = await pool.query('SELECT * FROM sales_brain_searches ORDER BY created_at DESC');
    return res.rows;
  }
};
