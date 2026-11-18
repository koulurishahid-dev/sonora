// mergeLoveSongs2.mjs — Aggressive dedup: only by normalized base title
import fs from 'fs';

const harvested = JSON.parse(fs.readFileSync('love_songs_harvested.json', 'utf8'));
const existing = JSON.parse(fs.readFileSync('public/data/telugu_500_songs.json', 'utf8'));

// Keep existing non-love songs untouched (read from original backup if needed)
// But since we already wrote merged, re-read all songs and keep non-love from the new file
const nonLove = existing.filter(s => s.category !== 'Love Songs');

function normTitle(title) {
  return (title || '').toLowerCase()
    .replace(/\(from\s+"[^"]*"\)/gi, '')
    .replace(/\(from\s+[^)]*\)/gi, '')
    .replace(/\(telugu\)/gi, '')
    .replace(/\(original motion picture soundtrack\)/gi, '')
    .replace(/\(extended version\)/gi, '')
    .replace(/- jersey$/gi, '')
    .replace(/- lofi mix/gi, '')
    .replace(/lofi mix/gi, '')
    .replace(/theme(\s+\(telugu\))?$/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Deduplicate by normalized title ONLY
const seen = new Set();
const uniqueLove = [];

for (const song of harvested) {
  const key = normTitle(song.title);
  if (key.length < 3) continue;
  if (seen.has(key)) {
    continue;
  }
  
  const lowerTitle = song.title.toLowerCase();
  // Skip theme/BGM tracks
  if (lowerTitle.includes('theme') && !lowerTitle.includes('love')) continue;
  // Skip obvious non-love-songs leaking in
  if (lowerTitle.includes('chilakamma') || lowerTitle.includes('repallantaa')) continue;
  
  seen.add(key);
  
  // Clean the song data
  song.title = song.title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  song.artist = (song.artist || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  song.movie = (song.movie || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  song.album = (song.album || '').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  
  // Use the original movie name from the actual album, not compilation albums
  // If movie name looks like a compilation, try to extract real movie
  const compIndicators = ['expectional', 'trending', 'love hits', 'million beats', 'musical magic', 
    'stunning beauty', 'new and trending', 'blockbuster', 'tollywood', 'top 10'];
  const movieLower = song.movie.toLowerCase();
  if (compIndicators.some(ci => movieLower.includes(ci))) {
    // Try to extract movie from "(From "...")" in the title
    const fromMatch = song.title.match(/\(From\s+"([^"]+)"\)/i);
    if (fromMatch) {
      song.movie = fromMatch[1];
      song.album = fromMatch[1];
    }
  }
  
  // Clean title: remove "(From "...")" suffix for display
  song.title = song.title.replace(/\s*\(From\s+"[^"]*"\)\s*/gi, '').trim();
  
  song.category = 'Love Songs';
  song.genre = 'Love Songs';
  
  uniqueLove.push(song);
}

console.log(`After aggressive dedup: ${uniqueLove.length} unique songs`);

// Cap at 150
const finalLove = uniqueLove.slice(0, 150);

// Re-index IDs
finalLove.forEach((s, i) => {
  const slug = normTitle(s.title).substring(0, 25);
  s.id = `telugu_love_${i + 1}_${slug}`;
});

console.log(`Final love songs: ${finalLove.length}`);

// Also check for any non-love existing songs that might overlap with these
const existingNonLoveTitles = new Set(nonLove.map(s => normTitle(s.title)));
const loveSongsAlsoInOther = finalLove.filter(s => existingNonLoveTitles.has(normTitle(s.title)));
console.log(`Love songs also in other categories: ${loveSongsAlsoInOther.length}`);
if (loveSongsAlsoInOther.length > 0) {
  loveSongsAlsoInOther.forEach(s => console.log(`  Overlap: ${s.title}`));
}

// Merge
const merged = [...nonLove, ...finalLove];
console.log(`\nTotal merged: ${merged.length}`);

// Category breakdown
const cats = {};
merged.forEach(s => { cats[s.category] = (cats[s.category] || 0) + 1; });
console.log('\nCategory breakdown:');
Object.entries(cats).sort((a,b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

// Write
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

console.log('\n✅ Both files updated');

// Print all love songs
console.log('\n🎵 All love songs:');
finalLove.forEach((s, i) => {
  console.log(`${String(i+1).padStart(3)}. ${s.title.substring(0,45).padEnd(45)} | ${s.artist.substring(0,30).padEnd(30)} | ${s.movie.substring(0,30)}`);
});
