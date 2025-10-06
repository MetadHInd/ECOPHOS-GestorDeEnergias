const API_ADMIN = `${location.origin}/api/admin`;
const $ = s => document.querySelector(s);

/* ---------- Login / Panel ---------- */
const adminLoginBox  = $('#adminLoginBox');
const adminLoginForm = $('#adminLoginForm');
const adminLoginMsg  = $('#adminLoginMsg');
const adminPanel     = $('#adminPanel');

function showLogin(){ adminLoginBox.style.display='block'; adminPanel.style.display='none'; }
function showPanel(){ adminLoginBox.style.display='none';  adminPanel.style.display='block'; }

async function getMe(){
  const r = await fetch(`${API_ADMIN}/me`, { credentials:'include' });
  if(!r.ok) return null;
  return r.json();
}

adminLoginForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  adminLoginMsg.textContent='';
  const data = Object.fromEntries(new FormData(adminLoginForm));
  try{
    const r = await fetch(`${API_ADMIN}/login`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      credentials:'include',
      body: JSON.stringify(data)
    });
    const out = await r.json().catch(()=>({}));
    if(!r.ok){ adminLoginMsg.textContent=`⚠️ ${out.error||'No se pudo iniciar sesión'}`; return; }
    showPanel();
    switchView('users');
  }catch{
    adminLoginMsg.textContent='⚠️ Error de conexión';
  }
});

$('#adminLogoutBtn')?.addEventListener('click', async ()=>{
  await fetch(`${API_ADMIN}/logout`, { method:'POST', credentials:'include' });
  showLogin();
});

/* ---------- Controles / Tabla ---------- */
const tableTitle = $('#tableTitle');
const thead = $('#adminThead');
const tbody = $('#adminTbody');
const adminMsg = $('#adminMsg');

const btnUsers  = $('#reloadBtn');   // Usuarios
const btnBuffer = $('#bufferBtn');   // Buffer de contactos
const btnNews   = $('#newsBtn');     // Admin noticias

let currentView = 'users'; // users | contacts | news

btnUsers?.addEventListener('click',  ()=> switchView('users'));
btnBuffer?.addEventListener('click', ()=> switchView('contacts'));
btnNews?.addEventListener('click',   ()=> switchView('news'));

function setActiveBtn(){
  [btnUsers, btnBuffer, btnNews].forEach(b=>b.classList.remove('is-active'));
  if(currentView==='users')   btnUsers.classList.add('is-active');
  if(currentView==='contacts')btnBuffer.classList.add('is-active');
  if(currentView==='news')    btnNews.classList.add('is-active');
}

function switchView(view){
  currentView = view;
  setActiveBtn();
  tbody.innerHTML=''; thead.innerHTML=''; adminMsg.textContent='';
  
  newsFormWrap.style.display = (view==='news') ? 'block' : 'none';

  if(view==='users'){    tableTitle.textContent='Usuarios';               renderUsers(); }
  if(view==='contacts'){ tableTitle.textContent='Buffer de Contactos';    renderContacts(); }
  if(view==='news'){     tableTitle.textContent='Noticias';               renderNews(); }
}

/* ---------- Usuarios ---------- */
async function renderUsers(){
  thead.innerHTML = `
    <tr style="text-align:left; border-bottom:1px solid #e5e7eb;">
      <th style="padding:8px;">Nombre</th>
      <th style="padding:8px;">Correo</th>
      <th style="padding:8px;">Celular</th>
      <th style="padding:8px;">Creado</th>
      <th style="padding:8px;">Acciones</th>
    </tr>`;
  tbody.innerHTML='';
  adminMsg.textContent='Cargando usuarios…';
  try{
    const r = await fetch(`${API_ADMIN}/users`, { credentials:'include' });
    if(!r.ok) throw 0;
    const users = await r.json();
    if(!users.length){
      tbody.innerHTML='<tr><td colspan="5" style="padding:10px;">Sin usuarios.</td></tr>';
      adminMsg.textContent=''; return;
    }
    const frag = document.createDocumentFragment();
    users.forEach(u=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">${esc(u.name)}</td>
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">${esc(u.email)}</td>
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">${esc(u.phone)}</td>
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">${fmtDT(u.createdAt)}</td>
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">
          <button class="btn-outline btn-del" data-id="${u.id}">Eliminar</button>
        </td>`;
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
    adminMsg.textContent='';

    tbody.querySelectorAll('.btn-del').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = btn.getAttribute('data-id');
        if(!confirm('¿Eliminar este usuario (y sus proyectos)?')) return;
        const r = await fetch(`${API_ADMIN}/users/${id}`, { method:'DELETE', credentials:'include' });
        const out = await r.json().catch(()=>({}));
        if(!r.ok){ alert(out.error||'No se pudo eliminar'); return; }
        adminMsg.textContent = `✅ Usuario eliminado (proyectos eliminados: ${out.deletedProjects||0})`;
        renderUsers();
      });
    });

  }catch{
    adminMsg.textContent='⚠️ Error cargando usuarios.';
  }
}

/* ---------- Buffer de contactos ---------- */
async function renderContacts(){
  thead.innerHTML = `
    <tr style="text-align:left; border-bottom:1px solid #e5e7eb;">
      <th style="padding:8px;">Nombre</th>
      <th style="padding:8px;">Correo</th>
      <th style="padding:8px;">Celular</th>
      <th style="padding:8px;">Mensaje</th>
      <th style="padding:8px;">Recibido</th>
    </tr>`;
  tbody.innerHTML='';
  adminMsg.textContent='Cargando contactos…';
  try{
    const r = await fetch(`${API_ADMIN}/contacts`, { credentials:'include' });
    if(!r.ok) throw 0;
    const list = await r.json();
    if(!list.length){
      tbody.innerHTML='<tr><td colspan="5" style="padding:10px;">Sin contactos.</td></tr>';
      adminMsg.textContent=''; return;
    }
    const frag = document.createDocumentFragment();
    list.forEach(c=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">${esc(c.name)}</td>
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">${esc(c.email)}</td>
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">${esc(c.phone)}</td>
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">${esc(c.message)}</td>
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">${fmtDT(c.createdAt)}</td>`;
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
    adminMsg.textContent='';
  }catch{
    adminMsg.textContent='⚠️ Error cargando contactos.';
  }
}

/* ---------- Noticias ---------- */
const newsFormWrap = $('#newsFormWrap');
const newsForm     = $('#newsForm');
const newsFormMsg  = $('#newsFormMsg');

async function renderNews(){
  thead.innerHTML = `
    <tr style="text-align:left; border-bottom:1px solid #e5e7eb;">
      <th style="padding:8px;">Imagen</th>
      <th style="padding:8px;">Título</th>
      <th style="padding:8px;">Descripción</th>
      <th style="padding:8px;">Fecha</th>
      <th style="padding:8px;">Acciones</th>
    </tr>`;
  tbody.innerHTML='';
  adminMsg.textContent='Cargando noticias…';
  try{
    const r = await fetch(`${API_ADMIN}/news`, { credentials:'include' });
    if(!r.ok) throw 0;
    const list = await r.json();
    if(!list.length){
      tbody.innerHTML='<tr><td colspan="5" style="padding:10px;">Sin noticias.</td></tr>';
      adminMsg.textContent=''; return;
    }
    const frag = document.createDocumentFragment();
    list.forEach(n=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">
          ${n.image ? `<img src="${esc(n.image)}" alt="" style="width:80px;height:50px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;">` : ''}
        </td>
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">${esc(n.title)}</td>
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">${esc(n.description)}</td>
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">${fmtDate(n.datePublished)}</td>
        <td style="padding:8px; border-bottom:1px solid #e5e7eb;">
          <button class="btn-outline btn-del-news" data-id="${n.id}">Eliminar</button>
        </td>`;
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
    adminMsg.textContent='';

    tbody.querySelectorAll('.btn-del-news').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = btn.getAttribute('data-id');
        if(!confirm('¿Eliminar esta noticia?')) return;
        const r = await fetch(`${API_ADMIN}/news/${id}`, { method:'DELETE', credentials:'include' });
        const out = await r.json().catch(()=>({}));
        if(!r.ok){ alert(out.error||'No se pudo eliminar'); return; }
        renderNews();
      });
    });

  }catch{
    adminMsg.textContent='⚠️ Error cargando noticias.';
  }
}

/* Alta de noticia */
newsForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  newsFormMsg.textContent='';
  const fd = new FormData(newsForm);
  try{
    const r = await fetch(`${API_ADMIN}/news`, {
      method:'POST',
      credentials:'include',
      body: fd
    });
    const out = await r.json().catch(()=>({}));
    if(!r.ok){ newsFormMsg.textContent=`⚠️ ${out.error || 'No se pudo publicar'}`; return; }
    newsForm.reset();
    newsFormMsg.textContent='✅ Publicada';
    renderNews();
  }catch{
    newsFormMsg.textContent='⚠️ Error de conexión';
  }
});

/* ---------- Utilidades ---------- */
function esc(s=''){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m])); }
function fmtDate(iso){ try{ return new Date(iso).toLocaleDateString([], { dateStyle:'medium' }); }catch{ return iso||''; } }
function fmtDT(iso){ try{ return new Date(iso).toLocaleString([], { dateStyle:'medium', timeStyle:'short' }); }catch{ return iso||''; } }

/* ---------- Arranque ---------- */
getMe().then(me=>{
  if(me && me.role==='admin'){ showPanel(); switchView('users'); }
  else { showLogin(); }
}).catch(()=>showLogin());



const userCreateForm = document.getElementById('userCreateForm');
const userCreateMsg  = document.getElementById('userCreateMsg');

userCreateForm?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  userCreateMsg.textContent = '';
  const data = Object.fromEntries(new FormData(userCreateForm));
  try{
    const r = await fetch(`${API_ADMIN}/users`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      credentials:'include',
      body: JSON.stringify(data)  // {name,email,phone,password,role}
    });
    const out = await r.json().catch(()=>({}));
    if(!r.ok){ userCreateMsg.textContent = `⚠️ ${out.error || 'No se pudo crear'}`; return; }
    userCreateMsg.textContent = '✅ Usuario creado';
    userCreateForm.reset();
    // refrescar tabla
    if (typeof renderUsers === 'function') renderUsers();

  }catch{
    userCreateMsg.textContent = '⚠️ Error de conexión';
  }
});

