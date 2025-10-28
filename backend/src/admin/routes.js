const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const bcrypt = require('bcryptjs');
const multer = require('multer');

const { setAuthCookie, clearAuthCookie, authRequired } = require('../auth/middleware');

const router = express.Router();

// --- Constants ---

const NEWS_PATH = path.join(__dirname, '../data/news.json');
const MEDIA_DIR = path.join(__dirname, '../data/img');
const ADMINS_PATH = path.join(__dirname, '../data/administradores.json');
const PROJECTS_PATH = path.join(__dirname, '../data/projects.json');
const USERS_PATH = path.join(__dirname, '../data/users.json');
const CONTACTS_PATH = path.join(__dirname, '../data/contactos.json');

// --- Multer Configuration ---

const sanitize = s => String(s || '').replace(/[\w.\-]+/g, '_');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, MEDIA_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = sanitize(file.originalname);
    cb(null, `${ts}_${safe}`);
  }
});
const upload = multer({ storage });

// --- Data Access Helpers ---

async function readJsonFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

async function writeJsonFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

const readNews = () => readJsonFile(NEWS_PATH);
const writeNews = (data) => writeJsonFile(NEWS_PATH, data);

const readAdmins = () => readJsonFile(ADMINS_PATH);
const writeAdmins = (data) => writeJsonFile(ADMINS_PATH, data);

const readProjects = () => readJsonFile(PROJECTS_PATH);
const writeProjects = (data) => writeJsonFile(PROJECTS_PATH, data);

const readUsers = () => readJsonFile(USERS_PATH);
const writeUsers = (data) => writeJsonFile(USERS_PATH, data);

const readContacts = () => readJsonFile(CONTACTS_PATH);

// --- Seed Admin ---

async function ensureSeedAdmin() {
  const admins = await readAdmins();
  if (admins.length === 0) {
    const seed = {
      id: Date.now().toString(),
      username: 'admin',
      password: '123456', // Plain text, will be handled by login logic
      name: 'Administrador',
      email: 'admin@ecophos.local',
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    admins.push(seed);
    await writeAdmins(admins);
  }
}
ensureSeedAdmin().catch(console.error);

// --- Middleware ---

async function adminRequired(req, res, next) {
  try {
    return authRequired(req, res, function afterAuth() {
      if (req.user && req.user.role === 'admin') {
        return next();
      }
      return res.status(403).json({ error: 'Solo administradores' });
    });
  } catch {
    return res.status(401).json({ error: 'No autenticado' });
  }
}

// --- Routes ---

// Auth
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const admins = await readAdmins();
  const admin = admins.find(a =>
    (a.username && a.username.toLowerCase() === username.toLowerCase()) ||
    (a.email && a.email.toLowerCase() === username.toLowerCase())
  );

  if (!admin) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  let ok = false;
  if (typeof admin.password === 'string' && admin.password.startsWith('$2')) {
    ok = await bcrypt.compare(password, admin.password);
  } else {
    ok = password === admin.password;
  }

  if (!ok) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  const payload = {
    id: admin.id,
    email: admin.email,
    name: admin.name || admin.username,
    role: 'admin'
  };

  setAuthCookie(res, payload);
  return res.json(payload);
});

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', adminRequired, async (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    role: req.user.role
  });
});

// User Management
router.get('/users', adminRequired, async (_req, res) => {
  const users = await readUsers();
  res.json(users);
});

router.delete('/users/:id', adminRequired, async (req, res) => {
  const { id } = req.params;

  let users = await readUsers();
  const initialUserCount = users.length;
  users = users.filter(u => u.id !== id);

  if (users.length === initialUserCount) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }
  await writeUsers(users);

  let projects = await readProjects();
  const initialProjectCount = projects.length;
  projects = projects.filter(p => p.userId !== id);
  const deletedProjectsCount = initialProjectCount - projects.length;
  await writeProjects(projects);

  return res.json({ success: true, deletedProjects: deletedProjectsCount });
});

// Contact Messages
router.get('/contacts', adminRequired, async (_req, res) => {
  let contacts = await readContacts();
  contacts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(contacts);
});

// News Management
router.get('/news', adminRequired, async (_req, res) => {
  const items = await readNews();
  items.sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished));
  res.json(items);
});

router.post('/news', adminRequired, upload.single('image'), async (req, res) => {
  const { title, description, datePublished } = req.body || {};
  if (!title || !description || !datePublished || !req.file) {
    return res.status(400).json({ error: 'Título, descripción, fecha e imagen son requeridos' });
  }

  const items = await readNews();
  const newItem = {
    id: Date.now().toString(),
    title,
    description,
    datePublished,
    image: `/media/${req.file.filename}`
  };
  items.push(newItem);
  await writeNews(items);

  res.status(201).json(newItem);
});

router.delete('/news/:id', adminRequired, async (req, res) => {
  const { id } = req.params;
  const items = await readNews();
  const initialCount = items.length;
  const filteredItems = items.filter(n => n.id !== id);

  if (filteredItems.length === initialCount) {
    return res.status(404).json({ error: 'Noticia no encontrada' });
  }

  await writeNews(filteredItems);
  res.json({ success: true });
});

// --- Noticias públicas (sin autenticación) ---
router.get('/news/all', async (_req, res) => {
  try {
    const items = await readNews();
    items.sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished));
    res.json(items);
  } catch (e) {
    console.error('Error cargando noticias públicas:', e);
    res.status(500).json({ error: 'Error al cargar noticias' });
  }
});

// Crear usuario (solo admin)
router.post('/users', adminRequired, async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};

    // Validaciones mínimas
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos' });
    }
    const emailNorm = String(email).trim().toLowerCase();
    const users = await readUsers();

    // Correo único
    if (users.some(u => (u.email || '').toLowerCase() === emailNorm)) {
      return res.status(409).json({ error: 'Ese correo ya está registrado' });
    }

    // Hash de contraseña
    const hash = await bcrypt.hash(password, 10);

    const user = {
      id: Date.now().toString(),
      name: String(name).trim(),
      email: emailNorm,
      phone: phone ? String(phone).trim() : '',
      password: hash,
      role: 'user',             
      createdAt: new Date().toISOString()
    };

    users.push(user);
    await writeUsers(users);

    // nunca regreses password al cliente
    const { password: _, ...safe } = user;
    return res.status(201).json(safe);
  } catch (e) {
    console.error('POST /api/admin/users failed:', e);
    return res.status(500).json({ error: 'No se pudo crear el usuario' });
  }
});


module.exports = router;