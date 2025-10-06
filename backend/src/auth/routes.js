const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const express = require('express');
const { authRequired, setAuthCookie, clearAuthCookie } = require('./middleware');

const router = express.Router();
const dbPath = path.join(__dirname, '../data/users.json');

function readUsers() {
  if (!fs.existsSync(dbPath)) return [];
  const raw = fs.readFileSync(dbPath, 'utf8') || '[]';
  return JSON.parse(raw);
}
function writeUsers(users) {
  fs.writeFileSync(dbPath, JSON.stringify(users, null, 2));
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Faltan campos requeridos' });

  const users = readUsers();
  const exists = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) return res.status(409).json({ error: 'El correo ya está registrado' });

  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: Date.now().toString(),
    name,
    email,
    phone: phone || '',
    password: hash,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  writeUsers(users);

  setAuthCookie(res, { id: user.id, email: user.email, name: user.name });
  res.status(201).json({ id: user.id, name: user.name, email: user.email, phone: user.phone });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña requeridos' });

  const users = readUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

  setAuthCookie(res, { id: user.id, email: user.email, name: user.name });
  res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', authRequired, (req, res) => {
  const users = readUsers();
  const me = users.find(u => u.id === req.user.id);
  if (!me) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ id: me.id, name: me.name, email: me.email, phone: me.phone });
});

// PUT /api/users/me  (editar perfil básico)
// PUT /api/auth/me
router.put('/me', authRequired, (req, res) => {
  const { name, phone } = req.body || {};
  const users = readUsers();
  const idx = users.findIndex(u => u.id === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Usuario no encontrado' });

  users[idx].name  = typeof name  === 'string' ? name  : users[idx].name;
  users[idx].phone = typeof phone === 'string' ? phone : users[idx].phone;

  writeUsers(users);
  const u = users[idx];
  res.json({ id: u.id, name: u.name, email: u.email, phone: u.phone });
});



module.exports = router;
