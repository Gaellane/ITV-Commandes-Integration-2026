// Stockage des commandes, deux modes selon l'environnement :
//  - LOCAL (par défaut, sans configuration) : fichiers dans le dossier data/
//      data/orders.json      -> les commandes
//      data/commandes.xlsx   -> l'Excel, mis à jour à chaque nouvelle commande
//  - VERCEL : si les variables Upstash Redis sont présentes (Vercel > Storage).
//      Vercel n'a pas de disque permanent : l'Excel est alors généré à la demande (api/export.js).
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const JSON_FILE = path.join(DATA_DIR, 'orders.json');
const XLSX_FILE = path.join(DATA_DIR, 'commandes.xlsx');

const redisUrl = () => process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = () => process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const useRedis = () => Boolean(redisUrl() && redisToken());

// ---------- Mode Vercel (Redis) ----------
const KEY = 'orders';
let redis;

function db() {
  if (!redis) {
    const { Redis } = require('@upstash/redis');
    redis = new Redis({ url: redisUrl(), token: redisToken() });
  }
  return redis;
}

// ---------- Mode local (fichiers) ----------
let queue = Promise.resolve(); // une écriture à la fois, pour ne rien perdre

function readLocal() {
  try {
    return JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function addLocal(data) {
  const job = queue.then(async () => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const all = readLocal();
    const order = { ref: 'CMD-' + String(all.length + 1).padStart(3, '0'), ...data };
    all.push(order);
    fs.writeFileSync(JSON_FILE, JSON.stringify(all, null, 2));
    try {
      const { buildWorkbook } = require('./excel');
      fs.writeFileSync(XLSX_FILE, await buildWorkbook(all));
    } catch (e) {
      // Fichier Excel ouvert dans Excel (Windows le verrouille) : la commande est quand même enregistrée.
      console.warn("Excel non mis à jour (ferme data/commandes.xlsx s'il est ouvert) :", e.message);
    }
    return order;
  });
  queue = job.catch(() => {});
  return job;
}

// ---------- API commune ----------
async function addOrder(data) {
  if (!useRedis()) return addLocal(data);
  const r = db();
  const n = await r.incr('orders:seq'); // numéro unique et atomique
  const order = { ref: 'CMD-' + String(n).padStart(3, '0'), ...data };
  await r.rpush(KEY, JSON.stringify(order));
  return order;
}

async function listOrders() {
  if (!useRedis()) return readLocal();
  const rows = await db().lrange(KEY, 0, -1);
  return rows.map((r) => (typeof r === 'string' ? JSON.parse(r) : r));
}

async function clearOrders() {
  if (useRedis()) {
    await db().del(KEY, 'orders:seq'); // la numérotation repart aussi à CMD-001
    return;
  }
  const job = queue.then(async () => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(JSON_FILE, '[]');
    try {
      const { buildWorkbook } = require('./excel');
      fs.writeFileSync(XLSX_FILE, await buildWorkbook([]));
    } catch (e) {}
  });
  queue = job.catch(() => {});
  return job;
}

// Confirme une commande (définitif). Renvoie la commande modifiée, ou null si la réf n'existe pas.
async function setConfirmed(ref) {
  const patch = (o) => (o.confirmed ? o : { ...o, confirmed: true, confirmedAt: new Date().toISOString() });

  if (useRedis()) {
    const r = db();
    const rows = await r.lrange(KEY, 0, -1);
    const orders = rows.map((x) => (typeof x === 'string' ? JSON.parse(x) : x));
    const idx = orders.findIndex((o) => o.ref === ref);
    if (idx === -1) return null;
    const updated = patch(orders[idx]);
    await r.lset(KEY, idx, JSON.stringify(updated));
    return updated;
  }

  const job = queue.then(async () => {
    const all = readLocal();
    const idx = all.findIndex((o) => o.ref === ref);
    if (idx === -1) return null;
    all[idx] = patch(all[idx]);
    fs.writeFileSync(JSON_FILE, JSON.stringify(all, null, 2));
    try {
      const { buildWorkbook } = require('./excel');
      fs.writeFileSync(XLSX_FILE, await buildWorkbook(all));
    } catch (e) {
      console.warn("Excel non mis à jour (ferme data/commandes.xlsx s'il est ouvert) :", e.message);
    }
    return all[idx];
  });
  queue = job.catch(() => {});
  return job;
}

module.exports = { addOrder, listOrders, clearOrders, setConfirmed };
