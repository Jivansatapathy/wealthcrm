// Authentication & Role-Based Authorization API Module
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userDb, initUserTable } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('[Auth Security Error] JWT_SECRET environment variable is missing.');
}
const TOKEN_EXPIRY = '7d';

// In-memory sliding-window rate limiter for login brute-force prevention
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function isRateLimited(key) {
  const now = Date.now();
  const record = loginAttempts.get(key) || [];
  const valid = record.filter(t => now - t < WINDOW_MS);
  loginAttempts.set(key, valid);
  return valid.length >= MAX_ATTEMPTS;
}

function recordFailedAttempt(key) {
  const now = Date.now();
  const record = loginAttempts.get(key) || [];
  record.push(now);
  loginAttempts.set(key, record);
}

function clearAttempts(key) {
  loginAttempts.delete(key);
}

// Helper to extract bearer token
export function extractToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

// Verify JWT token
export function verifyJwt(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Middleware: Authenticate request
export function authenticateUser(req) {
  const token = extractToken(req);
  if (!token) return null;
  return verifyJwt(token);
}

export function createAuthApi() {
  // Ensure tables and seeds are ready on boot
  initUserTable();

  const readJsonBody = async (req) => {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try { resolve(body ? JSON.parse(body) : {}); }
        catch { resolve({}); }
      });
      req.on('error', () => resolve({}));
    });
  };

  const jsonResponse = (res, statusCode, data) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.statusCode = statusCode;
    res.end(JSON.stringify(data));
  };

  return async function handleAuthRequest(req, res, pathname) {
    let subpath = pathname.replace(/^\/api\/auth/, '').replace(/^\/auth/, '') || '/';
    if (!subpath.startsWith('/')) subpath = '/' + subpath;

    const method = req.method.toUpperCase();

    if (method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.statusCode = 204;
      res.end();
      return true;
    }

    try {
      // 1. POST /register
      if (method === 'POST' && subpath === '/register') {
        const body = await readJsonBody(req);
        const { email, password, full_name, title, role } = body;

        // Input Validation
        if (!email || !String(email).includes('@')) {
          return jsonResponse(res, 400, { success: false, error: 'A valid email address is required.' }), true;
        }
        if (!password || String(password).length < 6) {
          return jsonResponse(res, 400, { success: false, error: 'Password must be at least 6 characters long.' }), true;
        }
        if (!full_name || !String(full_name).trim()) {
          return jsonResponse(res, 400, { success: false, error: 'Full name is required.' }), true;
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const existing = await userDb.findByEmail(cleanEmail);
        if (existing) {
          return jsonResponse(res, 400, { success: false, error: 'An account with this email address already exists.' }), true;
        }

        // Hash password with bcrypt
        const passwordHash = await bcrypt.hash(password, 10);
        const userId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const assignedRole = role === 'admin' ? 'admin' : role === 'advisor' ? 'advisor' : 'user';

        const user = await userDb.create({
          id: userId,
          email: cleanEmail,
          passwordHash,
          fullName: full_name,
          title: title || 'Wealth Professional',
          role: assignedRole
        });

        // Issue JWT token
        const tokenPayload = {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          title: user.title,
          role: user.role
        };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

        return jsonResponse(res, 201, {
          success: true,
          message: 'Registration successful',
          token,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            title: user.title,
            role: user.role,
            createdAt: user.created_at
          }
        }), true;
      }

      // 2. POST /login
      if (method === 'POST' && subpath === '/login') {
        const clientIp = req.socket?.remoteAddress || 'client';
        const body = await readJsonBody(req);
        const { email, password } = body;

        if (!email || !password) {
          return jsonResponse(res, 400, { success: false, error: 'Email and password are required.' }), true;
        }

        const cleanEmail = String(email).trim().toLowerCase();
        const rateLimitKey = `${clientIp}:${cleanEmail}`;

        // Rate limiting check
        if (isRateLimited(rateLimitKey)) {
          return jsonResponse(res, 429, {
            success: false,
            error: 'Too many failed login attempts. Please wait 15 minutes before trying again.'
          }), true;
        }

        const user = await userDb.findByEmail(cleanEmail);
        if (!user) {
          recordFailedAttempt(rateLimitKey);
          return jsonResponse(res, 401, { success: false, error: 'Invalid email or password.' }), true;
        }

        // Check password hash
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
          recordFailedAttempt(rateLimitKey);
          return jsonResponse(res, 401, { success: false, error: 'Invalid email or password.' }), true;
        }

        // Success: clear rate limit
        clearAttempts(rateLimitKey);

        const tokenPayload = {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          title: user.title,
          role: user.role
        };
        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

        return jsonResponse(res, 200, {
          success: true,
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            title: user.title,
            role: user.role
          }
        }), true;
      }

      // 3. GET /me (Current User Profile)
      if (method === 'GET' && subpath === '/me') {
        const payload = authenticateUser(req);
        if (!payload) {
          return jsonResponse(res, 401, { success: false, error: 'Authentication required. Invalid or expired token.' }), true;
        }

        const user = await userDb.findById(payload.id);
        if (!user) {
          return jsonResponse(res, 401, { success: false, error: 'User no longer exists.' }), true;
        }

        return jsonResponse(res, 200, {
          success: true,
          user: {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            title: user.title,
            role: user.role,
            createdAt: user.created_at
          }
        }), true;
      }

      // 4. POST /logout
      if (method === 'POST' && subpath === '/logout') {
        return jsonResponse(res, 200, {
          success: true,
          message: 'Logged out successfully.'
        }), true;
      }

      // Not found in /auth
      return jsonResponse(res, 404, { success: false, error: 'Auth route not found.' }), true;
    } catch (err) {
      console.error('[Auth API Error]:', err);
      return jsonResponse(res, 500, { success: false, error: 'Internal auth server error: ' + err.message }), true;
    }
  };
}
