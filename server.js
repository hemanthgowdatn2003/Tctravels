const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');

let PORT = parseInt(process.env.PORT, 10) || 3000;
const PUBLIC_DIR = __dirname;
const DATA_DIR = path.join(__dirname, 'data');
const SITE_DATA_FILE = path.join(DATA_DIR, 'site-data.json');
const ADMIN_CONFIG_FILE = path.join(DATA_DIR, 'admin-config.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

// Helper to read JSON safely
function readJson(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  return fallback;
}

// Helper to write JSON safely
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Validate admin token
function isAuthorized(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '') || req.headers['x-admin-token'];
  if (!token) return false;

  const config = readJson(ADMIN_CONFIG_FILE, { tokens: [] });
  return Array.isArray(config.tokens) && config.tokens.includes(token);
}

// Helper to parse JSON body
function parseJsonBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 5 * 1024 * 1024) { // 5MB limit
      req.destroy();
    }
  });
  req.on('end', () => {
    try {
      const data = body ? JSON.parse(body) : {};
      callback(null, data);
    } catch (err) {
      callback(err);
    }
  });
}

function createServer() {
  const server = http.createServer((req, res) => {
    const parsedUrl = req.url.split('?')[0];
    const method = req.method.toUpperCase();

    // =========================================================================
    // REST API ENDPOINTS
    // =========================================================================

    // 1. GET /api/data (Public read of current site data)
    if (method === 'GET' && parsedUrl === '/api/data') {
      const data = readJson(SITE_DATA_FILE, {});
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(JSON.stringify(data));
      return;
    }

    // 2. POST /api/login (Admin authentication)
    if (method === 'POST' && parsedUrl === '/api/login') {
      parseJsonBody(req, (err, payload) => {
        if (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
          return;
        }

        const { username, password } = payload;
        const config = readJson(ADMIN_CONFIG_FILE, { username: 'admin', password: 'admin123', tokens: [] });

        if (username === config.username && password === config.password) {
          const token = crypto.randomBytes(32).toString('hex');
          if (!Array.isArray(config.tokens)) config.tokens = [];
          config.tokens.push(token);
          // Keep only last 10 tokens
          if (config.tokens.length > 10) config.tokens.shift();
          writeJson(ADMIN_CONFIG_FILE, config);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, token, username: config.username }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid username or password' }));
        }
      });
      return;
    }

    // 3. POST /api/data (Admin update website data)
    if (method === 'POST' && parsedUrl === '/api/data') {
      if (!isAuthorized(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized: Admin login required' }));
        return;
      }

      parseJsonBody(req, (err, updatedData) => {
        if (err || !updatedData) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
          return;
        }

        try {
          // Save to site-data.json
          writeJson(SITE_DATA_FILE, updatedData);

          // Synchronize to js/data.js
          const jsDataPath = path.join(PUBLIC_DIR, 'js', 'data.js');
          const jsContent = `/**\n * TC Travels Mysore - Data Store\n * Automatically synchronized via Admin Portal\n */\n\nconst TC_DATA = ${JSON.stringify(updatedData, null, 2)};\n`;
          fs.writeFileSync(jsDataPath, jsContent, 'utf8');

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Website content updated successfully!' }));
        } catch (saveErr) {
          console.error('Error saving data:', saveErr);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Failed to write data to disk' }));
        }
      });
      return;
    }

    // 4. POST /api/change-password
    if (method === 'POST' && parsedUrl === '/api/change-password') {
      if (!isAuthorized(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
        return;
      }

      parseJsonBody(req, (err, payload) => {
        if (err || !payload.newPassword) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'New password required' }));
          return;
        }

        const config = readJson(ADMIN_CONFIG_FILE, { username: 'admin', password: 'admin123', tokens: [] });
        if (payload.oldPassword && payload.oldPassword !== config.password) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Current password does not match' }));
          return;
        }

        config.password = payload.newPassword;
        if (payload.newUsername) config.username = payload.newUsername.trim();
        writeJson(ADMIN_CONFIG_FILE, config);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Credentials updated successfully' }));
      });
      return;
    }

    // 5. POST /api/logout
    if (method === 'POST' && parsedUrl === '/api/logout') {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace(/^Bearer\s+/i, '') || req.headers['x-admin-token'];
      if (token) {
        const config = readJson(ADMIN_CONFIG_FILE, { tokens: [] });
        config.tokens = (config.tokens || []).filter(t => t !== token);
        writeJson(ADMIN_CONFIG_FILE, config);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // =========================================================================
    // STATIC ASSET SERVING
    // =========================================================================
    let reqPath = parsedUrl;
    if (reqPath === '/' || reqPath === '') {
      reqPath = '/index.html';
    }

    const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(PUBLIC_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    });
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${PORT} is currently in use. Trying port ${PORT + 1}...`);
      PORT += 1;
      server.listen(PORT);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log('====================================================');
    console.log(`🚀 TC Travels Mysore website is live at:`);
    console.log(`   ${url}`);
    console.log(`🔒 Admin Portal available at:`);
    console.log(`   ${url}/admin.html`);
    console.log('====================================================');
    console.log('Default Admin: admin | Password: admin123\n');
  });
}

createServer();
