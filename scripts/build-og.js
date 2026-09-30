'use strict';

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const source = path.join(root, 'assets', 'og.svg');
const target = path.join(root, 'public', 'og.png');

sharp(fs.readFileSync(source), { density: 144 })
  .resize(1200, 630, { fit: 'cover' })
  .png({ quality: 92, compressionLevel: 9 })
  .toFile(target)
  .then(() => {
    const { size } = fs.statSync(target);
    console.log(`og.png generado (${(size / 1024).toFixed(1)} KB)`);
  })
  .catch((error) => {
    console.error('No se pudo generar og.png:', error.message);
    process.exit(1);
  });