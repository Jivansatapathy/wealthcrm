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

    // Seed and synchronize role accounts from environment variables (no hardcoded emails or passwords)
    const adminEmail = process.env.ADMIN_EMAIL ? String(process.env.ADMIN_EMAIL).trim().toLowerCase() : null;
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.DEMO_USER_PASSWORD;

    const advisorEmail = process.env.ADVISOR_EMAIL ? String(process.env.ADVISOR_EMAIL).trim().toLowerCase() : null;
    const advisorPassword = process.env.ADVISOR_PASSWORD || process.env.DEMO_USER_PASSWORD;

    const associateEmail = process.env.ASSOCIATE_EMAIL ? String(process.env.ASSOCIATE_EMAIL).trim().toLowerCase() : null;
    const associatePassword = process.env.ASSOCIATE_PASSWORD || process.env.DEMO_USER_PASSWORD;

    if (adminEmail && adminPassword) {
      const adminHash = await bcrypt.hash(adminPassword, 10);
      await pool.query(`
        INSERT INTO crm_users (id, email, password_hash, full_name, title, role)
        VALUES ('usr-admin-1', $1, $2, 'Catherine Sinclair', 'Senior Vice President & Wealth Advisor', 'admin')
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
      `, [adminEmail, adminHash]);
    }

    if (advisorEmail && advisorPassword) {
      const advisorHash = await bcrypt.hash(advisorPassword, 10);
      await pool.query(`
        INSERT INTO crm_users (id, email, password_hash, full_name, title, role)
        VALUES ('usr-adv-1', $1, $2, 'Marcus Vance', 'Discretionary Portfolio Manager', 'advisor')
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
      `, [advisorEmail, advisorHash]);
    }

    if (associateEmail && associatePassword) {
      const associateHash = await bcrypt.hash(associatePassword, 10);
      await pool.query(`
        INSERT INTO crm_users (id, email, password_hash, full_name, title, role)
        VALUES ('usr-std-1', $1, $2, 'Elena Vance', 'Associate Wealth Planner', 'user')
        ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
      `, [associateEmail, associateHash]);
    }

    console.log('[Auth DB] Synchronized CRM role accounts (admin, advisor, associate) from environment.');
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
