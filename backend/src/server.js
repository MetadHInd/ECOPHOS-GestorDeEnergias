// backend/src/server.js
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const MEDIA_DIR = path.join(__dirname, './data/img');

// Rutas API
app.use('/api/auth', require('./auth/routes'));
app.use('/api/projects', require('./routes/projects')); 
app.use('/api/contact', require('./routes/contact'));
app.use('/api/admin', require('./admin/routes'));
app.use('/api/news', require('./routes/news'));
app.use('/media', express.static(MEDIA_DIR));



// Salud
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Frontend estático
const FRONT_DIR = path.join(__dirname, '../../frontend');
app.use(express.static(FRONT_DIR));
app.get('/*', (_req, res) => res.sendFile(path.join(FRONT_DIR, 'index.html')));

app.listen(PORT, () => console.log(`✅ Backend http://localhost:${PORT}`));
