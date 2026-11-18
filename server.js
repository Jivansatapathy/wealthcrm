// VGT Wealth AI CRM - Production Server for Railway & Cloud Deployments
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, validateRequiredEnv } from './scraper/config/validateEnv.js';
import { createAuthApi } from './scraper/auth/index.js';
import { createSalesBrainApi } from './scraper/sales-brain/api.js';

// 1. Load environment variables & validate
loadEnv();
validateRequiredEnv({ nonFatal: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const DIST_DIR = path.join(__dirname, 'dist');

const authApi = createAuthApi();
const salesBrainApi = createSalesBrainApi();

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

const server = http.createServer(async (req, res) => {
  // CORS & Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // 1. Auth API Route (/api/auth or /auth)
  if (pathname.startsWith('/api/auth') || pathname.startsWith('/auth')) {
    try {
      const handled = await authApi(req, res, pathname);
      if (handled) return;
    } catch (err) {
      console.error('[Production Auth Error]:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // 2. Sales Brain API Route (/api/sales-brain or /sales-brain)
  if (pathname.startsWith('/api/sales-brain') || pathname.startsWith('/sales-brain')) {
    try {
      const query = Object.fromEntries(parsedUrl.searchParams.entries());
      const handled = await salesBrainApi(req, res, pathname, query);
      if (handled) return;
    } catch (err) {
      console.error('[Production Sales Brain Error]:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
      return;
    }
  }

  // 3. Health check
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  // 4. Static File Serving from dist/
  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);

  // If path doesn't exist, fallback to dist/index.html (SPA client-side routing)
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 - Internal Server Error');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 VGT Wealth Growth AI CRM Production Server`);
  console.log(`⚡ API & Static Assets Live on port ${PORT}`);
  console.log(`🌐 Ready for Railway & Cloud Deployments`);
  console.log(`======================================================\n`);
});
