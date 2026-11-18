import fs from 'fs';

async function checkFile(filePath) {
  console.log(`Checking ${filePath}...`);
  const content = fs.readFileSync(filePath, 'utf-8');
  // Match image URLs
  const regex = /artworkUrl:\s*["'](https?:\/\/[^"']+)["']/g;
  let match;
  const urls = [];
  while ((match = regex.exec(content)) !== null) {
    urls.push(match[1]);
  }
  const uniqueUrls = [...new Set(urls)];
  console.log(`Found ${uniqueUrls.length} unique artwork URLs in ${filePath}`);

  const broken = [];
  for (const url of uniqueUrls) {
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.status !== 200) {
        broken.push({ url, status: res.status });
      }
    } catch (e) {
      broken.push({ url, status: 'ERROR: ' + e.message });
    }
  }

  console.log(`Broken count: ${broken.length}`);
  broken.forEach(b => console.log(`${b.status} -> ${b.url}`));
  return broken;
}

async function main() {
  await checkFile('src/lib/spotifyService.ts');
  await checkFile('src/lib/audioSynthesis.ts');
}

main();
