const API_NEWS = `${location.origin}/api/news/all`;

const grid = document.getElementById('newsGrid');
const msg  = document.getElementById('newsMsg');

init();

async function init() {
  msg.textContent = 'Cargando noticias…';
  grid.innerHTML = '';

  try {
    const r = await fetch(API_NEWS);
    if (!r.ok) throw new Error('Respuesta no válida del servidor');
    const items = await r.json();

    if (!items.length) {
      msg.textContent = 'Aún no hay noticias.';
      return;
    }

    // Ordenar por fecha descendente
    items.sort((a, b) => new Date(b.datePublished) - new Date(a.datePublished));

    // Asignar estilos tipo "servicios"
    grid.className = 'servicios';

    // Crear tarjetas
    const frag = document.createDocumentFragment();
    items.forEach(n => frag.appendChild(card(n)));
    grid.appendChild(frag);

    msg.textContent = '';
  } catch (err) {
    console.error('Error cargando noticias:', err);
    msg.textContent = '⚠️ Error cargando noticias.';
  }
}

function card(n) {
  const art = document.createElement('article');
  art.className = 'servicio'; // usa el mismo diseño de servicios

  art.innerHTML = `
    ${n.image ? `<img src="${esc(n.image)}" alt="${esc(n.title)}">` : ''}
    <h3>${esc(n.title)}</h3>
    <p>${esc(n.description)}</p>
    <p style="text-align:center; font-size:14px; color:#666; margin-bottom:1rem;">
      📅 ${fmt(n.datePublished)}
    </p>
  `;

  return art;
}

// Sanitizador de texto
const esc = s => String(s || '').replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
}[m]));

// Formateador de fecha
const fmt = iso => {
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  } catch {
    return iso || '';
  }
};