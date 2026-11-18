import fs from 'fs';

async function fetchItunesArt(term) {
  try {
    const url = 'https://itunes.apple.com/search?term=' + encodeURIComponent(term) + '&entity=song&limit=3';
    const res = await fetch(url).then(r => r.json());
    if (res.results && res.results.length > 0) {
      const match = res.results[0];
      if (match.artworkUrl100) {
        return match.artworkUrl100.replace('100x100bb', '600x600bb');
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function fixSpotifyService() {
  const filePath = 'src/lib/spotifyService.ts';
  let content = fs.readFileSync(filePath, 'utf-8');

  // Extract song objects
  const songRegex = /{\s*title:\s*["']([^"']+)["'],\s*artist:\s*["']([^"']+)["'],\s*movie:\s*["']([^"']+)["'][^}]+artworkUrl:\s*["']([^"']+)["']/g;
  
  let match;
  const updates = [];

  while ((match = songRegex.exec(content)) !== null) {
    const fullMatch = match[0];
    const title = match[1];
    const artist = match[2];
    const movie = match[3];
    const currentUrl = match[4];

    // Check if current URL is broken
    let isBroken = false;
    try {
      const res = await fetch(currentUrl, { method: 'HEAD' });
      if (res.status !== 200) isBroken = true;
    } catch {
      isBroken = true;
    }

    if (isBroken) {
      console.log(`Fixing broken cover for: "${title}" (${movie})`);
      const searchTerms = [
        `${title} ${movie}`,
        `${title} Telugu`,
        movie
      ];

      let newArt = null;
      for (const term of searchTerms) {
        newArt = await fetchItunesArt(term);
        if (newArt) break;
      }

      if (!newArt) {
        console.log(`  -> Fallback to local category cover`);
        newArt = '/covers/hot_hits_telugu.jpg';
      } else {
        console.log(`  -> Found iTunes art: ${newArt}`);
      }

      updates.push({ oldUrl: currentUrl, newUrl: newArt, title });
    }
  }

  console.log(`Applying ${updates.length} artwork updates to ${filePath}...`);
  for (const up of updates) {
    content = content.replaceAll(up.oldUrl, up.newUrl);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Updated spotifyService.ts successfully!');
}

fixSpotifyService();
