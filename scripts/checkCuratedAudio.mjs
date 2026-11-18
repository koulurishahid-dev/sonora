import fs from 'fs';

async function checkAudioInSynthesis() {
  const content = fs.readFileSync('src/lib/audioSynthesis.ts', 'utf-8');
  const regex = /title:\s*["']([^"']+)["'][^}]+sourceUrl:\s*["']([^"']+)["']/g;
  let match;
  const list = [];
  while ((match = regex.exec(content)) !== null) {
    list.push({ title: match[1], url: match[2] });
  }

  console.log(`Checking ${list.length} tracks in audioSynthesis.ts...`);
  let ok = 0;
  let fail = 0;
  for (const item of list) {
    try {
      const res = await fetch(item.url, { method: 'HEAD' });
      if (res.status === 200) {
        ok++;
      } else {
        fail++;
        console.log(`404: ${item.title}`);
      }
    } catch (e) {
      fail++;
      console.log(`ERR: ${item.title} -> ${e.message}`);
    }
  }
  console.log(`Results: ${ok} OK, ${fail} FAILED`);
}

checkAudioInSynthesis();
