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

async function testMovieSongs(query) {
  const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&p=1&n=15&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const data = await res.json();
  const results = data.results || [];
  console.log(`\n=== "${query}" (Found ${results.length}) ===`);
  for (const s of results) {
    if (s.language && s.language.toLowerCase() !== 'telugu') continue;
    const title = s.song.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
    const movie = s.album.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
    const artists = s.primary_artists || s.singers;
    const dec = s.encrypted_media_url ? decryptMediaUrl(s.encrypted_media_url) : null;
    const url320 = dec ? dec.replace(/_(96|160)\.mp4$/, '_320.mp4') : null;
    console.log(`  - ${title} | ${movie} | ${artists} | 320: ${Boolean(url320)}`);
  }
}

async function run() {
  await testMovieSongs('Pushpa 2 The Rule telugu');
  await testMovieSongs('Ala Vaikunthapurramuloo telugu');
  await testMovieSongs('Geetha Govindam telugu');
}
run();
