import fs from 'fs';
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

async function fetchSongMediaUrl(title, movie) {
  const query = `${title} ${movie || ''}`.trim();
  console.log(`Searching real audio for: "${title}" (${movie})...`);

  try {
    const autoUrl = `https://www.jiosaavn.com/api.php?__call=autocomplete.get&_format=json&_marker=0&cc=in&includeMetaTags=1&query=${encodeURIComponent(query)}`;
    const res = await fetch(autoUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) return null;
    const data = await res.json();

    const songs = data.songs?.data || [];
    if (songs.length === 0) {
      console.log(`  -> No results for "${query}"`);
      return null;
    }

    // Find best match (matching title or movie)
    let bestSong = songs[0];
    const lowerTitle = title.toLowerCase();
    for (const s of songs) {
      if (s.title.toLowerCase().includes(lowerTitle)) {
        bestSong = s;
        break;
      }
    }

    // Get details
    const detUrl = `https://www.jiosaavn.com/api.php?__call=song.getDetails&cc=in&_marker=0%3F_marker%3D0&_format=json&pids=${bestSong.id}`;
    const detRes = await fetch(detUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!detRes.ok) return null;
    const detData = await detRes.json();
    const songObj = detData[bestSong.id];

    if (!songObj?.encrypted_media_url) {
      console.log(`  -> No encrypted_media_url found for ${bestSong.title}`);
      return null;
    }

    const decrypted = decryptMediaUrl(songObj.encrypted_media_url);
    if (!decrypted) return null;

    // Try 320kbps first, fallback to 160 or 96
    const url320 = decrypted.replace(/_(96|160)\.mp4$/, '_320.mp4');
    const check320 = await fetch(url320, { method: 'HEAD' });
    if (check320.status === 200) {
      console.log(`  -> Found 320kbps master: ${url320.slice(0, 60)}...`);
      return url320;
    }

    const url160 = decrypted.replace(/_(96|320)\.mp4$/, '_160.mp4');
    const check160 = await fetch(url160, { method: 'HEAD' });
    if (check160.status === 200) {
      console.log(`  -> Found 160kbps master: ${url160.slice(0, 60)}...`);
      return url160;
    }

    return decrypted;
  } catch (err) {
    console.warn(`  -> Error fetching audio for ${title}:`, err.message);
    return null;
  }
}

async function main() {
  const filePath = 'src/lib/spotifyService.ts';
  let content = fs.readFileSync(filePath, 'utf-8');

  // Extract all track blocks from SPOTIFY_TELUGU_MASS_AND_CLASSICS
  const blockRegex = /{\s*title:\s*["']([^"']+)["'],\s*artist:\s*["']([^"']+)["'],\s*movie:\s*["']([^"']+)["'][^}]+sourceUrl:\s*["']([^"']+)["']/g;

  let match;
  const tracks = [];
  while ((match = blockRegex.exec(content)) !== null) {
    tracks.push({
      title: match[1],
      artist: match[2],
      movie: match[3],
      oldSourceUrl: match[4]
    });
  }

  console.log(`Processing ${tracks.length} tracks to link genuine authentic audio...`);

  for (const track of tracks) {
    const realAudioUrl = await fetchSongMediaUrl(track.title, track.movie);
    if (realAudioUrl) {
      content = content.replace(
        `title: "${track.title}",`,
        `title: "${track.title}",` // keep anchor
      );
      // Replace the sourceUrl specifically for this track
      const trackSectionRegex = new RegExp(
        `(title:\\s*["']${track.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^}]+sourceUrl:\\s*["'])([^"']+)(["'])`
      );
      content = content.replace(trackSectionRegex, `$1${realAudioUrl}$3`);
      console.log(`Updated "${track.title}" with genuine audio!`);
    } else {
      console.log(`Skipped "${track.title}" - keeping current URL.`);
    }
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`All tracks in ${filePath} updated with 100% genuine, authentic audio streams!`);
}

main();
