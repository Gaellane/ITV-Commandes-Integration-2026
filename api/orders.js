const { PRICE, DISHES, CLASSES, OTHER_CLASS } = require('../lib/menu');
const { addOrder, listOrders, clearOrders, setConfirmed } = require('../lib/store');
const { isAdmin } = require('../lib/auth');

const clean = (s, max) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, max);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    // --- Nouvelle commande (public) ---
    if (req.method === 'POST') {
      if (process.env.ORDERS_CLOSED === '1') {
        return res.status(403).json({ error: 'Les commandes sont closes.' });
      }
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      if (b.website) return res.status(200).json({ ok: true }); // champ piège anti-robots

      const nom = clean(b.nom, 100);
      const etu = clean(b.etu, 20).toUpperCase();
      const contact = clean(b.contact, 25);
      if (nom.length < 3) return res.status(400).json({ error: 'Indique ton nom et prénoms.' });
      if (!/^[0-9]{4}$/.test(etu)) {
        return res.status(400).json({ error: 'Le numéro ETU doit comporter 4 chiffres.' });
      }
      const classe = clean(b.classe, 20);
      if (![...CLASSES, OTHER_CLASS].includes(classe)) {
        return res.status(400).json({ error: 'Choisis ta classe.' });
      }
      if (!/^\+?[0-9][0-9 .()-]{6,23}$/.test(contact)) {
        return res.status(400).json({ error: 'Numéro de téléphone invalide.' });
      }

      const asked = Array.isArray(b.items) ? b.items : [];
      const items = [];
      for (const d of DISHES) {
        const row = asked.find((i) => i && i.id === d.id);
        const qty = row ? Number(row.qty) : 0;
        if (!Number.isInteger(qty) || qty < 0 || qty > 20) {
          return res.status(400).json({ error: 'Quantité invalide.' });
        }
        if (qty > 0) items.push({ id: d.id, name: d.name, qty });
      }
      if (!items.length) return res.status(400).json({ error: 'Choisis au moins un plat.' });

      // Le total est toujours recalculé côté serveur.
      const total = items.reduce((sum, i) => sum + i.qty * PRICE, 0);
      const order = await addOrder({ createdAt: new Date().toISOString(), nom, etu, classe, contact, items, total });
      return res.status(201).json({ ok: true, ref: order.ref, total, orangeMoneyOnly: classe === OTHER_CLASS });
    }

    // --- Consultation publique (lecture seule, sans le numéro de téléphone) ---
    if (req.method === 'GET' && req.query && req.query.view === 'public') {
      const orders = (await listOrders()).reverse().map(({ contact, ...o }) => o);
      return res.status(200).json({ orders });
    }

    // --- Liste complète des commandes (admin) ---
    if (req.method === 'GET') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Mot de passe incorrect.' });
      const orders = (await listOrders()).reverse();
      return res.status(200).json({ orders });
    }

    // --- Confirmer une commande (admin) : irréversible, aucune annulation possible ---
    if (req.method === 'PATCH') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Mot de passe incorrect.' });
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      const order = await setConfirmed(clean(b.ref, 20));
      if (!order) return res.status(404).json({ error: 'Commande introuvable.' });
      return res.status(200).json({ ok: true, order });
    }

    // --- Effacer toutes les commandes (admin) : utile pour vider les commandes de test ---
    if (req.method === 'DELETE') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Mot de passe incorrect.' });
      await clearOrders();
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Méthode non autorisée.' });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'NO_DB') {
      console.error('Base Redis non connectée : Vercel > Storage > Upstash Redis > Connect to Project, puis Redeploy.');
      return res.status(500).json({ error: 'Base de données non connectée (Vercel > Storage > Upstash Redis), puis Redeploy.' });
    }
    return res.status(500).json({ error: 'Erreur serveur, réessaie dans un instant.' });
  }
};