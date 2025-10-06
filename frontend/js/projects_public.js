const API_ALL   = `${location.origin}/api/projects/all`;
const API_TASKS = (id) => `${location.origin}/api/projects/public/${id}/tasks`;

const grid   = document.getElementById('projectsGrid');
const msg    = document.getElementById('projectsMsg');
const search = document.getElementById('searchInput');
const badge  = document.getElementById('countBadge');

// Modal refs
const pubModal = document.getElementById('publicModal');
const pubTitle = document.getElementById('pubTitle');
const pubClose = document.getElementById('pubClose');
const pubBack  = document.getElementById('pubBack');
const pubTbody = document.getElementById('pubTbody');

let allProjects = [];
let chart = null;

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return iso || ''; }
}

function esc(s=''){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"\'":'&#39;' }[m])); }

function render(list) {
  grid.innerHTML = '';
  badge.textContent = list.length;

  if (!list.length) { msg.textContent = 'No hay proyectos para mostrar.'; return; }
  msg.textContent = '';

  const frag = document.createDocumentFragment();

  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = p.id;
    card.dataset.title = p.title;

    card.innerHTML = `
      <div class="card-body">
        <h3 class="card-title">${esc(p.title)}</h3>
        <p class="card-text">${esc(p.description)}</p>
      </div>
      <div class="card-meta">
        <div>
          <span class="meta-title">Asociado a</span>
          <span class="meta-value">${esc(p.ownerName || 'Usuario')}</span>
        </div>
        <div>
          <span class="meta-title">Creado</span>
          <span class="meta-value">${fmtDate(p.createdAt)}</span>
        </div>
      </div>
    `;

    // Click → abrir modal con estadísticas
    card.addEventListener('click', () => openPublicModal(p.id, p.title));
    frag.appendChild(card);
  });

  grid.appendChild(frag);
}

async function load() {
  grid.innerHTML = '';
  msg.textContent = 'Cargando proyectos…';
  badge.textContent = '0';
  try {
    const r = await fetch(API_ALL, { credentials: 'omit' });
    if (!r.ok) throw new Error('Error al cargar');
    allProjects = await r.json();
    render(allProjects);
  } catch (e) {
    console.error(e);
    msg.textContent = '⚠️ No se pudieron cargar los proyectos.';
  }
}

search?.addEventListener('input', () => {
  const q = (search.value || '').trim().toLowerCase();
  if (!q) return render(allProjects);
  const filtered = allProjects.filter(p =>
    (p.title || '').toLowerCase().includes(q) ||
    (p.description || '').toLowerCase().includes(q) ||
    (p.ownerName || '').toLowerCase().includes(q)
  );
  render(filtered);
});

// ---------- Modal público ----------
function showModal(){ document.body.classList.add('mg-lock'); pubModal.classList.add('show'); }
function hideModal(){ pubModal.classList.remove('show'); document.body.classList.remove('mg-lock'); }
pubClose?.addEventListener('click', hideModal);
pubBack?.addEventListener('click', hideModal);
pubModal?.addEventListener('click', (e)=> { if (e.target === pubModal) hideModal(); });
window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape' && pubModal.classList.contains('show')) hideModal(); });

async function openPublicModal(projectId, title) {
  pubTitle.textContent = `Proyecto: ${title}`;
  pubTbody.innerHTML = '<tr><td colspan="4" class="muted">Cargando…</td></tr>';
  drawChart([0,0,0], 'pubChart'); // limpia
  showModal();

  try {
    const r = await fetch(API_TASKS(projectId));
    if (!r.ok) throw 0;
    const tasks = await r.json();

    // Tabla (solo lectura)
    if (!tasks.length) {
      pubTbody.innerHTML = '<tr><td colspan="4" class="muted">Sin tareas registradas.</td></tr>';
    } else {
      const frag = document.createDocumentFragment();
      tasks.forEach(t=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${esc(t.status)}</td>
          <td>${esc(t.priority)}</td>
          <td>${esc(t.owner)}</td>
          <td>${esc(t.desc || '')}</td>
        `;
        frag.appendChild(tr);
      });
      pubTbody.innerHTML = '';
      pubTbody.appendChild(frag);
    }

    // Dona
    const done = tasks.filter(t=>t.status === 'Completado').length;
    const prog = tasks.filter(t=>t.status === 'En progreso').length;
    const pend = tasks.filter(t=>t.status === 'Pendiente').length;
    drawChart([done, prog, pend], 'pubChart');

  } catch {
    pubTbody.innerHTML = '<tr><td colspan="4" class="muted">⚠️ No se pudieron cargar las tareas.</td></tr>';
  }
}

// Reutilizamos la función de dona
function drawChart(values, canvasId) {
  const el = document.getElementById(canvasId);
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
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: { legend: { display: false } },
      animation: { duration: 250 }
    }
  });
}

load();
