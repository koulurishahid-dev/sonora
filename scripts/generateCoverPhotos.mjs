import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public/covers');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const CATEGORIES = [
  {
    fileName: 'hot_hits_telugu.svg',
    title: 'HOT HITS TELUGU',
    tagline: 'TRENDING 2024 CHARTBUSTERS',
    color1: '#FF5E00',
    color2: '#FFB800',
    color3: '#1E120A',
    badge: 'TOP 50',
    accent: '#1ED760',
    iconType: 'flame',
  },
  {
    fileName: 'telugu_romance.svg',
    title: 'TELUGU ROMANCE',
    tagline: 'SOULFUL LOVE ANTHEMS & DUETS',
    color1: '#E11D48',
    color2: '#FB7185',
    color3: '#1C0B12',
    badge: 'ROMANCE',
    accent: '#FDA4AF',
    iconType: 'heart',
  },
  {
    fileName: 'soulful_melodies.svg',
    title: 'SOULFUL MELODIES',
    tagline: 'ACOUSTIC UNPLUGGED & LATE NIGHTS',
    color1: '#059669',
    color2: '#10B981',
    color3: '#041B14',
    badge: 'ACOUSTIC',
    accent: '#34D399',
    iconType: 'melody',
  },
  {
    fileName: 'mass_party_beats.svg',
    title: 'MASS & PARTY BEATS',
    tagline: 'THUMPING DRUMS & DANCE HITS',
    color1: '#7C3AED',
    color2: '#C084FC',
    color3: '#140A26',
    badge: 'MASS MASALA',
    accent: '#F43F5E',
    iconType: 'speaker',
  },
  {
    fileName: 'golden_classics.svg',
    title: '2000s GOLDEN NOSTALGIA',
    tagline: 'ALL-TIME TELUGU NOSTALGIC GEMS',
    color1: '#D97706',
    color2: '#FBBF24',
    color3: '#221405',
    badge: 'CLASSICS',
    accent: '#FDE68A',
    iconType: 'cassette',
  },
  {
    fileName: 'sid_sriram_essentials.svg',
    title: 'SID SRIRAM ESSENTIALS',
    tagline: 'EVERY ICONIC CHARTBUSTER ON REPEAT',
    color1: '#0284C7',
    color2: '#38BDF8',
    color3: '#061726',
    badge: 'VOCALIST',
    accent: '#7DD3FC',
    iconType: 'mic',
  },
  {
    fileName: 'blockbuster_hits.svg',
    title: 'BLOCKBUSTER BEATS',
    tagline: 'DSP • THAMAN S • ANIRUDH ANTHEMS',
    color1: '#EA580C',
    color2: '#F97316',
    color3: '#1E0E06',
    badge: 'COMPOSERS',
    accent: '#FDBA74',
    iconType: 'disc',
  },
];

function generateSvgCover(cat) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <defs>
    <!-- Background Linear & Radial Gradients -->
    <radialGradient id="bgGlow" cx="50%" cy="30%" r="75%">
      <stop offset="0%" stop-color="${cat.color1}" stop-opacity="0.85" />
      <stop offset="55%" stop-color="${cat.color2}" stop-opacity="0.2" />
      <stop offset="100%" stop-color="${cat.color3}" stop-opacity="1" />
    </radialGradient>
    
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.6" />
    </linearGradient>

    <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="${cat.accent}" />
    </linearGradient>

    <!-- Vinyl Disc Grooves Mask & Texture -->
    <filter id="vinylGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="30" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Base Solid Background -->
  <rect width="800" height="800" fill="${cat.color3}" />

  <!-- Atmospheric Radial Burst -->
  <rect width="800" height="800" fill="url(#bgGlow)" />

  <!-- Vinyl Record Graphic Element (Upper Center) -->
  <g transform="translate(400, 310)" opacity="0.95">
    <!-- Vinyl Outer Shadow -->
    <circle r="220" fill="#08090B" filter="url(#vinylGlow)" opacity="0.5" />
    <circle r="210" fill="#0D0E12" stroke="rgba(255,255,255,0.12)" stroke-width="1.5" />
    
    <!-- Concentric Grooves -->
    <circle r="195" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="2" />
    <circle r="180" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1.5" />
    <circle r="165" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="2" />
    <circle r="150" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1.5" />
    <circle r="135" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="2" />
    <circle r="120" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1.5" />
    <circle r="105" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2" />

    <!-- Vinyl Center Label -->
    <circle r="80" fill="${cat.color1}" stroke="#000000" stroke-width="4" />
    <circle r="74" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1" />
    
    <!-- Center Label Text -->
    <text text-anchor="middle" y="-12" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="14" fill="#000000" letter-spacing="3">SONORA</text>
    <text text-anchor="middle" y="8" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="800" font-size="10" fill="#000000" letter-spacing="2">TELUGU</text>
    <text text-anchor="middle" y="24" font-family="monospace" font-size="9" fill="rgba(0,0,0,0.7)">320 KBPS</text>
    
    <!-- Spindle Hole -->
    <circle r="12" fill="#08090B" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" />
  </g>

  <!-- Top Navigation Badges -->
  <g transform="translate(60, 60)">
    <!-- Spotify Green Pill -->
    <rect width="130" height="34" rx="17" fill="#000000" stroke="#1ED760" stroke-width="1.5" opacity="0.9" />
    <!-- Spotify Icon Mini -->
    <path transform="translate(14, 8) scale(0.75)" fill="#1ED760" d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.495 17.306c-.216.353-.674.464-1.026.25-2.812-1.718-6.353-2.106-10.523-1.154-.403.092-.803-.16-.895-.563-.092-.403.16-.803.563-.895 4.567-1.042 8.49-.602 11.63 1.336.353.216.464.674.251 1.026zm1.467-3.262c-.272.441-.852.58-1.293.308-3.22-1.979-8.127-2.551-11.935-1.395-.497.151-1.029-.136-1.18-.633-.151-.497.136-1.029.633-1.18 4.356-1.322 9.776-.682 13.467 1.587.441.272.58.852.308 1.293zm.126-3.41c-3.86-2.292-10.228-2.503-13.896-1.389-.592.18-1.226-.154-1.406-.746-.18-.592.154-1.226.746-1.406 4.218-1.281 11.253-1.034 15.696 1.603.533.316.708 1.011.392 1.544-.316.533-1.011.708-1.532.394z" />
    <text x="44" y="22" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="12" fill="#FFFFFF" letter-spacing="1">SPOTIFY</text>
  </g>

  <!-- Category Tag Right Badge -->
  <g transform="translate(620, 60)">
    <rect width="120" height="34" rx="17" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
    <text x="60" y="21" text-anchor="middle" font-family="monospace" font-weight="700" font-size="11" fill="${cat.accent}" letter-spacing="1">${cat.badge}</text>
  </g>

  <!-- Soundwave Graphic Across Middle -->
  <g transform="translate(80, 510)" opacity="0.4">
    <rect x="0" y="20" width="6" height="40" rx="3" fill="#ffffff" />
    <rect x="14" y="10" width="6" height="60" rx="3" fill="#ffffff" />
    <rect x="28" y="25" width="6" height="30" rx="3" fill="#ffffff" />
    <rect x="42" y="5" width="6" height="70" rx="3" fill="#ffffff" />
    <rect x="56" y="15" width="6" height="50" rx="3" fill="#ffffff" />
    <rect x="70" y="30" width="6" height="20" rx="3" fill="#ffffff" />
    <rect x="84" y="8" width="6" height="65" rx="3" fill="#ffffff" />
    <rect x="98" y="22" width="6" height="36" rx="3" fill="#ffffff" />
    <rect x="112" y="3" width="6" height="74" rx="3" fill="#ffffff" />
    <rect x="126" y="18" width="6" height="45" rx="3" fill="#ffffff" />
    <rect x="140" y="28" width="6" height="25" rx="3" fill="#ffffff" />
    <rect x="154" y="12" width="6" height="58" rx="3" fill="#ffffff" />
    <rect x="168" y="0" width="6" height="80" rx="3" fill="#ffffff" />
    <rect x="182" y="20" width="6" height="40" rx="3" fill="#ffffff" />
    <rect x="196" y="10" width="6" height="60" rx="3" fill="#ffffff" />
    <rect x="210" y="25" width="6" height="30" rx="3" fill="#ffffff" />
    <rect x="224" y="5" width="6" height="70" rx="3" fill="#ffffff" />
    <rect x="238" y="15" width="6" height="50" rx="3" fill="#ffffff" />
    <rect x="252" y="30" width="6" height="20" rx="3" fill="#ffffff" />
    <rect x="266" y="8" width="6" height="65" rx="3" fill="#ffffff" />
    <rect x="280" y="22" width="6" height="36" rx="3" fill="#ffffff" />
    <rect x="294" y="3" width="6" height="74" rx="3" fill="#ffffff" />
    <rect x="308" y="18" width="6" height="45" rx="3" fill="#ffffff" />
    <rect x="322" y="28" width="6" height="25" rx="3" fill="#ffffff" />
    <rect x="336" y="12" width="6" height="58" rx="3" fill="#ffffff" />
    <rect x="350" y="0" width="6" height="80" rx="3" fill="#ffffff" />
    <rect x="364" y="20" width="6" height="40" rx="3" fill="#ffffff" />
    <rect x="378" y="10" width="6" height="60" rx="3" fill="#ffffff" />
    <rect x="392" y="25" width="6" height="30" rx="3" fill="#ffffff" />
    <rect x="406" y="5" width="6" height="70" rx="3" fill="#ffffff" />
    <rect x="420" y="15" width="6" height="50" rx="3" fill="#ffffff" />
    <rect x="434" y="30" width="6" height="20" rx="3" fill="#ffffff" />
    <rect x="448" y="8" width="6" height="65" rx="3" fill="#ffffff" />
    <rect x="462" y="22" width="6" height="36" rx="3" fill="#ffffff" />
    <rect x="476" y="3" width="6" height="74" rx="3" fill="#ffffff" />
    <rect x="490" y="18" width="6" height="45" rx="3" fill="#ffffff" />
    <rect x="504" y="28" width="6" height="25" rx="3" fill="#ffffff" />
    <rect x="518" y="12" width="6" height="58" rx="3" fill="#ffffff" />
    <rect x="532" y="0" width="6" height="80" rx="3" fill="#ffffff" />
    <rect x="546" y="20" width="6" height="40" rx="3" fill="#ffffff" />
    <rect x="560" y="10" width="6" height="60" rx="3" fill="#ffffff" />
    <rect x="574" y="25" width="6" height="30" rx="3" fill="#ffffff" />
    <rect x="588" y="5" width="6" height="70" rx="3" fill="#ffffff" />
    <rect x="602" y="15" width="6" height="50" rx="3" fill="#ffffff" />
    <rect x="616" y="30" width="6" height="20" rx="3" fill="#ffffff" />
    <rect x="630" y="8" width="6" height="65" rx="3" fill="#ffffff" />
  </g>

  <!-- Bottom Lower Third Glass Card for Typography -->
  <g transform="translate(60, 560)">
    <!-- Glass Backdrop -->
    <rect width="680" height="180" rx="24" fill="url(#cardGrad)" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" />
    
    <!-- Title -->
    <text x="40" y="65" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="900" font-size="38" fill="url(#textGrad)" letter-spacing="1">
      ${cat.title}
    </text>

    <!-- Subtitle / Tagline -->
    <text x="40" y="105" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="700" font-size="16" fill="rgba(255,255,255,0.7)" letter-spacing="2">
      ${cat.tagline}
    </text>

    <!-- Bottom Metadata Row -->
    <g transform="translate(40, 135)">
      <circle cx="6" cy="6" r="4" fill="#1ED760" />
      <text x="20" y="10" font-family="monospace" font-weight="700" font-size="12" fill="#FFFFFF" letter-spacing="1">ORIGINAL MASTER</text>
      
      <circle cx="170" cy="6" r="3" fill="rgba(255,255,255,0.4)" />
      <text x="185" y="10" font-family="monospace" font-weight="700" font-size="12" fill="rgba(255,255,255,0.6)" letter-spacing="1">320 KBPS HI-FI</text>

      <circle cx="320" cy="6" r="3" fill="rgba(255,255,255,0.4)" />
      <text x="335" y="10" font-family="monospace" font-weight="700" font-size="12" fill="${cat.accent}" letter-spacing="1">TELUGU STUDIO</text>
    </g>
  </g>
</svg>`;
}

for (const cat of CATEGORIES) {
  const svg = generateSvgCover(cat);
  const filePath = path.join(outDir, cat.fileName);
  fs.writeFileSync(filePath, svg.trim(), 'utf-8');
  console.log(`Generated: ${cat.fileName}`);
}

console.log('All cover photos generated successfully in public/covers/');
