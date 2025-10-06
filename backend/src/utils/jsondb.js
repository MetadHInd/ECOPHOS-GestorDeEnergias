const fs = require('fs').promises;
const path = require('path');

const DB_DIR = path.join(__dirname, '../../data');

async function ensureFile(file, initial = []) {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
    const full = path.join(DB_DIR, file);
    await fs.access(full).catch(async () => {
      await fs.writeFile(full, JSON.stringify(initial, null, 2), 'utf8');
    });
    return full;
  } catch (e) { throw e; }
}

async function read(file) {
  const full = await ensureFile(file);
  const txt = await fs.readFile(full, 'utf8');
  return JSON.parse(txt || '[]');
}

async function write(file, data) {
  const full = await ensureFile(file);
  await fs.writeFile(full, JSON.stringify(data, null, 2), 'utf8');
  return true;
}

module.exports = { read, write, ensureFile, DB_DIR };
