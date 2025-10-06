// frontend/js/perfil.js
document.addEventListener('DOMContentLoaded', () => {
  const API_BASE = '/api/auth';

  const form       = document.querySelector('#profile-form');
  const editBtn    = document.querySelector('#edit-btn');
  const saveBtn    = document.querySelector('#save-btn');
  const nameInput  = document.querySelector('#profile-name');
  const emailInput = document.querySelector('#profile-email');
  const phoneInput = document.querySelector('#profile-phone');
  const editMsg    = document.querySelector('#editMsg');

  // Si el perfil no está en el DOM, salimos sin romper nada
  if (!form || !editBtn || !saveBtn || !nameInput || !phoneInput) return;

  // Aseguramos estado inicial
  function lock() {
    nameInput.disabled  = true;
    // El email por ahora es de solo-lectura
    emailInput.disabled = true;
    phoneInput.disabled = true;
    saveBtn.disabled    = true;
    editBtn.disabled    = false;
  }
  lock();

  editBtn.addEventListener('click', () => {
    // Habilitar edición de nombre y teléfono
    nameInput.disabled  = false;
    phoneInput.disabled = false;
    saveBtn.disabled    = false;
    editBtn.disabled    = true;
    nameInput.focus();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    editMsg.textContent = '';

    const name  = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!name) {
      editMsg.textContent = '⚠️ El nombre no puede estar vacío';
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, phone })
      });

      if (!res.ok) {
        let msg = 'Error';
        try {
          const ct = res.headers.get('content-type') || '';
          msg = ct.includes('application/json') ? (await res.json()).error || msg : await res.text();
        } catch {}
        editMsg.textContent = `⚠️ ${msg}`;
        return;
      }

      editMsg.textContent = '✅ Cambios guardados';
      lock();
    } catch (err) {
      editMsg.textContent = '⚠️ Error de red';
    }
  });
});
