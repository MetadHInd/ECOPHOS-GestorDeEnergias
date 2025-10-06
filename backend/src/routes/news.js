const express = require('express');
const path = require('path');
const { readFile, writeFile } = require('fs/promises');

const router = express.Router();
const NEWS_PATH = path.join(__dirname, '../data/news.json');

async function readNews() {
  try {
    const raw = await readFile(NEWS_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch { return []; }
}
async function writeNews(list) {
  await writeFile(NEWS_PATH, JSON.stringify(list, null, 2));
}

// GET /api/news/all  (público)
router.get('/all', async (_req, res) => {
  const items = await readNews();
  items.sort((a,b)=> new Date(b.datePublished) - new Date(a.datePublished));
  res.json(items);
});

module.exports = router;
