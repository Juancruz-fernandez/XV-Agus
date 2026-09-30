(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const state = { rsvps: [], songs: [] };

  const when = (iso) =>
    new Date(iso).toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

  async function api(path, options) {
    const response = await fetch(path, options);
    if (response.status === 401) {
      showLogin();
      throw new Error('Sesión no válida.');
    }
    return response.json();
  }

  function showLogin() {
    $('dataView').hidden = true;
    $('headActions').hidden = true;
    $('loginView').hidden = false;
    $('password').value = '';
    $('password').focus();
  }

  function showData() {
    $('loginView').hidden = true;
    $('dataView').hidden = false;
    $('headActions').hidden = false;
  }

  function render() {
    $('statYes').textContent = state.rsvps.filter((item) => item.asiste === 'si').length;
    $('statNo').textContent = state.rsvps.filter((item) => item.asiste === 'no').length;
    $('statSongs').textContent = state.songs.length;

    const rsvpQuery = $('searchRsvp').value.trim().toLowerCase();
    const songQuery = $('searchSong').value.trim().toLowerCase();

    const rsvps = state.rsvps.filter((item) => item.nombre.toLowerCase().includes(rsvpQuery));
    const songs = state.songs.filter((item) =>
      `${item.cancion} ${item.artista || ''}`.toLowerCase().includes(songQuery)
    );

    $('rsvpEmpty').hidden = rsvps.length > 0;
    $('songEmpty').hidden = songs.length > 0;

    $('rsvpBody').innerHTML = rsvps
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.nombre)}</td>
          <td><span class="tag ${item.asiste === 'si' ? 'tag--yes' : 'tag--no'}">${item.asiste === 'si' ? 'Sí' : 'No'}</span></td>
          <td class="table__date">${when(item.createdAt)}</td>
          <td><button class="row-del" type="button" data-del="rsvp" data-id="${item.id}">Borrar</button></td>
        </tr>`
      )
      .join('');

    $('songBody').innerHTML = songs
      .map(
        (item) => `<tr>
          <td>${escapeHtml(item.cancion)}</td>
          <td>${item.artista ? escapeHtml(item.artista) : '—'}</td>
          <td class="table__date">${when(item.createdAt)}</td>
          <td><button class="row-del" type="button" data-del="song" data-id="${item.id}">Borrar</button></td>
        </tr>`
      )
      .join('');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }

  async function load() {
    const data = await api('/api/admin/data');
    state.rsvps = data.rsvps || [];
    state.songs = data.songs || [];
    showData();
    render();
  }

  $('loginForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const status = $('loginStatus');
    const button = event.currentTarget.querySelector('button');

    status.textContent = '';
    status.classList.remove('is-visible', 'is-ok');
    button.disabled = true;

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: $('password').value })
      });
      const result = await response.json();

      if (!response.ok || !result.ok) throw new Error(result.error || 'No pudimos iniciar sesión.');

      $('loginView').hidden = true;
      await load();
    } catch (error) {
      status.textContent = error.message;
      status.classList.add('is-visible');
    } finally {
      button.disabled = false;
    }
  });

  $('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    showLogin();
  });

  $('refreshBtn').addEventListener('click', () => load().catch(() => {}));

  $('searchRsvp').addEventListener('input', render);
  $('searchSong').addEventListener('input', render);

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-del]');
    if (!button) return;

    const kind = button.dataset.del;
    const label = kind === 'rsvp' ? 'la confirmación' : 'la canción';
    if (!confirm(`¿Borrar ${label}?`)) return;

    button.disabled = true;
    try {
      const result = await api(`/api/admin/${kind}/${encodeURIComponent(button.dataset.id)}`, { method: 'DELETE' });
      if (!result.ok) throw new Error(result.error);
      await load();
    } catch (error) {
      alert(error.message || 'No se pudo borrar.');
      button.disabled = false;
    }
  });

  api('/api/admin/session')
    .then((data) => (data.admin ? load() : showLogin()))
    .catch(showLogin);
})();