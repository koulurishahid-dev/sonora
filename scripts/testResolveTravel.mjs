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
    .trim();
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
  const artist = (track.subtitle || '').split(',')[0].trim();
  const queries = [
    `${cTitle} ${artist} telugu`,
    `${cTitle} telugu`,
    `${cTitle}`
  ];

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

      // Verify audio stream with HEAD
      try {
        const head = await fetch(direct320, { method: 'HEAD' });
        if (head.status === 200) {
          const songTitle = (finalDetails.song || finalDetails.title || cTitle).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
          const movie = (finalDetails.album || finalDetails.more_info?.album || songTitle).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
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
            year: parseInt(finalDetails.year || finalDetails.more_info?.year) || 2020,
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

  // If JioSaavn search fails, use track preview or fallback
  return null;
}

async function testFirst() {
  const list = JSON.parse(fs.readFileSync('scripts/spotify_travel.json', 'utf8'));
  console.log(`Testing first 5 tracks...`);
  for (let i = 0; i < 5; i++) {
    const res = await resolveTrack(list[i], i);
    console.log(`[${i+1}] ${list[i].title} =>`, res ? `FOUND: ${res.title} (${res.movie}) [${res.duration}s]` : 'NOT FOUND');
  }
}

testFirst();
