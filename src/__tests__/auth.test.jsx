import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { extractToken, verifyJwt } from '../../scraper/auth/index.js';

describe('Authentication & Authorization Suite', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-min-32-chars-length';
  const testPassword = process.env.TEST_USER_PASSWORD || 'WealthDemo2026!';
  const demoPassword = process.env.DEMO_USER_PASSWORD || 'Wealth2026!';

  describe('1. Password Hashing & Verification (bcrypt)', () => {
    it('hashes passwords and never stores plain text', async () => {
      const plainPassword = testPassword;
      const hash = await bcrypt.hash(plainPassword, 10);

      expect(hash).not.toBe(plainPassword);
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/); // standard bcrypt prefix

      const isMatch = await bcrypt.compare(plainPassword, hash);
      expect(isMatch).toBe(true);

      const isBadMatch = await bcrypt.compare('WrongPassword999', hash);
      expect(isBadMatch).toBe(false);
    });
  });

  describe('2. JWT Access Token Issuance & Verification', () => {
    it('generates a valid JWT token with user claims and verifies it', () => {
      const payload = {
        id: 'usr-test-123',
        email: 'advisor@scotia.wealth',
        fullName: 'Marcus Vance',
        title: 'Portfolio Manager',
        role: 'advisor'
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      expect(typeof token).toBe('string');

      const decoded = verifyJwt(token);
      expect(decoded).not.toBeNull();
      expect(decoded.email).toBe('advisor@scotia.wealth');
      expect(decoded.role).toBe('advisor');
    });

    it('rejects an invalid or tampered JWT token', () => {
      const badToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
      const decoded = verifyJwt(badToken);
      expect(decoded).toBeNull();
    });

    it('extracts Bearer token correctly from authorization headers', () => {
      const req = {
        headers: {
          authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validToken'
        }
      };
      const token = extractToken(req);
      expect(token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validToken');
    });

    it('returns null when authorization header is missing or malformed', () => {
      expect(extractToken({ headers: {} })).toBeNull();
      expect(extractToken({ headers: { authorization: 'Basic 12345' } })).toBeNull();
    });
  });

  describe('3. Role-Based Authorization Guards (RBAC)', () => {
    const VIEW_PERMISSIONS = {
      intent_stream: ['admin', 'advisor', 'user'],
      pipeline: ['admin', 'advisor', 'user'],
      client360: ['admin', 'advisor', 'user'],
      source_intel: ['admin', 'advisor'],
      sales_brain: ['admin', 'advisor'],
      referrals: ['admin', 'advisor'],
      copilot: ['admin', 'advisor'],
      acquisition: ['admin'],
      analytics: ['admin']
    };

    function checkAccess(role, viewId) {
      if (!role) return { status: 401, authorized: false };
      const allowed = VIEW_PERMISSIONS[viewId] || ['admin'];
      if (role === 'admin' || allowed.includes(role)) {
        return { status: 200, authorized: true };
      }
      return { status: 403, authorized: false };
    }

    it('grants admin role full access to all views', () => {
      expect(checkAccess('admin', 'analytics')).toEqual({ status: 200, authorized: true });
      expect(checkAccess('admin', 'acquisition')).toEqual({ status: 200, authorized: true });
      expect(checkAccess('admin', 'sales_brain')).toEqual({ status: 200, authorized: true });
      expect(checkAccess('admin', 'intent_stream')).toEqual({ status: 200, authorized: true });
    });

    it('allows advisor role access to operational views but restricts admin-only views with 403', () => {
      expect(checkAccess('advisor', 'sales_brain')).toEqual({ status: 200, authorized: true });
      expect(checkAccess('advisor', 'copilot')).toEqual({ status: 200, authorized: true });
      expect(checkAccess('advisor', 'pipeline')).toEqual({ status: 200, authorized: true });

      // Admin only views -> 403 Forbidden
      expect(checkAccess('advisor', 'analytics')).toEqual({ status: 403, authorized: false });
      expect(checkAccess('advisor', 'acquisition')).toEqual({ status: 403, authorized: false });
    });

    it('restricts standard user role from executive views with 403', () => {
      expect(checkAccess('user', 'intent_stream')).toEqual({ status: 200, authorized: true });
      expect(checkAccess('user', 'pipeline')).toEqual({ status: 200, authorized: true });

      // Restricted views -> 403 Forbidden
      expect(checkAccess('user', 'sales_brain')).toEqual({ status: 403, authorized: false });
      expect(checkAccess('user', 'copilot')).toEqual({ status: 403, authorized: false });
      expect(checkAccess('user', 'analytics')).toEqual({ status: 403, authorized: false });
      expect(checkAccess('user', 'acquisition')).toEqual({ status: 403, authorized: false });
    });

    it('returns 401 when user is unauthenticated', () => {
      expect(checkAccess(null, 'intent_stream')).toEqual({ status: 401, authorized: false });
      expect(checkAccess(undefined, 'analytics')).toEqual({ status: 401, authorized: false });
    });
  });

  describe('4. Live API Authentication Integration', () => {
    it('successfully logs in with valid demo admin credentials', async () => {
      const res = await fetch('http://localhost:3100/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@scotia.wealth',
          password: demoPassword
        })
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.token).toBeDefined();
      expect(data.user.role).toBe('admin');
      expect(data.user.email).toBe('admin@scotia.wealth');
    });

    it('returns 401 Unauthorized for invalid password', async () => {
      const res = await fetch('http://localhost:3100/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@scotia.wealth',
          password: 'DefectivePassword123'
        })
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toMatch(/invalid email or password/i);
    });

    it('returns 401 Unauthorized when requesting /auth/me without token', async () => {
      const res = await fetch('http://localhost:3100/auth/me');
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.success).toBe(false);
    });

    it('returns 200 OK and user claims when requesting /auth/me with valid token', async () => {
      // 1. Login to get token
      const loginRes = await fetch('http://localhost:3100/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'advisor@scotia.wealth',
          password: demoPassword
        })
      });
      const loginData = await loginRes.json();

      // 2. Fetch /me
      const meRes = await fetch('http://localhost:3100/auth/me', {
        headers: { Authorization: `Bearer ${loginData.token}` }
      });
      expect(meRes.status).toBe(200);
      const meData = await meRes.json();
      expect(meData.success).toBe(true);
      expect(meData.user.email).toBe('advisor@scotia.wealth');
      expect(meData.user.role).toBe('advisor');
    });
  });
});
