// PostgreSQL User Management Data Layer for VGT Wealth CRM
import { pool } from '../sales-brain/db.js';
import bcrypt from 'bcryptjs';

export async function initUserTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS crm_users (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        title VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_crm_users_email ON crm_users(email);
    `);

    // Check if table is empty; if so, seed demo users
    const countRes = await pool.query('SELECT count(*) FROM crm_users');
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      const defaultPassword = process.env.DEMO_USER_PASSWORD || 'Wealth2026!';
      const hash = await bcrypt.hash(defaultPassword, 10);

      await pool.query(`
        INSERT INTO crm_users (id, email, password_hash, full_name, title, role)
        VALUES 
          ('usr-admin-1', 'admin@scotia.wealth', $1, 'Catherine Sinclair', 'Senior Vice President & Wealth Advisor', 'admin'),
          ('usr-adv-1', 'advisor@scotia.wealth', $1, 'Marcus Vance', 'Discretionary Portfolio Manager', 'advisor'),
          ('usr-std-1', 'user@scotia.wealth', $1, 'Elena Vance', 'Associate Wealth Planner', 'user')
        ON CONFLICT (email) DO NOTHING;
      `, [hash]);

      console.log('[Auth DB] Seeded initial CRM users (admin, advisor, user).');
    }
  } catch (err) {
    console.error('[Auth DB Error] Failed to initialize crm_users table:', err.message);
  }
}

export const userDb = {
  async findByEmail(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const res = await pool.query('SELECT * FROM crm_users WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
    return res.rows[0] || null;
  },

  async findById(id) {
    const res = await pool.query('SELECT id, email, full_name, title, role, created_at, updated_at FROM crm_users WHERE id = $1 LIMIT 1', [id]);
    return res.rows[0] || null;
  },

  async create({ id, email, passwordHash, fullName, title, role }) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const userRole = ['admin', 'advisor', 'user'].includes(role) ? role : 'user';
    const res = await pool.query(`
      INSERT INTO crm_users (id, email, password_hash, full_name, title, role, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, email, full_name, title, role, created_at
    `, [id, cleanEmail, passwordHash, fullName.trim(), (title || '').trim(), userRole]);
    return res.rows[0];
  },

  async list() {
    const res = await pool.query('SELECT id, email, full_name, title, role, created_at FROM crm_users ORDER BY created_at ASC');
    return res.rows;
  }
};
