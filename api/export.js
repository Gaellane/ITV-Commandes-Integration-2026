const { buildWorkbook } = require('../lib/excel');
const { listOrders } = require('../lib/store');
const { isAdmin } = require('../lib/auth');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée.' });
    if (!isAdmin(req)) return res.status(401).json({ error: 'Mot de passe incorrect.' });

    const buffer = await buildWorkbook(await listOrders());
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="commandes-it-volunteers.xlsx"');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buffer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
