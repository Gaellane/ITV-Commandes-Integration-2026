const crypto = require('crypto');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

// Le mot de passe admin est envoyé dans l'en-tête x-admin-key (jamais dans l'URL).
function isAdmin(req) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return false;
  const given = req.headers['x-admin-key'] || '';
  return crypto.timingSafeEqual(sha(given), sha(pass));
}

// Mot de passe de la liste de consultation (/commandes.html) : LIST_PASSWORD, ou à défaut ADMIN_PASSWORD.
// Le mot de passe admin est aussi accepté pour consulter la liste.
function canViewList(req) {
  if (isAdmin(req)) return true;
  const pass = process.env.LIST_PASSWORD;
  if (!pass) return false;
  const given = req.headers['x-list-key'] || '';
  return crypto.timingSafeEqual(sha(given), sha(pass));
}

module.exports = { isAdmin, canViewList };
