#!/usr/bin/env node
/**
 * Generates branded SVG placeholder product images into apps/web/public/images/.
 * All seed image paths are /images/<name>.svg, so this must run before `astro dev/build`.
 * Run: npm run images:generate
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'apps/web/public/images');
mkdirSync(OUT, { recursive: true });

const COLORS = {
  ocean: '#0E7C7B',
  glacier: '#4FA3D9',
  sand: '#D9C7A7',
  charcoal: '#37424C',
  rose: '#C98A8E',
  moss: '#7C9A6D',
  teal: '#0E7C7B',
};

// shape templates per product kind; {c} = color hex
const KINDS = {
  bottle: (c) => `
    <g transform="translate(300 80)">
      <rect x="0" y="60" width="200" height="520" rx="70" fill="${c}"/>
      <rect x="0" y="60" width="200" height="520" rx="70" fill="url(#shade)"/>
      <rect x="62" y="-10" width="76" height="86" rx="26" fill="#20323b"/>
      <rect x="70" y="0" width="60" height="14" rx="7" fill="#31485242"/>
      <rect x="26" y="150" width="148" height="300" rx="50" fill="#ffffff" opacity="0.14"/>
      <rect x="40" y="300" width="120" height="6" rx="3" fill="#ffffff" opacity="0.5"/>
      <text x="100" y="430" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="30" fill="#ffffff" opacity="0.9">PureSip</text>
    </g>`,
  mini: (c) => `
    <g transform="translate(310 160)">
      <rect x="0" y="40" width="180" height="400" rx="64" fill="${c}"/>
      <rect x="0" y="40" width="180" height="400" rx="64" fill="url(#shade)"/>
      <rect x="56" y="-8" width="68" height="64" rx="22" fill="#20323b"/>
      <rect x="22" y="120" width="136" height="220" rx="44" fill="#ffffff" opacity="0.14"/>
      <text x="90" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="26" fill="#ffffff" opacity="0.9">PureSip</text>
    </g>`,
  tumbler: (c) => `
    <g transform="translate(300 120)">
      <path d="M10 40 L190 40 L172 560 Q170 600 130 600 L70 600 Q30 600 28 560 Z" fill="${c}"/>
      <path d="M10 40 L190 40 L172 560 Q170 600 130 600 L70 600 Q30 600 28 560 Z" fill="url(#shade)"/>
      <rect x="52" y="0" width="96" height="52" rx="18" fill="#20323b"/>
      <rect x="84" y="10" width="32" height="8" rx="4" fill="#ffffff" opacity="0.35"/>
      <rect x="30" y="110" width="140" height="300" rx="46" fill="#ffffff" opacity="0.13"/>
      <text x="100" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="28" fill="#ffffff" opacity="0.9">PureSip</text>
    </g>`,
  straw: (c) => `
    <g transform="translate(280 170)">
      <ellipse cx="100" cy="120" rx="170" ry="70" fill="${c}"/>
      <ellipse cx="100" cy="104" rx="170" ry="66" fill="#ffffff" opacity="0.18"/>
      <ellipse cx="100" cy="112" rx="120" ry="40" fill="#20323b"/>
      <rect x="150" y="-70" width="26" height="220" rx="13" fill="${c}" transform="rotate(18 163 40)"/>
      <text x="100" y="230" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="30" fill="#ffffff" opacity="0.85">Straw Lid</text>
    </g>`,
  loop: (c) => `
    <g transform="translate(280 150)">
      <circle cx="200" cy="180" r="130" fill="none" stroke="${c}" stroke-width="56"/>
      <circle cx="200" cy="180" r="130" fill="none" stroke="#ffffff" stroke-width="10" opacity="0.15"/>
      <rect x="60" y="290" width="280" height="70" rx="35" fill="#20323b"/>
      <text x="200" y="336" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="26" fill="#ffffff" opacity="0.85">Carry Loop</text>
    </g>`,
  brush: (c) => `
    <g transform="translate(240 130)">
      <rect x="40" y="0" width="30" height="360" rx="15" fill="#20323b"/>
      <rect x="28" y="340" width="54" height="130" rx="27" fill="${c}"/>
      <rect x="130" y="60" width="26" height="290" rx="13" fill="#20323b"/>
      <rect x="122" y="330" width="42" height="100" rx="21" fill="${c}"/>
      <rect x="210" y="110" width="22" height="230" rx="11" fill="#20323b"/>
      <rect x="204" y="320" width="34" height="80" rx="17" fill="${c}"/>
      <text x="150" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="28" fill="#ffffff" opacity="0.85">Brush Kit</text>
    </g>`,
  cap: (c) => `
    <g transform="translate(280 170)">
      <ellipse cx="120" cy="120" rx="160" ry="66" fill="${c}"/>
      <ellipse cx="120" cy="106" rx="160" ry="62" fill="#ffffff" opacity="0.18"/>
      <ellipse cx="120" cy="114" rx="110" ry="38" fill="#20323b"/>
      <path d="M170 60 Q230 -30 290 10" stroke="${c}" stroke-width="30" fill="none" stroke-linecap="round"/>
      <text x="120" y="230" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="30" fill="#ffffff" opacity="0.85">Sports Cap</text>
    </g>`,
};

function svgFor(kind, hex, shadeStop = '#00000055') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#F2F8F8"/>
      <stop offset="1" stop-color="#DDEEEE"/>
    </linearGradient>
    <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="1" stop-color="${shadeStop}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <circle cx="650" cy="130" r="90" fill="#0E7C7B" opacity="0.10"/>
  <circle cx="120" cy="660" r="130" fill="#36B3AE" opacity="0.08"/>
  ${KINDS[kind](hex)}
</svg>\n`;
}

// Map: image filename → [kind, colorKey]
const specs = [];
const bottleColors = ['ocean', 'glacier', 'sand', 'charcoal', 'rose', 'moss'];
const bottleSizes = [
  ['bottle-500', 'bottle'],
  ['bottle-750', 'bottle'],
  ['mini-350', 'mini'],
  ['tumbler-400', 'tumbler'],
];
for (const [prefix, kind] of bottleSizes) {
  for (const color of bottleColors) {
    for (let i = 1; i <= 3; i++) specs.push([`${prefix}-${color}-${i}`, kind, color]);
  }
}
const accColors = { 'straw-lid': ['teal', 'charcoal', 'glacier'], 'carry-loop': ['teal', 'charcoal', 'rose'], 'brush-kit': ['teal', 'charcoal', 'glacier'], 'sports-cap': ['teal', 'charcoal', 'sand'] };
for (const [prefix, colors] of Object.entries(accColors)) {
  for (const color of colors) {
    for (let i = 1; i <= 2; i++) specs.push([`${prefix}-${color}-${i}`, prefix.replace('straw-lid', 'straw').replace('carry-loop', 'loop').replace('brush-kit', 'brush').replace('sports-cap', 'cap'), color]);
  }
}

let count = 0;
for (const [name, kind, color] of specs) {
  const hex = COLORS[color] ?? '#0E7C7B';
  writeFileSync(join(OUT, `${name}.svg`), svgFor(kind, hex));
  count += 1;
}
console.log(`Generated ${count} product images in apps/web/public/images/`);
