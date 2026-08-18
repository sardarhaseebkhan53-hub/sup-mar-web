/**
 * QAVLIO PWA icon generator.
 *
 * Renders the official brand app-icon SVG to the PNG sizes required by the
 * Web App Manifest, Apple touch icon and favicons. Run with:
 *
 *   npm run icons
 *
 * Icons are static build artifacts committed to frontend/public/icons so the
 * app builds and serves without needing sharp at deploy time.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(__dirname, '../src/assets/brand/qavlio-app-icon.svg');
const outDir = path.resolve(__dirname, '../public/icons');

const targets = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-maskable-192.png', size: 192 },
  { name: 'icon-maskable-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
];

await mkdir(outDir, { recursive: true });

for (const { name, size } of targets) {
  const out = path.join(outDir, name);
  // For maskable icons, expand the safe-zone canvas to the full square.
  const isMaskable = name.includes('maskable');
  const icon = sharp(source);
  const sized = isMaskable ? icon.resize(size, size, { fit: 'cover' }) : icon.resize(size, size);
  await sized.png().toFile(out);
  console.log(`✓ generated ${name}`);
}
