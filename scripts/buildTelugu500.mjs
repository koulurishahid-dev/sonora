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

// Define the queries that systematically cover all 10 genres
const HARVEST_QUERIES = [
  // --- 1. HOT HITS & 2023-2026 TRENDING ---
  { q: 'Pushpa 2 The Rule telugu', cat: 'Hot Hits', max: 8 },
  { q: 'Devara telugu', cat: 'Hot Hits', max: 8 },
  { q: 'Guntur Kaaram telugu', cat: 'Hot Hits', max: 8 },
  { q: 'Kalki 2898 AD telugu', cat: 'Hot Hits', max: 8 },
  { q: 'Tillu Square telugu', cat: 'Hot Hits', max: 6 },
  { q: 'Salaar telugu', cat: 'Hot Hits', max: 6 },
  { q: 'HanuMan telugu', cat: 'Hot Hits', max: 6 },
  { q: 'Animal telugu', cat: 'Hot Hits', max: 6 },
  { q: 'Hi Nanna telugu', cat: 'Hot Hits', max: 7 },
  { q: 'Kushi telugu 2023', cat: 'Hot Hits', max: 7 },
  { q: 'Baby telugu', cat: 'Hot Hits', max: 6 },
  { q: 'Dasara telugu', cat: 'Hot Hits', max: 6 },
  { q: 'Waltair Veerayya telugu', cat: 'Hot Hits', max: 6 },
  { q: 'Veera Simha Reddy telugu', cat: 'Hot Hits', max: 5 },
  { q: 'Game Changer telugu', cat: 'Hot Hits', max: 5 },
  { q: 'Saripodhaa Sanivaaram telugu', cat: 'Hot Hits', max: 5 },
  { q: 'Lucky Baskhar telugu', cat: 'Hot Hits', max: 5 },
  { q: 'Amaran telugu', cat: 'Hot Hits', max: 5 },

  // --- 2. TELUGU ROMANCE & LOVE ANTHEMS ---
  { q: 'Sita Ramam telugu', cat: 'Love Songs', max: 8 },
  { q: 'Geetha Govindam telugu', cat: 'Love Songs', max: 7 },
  { q: 'Jersey telugu', cat: 'Love Songs', max: 6 },
  { q: 'Majili telugu', cat: 'Love Songs', max: 6 },
  { q: 'Dear Comrade telugu', cat: 'Love Songs', max: 6 },
  { q: 'Uppena telugu', cat: 'Love Songs', max: 6 },
  { q: 'Love Story telugu', cat: 'Love Songs', max: 6 },
  { q: 'Fidaa telugu', cat: 'Love Songs', max: 6 },
  { q: 'Ninnu Kori telugu', cat: 'Love Songs', max: 6 },
  { q: 'Tholi Prema 2018 telugu', cat: 'Love Songs', max: 6 },
  { q: 'Padi Padi Leche Manasu telugu', cat: 'Love Songs', max: 5 },
  { q: 'Orange telugu', cat: 'Love Songs', max: 7 },
  { q: 'Ye Maaya Chesave telugu', cat: 'Love Songs', max: 7 },
  { q: '100% Love telugu', cat: 'Love Songs', max: 6 },
  { q: 'Mr Perfect telugu', cat: 'Love Songs', max: 6 },
  { q: 'Ishq telugu', cat: 'Love Songs', max: 6 },
  { q: 'Gunde Jaari Gallanthayyinde telugu', cat: 'Love Songs', max: 5 },
  { q: 'Oohalu Gusagusalade telugu', cat: 'Love Songs', max: 5 },
  { q: 'Ala Modalaindi telugu', cat: 'Love Songs', max: 5 },
  { q: 'Anand telugu', cat: 'Love Songs', max: 6 },
  { q: 'Godavari telugu', cat: 'Love Songs', max: 6 },

  // --- 3. MASS & PARTY DANCE BEATS ---
  { q: 'RRR telugu', cat: 'Mass & Beats', max: 8 },
  { q: 'Pushpa The Rise telugu', cat: 'Mass & Beats', max: 7 },
  { q: 'Ala Vaikunthapurramuloo telugu', cat: 'Mass & Beats', max: 8 },
  { q: 'Sarileru Neekevvaru telugu', cat: 'Mass & Beats', max: 6 },
  { q: 'iSmart Shankar telugu', cat: 'Mass & Beats', max: 6 },
  { q: 'Krack telugu', cat: 'Mass & Beats', max: 5 },
  { q: 'Dhamaka telugu', cat: 'Mass & Beats', max: 6 },
  { q: 'Rangasthalam telugu', cat: 'Mass & Beats', max: 7 },
  { q: 'Janatha Garage telugu', cat: 'Mass & Beats', max: 6 },
  { q: 'Sarrainodu telugu', cat: 'Mass & Beats', max: 6 },
  { q: 'Race Gurram telugu', cat: 'Mass & Beats', max: 6 },
  { q: 'Mirchi telugu', cat: 'Mass & Beats', max: 6 },
  { q: 'Gabbar Singh telugu', cat: 'Mass & Beats', max: 6 },
  { q: 'Dookudu telugu', cat: 'Mass & Beats', max: 6 },
  { q: 'Businessman telugu', cat: 'Mass & Beats', max: 5 },
  { q: 'Baahubali The Beginning telugu', cat: 'Mass & Beats', max: 7 },
  { q: 'Baahubali 2 The Conclusion telugu', cat: 'Mass & Beats', max: 7 },
  { q: 'Simhadri telugu', cat: 'Mass & Beats', max: 5 },
  { q: 'Aadi telugu', cat: 'Mass & Beats', max: 5 },
  { q: 'Tagore telugu', cat: 'Mass & Beats', max: 5 },
  { q: 'Indra telugu', cat: 'Mass & Beats', max: 5 },

  // --- 4. SOULFUL MELODIES & ACOUSTIC ---
  { q: 'Shyam Singha Roy telugu', cat: 'Melodies', max: 6 },
  { q: 'Sir telugu', cat: 'Melodies', max: 5 },
  { q: 'Pelli Choopulu telugu', cat: 'Melodies', max: 5 },
  { q: 'Sammohanam telugu', cat: 'Melodies', max: 5 },
  { q: 'Brochevarevarura telugu', cat: 'Melodies', max: 5 },
  { q: 'Mahanati telugu', cat: 'Melodies', max: 6 },
  { q: 'C/o Kancharapalem telugu', cat: 'Melodies', max: 5 },
  { q: 'Jersey ost telugu', cat: 'Melodies', max: 5 },
  { q: 'Colour Photo telugu', cat: 'Melodies', max: 5 },
  { q: 'Ante Sundaraniki telugu', cat: 'Melodies', max: 5 },
  { q: 'Ee Nagaraniki Emaindi telugu', cat: 'Melodies', max: 5 },
  { q: 'A Aa telugu', cat: 'Melodies', max: 6 },
  { q: 'Srimanthudu telugu', cat: 'Melodies', max: 6 },
  { q: 'Manam telugu', cat: 'Melodies', max: 6 },
  { q: 'Seethamma Vakitlo Sirimalle Chettu telugu', cat: 'Melodies', max: 6 },
  { q: 'Leader telugu', cat: 'Melodies', max: 5 },

  // --- 5. 2000s NOSTALGIA & GOLDEN CLASSICS ---
  { q: 'Okkadu telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Varsham telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Arya telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Arya 2 telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Athadu telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Pokiri telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Bommarillu telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Jalsa telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Magadheera telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Happy Days telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Kotha Bangaru Lokam telugu', cat: 'Golden Classics', max: 5 },
  { q: 'Chirutha telugu', cat: 'Golden Classics', max: 5 },
  { q: 'Desamuduru telugu', cat: 'Golden Classics', max: 5 },
  { q: 'Chatrapathi telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Santosham telugu', cat: 'Golden Classics', max: 5 },
  { q: 'Manmadhudu telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Kushi telugu 2001', cat: 'Golden Classics', max: 6 },
  { q: 'Nuvvu Naaku Nachav telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Murari telugu', cat: 'Golden Classics', max: 6 },
  { q: 'Nuvve Kavali telugu', cat: 'Golden Classics', max: 5 },
  { q: 'Nuvvu Nenu telugu', cat: 'Golden Classics', max: 5 },
  { q: 'Jayam telugu', cat: 'Golden Classics', max: 5 },
  { q: 'Malliswari telugu', cat: 'Golden Classics', max: 5 },

  // --- 6. ARTIST SPOTLIGHT: SID SRIRAM ---
  { q: 'sid sriram telugu hits', cat: 'Sid Sriram', max: 15 },
  { q: 'sid sriram melodies telugu', cat: 'Sid Sriram', max: 12 },
  { q: 'sid sriram romantic telugu', cat: 'Sid Sriram', max: 12 },

  // --- 7. COMPOSER BLOCKBUSTERS: DSP, THAMAN, ANIRUDH, KEERAVAANI, MANI SHARMA ---
  { q: 'devi sri prasad hits telugu', cat: 'Blockbusters', max: 15 },
  { q: 'thaman hits telugu', cat: 'Blockbusters', max: 15 },
  { q: 'anirudh telugu hits', cat: 'Blockbusters', max: 12 },
  { q: 'keeravaani hits telugu', cat: 'Blockbusters', max: 12 },
  { q: 'mani sharma hits telugu', cat: 'Blockbusters', max: 12 },
  { q: 'mickey j meyer hits telugu', cat: 'Blockbusters', max: 10 },
  { q: 'ar rahman telugu hits', cat: 'Blockbusters', max: 12 },

  // --- 8. TELUGU FOLK, TEENMAAR & VILLAGE BEATS ---
  { q: 'mangli telugu folk hits', cat: 'Folk & Beats', max: 10 },
  { q: 'ram miriyala telugu songs', cat: 'Folk & Beats', max: 10 },
  { q: 'penchal das telugu folk', cat: 'Folk & Beats', max: 8 },
  { q: 'telugu teenmaar dj songs', cat: 'Folk & Beats', max: 10 },
  { q: 'telangana folk songs telugu', cat: 'Folk & Beats', max: 10 },
  { q: 'jathi ratnalu telugu', cat: 'Folk & Beats', max: 5 },
  { q: 'dj tillu telugu', cat: 'Folk & Beats', max: 5 },

  // --- 9. 90s NOSTALGIA & VINTAGE CLASSICS ---
  { q: 'shiva telugu', cat: '90s Classics', max: 5 },
  { q: 'geetanjali telugu', cat: '90s Classics', max: 6 },
  { q: 'kshana kshanam telugu', cat: '90s Classics', max: 5 },
  { q: 'roja telugu', cat: '90s Classics', max: 5 },
  { q: 'bombay telugu', cat: '90s Classics', max: 5 },
  { q: 'premikudu telugu', cat: '90s Classics', max: 5 },
  { q: 'prema desam telugu', cat: '90s Classics', max: 5 },
  { q: 'jeans telugu', cat: '90s Classics', max: 5 },
  { q: 'dalapathi telugu', cat: '90s Classics', max: 5 },
  { q: 'gharana mogudu telugu', cat: '90s Classics', max: 5 },
  { q: 'allari priyudu telugu', cat: '90s Classics', max: 5 },
  { q: 'ninne pelladatha telugu', cat: '90s Classics', max: 5 },
  { q: 'tholi prema 1998 telugu', cat: '90s Classics', max: 5 },
  { q: 'badri telugu', cat: '90s Classics', max: 5 },
  { q: 'sp balu evergreen telugu', cat: '90s Classics', max: 10 },
  { q: 'ks chithra golden telugu', cat: '90s Classics', max: 10 },

  // --- 10. DEVOTIONAL & SPIRITUAL LEGENDS ---
  { q: 'annamayya songs telugu', cat: 'Devotional', max: 8 },
  { q: 'sri ramadasu songs telugu', cat: 'Devotional', max: 8 },
  { q: 'shirdi sai telugu songs', cat: 'Devotional', max: 6 },
  { q: 'om namo venkatesaya telugu', cat: 'Devotional', max: 6 },
  { q: 'lord shiva songs telugu spb', cat: 'Devotional', max: 8 },
  { q: 'venkateswara suprabhatam telugu', cat: 'Devotional', max: 5 },
];

async function fetchQuery(query, count = 10) {
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

async function harvest() {
  console.log(`Starting Telugu 500 Songs Harvest across ${HARVEST_QUERIES.length} target queries...`);
  const seenNorm = new Set();
  const collected = [];

  for (let idx = 0; idx < HARVEST_QUERIES.length; idx++) {
    const item = HARVEST_QUERIES[idx];
    const results = await fetchQuery(item.q, item.max || 10);
    let addedForQuery = 0;

    for (const raw of results) {
      if (raw.language && raw.language.toLowerCase() !== 'telugu') continue;
      if (!raw.encrypted_media_url) continue;

      const title = cleanText(raw.song);
      const movie = cleanText(raw.album || raw.movie || 'Telugu Single');
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
      collected.push({
        id: `telugu_${collected.length + 1}_${normalizeTitle(title).slice(0, 20)}`,
        title,
        artist: artists,
        movie,
        album: movie,
        year,
        category: item.cat,
        genre: item.cat,
        duration,
        sourceUrl: url320,
        artworkUrl: artwork,
      });

      addedForQuery++;
      if (addedForQuery >= (item.max || 10)) break;
    }

    if ((idx + 1) % 10 === 0 || idx === HARVEST_QUERIES.length - 1) {
      console.log(`[${idx + 1}/${HARVEST_QUERIES.length}] Query: "${item.q}" -> Total collected so far: ${collected.length}`);
    }

    // Small delay to prevent network throttling
    await new Promise(r => setTimeout(r, 60));

    if (collected.length >= 500) {
      console.log(`Reached 500 songs goal! (Total: ${collected.length})`);
      break;
    }
  }

  console.log(`\nHarvest complete! Total unique Telugu songs collected: ${collected.length}`);

  // Tally by category
  const catTally = {};
  for (const s of collected) {
    catTally[s.category] = (catTally[s.category] || 0) + 1;
  }
  console.log('Category breakdown:');
  for (const [c, n] of Object.entries(catTally)) {
    console.log(` - ${c}: ${n} songs`);
  }

  // Save to JSON
  const outDir = path.resolve('public', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'telugu_500_songs.json'), JSON.stringify(collected, null, 2), 'utf-8');
  console.log(`Saved dataset to public/data/telugu_500_songs.json (${(fs.statSync(path.join(outDir, 'telugu_500_songs.json')).size / 1024).toFixed(1)} KB)`);
}

harvest();
