import fs from 'fs';
import path from 'path';

function createSvg(title, subtitle, tag, color1, color2, iconPath) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="30%" r="75%">
      <stop offset="0%" stop-color="${color1}" stop-opacity="0.85" />
      <stop offset="60%" stop-color="${color2}" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#08090B" stop-opacity="1" />
    </radialGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.7" />
    </linearGradient>
  </defs>

  <rect width="800" height="800" fill="#08090B" />
  <rect width="800" height="800" fill="url(#bgGlow)" />

  <!-- Vinyl Graphic -->
  <g transform="translate(400, 310)" opacity="0.95">
    <circle r="210" fill="#0D0E12" stroke="rgba(255,255,255,0.12)" stroke-width="2" />
    <circle r="190" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2" />
    <circle r="160" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="2" />
    <circle r="130" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2" />
    <circle r="90" fill="${color1}" fill-opacity="0.35" stroke="${color2}" stroke-width="3" />
    <circle r="30" fill="#0D0E12" />
    <circle r="8" fill="#ffffff" />
  </g>

  <!-- Bottom Details Glass Panel -->
  <rect x="40" y="520" width="720" height="230" rx="24" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />

  <!-- Badge Pill -->
  <rect x="70" y="555" width="160" height="32" rx="16" fill="${color1}" fill-opacity="0.2" stroke="${color1}" stroke-width="1" />
  <text x="150" y="576" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="800" fill="#ffffff" letter-spacing="2" text-anchor="middle">${tag}</text>

  <!-- Title Text -->
  <text x="70" y="635" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="900" fill="#ffffff" letter-spacing="-1">${title}</text>
  <text x="70" y="675" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="500" fill="rgba(255,255,255,0.7)">${subtitle}</text>
  <text x="70" y="715" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#1ED760" letter-spacing="1.5">SONORA CURATED &bull; 50 TRACKS</text>
</svg>`;
}

const covers = [
  {
    name: 'folk_beats',
    title: 'Telugu Folk & Beats',
    subtitle: 'Mangli, Ram Miriyala, Teenmaar & Village Rhythm',
    tag: 'FOLK & TEENMAAR',
    c1: '#F97316',
    c2: '#EF4444',
  },
  {
    name: 'classics_90s',
    title: '90s Telugu Golden Era',
    subtitle: 'SPB, Chithra, Ilaiyaraaja, Keeravani Classics',
    tag: '90s VINTAGE GEMS',
    c1: '#8B5CF6',
    c2: '#3B82F6',
  },
  {
    name: 'devotional_classics',
    title: 'Devotional & Spiritual',
    subtitle: 'Annamayya, Sri Ramadasu, Shirdi Sai Divine Melodies',
    tag: 'SACRED & CLASSICAL',
    c1: '#EAB308',
    c2: '#F59E0B',
  },
];

const outDir = path.resolve('public', 'covers');
for (const c of covers) {
  const svg = createSvg(c.title, c.subtitle, c.tag, c.c1, c.c2);
  fs.writeFileSync(path.join(outDir, `${c.name}.svg`), svg, 'utf-8');
  // Copy as fallback jpg path so any jpg reference loads gracefully
  fs.writeFileSync(path.join(outDir, `${c.name}.jpg`), svg, 'utf-8');
  console.log(`Created ${c.name}.svg and ${c.name}.jpg`);
}
