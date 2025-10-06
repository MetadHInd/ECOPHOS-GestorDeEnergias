const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-ecophos';
const COOKIE_NAME = 'ecophos_token';

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authRequired(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: 'No autenticado' });
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}

function setAuthCookie(res, payload) {
  const token = signToken(payload);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false, // ponlo true si usas HTTPS
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

module.exports = { authRequired, setAuthCookie, clearAuthCookie };
