// harvestSidSriramPlaylist.mjs — Fetch all 50 songs from Spotify playlist and get 320kbps audio & artwork from JioSaavn
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

async function searchSongs(query, n = 5) {
  const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&p=1&n=${n}&q=${encodeURIComponent(query)}`;
  try {
    const raw = await fetch(url);
    const data = JSON.parse(raw);
    return data.results || [];
  } catch { return []; }
}

function htmlDecode(s) {
  return (s || '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#039;/g, "'");
}

function normTitle(t) {
  return (t || '').toLowerCase()
    .replace(/\(from\s+"[^"]*"\)/gi, '')
    .replace(/\(from\s+[^)]*\)/gi, '')
    .replace(/\(telugu\)/gi, '')
    .replace(/[^a-z0-9]/g, '');
}

async function main() {
  const spotifyList = JSON.parse(fs.readFileSync('spotify_sid_sriram.json', 'utf8'));
  console.log(`🎵 Processing ${spotifyList.length} tracks from Spotify Sid Sriram playlist...\n`);

  const resolvedSongs = [];

  for (let i = 0; i < spotifyList.length; i++) {
    const track = spotifyList[i];
    const cleanTitle = track.title.replace(/\s*\(From\s+"[^"]*"\)\s*/gi, '').replace(/\s*\(Telugu\)\s*/gi, '').trim();
    const query = `${cleanTitle} Sid Sriram telugu`;
    console.log(`[${i+1}/${spotifyList.length}] Searching: "${query}"`);

    const results = await searchSongs(query, 6);
    let best = null;

    for (const r of results) {
      const lang = (r.language || '').toLowerCase();
      if (lang && lang !== 'telugu') continue;

      const dur = parseInt(r.duration || '0');
      if (dur > 0 && dur < 60) continue;

      const title = (r.song || r.title || '').toLowerCase();
      // Look for title match
      const firstWord = cleanTitle.toLowerCase().split(' ')[0];
      if (!title.includes(firstWord)) continue;

      const encUrl = r.encrypted_media_url || r.more_info?.encrypted_media_url;
      if (!encUrl) continue;

      best = r;
      break;
    }

    // Fallback search with just title + movie if needed
    if (!best) {
      const q2 = `${cleanTitle} telugu`;
      const r2 = await searchSongs(q2, 5);
      for (const r of r2) {
        const lang = (r.language || '').toLowerCase();
        if (lang && lang !== 'telugu') continue;
        const encUrl = r.encrypted_media_url || r.more_info?.encrypted_media_url;
        if (!encUrl) continue;
        best = r;
        break;
      }
    }

    if (!best) {
      console.log(`  ❌ Not found on JioSaavn: ${cleanTitle}`);
      continue;
    }

    const sourceUrl = decryptUrl(best.encrypted_media_url || best.more_info?.encrypted_media_url);
    if (!sourceUrl) {
      console.log(`  ❌ Decrypt fail: ${cleanTitle}`);
      continue;
    }

    const artworkUrl = (best.image || best.more_info?.image || '')
      .replace(/150x150|50x50/, '500x500') || '/covers/sid_sriram_essentials.jpg';
    
    const movie = htmlDecode(best.more_info?.album || best.album || 'Sid Sriram Essentials');
    const artists = htmlDecode(best.primary_artists || best.singers || track.subtitle);

    const songRecord = {
      id: `sid_sriram_${i+1}_${normTitle(cleanTitle).substring(0, 25)}`,
      title: cleanTitle,
      artist: artists.includes('Sid Sriram') ? artists : `Sid Sriram, ${artists}`,
      movie: movie,
      album: movie,
      year: parseInt(best.year || '2024'),
      category: 'Sid Sriram',
      genre: 'Sid Sriram',
      duration: parseInt(best.duration || track.duration.toString()),
      sourceUrl,
      artworkUrl,
    };

    resolvedSongs.push(songRecord);
    console.log(`  ✅ Resolved: ${cleanTitle} — ${songRecord.artist.substring(0, 35)} [${movie.substring(0, 25)}]`);
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n🎉 Successfully resolved ${resolvedSongs.length} / ${spotifyList.length} Sid Sriram songs!`);
  fs.writeFileSync('sid_sriram_resolved.json', JSON.stringify(resolvedSongs, null, 2));

  // Now replace ALL existing "Sid Sriram" category songs in public/data/telugu_500_songs.json
  const masterData = JSON.parse(fs.readFileSync('public/data/telugu_500_songs.json', 'utf8'));
  const nonSidSriram = masterData.filter(s => s.category !== 'Sid Sriram');
  console.log(`Non-Sid-Sriram songs in catalog: ${nonSidSriram.length}`);

  const updatedCatalog = [...nonSidSriram, ...resolvedSongs];
  console.log(`New total songs in master catalog: ${updatedCatalog.length}`);

  const counts = {};
  updatedCatalog.forEach(s => { counts[s.category] = (counts[s.category] || 0) + 1; });
  console.log('\nUpdated Category Breakdown:');
  Object.entries(counts).sort((a,b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

  // Write to public/data/telugu_500_songs.json
  fs.writeFileSync('public/data/telugu_500_songs.json', JSON.stringify(updatedCatalog, null, 2));

  // Write to src/lib/telugu500Data.ts
  const tsContent = `// Auto-generated Telugu Songs Dataset — ${updatedCatalog.length} songs across ${Object.keys(counts).length} Categories
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

export const TELUGU_500_SONGS: TeluguSongRecord[] = ${JSON.stringify(updatedCatalog, null, 2)};
`;
  fs.writeFileSync('src/lib/telugu500Data.ts', tsContent);
  console.log('✅ Updated public/data/telugu_500_songs.json and src/lib/telugu500Data.ts');
}

main().catch(console.error);
