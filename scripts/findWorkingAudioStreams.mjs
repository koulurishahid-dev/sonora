import fs from 'fs';

async function findWorkingAudio() {
  const content = fs.readFileSync('src/lib/audioSynthesis.ts', 'utf-8');
  const regex = /sourceUrl:\s*["']([^"']+)["']/g;
  let match;
  const urls = [];
  while ((match = regex.exec(content)) !== null) {
    urls.push(match[1]);
  }

  const unique = [...new Set(urls)];
  console.log(`Testing ${unique.length} unique audio URLs concurrently...`);

  const working = [];
  await Promise.all(
    unique.map(async (u) => {
      try {
        const res = await fetch(u, { method: 'HEAD' });
        if (res.status === 200) {
          working.push(u);
        }
      } catch (e) {
        // ignore
      }
    })
  );

  console.log(`Found ${working.length} working audio streams out of ${unique.length}:`);
  working.forEach(w => console.log(w));
}

findWorkingAudio();
