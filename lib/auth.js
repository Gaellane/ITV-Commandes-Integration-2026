const crypto = require('crypto');

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

// Le mot de passe admin est envoyé dans l'en-tête x-admin-key (jamais dans l'URL).
function isAdmin(req) {
  const pass = process.env.ADMIN_PASSWORD;
  if (!pass) return false;
  const given = req.headers['x-admin-key'] || '';
  return crypto.timingSafeEqual(sha(given), sha(pass));
}

module.exports = { isAdmin };
