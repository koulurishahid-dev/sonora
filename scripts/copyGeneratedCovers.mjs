import fs from 'fs';
import path from 'path';

const brainDir = 'C:/Users/SHAHID/.gemini/antigravity/brain/6fdb0859-f235-4a95-8395-bba9241aa74b';
const targetDir = path.resolve('public/covers');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const keys = [
  'hot_hits_telugu',
  'telugu_romance',
  'soulful_melodies',
  'mass_party_beats',
  'golden_classics',
  'sid_sriram_essentials',
  'blockbuster_hits'
];

const files = fs.readdirSync(brainDir);

keys.forEach(key => {
  // Find matching file
  const matching = files
    .filter(f => f.startsWith(key) && (f.endsWith('.jpg') || f.endsWith('.png')))
    .sort()
    .reverse();

  if (matching.length > 0) {
    const src = path.join(brainDir, matching[0]);
    const ext = path.extname(matching[0]);
    const dest = path.join(targetDir, `${key}${ext}`);
    fs.copyFileSync(src, dest);
    console.log(`Copied: ${matching[0]} -> ${key}${ext}`);
  } else {
    console.log(`Waiting for: ${key}`);
  }
});
