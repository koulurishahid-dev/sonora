import fs from 'fs';
import crypto from 'crypto';

const DES_KEY = Buffer.from('38346591');
function decryptUrl(encUrl) {
  try {
    const decipher = crypto.createDecipheriv('des-ecb', DES_KEY, null);
    decipher.setAutoPadding(true);
    let dec = decipher.update(encUrl, 'base64', 'utf8');
    dec += decipher.final('utf8');
    return dec.replace(/_96\.mp4|_160\.mp4/, '_320.mp4');
  } catch {
    return '';
  }
}

function cleanTitle(t) {
  return (t || '')
    .replace(/\s*\(From\s+"[^"]*"\)\s*/gi, '')
    .replace(/\s*\(From\s+[^)]*\)\s*/gi, '')
    .replace(/\s*-\s*From\s+"[^"]*"\s*/gi, '')
    .replace(/\s*-\s*From\s+[^)]*\s*/gi, '')
    .replace(/\s*\(Telugu\)\s*/gi, '')
    .replace(/\s*-\s*Telugu\s*/gi, '')
    .replace(/\s*\(Remastered\)\s*/gi, '')
    .replace(/\s*\[[^\]]*\]\s*/gi, '')
    .trim();
}

function extractMovie(t) {
  const m1 = t.match(/\(From\s+"([^"]+)"\)/i) || t.match(/\(From\s+([^)]+)\)/i) || t.match(/-\s*From\s+"([^"]+)"/i) || t.match(/-\s*From\s+([^)]+)/i);
  return m1 ? m1[1].trim() : '';
}

async function searchJioSaavn(query) {
  const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&p=1&n=6&q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

async function getDetails(id) {
  const url = `https://www.jiosaavn.com/api.php?__call=song.getDetails&cc=in&_marker=0&_format=json&pids=${id}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    return data[id];
  } catch {
    return null;
  }
}

async function resolveTrack(track, idx) {
  const cTitle = cleanTitle(track.title);
  const movieHint = extractMovie(track.title);
  const artist = (track.subtitle || '').split(',')[0].trim();

  const queries = [];
  if (movieHint) {
    queries.push(`${cTitle} ${movieHint}`);
  }
  queries.push(`${cTitle} ${artist} telugu`);
  queries.push(`${cTitle} telugu`);
  queries.push(`${cTitle}`);

  for (const q of queries) {
    const results = await searchJioSaavn(q);
    for (const r of results) {
      const lang = (r.language || '').toLowerCase();
      if (lang && lang !== 'telugu') continue;

      let encUrl = r.encrypted_media_url || r.more_info?.encrypted_media_url;
      let finalDetails = r;

      if (!encUrl && r.id) {
        finalDetails = await getDetails(r.id);
        encUrl = finalDetails?.encrypted_media_url;
      }

      if (!encUrl) continue;

      const direct320 = decryptUrl(encUrl);
      if (!direct320) continue;

      // Check stream
      try {
        const head = await fetch(direct320, { method: 'HEAD' });
        if (head.status === 200) {
          const songTitle = (finalDetails.song || finalDetails.title || cTitle).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
          const movie = (finalDetails.album || finalDetails.more_info?.album || movieHint || songTitle).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
          const singers = finalDetails.singers || finalDetails.more_info?.singers || track.subtitle || 'Telugu Artist';
          let artwork = finalDetails.image || finalDetails.more_info?.image || '';
          if (artwork) {
            artwork = artwork.replace('150x150', '500x500').replace('50x50', '500x500');
          } else {
            artwork = 'https://c.saavncdn.com/224/Mani-Sharma-All-Time-Hits-Telugu-2018-20180622-500x500.jpg';
          }

          const duration = parseInt(finalDetails.duration || finalDetails.more_info?.duration || Math.round(track.duration / 1000) || 240);

          return {
            id: `telugu_travel_${idx + 1}_${songTitle.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)}`,
            title: songTitle,
            artist: singers,
            movie: movie,
            album: movie,
            year: parseInt(finalDetails.year || finalDetails.more_info?.year) || 2021,
            category: 'Telugu Travel Melodies',
            genre: 'Telugu Travel Melodies',
            duration: duration,
            sourceUrl: direct320,
            artworkUrl: artwork,
            spotifyUrl: track.uri ? `https://open.spotify.com/track/${track.uri.replace('spotify:track:', '')}` : undefined
          };
        }
      } catch {
        continue;
      }
    }
  }

  // Fallback to Spotify preview if JioSaavn failed
  if (track.audioPreview?.url) {
    return {
      id: `telugu_travel_${idx + 1}_${cTitle.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)}`,
      title: cTitle,
      artist: track.subtitle || 'Telugu Artist',
      movie: movieHint || cTitle,
      album: movieHint || cTitle,
      year: 2021,
      category: 'Telugu Travel Melodies',
      genre: 'Telugu Travel Melodies',
      duration: Math.round((track.duration || 240000) / 1000),
      sourceUrl: track.audioPreview.url,
      artworkUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&h=600&fit=crop',
      spotifyUrl: track.uri ? `https://open.spotify.com/track/${track.uri.replace('spotify:track:', '')}` : undefined
    };
  }

  return null;
}

async function main() {
  const list = JSON.parse(fs.readFileSync('scripts/spotify_travel.json', 'utf8'));
  console.log(`Starting resolution for all ${list.length} tracks...`);

  const resolved = [];
  let successCount = 0;

  for (let i = 0; i < list.length; i++) {
    const track = list[i];
    process.stdout.write(`[${i + 1}/${list.length}] Resolving: ${track.title}... `);
    const res = await resolveTrack(track, i);
    if (res) {
      resolved.push(res);
      successCount++;
      console.log(`✓ OK: "${res.title}" (${res.movie})`);
    } else {
      console.log(`✗ Skipped`);
    }
  }

  console.log(`\nHarvest complete! Successfully resolved ${resolved.length}/${list.length} tracks.`);
  fs.writeFileSync('scripts/resolved_travel_melodies.json', JSON.stringify(resolved, null, 2));
}

main();
