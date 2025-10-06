// backend/src/routes/projects.js
const express = require('express');
const path = require('path');
const { readFile, writeFile } = require('fs/promises');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authRequired } = require('../auth/middleware');

const router = express.Router();

// Rutas de archivos JSON
const PROJECTS_PATH = path.join(__dirname, '../data/projects.json');
const USERS_PATH    = path.join(__dirname, '../data/users.json');

/* ---------------- Utilidades de lectura/escritura ---------------- */
async function readProjects() {
  try {
    const raw = await readFile(PROJECTS_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}
async function writeProjects(projects) {
  await writeFile(PROJECTS_PATH, JSON.stringify(projects, null, 2));
}
function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
}
function ensureTasksArray(projects) {
  projects.forEach(p => { if (!Array.isArray(p.tasks)) p.tasks = []; });
}
function findProjectForUser(projects, pid, userId) {
  return projects.find(p => p.id === pid && p.userId === userId);
}

/* ---------------- Proyectos ---------------- */

// Crear proyecto
router.post('/', authRequired, async (req, res) => {
  const { title, description } = req.body || {};
  if (!title || !description) {
    return res.status(400).json({ error: 'Título y descripción requeridos' });
  }

  const projects = await readProjects();
  const newProject = {
    id: uuidv4(),
    userId: req.user.id,
    title,
    description,
    createdAt: new Date().toISOString(),
    tasks: [] // importante para gestionar tareas
  };

  projects.push(newProject);
  await writeProjects(projects);
  res.status(201).json(newProject);
});

// Listar proyectos del usuario autenticado
router.get('/', authRequired, async (req, res) => {
  const projects = await readProjects();
  ensureTasksArray(projects);
  res.json(projects.filter(p => p.userId === req.user.id));
});

// Alias /mine (por si lo usas en otro lado)
router.get('/mine', authRequired, async (req, res) => {
  const projects = await readProjects();
  ensureTasksArray(projects);
  res.json(projects.filter(p => p.userId === req.user.id));
});

// Eliminar proyecto (del usuario actual)
router.delete('/:id', authRequired, async (req, res) => {
  const { id } = req.params;
  let projects = await readProjects();
  const before = projects.length;

  projects = projects.filter(p => !(p.id === id && p.userId === req.user.id));
  if (projects.length === before) {
    return res.status(404).json({ error: 'Proyecto no encontrado' });
  }

  await writeProjects(projects);
  res.json({ success: true });
});

// Listado público/enriquecido de todos los proyectos
router.get('/all', async (_req, res) => {
  try {
    const projects = await readProjects();
    const users    = readUsers();

    const enriched = projects.map(p => {
      const owner = users.find(u => u.id === p.userId);
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        createdAt: p.createdAt,
        userId: p.userId,
        ownerName: owner ? owner.name : 'Usuario',
        ownerEmail: owner ? owner.email : ''
      };
    });

    enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(enriched);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo cargar proyectos' });
  }
});

/* ---------------- Tareas por proyecto ---------------- */

// Obtener tareas del proyecto del usuario actual
router.get('/:id/tasks', authRequired, async (req, res) => {
  const projects = await readProjects();
  ensureTasksArray(projects);

  const project = findProjectForUser(projects, req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  res.json(project.tasks);
});

// Crear tarea (incluye `desc`)
router.post('/:id/tasks', authRequired, async (req, res) => {
  const { status, priority, owner, desc = '' } = req.body || {};
  if (!status || !priority || !owner) {
    return res.status(400).json({ error: 'status, priority y owner son requeridos' });
  }

  const projects = await readProjects();
  ensureTasksArray(projects);

  const project = findProjectForUser(projects, req.params.id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const task = {
    id: Date.now().toString(), // o uuidv4()
    status,        // 'Completado' | 'En progreso' | 'Pendiente'
    priority,      // 'Alta' | 'Media' | 'Baja'
    owner,         // Responsable
    desc,          // Descripción breve
    createdAt: new Date().toISOString()
  };

  project.tasks.push(task);
  await writeProjects(projects);
  res.status(201).json(task);
});

// Eliminar tarea
router.delete('/:id/tasks/:tid', authRequired, async (req, res) => {
  const { id, tid } = req.params;

  const projects = await readProjects();
  ensureTasksArray(projects);

  const project = findProjectForUser(projects, id, req.user.id);
  if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' });

  const before = project.tasks.length;
  project.tasks = project.tasks.filter(t => t.id !== tid);
  if (project.tasks.length === before) {
    return res.status(404).json({ error: 'Tarea no encontrada' });
  }

  await writeProjects(projects);
  res.json({ ok: true });
});


// ---- Público: tareas de un proyecto (solo lectura) ----
router.get('/public/:id/tasks', async (req, res) => {
  try {
    const projects = await readProjects();
    const p = projects.find(x => x.id === req.params.id);
    if (!p) return res.status(404).json({ error: 'Proyecto no encontrado' });
    const tasks = Array.isArray(p.tasks) ? p.tasks : [];
    // Devuelve tal cual (status, priority, owner, desc, createdAt)
    res.json(tasks);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudieron cargar las tareas' });
  }
});


module.exports = router;
