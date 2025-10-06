const express = require('express');
const path = require('path');
const fs = require('fs/promises');

const router = express.Router();
const dbPath = path.join(__dirname, '../data/contactos.json');

// utilidades
async function readContacts() {
  try {
    const raw = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}

async function writeContacts(data) {
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

// Crear contacto (POST /api/contact)
router.post('/', async (req, res) => {
  const { name, phone, email, message } = req.body || {};
  if (!name || !phone || !email || !message) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  const contacts = await readContacts();
  const newContact = {
    id: Date.now().toString(),
    name,
    phone,
    email,
    message,
    createdAt: new Date().toISOString()
  };

  contacts.push(newContact);
  await writeContacts(contacts);

  res.status(201).json({ success: true, contact: newContact });
});

// (opcional) listar contactos
router.get('/', async (_req, res) => {
  const contacts = await readContacts();
  res.json(contacts);
});

module.exports = router;
