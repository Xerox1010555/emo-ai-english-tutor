/**
 * Generates the PWA icons.
 *
 * The mark is drawn programmatically (a rounded glass tile with a gradient
 * "E"), so the repository never needs binary art and the icon always matches
 * the brand colours. Run with: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const BRAND = [
  [239, 68, 68], // primary-500
  [59, 130, 246], // accent-500
];
const INK = [12, 12, 24];

/** CRC32 for PNG chunks. */
function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n += 1) {
    c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y += 1) {
    raw[offset] = 0; // filter: none
    offset += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x, y, size);
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
      offset += 4;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Signed distance to a rounded rectangle. */
function roundedRect(x, y, size, radius, inset) {
  const min = inset;
  const max = size - inset;
  const cx = Math.min(Math.max(x, min + radius), max - radius);
  const cy = Math.min(Math.max(y, min + radius), max - radius);
  const dx = x - cx;
  const dy = y - cy;
  return Math.sqrt(dx * dx + dy * dy) - radius;
}

/** The "E" mark, drawn as three bars plus a spine. */
function inE(x, y, size) {
  const u = size / 16; // unit
  const left = 5 * u;
  const right = 11 * u;
  const top = 4 * u;
  const bottom = 12 * u;
  const bar = 1.6 * u;

  const inBox = (x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

  // spine
  if (inBox(left, top, left + bar, bottom)) return true;
  // top bar
  if (inBox(left, top, right, top + bar)) return true;
  // middle bar
  if (inBox(left, (top + bottom) / 2 - bar / 2, right - u, (top + bottom) / 2 + bar / 2)) return true;
  // bottom bar
  if (inBox(left, bottom - bar, right, bottom)) return true;
  return false;
}

function makeIcon(size, { maskable = false } = {}) {
  const radius = maskable ? size / 2 : size * 0.22;
  const inset = maskable ? size * 0.1 : size * 0.06;

  return png(size, (x, y) => {
    const d = roundedRect(x, y, size, radius, inset);
    if (d > 0) return [0, 0, 0, 0]; // outside the tile

    // Brand gradient from top-left (primary) to bottom-right (accent).
    const t = (x / size) * 0.6 + (y / size) * 0.4;
    const r = Math.round(BRAND[0][0] * (1 - t) + BRAND[1][0] * t);
    const g = Math.round(BRAND[0][1] * (1 - t) + BRAND[1][1] * t);
    const b = Math.round(BRAND[0][2] * (1 - t) + BRAND[1][2] * t);

    // Inner glass: a soft light from the top-left.
    const gloss = Math.max(0, 0.22 - ((x + y) / size) * 0.22);
    const base = [
      Math.min(255, r + gloss * 255),
      Math.min(255, g + gloss * 255),
      Math.min(255, b + gloss * 255),
    ];

    if (inE(x, y, size)) {
      return [255, 255, 255, 255];
    }

    return [Math.round(base[0]), Math.round(base[1]), Math.round(base[2]), 255];
  });
}

const targets = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['badge-72.png', 72, {}],
];

for (const [name, size, options] of targets) {
  const file = join(outDir, name);
  writeFileSync(file, makeIcon(size, options));
  console.log('wrote', file);
}
