// harvestCuratedLove.mjs — Harvest curated Telugu love songs with specific song+movie queries
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

async function searchSongs(query, n = 10) {
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
  return (s || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#039;/g, "'");
}

// Curated list: [search query, expected title substring, movie/album name]
// Each entry targets a specific well-known Telugu love song
const CURATED_LOVE_SONGS = [
  // Sita Ramam (2022)
  ['Oh Sita Hey Rama Sita Ramam', 'oh sita hey rama', 'Sita Ramam'],
  ['Inthandham Sita Ramam', 'inthandham', 'Sita Ramam'],
  ['Kaanunna Kalyanam Sita Ramam', 'kaanunna kalyanam', 'Sita Ramam'],
  ['Oh Prema Sita Ramam', 'oh prema', 'Sita Ramam'],
  // Geetha Govindam (2018)
  ['Inkem Inkem Inkem Kaavaale Geetha Govindam', 'inkem inkem', 'Geetha Govindam'],
  ['Vachindamma Geetha Govindam', 'vachindamma', 'Geetha Govindam'],
  ['Yenti Yenti Geetha Govindam', 'yenti yenti', 'Geetha Govindam'],
  ['Kanureppala Kaalam Geetha Govindam', 'kanureppala', 'Geetha Govindam'],
  ['What The Life Geetha Govindam', 'what the life', 'Geetha Govindam'],
  ['Tanemandhe Tanemandhe Geetha Govindam', 'tanemandhe', 'Geetha Govindam'],
  // Jersey (2019)
  ['Adhento Gaani Vunnapaatuga Jersey', 'adhento gaani', 'Jersey'],
  ['Padhe Padhe Jersey', 'padhe padhe', 'Jersey'],
  ['Needa Padadhani Jersey', 'needa padadhani', 'Jersey'],
  ['Prapanchame Alaa Jersey', 'prapanchame', 'Jersey'],
  // Majili (2019)
  ['Priyathama Priyathama Majili', 'priyathama', 'Majili'],
  ['Yedetthu Mallele Majili', 'yedetthu', 'Majili'],
  ['Naa Gundello Majili', 'naa gundello', 'Majili'],
  ['Ye Manishike Majiliyo', 'ye manishike', 'Majili'],
  // Arjun Reddy (2017)
  ['Telisiney Na Nuvvey Arjun Reddy', 'telisiney', 'Arjun Reddy'],
  ['Emitemitemo Arjun Reddy', 'emitemitemo', 'Arjun Reddy'],
  ['Madhurame Arjun Reddy', 'madhurame', 'Arjun Reddy'],
  ['Oopiri Aaguthunnadey Arjun Reddy', 'oopiri', 'Arjun Reddy'],
  ['Gundelonaa Arjun Reddy', 'gundelonaa', 'Arjun Reddy'],
  ['Dhooram Arjun Reddy', 'dhooram', 'Arjun Reddy'],
  // Fidaa (2017)
  ['Vachinde Fidaa', 'vachinde', 'Fidaa'],
  ['Oosupodu Fidaa', 'oosupodu', 'Fidaa'],
  ['Hey Pillagaada Fidaa', 'hey pillagaada', 'Fidaa'],
  ['Edo Jarugutondi Fidaa', 'edo jarugutondi', 'Fidaa'],
  // Nenu Sailaja (2016)
  ['You Are My MLA Nenu Sailaja', 'you are my mla', 'Nenu Sailaja'],
  ['Crazy Feeling Nenu Sailaja', 'crazy feeling', 'Nenu Sailaja'],
  ['Yevare Nenu Sailaja', 'yevare', 'Nenu Sailaja'],
  // Shatamanam Bhavati (2017)
  ['Mellaga Tellarindoi Shatamanam Bhavati', 'mellaga', 'Shatamanam Bhavati'],
  ['Nilavade Shatamanam Bhavati', 'nilavade', 'Shatamanam Bhavati'],
  ['Naalo Nenu Shatamanam Bhavati', 'naalo nenu', 'Shatamanam Bhavati'],
  // Nenu Local (2017)
  ['Arere Yekkada Nenu Local', 'arere yekkada', 'Nenu Local'],
  // MCA (2017)
  ['Yemaindho Teliyadu Naaku MCA', 'yemaindho', 'MCA'],
  // Bharat Ane Nenu (2018)
  ['O Vasumathi Bharat Ane Nenu', 'o vasumathi', 'Bharat Ane Nenu'],
  ['Ide Kalala Vunnadhe Bharat Ane Nenu', 'ide kalala', 'Bharat Ane Nenu'],
  // Padi Padi Leche Manasu (2018)
  ['Padi Padi Leche Manasu title song', 'padi padi leche', 'Padi Padi Leche Manasu'],
  ['Emai Poyave Padi Padi Leche', 'emai poyave', 'Padi Padi Leche Manasu'],
  ['Kallolam Padi Padi Leche', 'kallolam', 'Padi Padi Leche Manasu'],
  ['Hrudhayam Jaripe Padi Padi Leche', 'hrudhayam', 'Padi Padi Leche Manasu'],
  ['O My Lovely Lalana Padi Padi Leche', 'lovely lalana', 'Padi Padi Leche Manasu'],
  // Jaanu (2020)
  ['Life Of Ram Jaanu', 'life of ram', 'Jaanu'],
  ['Praname Jaanu', 'praname', 'Jaanu'],
  ['Tharagathi Gadhi Jaanu', 'tharagathi', 'Jaanu'],
  // Uppena (2021)
  ['Nee Kannu Neeli Samudram Uppena', 'nee kannu neeli', 'Uppena'],
  ['Jala Jala Jalapaatham Uppena', 'jala jala', 'Uppena'],
  ['Dhak Dhak Dhak Uppena', 'dhak dhak', 'Uppena'],
  // Dear Comrade (2019)
  ['Kadalalle Dear Comrade', 'kadalalle', 'Dear Comrade'],
  ['Nee Neeli Kannullona Dear Comrade', 'nee neeli', 'Dear Comrade'],
  ['O Kalala Kathala Dear Comrade', 'kalala kathala', 'Dear Comrade'],
  // Ninnu Kori (2017)
  ['Unnattundi Gundey Ninnu Kori', 'unnattundi', 'Ninnu Kori'],
  ['Adiga Adiga Ninnu Kori', 'adiga adiga', 'Ninnu Kori'],
  ['Sailaja Sailaja Ninnu Kori', 'sailaja sailaja', 'Ninnu Kori'],
  // Love Story (2021)
  ['Nee Chitram Choosi Love Story', 'nee chitram', 'Love Story'],
  ['Saranga Dariya Love Story', 'saranga dariya', 'Love Story'],
  ['Evo Evo Kalale Love Story', 'evo evo', 'Love Story'],
  // Rang De (2021)
  ['Nee Roopamey Rang De', 'nee roopamey', 'Rang De'],
  ['Leharaayi Rang De', 'leharaayi', 'Rang De'],
  // Bheeshma (2020)
  ['Whattey Beauty Bheeshma', 'whattey beauty', 'Bheeshma'],
  ['Sara Sari Bheeshma', 'sara sari', 'Bheeshma'],
  // Most Eligible Bachelor (2021)
  ['Guche Gulabi Most Eligible Bachelor', 'guche gulabi', 'Most Eligible Bachelor'],
  ['Lechemmi Most Eligible Bachelor', 'lechemmi', 'Most Eligible Bachelor'],
  // Ye Maaya Chesave (2010)
  ['Ye Maaya Chesave title song', 'ye maaya chesave', 'Ye Maaya Chesave'],
  ['Kundanapu Bomma Ye Maaya Chesave', 'kundanapu', 'Ye Maaya Chesave'],
  // Bommarillu (2006)
  ['Appudo Ippudo Bommarillu', 'appudo ippudo', 'Bommarillu'],
  ['Kaani Ippudu Bommarillu', 'kaani ippudu', 'Bommarillu'],
  // Orange (2010)
  ['Nenu Nuvvantu Orange', 'nenu nuvvantu', 'Orange'],
  ['Rooba Rooba Orange', 'rooba rooba', 'Orange'],
  // 100% Love (2011)
  ['Diyalo Diyala 100% Love', 'diyalo diyala', '100% Love'],
  ['Dheemtanakka 100% Love', 'dheemtanakka', '100% Love'],
  // Tholi Prema (2018)
  ['Allasani Vaari Tholi Prema', 'allasani vaari', 'Tholi Prema'],
  ['Ninnila Ninnila Tholi Prema', 'ninnila', 'Tholi Prema'],
  // Ala Vaikunthapurramuloo (2020)
  ['Samajavaragamana Ala Vaikunthapurramuloo', 'samajavaragamana', 'Ala Vaikunthapurramuloo'],
  ['Butta Bomma Ala Vaikunthapurramuloo', 'butta bomma', 'Ala Vaikunthapurramuloo'],
  ['Ramuloo Ramulaa Ala Vaikunthapurramuloo', 'ramuloo', 'Ala Vaikunthapurramuloo'],
  // Pushpa (2021)
  ['Srivalli Pushpa', 'srivalli', 'Pushpa'],
  // S/O Satyamurthy (2015)
  ['Chal Chalo Chalo S/O Satyamurthy', 'chal chalo', 'S/O Satyamurthy'],
  ['Seethamma Andalu S/O Satyamurthy', 'seethamma', 'S/O Satyamurthy'],
  // A Aa (2016)
  ['Rang De Tu Mohe A Aa', 'rang de tu', 'A Aa'],
  // Attarintiki Daredi (2013)
  ['Babu Rambabu Attarintiki Daredi', 'babu rambabu', 'Attarintiki Daredi'],
  ['Katama Rayuda Attarintiki Daredi', 'katama rayuda', 'Attarintiki Daredi'],
  // Dookudu (2011)
  ['Guruvaram Dookudu', 'guruvaram', 'Dookudu'],
  ['Poovai Poovai Dookudu', 'poovai poovai', 'Dookudu'],
  // Julayi (2012)
  ['Idhedho Bagundey Julayi', 'idhedho', 'Julayi'],
  // Mr. Perfect (2011)
  ['Dhol Dhol Baaje Mr. Perfect', 'dhol dhol', 'Mr Perfect'],
  // Khaleja (2010)
  ['Sada Shiva Sanyasi Khaleja', 'sada shiva', 'Khaleja'],
  // Magadheera (2009)
  ['Dheera Dheera Magadheera', 'dheera dheera', 'Magadheera'],
  ['Panchadara Bomma Magadheera', 'panchadara', 'Magadheera'],
  // Pokiri (2006)
  ['Gala Gala Parutunna Pokiri', 'gala gala', 'Pokiri'],
  // Businessman (2012)
  ['Sir Osthara Businessman', 'sir osthara', 'Businessman'],
  // Eega (2012)
  ['Lava Lava Eega', 'lava lava', 'Eega'],
  ['Nene Nani Ne Eega', 'nene nani', 'Eega'],
  // Happy (2006)
  ['Oh My Friend Happy', 'oh my friend', 'Happy'],
  // Hi Nanna (2023)
  ['Ammaadi Hi Nanna', 'ammaadi', 'Hi Nanna'],
  ['Odhiyamma Hi Nanna', 'odhiyamma', 'Hi Nanna'],
  // Kushi (2023)
  ['Aradhya Kushi', 'aradhya', 'Kushi'],
  ['Na Rojaa Nuvve Kushi', 'na rojaa nuvve', 'Kushi'],
  ['Nee Chitram Chusi Kushi', 'nee chitram', 'Kushi'],
  // Ante Sundaraniki (2022)
  ['Letha Lavala Ante Sundaraniki', 'letha lavala', 'Ante Sundaraniki'],
  ['Oke Oka Lokam Ante Sundaraniki', 'oke oka lokam', 'Ante Sundaraniki'],
  // Guntur Kaaram (2024)
  ['Chuttamalle Guntur Kaaram', 'chuttamalle', 'Guntur Kaaram'],
  ['Merise Merise Guntur Kaaram', 'merise', 'Guntur Kaaram'],
  // Lucky Baskhar (2024)
  ['Angaari Lucky Baskhar', 'angaari', 'Lucky Baskhar'],
  // Devara (2024)
  ['Chuttamalle Devara', 'chuttamalle', 'Devara'],
  ['Ayudha Pooja Devara', 'ayudha pooja', 'Devara'],
  // Game Changer (2025)
  ['Jaragandi Game Changer', 'jaragandi', 'Game Changer'],
  // Ala Modalaindi (2011)
  ['Ala Modalaindi Ala Modalaindi', 'ala modalaindi', 'Ala Modalaindi'],
  // Oohalu Gusagusalade (2014)
  ['Oohalu Gusagusalade title', 'oohalu', 'Oohalu Gusagusalade'],
  // Rarandoi Veduka Chuddam (2017)
  ['Thakita Thakajham Rarandoi', 'thakita', 'Rarandoi Veduka Chuddam'],
  // Nuvvu Nenu (2001)
  ['Andamaina Premarani Nuvvu Nenu', 'andamaina premarani', 'Nuvvu Nenu'],
  // Nuvve Kavali (2000)
  ['Nuvve Kavali title', 'nuvve kavali', 'Nuvve Kavali'],
  // Sakhi (2000)
  ['Nee Navve Chalu Sakhi', 'nee navve', 'Sakhi'],
  ['Cheliya Cheliya Sakhi', 'cheliya', 'Sakhi'],
  // Nuvvu Naaku Nachav (2001)
  ['Hai Hai Nuvvu Naaku Nachav', 'hai hai', 'Nuvvu Naaku Nachav'],
  // Merupu Kalalu (1997)
  ['Merupu Kalalu title', 'merupu kalalu', 'Merupu Kalalu'],
  // Pelli Sandadi (1997)
  ['Muddabanthi Navvulo Pelli Sandadi', 'muddabanthi', 'Pelli Sandadi'],
  // Ishq (2012)
  ['Maa Prema Kathalo Ishq', 'maa prema', 'Ishq'],
  // Malli Malli Idi Rani Roju (2015)
  ['Malli Malli Idi Rani Roju title', 'malli malli', 'Malli Malli Idi Rani Roju'],
  // World Famous Lover (2020)
  ['Boggu Ganilo World Famous Lover', 'boggu ganilo', 'World Famous Lover'],
  // Maharshi (2019)
  ['Paala Pitta Maharshi', 'paala pitta', 'Maharshi'],
  ['Nuvve Samastham Maharshi', 'nuvve samastham', 'Maharshi'],
  // Mahanati (2018)
  ['Mooga Manasulu Mahanati', 'mooga manasulu', 'Mahanati'],
  // Sarkaru Vaari Paata (2022)
  ['Penny Song Sarkaru Vaari Paata', 'penny', 'Sarkaru Vaari Paata'],
  ['Kalaavathi Sarkaru Vaari Paata', 'kalaavathi', 'Sarkaru Vaari Paata'],
  // Liger (2022)
  ['Aafat Liger', 'aafat', 'Liger'],
  // Miss Shetty Mr Polishetty (2023)
  ['Keka Beka Miss Shetty', 'keka beka', 'Miss Shetty'],
  // Tillu Square (2024)
  ['Malli Malli Tillu Square', 'malli malli', 'Tillu Square'],
  // Baby (2023)
  ['Lalijo Baby Telugu', 'lalijo', 'Baby'],
  // Sir (Vaathi) (2023)
  ['Thassadiyya Sir', 'thassadiyya', 'Sir'],
  // F2 Fun and Frustration (2019)
  ['Entha Fun Chesave F2', 'entha fun', 'F2'],
  // Premam (2016 Telugu)
  ['Evare Premam', 'evare', 'Premam'],
  ['Raa Raa Premam', 'raa raa', 'Premam'],
  // Gunde Jaari Gallanthayyinde (2013)
  ['O Pilla Mounika Gunde Jaari', 'o pilla mounika', 'Gunde Jaari Gallanthayyinde'],
  // Naa Peru Surya (2018)
  ['Lover Also Fighter Also Naa Peru Surya', 'lover also', 'Naa Peru Surya'],
  // Sarileru Neekevvaru (2020)
  ['He Is So Cute Sarileru', 'he is so cute', 'Sarileru Neekevvaru'],
  ['Mind Block Sarileru Neekevvaru', 'mind block', 'Sarileru Neekevvaru'],
  // Ghani (2022)
  ['Priyathama Telugu Ghani', 'priyathama', 'Ghani'],
  // Fidaa - more songs
  ['Vachinde Fidaa Telugu', 'vachinde', 'Fidaa'],
  // Premam - more
  ['Malare Ninne Premam Telugu', 'malare', 'Premam'],
  // Kanche (2015)
  ['Itu Itu Ani Kanche', 'itu itu ani', 'Kanche'],
  // Naa Autograph (2004)
  ['Ennenno Janmala Naa Autograph', 'ennenno janmala', 'Naa Autograph'],
];

async function main() {
  const allSongs = [];
  const seenTitles = new Set();
  
  console.log(`🎵 Harvesting ${CURATED_LOVE_SONGS.length} curated Telugu love songs...\n`);

  for (let i = 0; i < CURATED_LOVE_SONGS.length; i++) {
    const [query, titleMatch, movieHint] = CURATED_LOVE_SONGS[i];
    const pct = `[${String(i+1).padStart(3)}/${CURATED_LOVE_SONGS.length}]`;
    
    const results = await searchSongs(query, 5);
    
    // Find best match
    let best = null;
    for (const r of results) {
      const lang = (r.language || '').toLowerCase();
      if (lang && lang !== 'telugu') continue;
      
      const title = (r.song || r.title || '').toLowerCase();
      if (!title.includes(titleMatch.split(' ')[0])) continue; // must contain at least first word
      
      const dur = parseInt(r.duration || '0');
      if (dur > 0 && dur < 60) continue; // skip very short clips
      
      // Skip BGM/instrumentals
      const lTitle = title.toLowerCase();
      if (lTitle.includes('background score') || lTitle.includes('bgm') || 
          lTitle.includes('karaoke') || lTitle.includes('instrumental') ||
          lTitle.includes('ringtone') || lTitle.includes('8d audio')) continue;
      
      const encUrl = r.encrypted_media_url || r.more_info?.encrypted_media_url;
      if (!encUrl) continue;
      
      best = r;
      break;
    }
    
    if (!best) {
      console.log(`${pct} ❌ No match: "${query}"`);
      continue;
    }
    
    const title = htmlDecode(best.song || best.title || '');
    const nKey = normTitle(title);
    if (seenTitles.has(nKey)) {
      console.log(`${pct} ⏭️  Duplicate: ${title}`);
      continue;
    }
    seenTitles.add(nKey);
    
    const sourceUrl = decryptUrl(best.encrypted_media_url || best.more_info?.encrypted_media_url);
    if (!sourceUrl) {
      console.log(`${pct} ❌ Decrypt fail: ${title}`);
      continue;
    }
    
    const artworkUrl = (best.image || best.more_info?.image || '')
      .replace(/150x150|50x50/, '500x500');
    const movie = htmlDecode(best.more_info?.album || best.album || movieHint);
    
    // Clean title: remove "(From "...")" for display  
    const cleanTitle = title.replace(/\s*\(From\s+"[^"]*"\)\s*/gi, '').trim();
    
    const record = {
      id: `telugu_love_${allSongs.length + 1}_${nKey.substring(0, 25)}`,
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
    
    allSongs.push(record);
    console.log(`${pct} ✅ ${cleanTitle} — ${record.artist.substring(0, 35)} [${movie.substring(0, 25)}]`);
    
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`\n✅ Total curated love songs: ${allSongs.length}`);
  
  // Write curated songs
  fs.writeFileSync('love_songs_curated.json', JSON.stringify(allSongs, null, 2));
  console.log('📁 Saved to love_songs_curated.json');
  
  // Now merge with existing non-love songs
  const existing = JSON.parse(fs.readFileSync('public/data/telugu_500_songs.json', 'utf8'));
  const nonLove = existing.filter(s => s.category !== 'Love Songs');
  
  // Cap at 150
  const finalLove = allSongs.slice(0, 150);
  finalLove.forEach((s, i) => {
    s.id = `telugu_love_${i + 1}_${normTitle(s.title).substring(0, 25)}`;
  });
  
  const merged = [...nonLove, ...finalLove];
  
  // Category counts
  const cats = {};
  merged.forEach(s => { cats[s.category] = (cats[s.category] || 0) + 1; });
  console.log('\nCategory breakdown:');
  Object.entries(cats).sort((a,b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));
  
  // Write merged data
  fs.writeFileSync('public/data/telugu_500_songs.json', JSON.stringify(merged, null, 2));
  
  const tsContent = `// Auto-generated Telugu Songs Dataset — ${merged.length} songs across ${Object.keys(cats).length} Categories
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

export const TELUGU_500_SONGS: TeluguSongRecord[] = ${JSON.stringify(merged, null, 2)};
`;
  fs.writeFileSync('src/lib/telugu500Data.ts', tsContent);
  
  console.log(`\n✅ Merged ${merged.length} total songs into data files`);
}

main().catch(e => console.error('Fatal:', e));
