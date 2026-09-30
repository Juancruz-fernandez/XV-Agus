'use strict';

const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');

try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {}

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'agus-xv-2026';
const SESSION_TTL = 8 * 60 * 60 * 1000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const FILES = { rsvp: 'rsvps.json', song: 'songs.json' };
const COOKIE = 'xv_admin';

fs.mkdirSync(DATA_DIR, { recursive: true });

const SECRET = loadSecret();

function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(DATA_DIR, '.session-secret');
  try {
    return fs.readFileSync(file, 'utf8').trim();
  } catch {
    const value = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(file, value, { mode: 0o600 });
    return value;
  }
}

const app = express();
app.disable('x-powered-by');
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'; frame-ancestors 'none'"
  );
  next();
});

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: false, limit: '16kb' }));

function clean(value, max) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

async function readList(kind) {
  try {
    const raw = await fsp.readFile(path.join(DATA_DIR, FILES[kind]), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeList(kind, list) {
  const target = path.join(DATA_DIR, FILES[kind]);
  const tmp = `${target}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(list, null, 2), 'utf8');
  await fsp.rename(tmp, target);
}

const hits = new Map();

function rateLimit({ max, windowMs, key = 'default' }) {
  return (req, res, next) => {
    const id = `${key}:${req.ip}`;
    const now = Date.now();
    const entry = hits.get(id);
    if (!entry || now > entry.resetAt) {
      hits.set(id, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({ ok: false, error: 'Demasiados intentos. Probá de nuevo en unos minutos.' });
    }
    return next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of hits) if (now > entry.resetAt) hits.delete(id);
}, 10 * 60 * 1000).unref();

const isBot = (body) => clean(body.website, 200).length > 0;

app.post('/api/rsvp', rateLimit({ key: 'submit', max: 15, windowMs: 10 * 60 * 1000 }), async (req, res) => {
  const body = req.body || {};
  if (isBot(body)) return res.json({ ok: true });

  const nombre = clean(body.nombre, 80);
  const asiste = body.asiste === 'si' || body.asiste === 'no' ? body.asiste : '';

  if (nombre.length < 2) return res.status(400).json({ ok: false, error: 'Escribí tu nombre y apellido.' });
  if (!asiste) return res.status(400).json({ ok: false, error: 'Contanos si vas a venir.' });

  const list = await readList('rsvp');
  const existing = list.find((item) => item.nombre.toLowerCase() === nombre.toLowerCase());
  const record = { id: existing ? existing.id : crypto.randomUUID(), nombre, asiste, createdAt: new Date().toISOString() };

  if (existing) Object.assign(existing, record);
  else list.push(record);

  await writeList('rsvp', list);
  const mensaje =
    asiste === 'si'
      ? '¡Gracias por confirmar! Nos vemos en la fiesta.'
      : 'Gracias por avisarnos. Te vamos a extrañar.';

  return res.json({ ok: true, mensaje });
});

app.post('/api/songs', rateLimit({ key: 'submit', max: 15, windowMs: 10 * 60 * 1000 }), async (req, res) => {
  const body = req.body || {};
  if (isBot(body)) return res.json({ ok: true });

  const cancion = clean(body.cancion, 120);
  const artista = clean(body.artista, 80);

  if (cancion.length < 2) return res.status(400).json({ ok: false, error: 'Escribí el nombre de la canción.' });

  const list = await readList('song');
  const record = {
    id: crypto.randomUUID(),
    cancion,
    artista: artista || null,
    createdAt: new Date().toISOString()
  };
  list.push(record);

  await writeList('song', list);
  return res.json({ ok: true, mensaje: '¡Canción guardada! Gracias por sumar a la fiesta.' });
});

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

function makeToken() {
  const payload = String(Date.now() + SESSION_TTL);
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token) {
  if (typeof token !== 'string') return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = sign(payload);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(payload) > Date.now();
}

function readCookie(req, name) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function sameSecret(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function isAdmin(req) {
  return verifyToken(readCookie(req, COOKIE));
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) return res.status(401).json({ ok: false, error: 'Sesión no válida.' });
  return next();
}

app.post('/api/admin/login', rateLimit({ key: 'login', max: 8, windowMs: 10 * 60 * 1000 }), (req, res) => {
  const password = String((req.body || {}).password || '');
  if (!password || !sameSecret(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ ok: false, error: 'Contraseña incorrecta.' });
  }
  res.setHeader('Set-Cookie', `${COOKIE}=${makeToken()}; HttpOnly; Path=/; Max-Age=${SESSION_TTL / 1000}; SameSite=Strict`);
  return res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', `${COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict`);
  res.json({ ok: true });
});

app.get('/api/admin/session', (req, res) => res.json({ ok: true, admin: isAdmin(req) }));

app.get('/api/admin/data', requireAdmin, async (req, res) => {
  const [rsvps, songs] = await Promise.all([readList('rsvp'), readList('song')]);
  res.json({
    ok: true,
    rsvps: rsvps.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    songs: songs.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  });
});

function removeRecord(kind) {
  return [
    requireAdmin,
    async (req, res) => {
      const id = clean(req.params.id, 60);
      const list = await readList(kind);
      const next = list.filter((item) => item.id !== id);
      if (next.length === list.length) return res.status(404).json({ ok: false, error: 'No se encontró el registro.' });
      await writeList(kind, next);
      return res.json({ ok: true });
    }
  ];
}

app.delete('/api/admin/rsvp/:id', ...removeRecord('rsvp'));
app.delete('/api/admin/song/:id', ...removeRecord('song'));

app.get('/api/admin/export.csv', requireAdmin, async (req, res) => {
  const [rsvps, songs] = await Promise.all([readList('rsvp'), readList('song')]);
  const cell = (value) => `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
  const when = (iso) => new Date(iso).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' });

  const lines = [['Tipo', 'Detalle', 'Artista', 'Asiste', 'Fecha (Argentina)'].map(cell).join(',')];
  for (const item of rsvps) lines.push([cell('Asistencia'), cell(item.nombre), cell(''), cell(item.asiste === 'si' ? 'Sí' : 'No'), cell(when(item.createdAt))].join(','));
  for (const item of songs) lines.push([cell('Canción'), cell(item.cancion), cell(item.artista || ''), cell(''), cell(when(item.createdAt))].join(','));

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="xv-agustina-respuestas.csv"');
  res.send(`\uFEFF${lines.join('\n')}`);
});

app.get('/admin', (req, res) => res.redirect('/admin.html'));

let indexHtml = null;

function originOf(req) {
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return host ? `${proto}://${host}` : '';
}

function serveIndex(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (!(req.headers.accept || '').includes('text/html')) return next();

  if (indexHtml === null) indexHtml = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8');

  const origin = originOf(req);
  const html = origin
    ? indexHtml
        .replace('content="/og.png"', `content="${origin}/og.png"`)
        .replace('</head>', `    <link rel="canonical" href="${origin}/" />\n    <meta property="og:url" content="${origin}/" />\n  </head>`)
    : indexHtml;

  res.setHeader('Content-Type', 'text/html; charset=UTF-8');
  res.setHeader('Cache-Control', 'no-cache');
  return res.send(html);
}

app.get(['/', '/index.html'], serveIndex);

app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    setHeaders(res, filePath) {
      if (/\.(?:css|js|svg|woff2?)$/.test(filePath)) res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  })
);

app.use((req, res) => res.status(404).sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.listen(PORT, () => {
  console.log(`Invitacion XV de Agustina Fernandez`);
  console.log(`-> http://localhost:${PORT}`);
  console.log(`-> Panel: http://localhost:${PORT}/admin`);
});