// harvestLoveSongs.mjs — Harvest 150 unique Telugu love/romance songs from JioSaavn
import https from 'https';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';

const DES_KEY = Buffer.from('38346591');
const OUTPUT_JSON = 'love_songs_harvested.json';

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

function normalizeKey(title, movie) {
  const clean = s => (s || '').toLowerCase()
    .replace(/\(from\s+"[^"]*"\)/gi, '')
    .replace(/\(telugu\)/gi, '')
    .replace(/- lofi mix/gi, '')
    .replace(/lofi mix/gi, '')
    .replace(/[^a-z0-9]/g, '');
  return clean(title) + '___' + clean(movie);
}

async function searchSongs(query, page = 1, count = 30) {
  const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&p=${page}&n=${count}&q=${encodeURIComponent(query)}`;
  try {
    const raw = await fetch(url);
    const data = JSON.parse(raw);
    return data.results || [];
  } catch (e) {
    console.error(`  Search error for "${query}":`, e.message);
    return [];
  }
}

// Reject background scores, instrumentals, remixes, karaoke
function isRealSong(song) {
  const title = (song.song || song.title || '').toLowerCase();
  const album = (song.album || '').toLowerCase();
  const badPatterns = [
    'background score', 'bgm', 'theme music', 'title theme', 'interval block',
    'karaoke', 'instrumental', 'ringtone', '8d audio', 'reverb', 'slowed',
    'lofi mix', 'lo-fi', 'mashup', 'unplugged', 'reprise',
    'scene', 'climax', 'makes.*proud', 'station scene', 'meditation'
  ];
  for (const p of badPatterns) {
    if (title.match(new RegExp(p, 'i')) || album.match(new RegExp(p, 'i'))) return false;
  }
  // Skip if duration < 90s (too short, likely a snippet/BGM)
  const dur = parseInt(song.duration || '0');
  if (dur > 0 && dur < 90) return false;
  return true;
}

// Telugu love song queries - movie-specific for maximum accuracy
const QUERIES = [
  // Classic romantic movies
  'Sita Ramam telugu', 'Geetha Govindam telugu', 'Jersey telugu', 'Majili telugu',
  'Arjun Reddy telugu', 'Fidaa telugu', 'Nenu Sailaja telugu', 'Premam telugu',
  'Shatamanam Bhavati telugu', 'Nenu Local telugu', 'MCA Middle Class Abbayi telugu',
  'Bharat Ane Nenu telugu', 'Padi Padi Leche Manasu telugu', 'Jaanu telugu',
  'Rang De telugu', 'Most Eligible Bachelor telugu', 'World Famous Lover telugu',
  'Bheeshma telugu', 'Ishq telugu', 'Oohalu Gusagusalade telugu',
  'Ala Modalaindi telugu', 'Malli Malli Idi Rani Roju telugu',
  'Rarandoi Veduka Chuddam telugu', 'Shailaja Reddy Alludu telugu',
  'Gunde Jaari Gallanthayyinde telugu', 'Eega telugu love',
  'Nuvvu Nenu telugu', 'Nuvve Kavali telugu', 'Sakhi telugu movie',
  'Nuvvu Naaku Nachav telugu', 'Merupu Kalalu telugu', 'Pelli Sandadi telugu',
  // Recent romantic hits
  'Hi Nanna telugu', 'Kushi telugu', 'Miss Shetty Mr Polishetty telugu',
  'Tillu Square telugu', 'Baby telugu movie', 'Samajavaragamana telugu',
  'Butta Bomma telugu', 'Saranga Dariya telugu love', 'Srivalli telugu',
  'Oo Antava telugu', 'Naatu Naatu telugu', 'Saahasam telugu',
  'Mr Perfect telugu', 'Julayi telugu', 'Dookudu telugu',
  'Khaleja telugu', 'Businessman telugu', 'Attarintiki Daredi telugu',
  'S/O Satyamurthy telugu', 'A Aa telugu movie', 'Ninnu Kori telugu',
  'Tholi Prema telugu 2018', 'Dear Comrade telugu', 'Uppena telugu',
  'Love Story telugu', 'Sarkaru Vaari Paata telugu', 'Liger telugu',
  'Ante Sundaraniki telugu', 'Sir telugu movie', 'Guntur Kaaram telugu love',
  'Pushpa telugu love songs', 'RRR telugu love', 'Lucky Baskhar telugu',
  'Devara telugu love', 'Game Changer telugu love',
  // Artist-focused love queries
  'Sid Sriram telugu love hits', 'Armaan Malik telugu love', 
  'Anurag Kulkarni telugu romance', 'Shreya Ghoshal telugu love',
  'Chinmayi telugu love', 'Haricharan telugu romance',
  // Older classics
  'Bommarillu telugu', 'Happy telugu', 'Pokiri telugu love',
  'Magadheera telugu', 'Ye Maaya Chesave telugu', 'Orange telugu movie',
  'Eega telugu', '100% Love telugu', 'Julayi telugu movie',
  'Naa Peru Surya telugu love', 'Mahanati telugu love',
  'Maharshi telugu', 'Sarileru Neekevvaru telugu love',
  'Ala Vaikunthapurramuloo telugu love', 'Vakeel Saab telugu',
];

async function main() {
  const seen = new Map(); // normalizedKey -> song record
  const allSongs = [];
  const TARGET = 155; // overshoot slightly for safety

  console.log(`🎵 Harvesting Telugu Love Songs (target: ${TARGET})...\n`);

  for (let qi = 0; qi < QUERIES.length && allSongs.length < TARGET; qi++) {
    const query = QUERIES[qi];
    console.log(`[${qi + 1}/${QUERIES.length}] Searching: "${query}" (${allSongs.length} so far)`);
    
    const results = await searchSongs(query, 1, 30);
    let added = 0;

    for (const r of results) {
      if (allSongs.length >= TARGET) break;
      
      const lang = (r.language || '').toLowerCase();
      if (lang && lang !== 'telugu') continue;
      
      if (!isRealSong(r)) continue;

      const title = r.song || r.title || '';
      const movie = r.more_info?.album || r.album || '';
      const key = normalizeKey(title, movie);
      
      // Also check by just normalized title to avoid near-dupes
      const titleOnly = (title || '').toLowerCase()
        .replace(/\(from\s+"[^"]*"\)/gi, '')
        .replace(/\(telugu\)/gi, '')
        .replace(/[^a-z0-9]/g, '');
      
      if (seen.has(key)) continue;
      if (titleOnly.length > 3 && [...seen.values()].some(s => {
        const st = (s.title || '').toLowerCase()
          .replace(/\(from\s+"[^"]*"\)/gi, '')
          .replace(/\(telugu\)/gi, '')
          .replace(/[^a-z0-9]/g, '');
        return st === titleOnly;
      })) continue;

      const encUrl = r.encrypted_media_url || r.more_info?.encrypted_media_url;
      if (!encUrl) continue;
      
      const sourceUrl = decryptUrl(encUrl);
      if (!sourceUrl) continue;

      const artworkUrl = (r.image || r.more_info?.image || '')
        .replace(/150x150|50x50/, '500x500');

      const record = {
        id: `love_${allSongs.length + 1}_${titleOnly.substring(0, 20)}`,
        title: title,
        artist: r.primary_artists || r.more_info?.artistMap?.primary_artists?.map(a => a.name).join(', ') || r.singers || '',
        movie: movie,
        album: movie,
        year: parseInt(r.year || '2024'),
        category: 'Love Songs',
        genre: 'Love Songs',
        duration: parseInt(r.duration || r.more_info?.duration || '0'),
        sourceUrl,
        artworkUrl,
      };

      seen.set(key, record);
      allSongs.push(record);
      added++;
    }

    console.log(`  → Found ${results.length} results, added ${added} unique songs`);
    
    // Small delay between requests to be polite
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅ Total unique love songs harvested: ${allSongs.length}`);
  
  // Write output
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(allSongs, null, 2));
  console.log(`📁 Saved to ${OUTPUT_JSON}`);
  
  // Print stats
  const artists = {};
  allSongs.forEach(s => {
    const a = s.artist.split(',')[0].trim();
    artists[a] = (artists[a] || 0) + 1;
  });
  const topArtists = Object.entries(artists).sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log('\n🎤 Top artists:');
  topArtists.forEach(([name, count]) => console.log(`  ${name}: ${count}`));
}

main().catch(e => console.error('Fatal:', e));
