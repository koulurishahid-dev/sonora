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

async function testMovies(movies) {
  for (const m of movies) {
    const url = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&p=1&n=10&q=${encodeURIComponent(m + ' telugu')}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    const results = data.results || [];
    console.log(`Movie "${m}": ${results.length} songs found`);
    if (results.length > 0) {
      console.log(`  Top song: ${results[0].song.replace(/&quot;/g, '"')} | ${results[0].singers || results[0].primary_artists}`);
    }
  }
}

testMovies(['Pushpa 2', 'Devara', 'Sita Ramam', 'Ala Vaikunthapurramuloo', 'Magadheera', 'Orange', 'Arya', 'Okkadu']);
