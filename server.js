// Serveur local : lance le formulaire, l'API et la page admin sur ton ordinateur.
//   npm install
//   npm start        puis ouvre http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');

// Charge le fichier .env (non versionné) s'il existe : ADMIN_PASSWORD=... y est écrit, jamais dans le code.
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, '$2');
  }
} catch (e) { /* pas de .env */ }

if (!process.env.ADMIN_PASSWORD) {
  console.error('\nADMIN_PASSWORD manquant : copie .env.example en .env et choisis un mot de passe.\n');
  process.exit(1);
}
const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const routes = {
  '/api/menu': require('./api/menu'),
  '/api/orders': require('./api/orders'),
  '/api/export': require('./api/export'),
};

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function readBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 100000) req.destroy(); // pas de corps géant
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch (e) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

http
  .createServer(async (req, res) => {
    const { pathname, searchParams } = new URL(req.url, 'http://localhost');
    req.query = Object.fromEntries(searchParams);

    // même petites méthodes que sur Vercel (res.status, res.json, res.send)
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
    };
    res.send = (body) => res.end(body);

    const handler = routes[pathname];
    if (handler) {
      if (req.method === 'POST' || req.method === 'PATCH') req.body = await readBody(req);
      return handler(req, res);
    }

    // fichiers statiques du dossier public/
    const file = path.normalize(path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname));
    if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.statusCode = 403; return res.end('Interdit'); }
    fs.readFile(file, (err, content) => {
      if (err) { res.statusCode = 404; return res.end('Page introuvable'); }
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.end(content);
    });
  })
  .listen(PORT, () => {
    console.log('\nCommandes IT-Volunteers - serveur local démarré');
    console.log('  Formulaire : http://localhost:' + PORT);
    console.log('  Admin      : http://localhost:' + PORT + '/admin.html   (mot de passe : celui de ADMIN_PASSWORD)');
    console.log('  Excel      : data/commandes.xlsx (mis à jour à chaque commande)\n');
  });
