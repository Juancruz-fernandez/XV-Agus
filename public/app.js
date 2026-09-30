(() => {
  'use strict';

  const EVENT = {
    alias: 'agulla.mp',
    address: 'Janos Ituzaingo 2',
    start: new Date('2026-10-23T21:30:00-03:00'),
    title: 'Mis XV · Agustina Fernandez'
  };

  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Toast ---------- */

  const toast = $('toast');
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  /* ---------- Intro ---------- */

  const intro = $('intro');
  const app = $('app');

  requestAnimationFrame(() => intro.classList.add('is-ready'));

  $('enterBtn').addEventListener('click', () => {
    intro.classList.add('is-gone');
    document.body.classList.remove('is-locked');
    app.classList.add('is-live');
    revealAll();
    setTimeout(() => intro.remove(), 1200);
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  /* ---------- Título partido ---------- */

  const nameEl = $('heroName');

  function splitName() {
    if (nameEl.dataset.ready) return;
    const text = nameEl.textContent;
    nameEl.textContent = '';
    nameEl.dataset.ready = '1';
    for (const char of text) {
      const span = document.createElement('span');
      if (char === ' ') {
        span.className = 'ch ch--space';
        span.innerHTML = '&nbsp;';
      } else {
        span.className = 'ch';
        span.textContent = char;
      }
      nameEl.appendChild(span);
    }
  }

  splitName();

  function animateName() {
    const chars = nameEl.querySelectorAll('.ch');
    chars.forEach((char, i) => {
      char.style.transitionDelay = `${i * 0.045}s`;
    });
    nameEl.classList.add('is-in');
  }

  /* ---------- Reveal al desplazar ---------- */

  const revealTargets = Array.from(document.querySelectorAll('[data-reveal]'));

  function revealAll() {
    revealTargets.forEach((el) => el.classList.add('is-in'));
    animateName();
  }

  if (reduceMotion) {
    revealAll();
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.12 }
    );

    revealTargets.forEach((el) => observer.observe(el));

    const heroObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          animateName();
          heroObserver.disconnect();
        }
      },
      { threshold: 0.4 }
    );

    heroObserver.observe($('hero'));
  }

  /* ---------- Barra de progreso ---------- */

  const progress = $('progress');

  function updateProgress() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  /* ---------- Cuenta regresiva ---------- */

  const cdCells = {
    days: $('cdDays').closest('.countdown__cell'),
    hours: $('cdHours').closest('.countdown__cell'),
    minutes: $('cdMinutes').closest('.countdown__cell'),
    seconds: $('cdSeconds').closest('.countdown__cell')
  };

  const pad = (n) => String(Math.max(0, n)).padStart(2, '0');

  function setCell(key, value) {
    const node = $(`cd${key[0].toUpperCase()}${key.slice(1)}`);
    const next = pad(value);
    if (node.textContent === next) return;
    node.textContent = next;
    if (reduceMotion) return;
    const cell = cdCells[key];
    cell.classList.remove('is-ticking');
    void cell.offsetWidth;
    cell.classList.add('is-ticking');
  }

  function tickCountdown() {
    const diff = EVENT.start.getTime() - Date.now();

    if (diff <= 0) {
      ['days', 'hours', 'minutes', 'seconds'].forEach((key) => setCell(key, 0));
      $('countdownGrid').hidden = true;
      $('countdownDone').hidden = false;
      clearInterval(timer);
      return;
    }

    const seconds = Math.floor(diff / 1000);
    setCell('days', Math.floor(seconds / 86400));
    setCell('hours', Math.floor((seconds % 86400) / 3600));
    setCell('minutes', Math.floor((seconds % 3600) / 60));
    setCell('seconds', seconds % 60);
  }

  const timer = setInterval(tickCountdown, 1000);
  tickCountdown();

  /* ---------- Partículas ---------- */

  function sparkles(canvas, options) {
    if (reduceMotion || !canvas) return;
    const ctx = canvas.getContext('2d');
    const dots = [];
    let width = 0;
    let height = 0;

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const target = Math.round((width * height) / options.density);
      dots.length = 0;
      for (let i = 0; i < target; i += 1) dots.push(create());
    }

    function create() {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        r: options.min + Math.random() * (options.max - options.min),
        speed: options.speed * (0.4 + Math.random()),
        drift: (Math.random() - 0.5) * 0.22,
        alpha: Math.random(),
        phase: Math.random() * Math.PI * 2
      };
    }

    function frame(time) {
      ctx.clearRect(0, 0, width, height);

      for (const dot of dots) {
        dot.y -= dot.speed;
        dot.x += dot.drift;
        dot.alpha = 0.28 + Math.abs(Math.sin(time / 1400 + dot.phase)) * 0.62;

        if (dot.y < -6) Object.assign(dot, create(), { y: height + 6 });
        if (dot.x < -6) dot.x = width + 6;
        if (dot.x > width + 6) dot.x = -6;

        const glow = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, dot.r * 5);
        glow.addColorStop(0, `rgba(255, 244, 214, ${dot.alpha})`);
        glow.addColorStop(0.4, `rgba(231, 205, 151, ${dot.alpha * 0.35})`);
        glow.addColorStop(1, 'rgba(231, 205, 151, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r * 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 252, 242, ${dot.alpha})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }

      requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  }

  sparkles($('particles'), { density: 12000, min: 0.4, max: 1.5, speed: 0.16 });
  sparkles($('introCanvas'), { density: 7000, min: 0.5, max: 1.8, speed: 0.3 });

  /* ---------- Copiar ---------- */

  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}

    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand('copy');
      area.remove();
      return ok;
    } catch {
      return false;
    }
  }

  $('copyAliasBtn').addEventListener('click', async (event) => {
    const ok = await copy(EVENT.alias);
    const btn = event.currentTarget;
    if (!ok) {
      showToast(`No se pudo copiar. El alias es ${EVENT.alias}`);
      return;
    }
    btn.classList.add('is-copied');
    const original = btn.innerHTML;
    btn.innerHTML = '¡Alias copiado!';
    showToast('Alias copiado al portapapeles');
    setTimeout(() => {
      btn.innerHTML = original;
      btn.classList.remove('is-copied');
    }, 2200);
  });

  $('copyAddressBtn').addEventListener('click', async () => {
    const ok = await copy(EVENT.address);
    showToast(ok ? 'Dirección copiada' : `Dirección: ${EVENT.address}`);
  });

  /* ---------- Compartir ---------- */

  const inviteLink = () => window.location.origin + window.location.pathname;

  const inviteText =
    `¡Me llegó la invitación de los XV de Agustina Fernandez! 🎉\n\n` +
    `23 de octubre de 2026\nJanos Ituzaingo 2\n21:30 a 5:30\nDress code: elegante\n\n` +
    `Entrá acá y confirmá si vas: `;

  $('waBtn').addEventListener('click', () => {
    const url = `https://wa.me/?text=${encodeURIComponent(inviteText + inviteLink())}`;
    window.open(url, '_blank', 'noopener');
  });

  $('shareBtn').addEventListener('click', async () => {
    const share = {
      title: EVENT.title,
      text: `${EVENT.title} — 23 de octubre de 2026, ${EVENT.address}. Dress code: elegante.`,
      url: inviteLink()
    };

    if (navigator.share) {
      try {
        await navigator.share(share);
        return;
      } catch {}
    }

    const ok = await copy(share.url);
    showToast(ok ? 'Link de la invitación copiado' : share.url);
  });

  /* ---------- Formularios ---------- */

  async function submitForm(form, status, url) {
    const btn = form.querySelector('button[type="submit"]');
    const data = Object.fromEntries(new FormData(form).entries());
    const label = btn.textContent;

    status.textContent = '';
    status.classList.remove('is-ok');
    btn.disabled = true;
    btn.textContent = 'Enviando…';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) throw new Error(result.error || 'No pudimos guardar tu respuesta.');

      status.textContent = result.mensaje;
      status.classList.add('is-visible', 'is-ok');
      form.classList.add('is-sent');
      showToast(result.mensaje);
    } catch (error) {
      status.textContent = error.message || 'No pudimos guardar tu respuesta. Probá de nuevo.';
      status.classList.add('is-visible');
    } finally {
      btn.disabled = false;
      btn.textContent = label;
    }
  }

  $('rsvpForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.nombre.value.trim();
    const choice = form.querySelector('input[name="asiste"]:checked');
    const status = $('rsvpStatus');

    if (name.length < 2) {
      status.textContent = 'Escribí tu nombre y apellido.';
      status.classList.add('is-visible');
      return;
    }
    if (!choice) {
      status.textContent = 'Contanos si vas a venir.';
      status.classList.add('is-visible');
      return;
    }

    submitForm(form, status, '/api/rsvp');
  });

  $('songForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const title = form.cancion.value.trim();
    const status = $('songStatus');

    if (title.length < 2) {
      status.textContent = 'Escribí el nombre de la canción.';
      status.classList.add('is-visible');
      return;
    }

    submitForm(form, status, '/api/songs');
  });
})();