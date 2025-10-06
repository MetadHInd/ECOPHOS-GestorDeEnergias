const PROJECTS_API = `${location.origin}/api/projects`;
const AUTH_ME_API  = `${location.origin}/api/auth/me`;

const $q = (s) => document.querySelector(s);
const listEl   = $q('#projectList');
const formEl   = $q('#projectForm');
const msgEl    = $q('#projMsg');
const titleEl  = $q('#projTitle');
const descEl   = $q('#projDesc');

// ---- modal refs
const mgModal  = $q('#manageModal');
const mgTitle  = $q('#mgTitle');
const mgClose  = $q('#mgClose');
const mgBack   = $q('#mgBack');
const taskForm = $q('#taskForm');
const taskMsg  = $q('#taskMsg');
const taskTbody= $q('#taskTbody');

let currentProjectId = null;
let chart = null;

async function isLogged() {
  const r = await fetch(AUTH_ME_API, { credentials: 'include' });
  return r.ok ? (await r.json()) : null;
}

function escapeHtml(str='') {
  return str.replace(/[&<>"']/g, m => (
    { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]
  ));
}

/* ---------------- Proyectos ---------------- */
async function loadProjects() {
  if (!listEl) return;
  listEl.innerHTML = '';
  const r = await fetch(PROJECTS_API, { credentials: 'include' });
  if (!r.ok) {
    listEl.innerHTML = `<li class="muted">No se pudieron cargar los proyectos.</li>`;
    return;
  }
  const items = await r.json();
  if (!items.length) {
    listEl.innerHTML = `<li class="muted">Aún no tienes proyectos.</li>`;
    return;
  }
  for (const p of items) {
    const li = document.createElement('li');
    li.className = 'project-item';
    li.innerHTML = `
      <div>
        <h4>${escapeHtml(p.title)}</h4>
        <p>${escapeHtml(p.description)}</p>
        <small class="muted">Creado: ${new Date(p.createdAt).toLocaleString([], {dateStyle:'medium', timeStyle:'short'})}</small>
      </div>
      <div class="actions">
        <button class="btn-outline btn-manage" data-id="${p.id}" data-title="${escapeHtml(p.title)}">Gestionar</button>
        <button class="btn-danger" data-id="${p.id}">Eliminar</button>
      </div>
    `;
    listEl.appendChild(li);
  }
}

async function addProject(e) {
  e?.preventDefault();
  msgEl.textContent = '';
  const title = titleEl.value.trim();
  const description = descEl.value.trim();
  if (!title || !description) {
    msgEl.textContent = '⚠️ Título y descripción son obligatorios';
    return;
  }
  const r = await fetch(PROJECTS_API, {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    credentials: 'include',
    body: JSON.stringify({ title, description })
  });
  if (!r.ok) {
    const err = await r.json().catch(()=>({error:'Error'}));
    msgEl.textContent = `⚠️ ${err.error || 'No se pudo crear'}`;
    return;
  }
  titleEl.value = ''; descEl.value = '';
  await loadProjects();
}

async function deleteProject(id) {
  const r = await fetch(`${PROJECTS_API}/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!r.ok) { alert('No se pudo eliminar'); return; }
  await loadProjects();
}

// Delegación de eventos: Eliminar + Gestionar
listEl?.addEventListener('click', (e) => {
  const btnDel = e.target.closest('button.btn-danger[data-id]');
  if (btnDel) {
    const id = btnDel.dataset.id;
    if (confirm('¿Eliminar este proyecto?')) deleteProject(id);
    return;
  }
  const btnMng = e.target.closest('button.btn-manage[data-id]');
  if (btnMng) {
    openManage(btnMng.dataset.id, btnMng.dataset.title);
  }
});

formEl?.addEventListener('submit', addProject);

/* ---------------- Modal Gestionar ---------------- */
function openManage(pid, title) {
  currentProjectId = pid;
  mgTitle.textContent = `Gestionar: ${title}`;
  taskForm.reset();
  taskMsg.textContent = '';
  taskTbody.innerHTML = '';
  drawChart([0,0,0]); // limpia
  document.body.classList.add('mg-lock');   // <—
  mgModal.classList.add('show');
  loadTasks();
}

function closeManage() {
  mgModal.classList.remove('show');
  document.body.classList.remove('mg-lock'); // <—
  currentProjectId = null;
}

mgClose?.addEventListener('click', closeManage);
mgBack?.addEventListener('click', closeManage);
mgModal?.addEventListener('click', (e)=> {
  if (e.target === mgModal) closeManage();
});

async function loadTasks() {
  if (!currentProjectId) return;
  taskTbody.innerHTML = '';
  const r = await fetch(`${PROJECTS_API}/${currentProjectId}/tasks`, { credentials:'include' });
  if (!r.ok) { taskTbody.innerHTML = `<tr><td colspan="4" class="muted">No se pudieron cargar tareas.</td></tr>`; return; }
  const tasks = await r.json();

  // tabla
  if (!tasks.length) {
    taskTbody.innerHTML = `<tr><td colspan="4" class="muted">Sin tareas aún.</td></tr>`;
  } else {
    const frag = document.createDocumentFragment();
    tasks.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${escapeHtml(t.status)}</td>
        <td>${escapeHtml(t.priority)}</td>
        <td>${escapeHtml(t.owner)}</td>
        <td>${escapeHtml(t.desc || '')}</td> 
        <td><button class="btn-outline btn-del-task" data-tid="${t.id}">Eliminar</button></td>
      `;
      frag.appendChild(tr);
    });
    taskTbody.appendChild(frag);
  }

  // chart
  const done = tasks.filter(t=>t.status==='Completado').length;
  const prog = tasks.filter(t=>t.status==='En progreso').length;
  const pend = tasks.filter(t=>t.status==='Pendiente').length;
  drawChart([done, prog, pend]);

  // bind deletes
  taskTbody.querySelectorAll('.btn-del-task').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const tid = btn.getAttribute('data-tid');
      if (!confirm('¿Eliminar esta tarea?')) return;
      const rr = await fetch(`${PROJECTS_API}/${currentProjectId}/tasks/${tid}`, {
        method:'DELETE', credentials:'include'
      });
      if (!rr.ok) { alert('No se pudo eliminar'); return; }
      loadTasks();
    });
  });
}

taskForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  if (!currentProjectId) return;
  taskMsg.textContent = '';
  const data = Object.fromEntries(new FormData(taskForm));
  const r = await fetch(`${PROJECTS_API}/${currentProjectId}/tasks`, {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    credentials:'include',
    body: JSON.stringify(data)
  });
  const out = await r.json().catch(()=>({}));
  if (!r.ok) { taskMsg.textContent = `⚠️ ${out.error || 'No se pudo agregar'}`; return; }
  taskForm.reset();
  loadTasks();
});

/* ---------------- Chart dona ---------------- */
function drawChart(values) {
  const el = document.getElementById('tasksChart');
  if (!el || typeof Chart === 'undefined') return;

  if (chart) chart.destroy();
  chart = new Chart(el, {
    type: 'doughnut',
    data: {
      labels: ['Completado','En progreso','Pendiente'],
      datasets: [{
        data: values,
        backgroundColor: ['#16a34a','#f59e0b','#ef4444'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,    // usamos el aspect-ratio del contenedor
      cutout: '62%',
      plugins: { legend: { display: false } },
      animation: { duration: 250 }
    }
  });
}

/* ---------------- Arranque ---------------- */
(async () => {
  if (!listEl || !formEl) return;
  const me = await isLogged();
  if (!me) return;
  await loadProjects();
})();


// Cerrar con tecla ESC
window.addEventListener('keydown', (ev)=>{
  if (ev.key === 'Escape' && mgModal.classList.contains('show')) {
    ev.preventDefault();
    closeManage();
  }
});
