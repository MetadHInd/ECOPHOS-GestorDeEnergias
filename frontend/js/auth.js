// frontend/js/auth.js
const API = `${location.origin}/api/auth`;

// Helpers de selección
const $  = (sel) => document.querySelector(sel);

// Referencias DOM
const tabsBox      = $('.auth-tabs');
const loginForm    = $('#loginForm');
const registerForm = $('#registerForm');
const loginMsg     = $('#loginMsg');
const regMsg       = $('#regMsg');

const profileBox   = $('#profileBox');
const nameSpan     = $('#pName');
const emailSpan    = $('#pEmail');
const phoneSpan    = $('#pPhone');

const nameInput    = $('#profile-name');
const emailInput   = $('#profile-email');
const phoneInput   = $('#profile-phone');

// ---------- UI helpers ----------
function setActiveTab(which = 'login') {
  if (!tabsBox) return;
  const tabs = tabsBox.querySelectorAll('.tab');
  tabs.forEach(t => t.classList.remove('active'));
  const btn = tabsBox.querySelector(`.tab[data-tab="${which}"]`);
  if (btn) btn.classList.add('active');
}

function showAuth(which = 'login') {
  // Mostrar pestañas + el form elegido
  if (tabsBox) tabsBox.style.display = 'flex';
  if (loginForm) {
    if (which === 'login') {
      loginForm.classList.add('show');
      loginForm.style.display = 'block';
    } else {
      loginForm.classList.remove('show');
      loginForm.style.display = 'none';
    }
  }
  if (registerForm) {
    if (which === 'register') {
      registerForm.classList.add('show');
      registerForm.style.display = 'block';
    } else {
      registerForm.classList.remove('show');
      registerForm.style.display = 'none';
    }
  }
  if (profileBox) profileBox.style.display = 'none';
  setActiveTab(which);
}

function showProfile(me) {
  // Ocultar pestañas + forms y mostrar perfil
  if (tabsBox) tabsBox.style.display = 'none';
  if (loginForm)  { loginForm.classList.remove('show');  loginForm.style.display = 'none'; }
  if (registerForm){ registerForm.classList.remove('show');registerForm.style.display = 'none'; }
  if (profileBox)  profileBox.style.display = 'block';

  // Rellenar spans (si existen, versiones antiguas)
  if (nameSpan)  nameSpan.textContent  = me.name  || '';
  if (emailSpan) emailSpan.textContent = me.email || '';
  if (phoneSpan) phoneSpan.textContent = me.phone || '';

  // Rellenar inputs (versión actual)
  if (nameInput)  nameInput.value  = me.name  || '';
  if (emailInput) emailInput.value = me.email || '';
  if (phoneInput) phoneInput.value = me.phone || '';
}

// ---------- Tabs (login/registro) ----------
function wireTabs() {
  if (!tabsBox) return;
  tabsBox.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      showAuth(tab); // mostrar form correspondiente
    });
  });
}

// ---------- Estado de sesión ----------
async function fetchMe() {
  try {
    const r = await fetch(`${API}/me`, { credentials: 'include' });
    if (!r.ok) {
      // no autenticado
      showAuth('login');
      return null;
    }
    const me = await r.json();
    showProfile(me);
    return me;
  } catch {
    showAuth('login');
    return null;
  }
}

// ---------- Manejadores de formularios ----------
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (loginMsg) loginMsg.textContent = '';

  const data = Object.fromEntries(new FormData(loginForm));
  try {
    const r = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    const out = await r.json().catch(() => ({}));

    if (!r.ok) {
      if (loginMsg) loginMsg.textContent = `⚠️ ${out.error || 'No se pudo iniciar sesión'}`;
      return;
    }

    // Obtener datos y mostrar perfil
    await fetchMe();
  } catch {
    if (loginMsg) loginMsg.textContent = '⚠️ Error de conexión';
  }
});

registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (regMsg) regMsg.textContent = '';

  const data = Object.fromEntries(new FormData(registerForm));
  try {
    const r = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    const out = await r.json().catch(() => ({}));

    if (!r.ok) {
      if (regMsg) regMsg.textContent = `⚠️ ${out.error || 'No se pudo registrar'}`;
      return;
    }

    // Ya quedó autenticado → mostrar perfil
    await fetchMe();
  } catch {
    if (regMsg) regMsg.textContent = '⚠️ Error de conexión';
  }
});

// Edición de perfil (si tienes form con id="editForm")
const editForm = $('#editForm');
const editMsg  = $('#editMsg');

editForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (editMsg) editMsg.textContent = '';

  const data = Object.fromEntries(new FormData(editForm));
  try {
    const r = await fetch(`${API}/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });

    const out = await r.json().catch(() => ({}));

    if (!r.ok) {
      if (editMsg) editMsg.textContent = `⚠️ ${out.error || 'No se pudo actualizar'}`;
      return;
    }
    if (editMsg) editMsg.textContent = '✅ Cambios guardados';
    await fetchMe();
  } catch {
    if (editMsg) editMsg.textContent = '⚠️ Error de conexión';
  }
});

// Logout
$('#logoutBtn')?.addEventListener('click', async () => {
  try {
    await fetch(`${API}/logout`, { method: 'POST', credentials: 'include' });
  } finally {
    // Volver a vista de login
    showAuth('login');
    if (loginMsg) loginMsg.textContent = '';
    if (regMsg)   regMsg.textContent   = '';
  }
});

// ---------- Arranque ----------
wireTabs();
fetchMe(); // si hay cookie válida → muestra perfil, si no → login
