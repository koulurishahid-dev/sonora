import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DES_KEY = '38346591';

function decryptMediaUrl(encrypted) {
  try {
    const decipher = crypto.createDecipheriv('des-ecb', Buffer.from(DES_KEY, 'utf-8'), null);
    decipher.setAutoPadding(true);
    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted.trim();
  } catch (e) {
    return null;
  }
}

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/\(from\s+[^)]+\)/gi, '')
    .replace(/\(telugu\)/gi, '')
    .replace(/\[[^\]]+\]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// 10 Balanced Categories with targeted queries, aiming for ~50 songs per category (~500 total)
const CATEGORY_TARGETS = [
  {
    name: 'Hot Hits',
    target: 50,
    queries: [
      'Pushpa 2 The Rule telugu', 'Devara telugu', 'Guntur Kaaram telugu', 'Kalki 2898 AD telugu',
      'Tillu Square telugu', 'Salaar telugu', 'HanuMan telugu', 'Hi Nanna telugu',
      'Kushi telugu 2023', 'Baby telugu', 'Dasara telugu', 'Waltair Veerayya telugu',
      'Game Changer telugu', 'Saripodhaa Sanivaaram telugu', 'Lucky Baskhar telugu', 'Amaran telugu'
    ]
  },
  {
    name: 'Love Songs',
    target: 50,
    queries: [
      'Sita Ramam telugu', 'Geetha Govindam telugu', 'Jersey telugu', 'Majili telugu',
      'Dear Comrade telugu', 'Uppena telugu', 'Love Story telugu', 'Fidaa telugu',
      'Ninnu Kori telugu', 'Tholi Prema 2018 telugu', 'Orange telugu', 'Ye Maaya Chesave telugu',
      '100% Love telugu', 'Mr Perfect telugu', 'Anand telugu', 'Godavari telugu'
    ]
  },
  {
    name: 'Mass & Beats',
    target: 50,
    queries: [
      'RRR telugu', 'Pushpa The Rise telugu', 'Ala Vaikunthapurramuloo telugu', 'Sarileru Neekevvaru telugu',
      'iSmart Shankar telugu', 'Krack telugu', 'Dhamaka telugu', 'Rangasthalam telugu',
      'Janatha Garage telugu', 'Sarrainodu telugu', 'Race Gurram telugu', 'Mirchi telugu',
      'Gabbar Singh telugu', 'Dookudu telugu', 'Baahubali The Beginning telugu', 'Baahubali 2 The Conclusion telugu'
    ]
  },
  {
    name: 'Melodies',
    target: 50,
    queries: [
      'Shyam Singha Roy telugu', 'Sir telugu', 'Pelli Choopulu telugu', 'Sammohanam telugu',
      'Brochevarevarura telugu', 'Mahanati telugu', 'Colour Photo telugu', 'Ante Sundaraniki telugu',
      'Ee Nagaraniki Emaindi telugu', 'A Aa telugu', 'Srimanthudu telugu', 'Manam telugu',
      'Seethamma Vakitlo Sirimalle Chettu telugu', 'Leader telugu', 'Nuvvostanante Nenoddantana telugu'
    ]
  },
  {
    name: 'Golden Classics',
    target: 50,
    queries: [
      'Okkadu telugu', 'Varsham telugu', 'Arya telugu', 'Arya 2 telugu', 'Athadu telugu',
      'Pokiri telugu', 'Bommarillu telugu', 'Jalsa telugu', 'Magadheera telugu', 'Happy Days telugu',
      'Kotha Bangaru Lokam telugu', 'Chirutha telugu', 'Desamuduru telugu', 'Chatrapathi telugu',
      'Santosham telugu', 'Manmadhudu telugu', 'Kushi telugu 2001', 'Nuvvu Naaku Nachav telugu', 'Murari telugu'
    ]
  },
  {
    name: 'Sid Sriram',
    target: 50,
    queries: [
      'sid sriram telugu hits', 'sid sriram melodies telugu', 'sid sriram romantic songs telugu',
      'sid sriram top 10 telugu', 'sid sriram chartbusters telugu'
    ]
  },
  {
    name: 'Blockbusters',
    target: 50,
    queries: [
      'devi sri prasad hits telugu', 'thaman hits telugu', 'anirudh telugu hits',
      'keeravaani hits telugu', 'mani sharma hits telugu', 'mickey j meyer hits telugu', 'ar rahman telugu hits'
    ]
  },
  {
    name: 'Folk & Beats',
    target: 50,
    queries: [
      'mangli telugu folk hits', 'ram miriyala telugu songs', 'penchal das telugu folk',
      'telugu teenmaar dj songs', 'telangana folk songs telugu', 'jathi ratnalu telugu',
      'dj tillu telugu', 'saranga dariya folk telugu', 'bullet bandi telugu song'
    ]
  },
  {
    name: '90s Classics',
    target: 50,
    queries: [
      'shiva telugu songs', 'geetanjali telugu songs', 'kshana kshanam telugu', 'roja telugu songs',
      'bombay telugu songs', 'premikudu telugu songs', 'prema desam telugu', 'jeans telugu songs',
      'dalapathi telugu songs', 'gharana mogudu telugu', 'ninne pelladatha telugu', 'tholi prema 1998 telugu',
      'sp balu evergreen telugu hits', 'ks chithra golden telugu hits', 'ilaiyaraaja telugu evergreen'
    ]
  },
  {
    name: 'Devotional',
    target: 50,
    queries: [
      'annamayya songs telugu', 'sri ramadasu songs telugu', 'shirdi sai telugu songs',
      'om namo venkatesaya telugu', 'lord shiva songs telugu spb', 'venkateswara suprabhatam telugu',
      'jagadananda karaka telugu', 'sri rama rajyam telugu songs', 'brahmam okate telugu song'
    ]
  }
];

async function fetchQuery(query, count = 15) {
  try {
    const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&p=1&n=${count}&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (e) {
    return [];
  }
}

async function harvestBalanced() {
  console.log('=== STARTING BALANCED 500 TELUGU SONGS HARVEST ===');
  const seenNorm = new Set();
  const allSongs = [];

  for (const catDef of CATEGORY_TARGETS) {
    console.log(`\nHarvesting Genre: "${catDef.name}" (Goal: ${catDef.target} songs)...`);
    let catCount = 0;

    for (const q of catDef.queries) {
      if (catCount >= catDef.target) break;

      const results = await fetchQuery(q, 15);
      for (const raw of results) {
        if (catCount >= catDef.target) break;
        if (raw.language && raw.language.toLowerCase() !== 'telugu') continue;
        if (!raw.encrypted_media_url) continue;

        const title = cleanText(raw.song);
        const movie = cleanText(raw.album || raw.movie || 'Telugu Hits');
        const artists = cleanText(raw.primary_artists || raw.singers || raw.music || 'Telugu Artist');
        const normKey = `${normalizeTitle(title)}_${normalizeTitle(movie)}`;

        if (seenNorm.has(normKey)) continue;

        const dec = decryptMediaUrl(raw.encrypted_media_url);
        if (!dec) continue;

        const url320 = dec.replace(/_(96|160)\.mp4$/, '_320.mp4');
        const artwork = (raw.image || '').replace('150x150', '500x500');
        const duration = parseInt(raw.duration, 10) || 240;
        const year = parseInt(raw.year, 10) || 2024;

        seenNorm.add(normKey);
        allSongs.push({
          id: `telugu_${allSongs.length + 1}_${normalizeTitle(title).slice(0, 20)}`,
          title,
          artist: artists,
          movie,
          album: movie,
          year,
          category: catDef.name,
          genre: catDef.name,
          duration,
          sourceUrl: url320,
          artworkUrl: artwork,
        });

        catCount++;
      }

      await new Promise(r => setTimeout(r, 60));
    }

    console.log(`  -> Finished "${catDef.name}": ${catCount} songs gathered`);
  }

  console.log(`\n===========================================`);
  console.log(`TOTAL SONGS GATHERED: ${allSongs.length}`);
  console.log(`===========================================`);

  // Breakdown
  const breakdown = {};
  for (const s of allSongs) {
    breakdown[s.category] = (breakdown[s.category] || 0) + 1;
  }
  for (const [c, n] of Object.entries(breakdown)) {
    console.log(` - ${c}: ${n} songs`);
  }

  // Save to public/data/telugu_500_songs.json
  const outDir = path.resolve('public', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'telugu_500_songs.json'), JSON.stringify(allSongs, null, 2), 'utf-8');

  // Also generate TypeScript module in src/lib/telugu500Data.ts so it can be imported directly
  const tsContent = `// Auto-generated 500 Telugu Songs Dataset across 10 Categories
export interface TeluguSongRecord {
  id: string;
  title: string;
  artist: string;
  movie: string;
  album: string;
  year: number;
  category: string;
  genre: string;
  duration: number;
  sourceUrl: string;
  artworkUrl: string;
}

export const TELUGU_500_SONGS: TeluguSongRecord[] = ${JSON.stringify(allSongs, null, 2)};
`;
  fs.writeFileSync(path.resolve('src', 'lib', 'telugu500Data.ts'), tsContent, 'utf-8');
  console.log('Saved TypeScript file to src/lib/telugu500Data.ts');
}

harvestBalanced();
