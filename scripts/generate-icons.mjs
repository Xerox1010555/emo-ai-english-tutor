/**
 * Generates the app icons and the favicon.
 *
 * The mark: a rounded "speech bubble" tile in the brand gradient, holding a
 * clean letter E whose middle arm is shorter — a small detail that makes the
 * shape read as a monogram rather than a font glyph. Everything is drawn
 * programmatically so the icon always matches the brand colours and the
 * repository carries no binary art.
 *
 * Run with: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(here, '..', 'public', 'icons');
const publicDir = join(here, '..', 'public');
mkdirSync(iconsDir, { recursive: true });

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

const BRAND_A = [248, 113, 113]; // primary-400
const BRAND_B = [220, 38, 38]; // primary-600
const ACCENT = [96, 165, 250]; // accent-400

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

/** The letter E, drawn as three bars and a spine. */
function inE(x, y, size) {
  const u = size / 16;
  const left = 5.2 * u;
  const right = 10.8 * u;
  const top = 4.4 * u;
  const bottom = 11.6 * u;
  const bar = 1.55 * u;
  const mid = (top + bottom) / 2;

  const inBox = (x0, y0, x1, y1) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

  if (inBox(left, top, left + bar, bottom)) return true; // spine
  if (inBox(left, top, right, top + bar)) return true; // top arm
  if (inBox(left, mid - bar / 2, right - 1.1 * u, mid + bar / 2)) return true; // middle arm
  if (inBox(left, bottom - bar, right, bottom)) return true; // bottom arm
  return false;
}

function makeIcon(size, { maskable = false } = {}) {
  const radius = maskable ? size / 2 : size * 0.235;
  const inset = maskable ? size * 0.115 : size * 0.075;
  const tail = maskable ? 0 : size * 0.13;

  return png(size, (x, y) => {
    const d = roundedRect(x, y, size, radius, inset);
    if (d > 0) {
      // The speech-bubble tail, only on the non-maskable icon.
      if (!maskable && tail > 0) {
        const tx = size * 0.34;
        const ty = size * 0.86;
        const inTail =
          y > ty - size * 0.1 && y < ty + size * 0.05 && x > tx && x < tx + size * 0.16 - (y - ty) * 1.4;
        if (inTail) {
          const t = (y - ty) / (size * 0.15);
          const c = [
            BRAND_A[0] * (1 - t) + BRAND_B[0] * t,
            BRAND_A[1] * (1 - t) + BRAND_B[1] * t,
            BRAND_A[2] * (1 - t) + BRAND_B[2] * t,
          ];
          return [Math.round(c[0]), Math.round(c[1]), Math.round(c[2]), 255];
        }
      }
      return [0, 0, 0, 0];
    }

    // Brand gradient with a cool accent in the lower right.
    const t = Math.min(1, Math.max(0, (x / size) * 0.65 + (y / size) * 0.35));
    const r = Math.round(BRAND_A[0] * (1 - t) + BRAND_B[0] * t);
    const g = Math.round(BRAND_A[1] * (1 - t) + BRAND_B[1] * t);
    const b = Math.round(BRAND_A[2] * (1 - t) + BRAND_B[2] * t);

    // Glass highlight from the top left.
    const gloss = Math.max(0, 0.26 - ((x + y) / size) * 0.26);
    const base = [
      Math.min(255, r + gloss * 255),
      Math.min(255, g + gloss * 255),
      Math.min(255, b + gloss * 255),
    ];

    if (inE(x, y, size)) {
      return [255, 255, 255, 255];
    }

    // A faint accent glow in the lower-right corner.
    const dx = x - size * 0.78;
    const dy = y - size * 0.78;
    const glow = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / (size * 0.45));
    return [
      Math.round(base[0] * (1 - glow * 0.45) + ACCENT[0] * glow * 0.45),
      Math.round(base[1] * (1 - glow * 0.45) + ACCENT[1] * glow * 0.45),
      Math.round(base[2] * (1 - glow * 0.45) + ACCENT[2] * glow * 0.45),
      255,
    ];
  });
}

const targets = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['icon-maskable-512.png', 512, { maskable: true }],
  ['badge-72.png', 72, {}],
  ['apple-touch-icon.png', 180, {}],
];

for (const [name, size, options] of targets) {
  const file = join(iconsDir, name);
  writeFileSync(file, makeIcon(size, options));
  console.log('wrote', file);
}

// The favicon is a small SVG of the same mark.
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f87171"/>
      <stop offset="1" stop-color="#dc2626"/>
    </linearGradient>
  </defs>
  <rect x="4" y="4" width="56" height="56" rx="15" fill="url(#g)"/>
  <path d="M21 17h22v6H27v6h13v6H27v12h-6z" fill="#fff"/>
</svg>
`;
writeFileSync(join(publicDir, 'favicon.svg'), favicon);
console.log('wrote', join(publicDir, 'favicon.svg'));
