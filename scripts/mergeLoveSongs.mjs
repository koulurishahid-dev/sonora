// mergeLoveSongs.mjs — Clean deduplicate the harvested love songs, merge with existing dataset
import fs from 'fs';

const harvested = JSON.parse(fs.readFileSync('love_songs_harvested.json', 'utf8'));
const existing = JSON.parse(fs.readFileSync('public/data/telugu_500_songs.json', 'utf8'));

// Aggressive title normalization
function normTitle(title) {
  return (title || '').toLowerCase()
    .replace(/\(from\s+"[^"]*"\)/gi, '')
    .replace(/\(telugu\)/gi, '')
    .replace(/\(original motion picture soundtrack\)/gi, '')
    .replace(/\(extended version\)/gi, '')
    .replace(/- lofi mix/gi, '')
    .replace(/lofi mix/gi, '')
    .replace(/theme\s*$/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

// Deduplicate: keep first occurrence by normalized title
const seen = new Set();
const uniqueLove = [];

for (const song of harvested) {
  const key = normTitle(song.title);
  if (key.length < 3) continue; // skip too-short titles
  if (seen.has(key)) continue;
  
  // Extra filter: skip "Theme" tracks
  const lowerTitle = song.title.toLowerCase();
  if (lowerTitle.includes('theme') && !lowerTitle.includes('love')) continue;
  
  seen.add(key);
  uniqueLove.push(song);
}

console.log(`Harvested: ${harvested.length} → Unique love songs: ${uniqueLove.length}`);

// Cap at 150
const finalLove = uniqueLove.slice(0, 150);
console.log(`Final love songs (capped at 150): ${finalLove.length}`);

// Re-index IDs
finalLove.forEach((s, i) => {
  s.id = `telugu_love_${i + 1}_${normTitle(s.title).substring(0, 25)}`;
  s.category = 'Love Songs';
  s.genre = 'Love Songs';
  // Clean HTML entities in titles
  s.title = s.title.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  s.artist = s.artist.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  s.movie = s.movie.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  s.album = s.album.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
});

// Remove old love songs from the existing dataset
const nonLove = existing.filter(s => s.category !== 'Love Songs');
console.log(`Non-love songs from existing dataset: ${nonLove.length}`);

// Combine: non-love songs + new 150 love songs
const merged = [...nonLove, ...finalLove];
console.log(`Total merged songs: ${merged.length}`);

// Category counts
const cats = {};
merged.forEach(s => { cats[s.category] = (cats[s.category] || 0) + 1; });
console.log('\nCategory breakdown:');
Object.entries(cats).sort((a,b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));

// Write merged JSON
fs.writeFileSync('public/data/telugu_500_songs.json', JSON.stringify(merged, null, 2));
console.log('\n✅ Written to public/data/telugu_500_songs.json');

// Generate TypeScript module
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
console.log('✅ Written to src/lib/telugu500Data.ts');

// Print first 30 love songs for verification
console.log('\n🎵 First 30 love songs:');
finalLove.slice(0, 30).forEach((s, i) => {
  console.log(`${i + 1}. ${s.title} — ${s.artist.substring(0, 50)} [${s.movie}] (${s.duration}s)`);
});
