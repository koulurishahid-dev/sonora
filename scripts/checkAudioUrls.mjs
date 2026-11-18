import fs from 'fs';

async function testSourceUrls(filePath) {
  console.log(`Checking audio source URLs in ${filePath}...`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const regex = /title:\s*["']([^"']+)["'][^}]+sourceUrl:\s*["']([^"']+)["']/g;
  let match;
  const list = [];
  while ((match = regex.exec(content)) !== null) {
    list.push({ title: match[1], url: match[2] });
  }

  console.log(`Found ${list.length} tracks with sourceUrl`);

  // Check first 15 tracks
  for (let i = 0; i < Math.min(15, list.length); i++) {
    const item = list[i];
    try {
      const res = await fetch(item.url, { method: 'HEAD' });
      console.log(`${res.status} | ${item.title} -> ${item.url.slice(0, 60)}...`);
    } catch (e) {
      console.log(`ERROR | ${item.title} -> ${e.message}`);
    }
  }
}

async function main() {
  await testSourceUrls('src/lib/spotifyService.ts');
}

main();
