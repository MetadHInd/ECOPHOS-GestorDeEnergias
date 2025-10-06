const API_NEWS = `${location.origin}/api/news/all`;

const grid = document.getElementById('newsGrid');
const msg  = document.getElementById('newsMsg');

init();

async function init() {
  msg.textContent = 'Cargando noticias…';
  grid.innerHTML = '';
  try {
    const r = await fetch(API_NEWS);
    if (!r.ok) throw 0;
    const items = await r.json();
    if (!items.length) { msg.textContent = 'Aún no hay noticias.'; return; }
    items.sort((a,b)=> new Date(b.datePublished) - new Date(a.datePublished));
    const frag = document.createDocumentFragment();
    items.forEach(n => frag.appendChild(card(n)));
    grid.appendChild(frag);
    msg.textContent = '';
  } catch {
    msg.textContent = '⚠️ Error cargando noticias';
  }
}

function card(n) {
  const art = document.createElement('article');
  art.className = 'card news-card';
  const header = n.image ? `<div class="card-media" style="background-image:url('${esc(n.image)}')"></div>` : '';
  art.innerHTML = `
    ${header}
    <div class="card-body">
      <h3 class="card-title">${esc(n.title)}</h3>
      <p class="card-text">${esc(n.description)}</p>
      <div class="card-meta">
        <time datetime="${esc(n.datePublished)}">${fmt(n.datePublished)}</time>
      </div>
    </div>
  `;
  return art;
}
const esc = s => String(s||'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[m]));
const fmt = iso => { try{ return new Date(iso).toLocaleDateString([], { dateStyle:'medium' }); }catch{ return iso||''; } };
