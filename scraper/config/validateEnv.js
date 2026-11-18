// Environment configuration loader and startup validator
import fs from 'node:fs';
import path from 'node:path';

/**
 * Loads .env file safely using Node.js native environment loader if available.
 */
export function loadEnv(envPath = '.env') {
  const fullPath = path.resolve(process.cwd(), envPath);
  if (fs.existsSync(fullPath)) {
    if (typeof process.loadEnvFile === 'function') {
      try {
        process.loadEnvFile(fullPath);
      } catch (err) {
        console.warn(`[Config] Notice: Error loading ${envPath}: ${err.message}`);
      }
    }
  }
}

/**
 * Validates that all critical environment variables exist.
 * Fails fast with clear diagnostics naming missing variables (never printing secret values).
 */
export function validateRequiredEnv(options = {}) {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'ADMIN_EMAIL',
    'ADMIN_PASSWORD',
    'ADVISOR_EMAIL',
    'ADVISOR_PASSWORD',
    'ASSOCIATE_EMAIL',
    'ASSOCIATE_PASSWORD'
  ];

  const missing = [];
  for (const varName of required) {
    const val = process.env[varName];
    if (!val || typeof val !== 'string' || val.trim().length === 0) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    const errorMsg = `[Startup Configuration Error] Missing required environment variable(s): ${missing.join(', ')}. Please configure them in your .env file or deployment environment.`;
    console.error(errorMsg);
    if (!options.nonFatal) {
      throw new Error(errorMsg);
    }
  }

  return { ok: missing.length === 0, missing };
}
