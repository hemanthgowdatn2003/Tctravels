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

// Helper to parse JSON body (supports base64 image uploads up to 35MB)
function parseJsonBody(req, callback) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 35 * 1024 * 1024) { // 35MB limit for high-res pictures
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

    // 6. POST /api/upload (Upload Picture for Fleet, Packages, or Site Assets)
    if (method === 'POST' && parsedUrl === '/api/upload') {
      if (!isAuthorized(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized: Admin login required' }));
        return;
      }

      parseJsonBody(req, (err, payload) => {
        if (err || !payload || !payload.data) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Invalid upload payload: image data required' }));
          return;
        }

        try {
          const uploadDir = path.join(PUBLIC_DIR, 'images', 'uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }

          const rawFilename = (payload.filename || 'photo.jpg').trim();
          const parsedExt = path.extname(rawFilename).toLowerCase() || '.jpg';
          const validExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'];
          const ext = validExts.includes(parsedExt) ? parsedExt : '.jpg';
          
          const rawBaseName = path.basename(rawFilename, parsedExt).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
          const cleanBaseName = (rawBaseName || 'picture').substring(0, 30);
          const safeFilename = `${cleanBaseName}-${Date.now()}${ext}`;
          const targetPath = path.join(uploadDir, safeFilename);

          // Strip Data URI prefix if present
          const base64Content = payload.data.replace(/^data:image\/\w+;base64,/, '');
          const buffer = Buffer.from(base64Content, 'base64');

          fs.writeFileSync(targetPath, buffer);

          const relativeUrl = `images/uploads/${safeFilename}`;
          console.log(`📸 Successfully uploaded picture: ${relativeUrl} (${(buffer.length / 1024).toFixed(1)} KB)`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            url: relativeUrl,
            filename: safeFilename,
            sizeKb: Math.round(buffer.length / 1024)
          }));
        } catch (uploadErr) {
          console.error('Upload error:', uploadErr);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Failed to write image to disk: ' + uploadErr.message }));
        }
      });
      return;
    }

    // 7. GET /api/images (List all available website and uploaded images)
    if (method === 'GET' && parsedUrl === '/api/images') {
      try {
        const imageList = [];
        const baseImagesDir = path.join(PUBLIC_DIR, 'images');
        const uploadDir = path.join(baseImagesDir, 'uploads');

        if (fs.existsSync(baseImagesDir)) {
          const files = fs.readdirSync(baseImagesDir);
          for (const f of files) {
            const ext = path.extname(f).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) {
              imageList.push({
                name: f,
                url: `images/${f}`,
                isUpload: false
              });
            }
          }
        }

        if (fs.existsSync(uploadDir)) {
          const uFiles = fs.readdirSync(uploadDir);
          for (const f of uFiles) {
            const ext = path.extname(f).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.webp', '.svg'].includes(ext)) {
              imageList.unshift({ // Newest uploads first
                name: f,
                url: `images/uploads/${f}`,
                isUpload: true
              });
            }
          }
        }

        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache'
        });
        res.end(JSON.stringify({ success: true, images: imageList }));
      } catch (listErr) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: listErr.message }));
      }
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
