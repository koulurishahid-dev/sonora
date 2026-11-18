// harvestMoreLove.mjs — Harvest 50 additional authentic Telugu love songs to reach 150+
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';

const DES_KEY = Buffer.from('38346591');

function decryptUrl(encUrl) {
  try {
    const decipher = crypto.createDecipheriv('des-ecb', DES_KEY, null);
    decipher.setAutoPadding(true);
    let dec = decipher.update(encUrl, 'base64', 'utf8');
    dec += decipher.final('utf8');
    return dec.replace(/_96\.mp4|_160\.mp4/, '_320.mp4');
  } catch { return ''; }
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function searchSongs(query, n = 8) {
  const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&p=1&n=${n}&q=${encodeURIComponent(query)}`;
  try {
    const raw = await fetch(url);
    const data = JSON.parse(raw);
    return data.results || [];
  } catch { return []; }
}

function normTitle(t) {
  return (t || '').toLowerCase()
    .replace(/\(from\s+"[^"]*"\)/gi, '')
    .replace(/\(from\s+[^)]*\)/gi, '')
    .replace(/\(telugu\)/gi, '')
    .replace(/[^a-z0-9]/g, '');
}

function htmlDecode(s) {
  return (s || '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;/g, "'");
}

// 60 Additional well-known Telugu romantic songs
const MORE_LOVE_QUERIES = [
  // Blockbuster Romance Tracks
  ['Kumkumala Brahmastra Telugu', 'kumkumala', 'Brahmastra'],
  ['Inkaem Inkaem Geetha Govindam', 'inkem', 'Geetha Govindam'],
  ['Undiporaadhey Hushaaru', 'undiporaadhey', 'Hushaaru'],
  ['Choosi Choodangaane Chalo', 'choosi choodangaane', 'Chalo'],
  ['Evaree Ammayi Chalo', 'evaree ammayi', 'Chalo'],
  ['Vintunnavaa Ye Maaya Chesave', 'vintunnavaa', 'Ye Maaya Chesave'],
  ['Aaromale Ye Maaya Chesave', 'aaromale', 'Ye Maaya Chesave'],
  ['Hosanna Ye Maaya Chesave', 'hosanna', 'Ye Maaya Chesave'],
  ['Manasaa Manasaa Most Eligible Bachelor', 'manasaa', 'Most Eligible Bachelor'],
  ['Chitti Jathi Ratnalu', 'chitti', 'Jathi Ratnalu'],
  ['Nuvvunte Naa Jathaga I Telugu', 'nuvvunte', 'I (Telugu)'],
  ['Poolane Kunukeyamantaa I Telugu', 'poolane', 'I (Telugu)'],
  ['Chali Chali Ga Mr Perfect', 'chali chali', 'Mr Perfect'],
  ['Nee Dookudu Dookudu', 'nee dookudu', 'Dookudu'],
  ['Gopikamma Mukunda', 'gopikamma', 'Mukunda'],
  ['Adiga Adiga Ninnu Kori Sid Sriram', 'adiga', 'Ninnu Kori'],
  ['Chinnadana Neekosam Ishq', 'chinnadana', 'Ishq'],
  ['Priya Priyathama Killer', 'priya priyathama', 'Killer'],
  ['Nuvve Nuvve Kavalantundi Nuvve Nuvve', 'nuvve nuvve', 'Nuvve Nuvve'],
  ['Naa Manasune Nuvve Nuvve', 'naa manasune', 'Nuvve Nuvve'],
  ['Anaganaga Oka Ooru Nuvve Nuvve', 'anaganaga', 'Nuvve Nuvve'],
  ['Nammaka Tappani Bommarillu', 'nammaka', 'Bommarillu'],
  ['Bommani Geesthe Bommarillu', 'bommani', 'Bommarillu'],
  ['We Have A Romeo Bommarillu', 'romeo', 'Bommarillu'],
  ['Subhalekha Rasukunna Kondaveeti Donga', 'subhalekha', 'Kondaveeti Donga'],
  ['Yamaho Yama Jagadeka Veerudu', 'yamaho', 'Jagadeka Veerudu'],
  ['Priyathama Naa Hrudayama Prema', 'priyathama naa hrudayama', 'Prema'],
  ['O Papa Laali Geetanjali', 'o papa laali', 'Geetanjali'],
  ['Aamani Koyila Geetanjali', 'aamani koyila', 'Geetanjali'],
  ['Jallantha Kavvinta Geetanjali', 'jallantha', 'Geetanjali'],
  ['Om Namaha Geetanjali', 'om namaha', 'Geetanjali'],
  ['Jagada Jagada Geetanjali', 'jagada jagada', 'Geetanjali'],
  ['Nandikonda Vaagullo Telugu', 'nandikonda', 'Love Songs'],
  ['Nee Selavadigi Chakram', 'nee selavadigi', 'Chakram'],
  ['Prema Prema Premadesam', 'prema prema', 'Premadesam'],
  ['Mustafa Mustafa Premadesam', 'mustafa', 'Premadesam'],
  ['Vennela Vennela Premadesam', 'vennela', 'Premadesam'],
  ['Kallaloki Kallu Petti Telugu', 'kallaloki', 'Telugu Romance'],
  ['Gundello Emundo Manasantha Nuvve', 'gundello', 'Manasantha Nuvve'],
  ['Cheppave Chirugaali Okkadu', 'cheppave', 'Okkadu'],
  ['Sahasam Cheyara Okkadu', 'sahasam', 'Okkadu'],
  ['Nuvve Maya Chesavoo Okkadu', 'nuvve maya', 'Okkadu'],
  ['Nuvvostanante Nenocharanantana Varsham', 'nuvvostanante', 'Varsham'],
  ['Mellaga Varsham', 'mellaga', 'Varsham'],
  ['Langa Voni Varsham', 'langa voni', 'Varsham'],
  ['Nee Sneham Nee Sneham', 'nee sneham', 'Nee Sneham'],
  ['Konchem Konchem Nee Sneham', 'konchem', 'Nee Sneham'],
  ['Gundello Valava Nee Sneham', 'gundello', 'Nee Sneham'],
  ['O Cheliya Naa Priya Sakhi', 'o cheliya', 'Sakhi'],
  ['Kailove Chedugudu Sakhi', 'kailove', 'Sakhi'],
  ['Snehithuda Snehithuda Sakhi', 'snehithuda', 'Sakhi'],
  ['Alaipayuthey Kanna Sakhi Telugu', 'kanna', 'Sakhi'],
  ['Telusa Telusa Sarrainodu', 'telusa telusa', 'Sarrainodu'],
  ['Nuvvele Nuvvele Jaya Janaki Nayaka', 'nuvvele', 'Jaya Janaki Nayaka'],
  ['Let Me Love You DJ Tillu', 'love', 'DJ Tillu'],
  ['Sammohanuda Baby', 'sammohanuda', 'Baby'],
  ['Deva Raaja Baby', 'deva raaja', 'Baby'],
  ['O Rendu Prema Meghaalila Baby', 'o rendu prema', 'Baby'],
  ['Premisthunna Baby', 'premisthunna', 'Baby'],
  ['Kalalo Kooda Baby', 'kalalo kooda', 'Baby'],
  ['Urike Urike Hit 2', 'urike urike', 'Hit 2'],
  ['Po Ve Po 3 Telugu', 'po ve po', '3 (Telugu)'],
  ['Nee Paata Madhuram 3 Telugu', 'nee paata', '3 (Telugu)'],
  ['Kannazhaga Telugu 3', 'kannuladha', '3 (Telugu)'],
  ['Yedurangula Vaana Telugu', 'yedurangula', 'Love Songs'],
  ['Naa Madhi Nuvve Telugu', 'naa madhi', 'Love Songs'],
];

async function main() {
  const existingLove = JSON.parse(fs.readFileSync('love_songs_curated.json', 'utf8'));
  console.log(`Currently loaded curated love songs: ${existingLove.length}`);
  
  const existingTitles = new Set(existingLove.map(s => normTitle(s.title)));
  const newSongs = [];

  for (let i = 0; i < MORE_LOVE_QUERIES.length && (existingLove.length + newSongs.length) < 155; i++) {
    const [query, titleMatch, movieHint] = MORE_LOVE_QUERIES[i];
    const results = await searchSongs(query, 5);

    let best = null;
    for (const r of results) {
      const lang = (r.language || '').toLowerCase();
      if (lang && lang !== 'telugu') continue;

      const title = (r.song || r.title || '').toLowerCase();
      if (!title.includes(titleMatch.split(' ')[0])) continue;

      const dur = parseInt(r.duration || '0');
      if (dur > 0 && dur < 60) continue;

      const lTitle = title.toLowerCase();
      if (lTitle.includes('karaoke') || lTitle.includes('instrumental') || lTitle.includes('ringtone')) continue;

      const encUrl = r.encrypted_media_url || r.more_info?.encrypted_media_url;
      if (!encUrl) continue;

      best = r;
      break;
    }

    if (!best) {
      console.log(`❌ No match: "${query}"`);
      continue;
    }

    const title = htmlDecode(best.song || best.title || '');
    const nKey = normTitle(title);
    if (existingTitles.has(nKey)) {
      console.log(`⏭️  Duplicate: ${title}`);
      continue;
    }
    existingTitles.add(nKey);

    const sourceUrl = decryptUrl(best.encrypted_media_url || best.more_info?.encrypted_media_url);
    if (!sourceUrl) continue;

    const artworkUrl = (best.image || best.more_info?.image || '').replace(/150x150|50x50/, '500x500');
    const movie = htmlDecode(best.more_info?.album || best.album || movieHint);
    const cleanTitle = title.replace(/\s*\(From\s+"[^"]*"\)\s*/gi, '').trim();

    const record = {
      id: `telugu_love_${existingLove.length + newSongs.length + 1}_${nKey.substring(0, 25)}`,
      title: cleanTitle,
      artist: htmlDecode(best.primary_artists || best.singers || ''),
      movie: movie,
      album: movie,
      year: parseInt(best.year || '2024'),
      category: 'Love Songs',
      genre: 'Love Songs',
      duration: parseInt(best.duration || '0'),
      sourceUrl,
      artworkUrl,
    };

    newSongs.push(record);
    console.log(`✅ [${existingLove.length + newSongs.length}/150] ${cleanTitle} — ${record.artist.substring(0, 30)} [${movie.substring(0, 20)}]`);
    await new Promise(r => setTimeout(r, 200));
  }

  const allLoveSongs = [...existingLove, ...newSongs].slice(0, 150);
  console.log(`\n🎉 Final Telugu Love Songs Count: ${allLoveSongs.length}`);

  // Re-index all IDs sequentially
  allLoveSongs.forEach((s, idx) => {
    s.id = `telugu_love_${idx + 1}_${normTitle(s.title).substring(0, 25)}`;
    s.category = 'Love Songs';
    s.genre = 'Love Songs';
  });

  fs.writeFileSync('love_songs_curated.json', JSON.stringify(allLoveSongs, null, 2));

  // Merge with remaining catalog (Hot Hits, Mass & Beats, Melodies, Golden Classics, etc.)
  const existingMaster = JSON.parse(fs.readFileSync('public/data/telugu_500_songs.json', 'utf8'));
  const nonLove = existingMaster.filter(s => s.category !== 'Love Songs');

  const fullLibrary = [...nonLove, ...allLoveSongs];
  console.log(`Total songs in master library: ${fullLibrary.length}`);

  const counts = {};
  fullLibrary.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1; });
  console.log('\nFinal Category Breakdown:');
  Object.entries(counts).sort((a,b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

  fs.writeFileSync('public/data/telugu_500_songs.json', JSON.stringify(fullLibrary, null, 2));

  const tsContent = `// Auto-generated Telugu Songs Dataset — ${fullLibrary.length} songs across ${Object.keys(counts).length} Categories
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

export const TELUGU_500_SONGS: TeluguSongRecord[] = ${JSON.stringify(fullLibrary, null, 2)};
`;
  fs.writeFileSync('src/lib/telugu500Data.ts', tsContent);
  console.log('✅ Updated public/data/telugu_500_songs.json and src/lib/telugu500Data.ts');
}

main().catch(console.error);
