# Mis XV · Agustina Fernandez

Invitación digital para los XV años de Agustina Fernandez.

- **Fecha:** 23 de octubre de 2026
- **Lugar:** Janos Ituzaingo 2
- **Horario:** 21:30 a 5:30
- **Dress code:** Elegante
- **Alias para regalo:** `agulla.mp`

## Requisitos

Node.js 20.12 o superior.

## Puesta en marcha

```bash
npm install
cp .env.example .env
```

Editá `.env` y poné una contraseña fuerte en `ADMIN_PASSWORD`:

```env
PORT=3000
ADMIN_PASSWORD=una-contrasena-larga-y-unica
TRUST_PROXY=1
```

Levantá el sitio:

```bash
npm start
```

- Invitación: http://localhost:3000
- Panel de Agustina: http://localhost:3000/admin

En desarrollo: `npm run dev` (recarga al guardar).

## Dónde se guardan las respuestas

Cada confirmación y cada canción sugerida se escribe en archivos JSON dentro de `data/`:

- `data/rsvps.json` — nombre, si asiste, fecha
- `data/songs.json` — canción, artista, fecha

Si alguien confirma dos veces con el mismo nombre, la respuesta se actualiza en lugar de duplicarse.

Desde el panel podés borrar registros sueltos y descargar todo en CSV (`Descargar CSV`), listo para Excel o Google Sheets.

## Publicar en Railway

1. Subí el código a GitHub. En la carpeta del proyecto:

   ```bash
   git init
   git add .
   git commit -m "Invitacion XV Agustina Fernandez"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/xv-agus.git
   git push -u origin main
   ```

   (Creá el repo vacío en GitHub antes de hacer el push.)

2. Entrá a [railway.app](https://railway.app), creá una cuenta y hacé **New Project → Deploy from GitHub Repo**. Elegí el repo `xv-agus`. Railway detecta Node solo por el `package.json`.

3. En **Variables**, agregá:

   | Variable | Valor |
   | --- | --- |
   | `ADMIN_PASSWORD` | la contraseña que elijas para el panel |
   | `TRUST_PROXY` | `1` |

   No hace falta definir `PORT`: Railway lo inyecta.

4. Generating **Networking → Generate Domain**. Te da una URL tipo `xv-agus-production.up.railway.app` con HTTPS. **Esa es la que mandás por WhatsApp.**

5. Verificá que ande: abrí la URL + `/admin`.

### Guardar las respuestas en forma permanente

Por defecto los datos viven en la carpeta `data/` del proyecto, que en Railway es temporal: si el servicio se reinicia o se redeploya, **se pierden las respuestas**.

Para que persistan:

1. En el proyecto, creá un **Volume** y montalo en `/data`.
2. Agregá la variable `DATA_DIR` con el valor `/data`.

El server usa `DATA_DIR` automáticamente si está definida (ver `server.js`). Con el volume montado, las confirmaciones y canciones sobreviven a cualquier reinicio.

### Comando de arranque

Ya está configurado en `railway.toml` (`npm start`). No lo cambies.

## Compartir por WhatsApp

En el pie de la invitación hay un botón **Compartir por WhatsApp**: abre WhatsApp con el mensaje ya escrito (invitación, fecha, lugar, horario, dress code y el link) para solo elegir a quién mandárselo. El otro botón, *Compartir invitación*, usa el menú nativo del teléfono y, si no existe, copia el link.

**Importante:** mandá el **link**, no la imagen de la invitación. Si mandás la imagen, los invitados no pueden confirmar asistencia ni sugerir canciones.

### Vista previa en WhatsApp

La imagen que se ve al compartir el link se genera desde `assets/og.svg`:

```bash
npm run build:og
```

Genera `public/og.png` (1200×630). Si cambiás el nombre, la fecha o el diseño de la invitación, editá `assets/og.svg`, corré el comando de nuevo y subí el PNG.

WhatsApp guarda en caché la vista previa de cada link. Si la actualizás, la imagen nueva puede tardar un rato en verse; probá con `https://api.whatsapp.com/v1/link/{LINK}` que muestra la previsualización sin caché.

## Publicar en otro hosting

Como es un proyecto Node, necesitás un hosting que corra Node: Railway, Render, Fly.io o una VPS. Los pasos son parecidos: comando `npm start`, variable `ADMIN_PASSWORD`, y un disco persistente para `data/`. No sirve GitHub Pages ni Netlify, porque no ejecutan el servidor Node.

## Estructura

```
server.js            API, persistencia JSON y acceso al panel
railway.toml         Configuración de deploy en Railway
assets/og.svg        Fuente de la imagen de vista previa
scripts/build-og.js  Genera public/og.png a partir de og.svg
public/
  index.html         Invitación
  styles.css         Estilos
  app.js             Cuenta regresiva, animaciones, formularios
  admin.html         Panel privado de Agustina
  admin.css
  admin.js
  og.png             Vista previa para WhatsApp (generada)
  favicon.svg
data/                Respuestas (se crea solo)
```