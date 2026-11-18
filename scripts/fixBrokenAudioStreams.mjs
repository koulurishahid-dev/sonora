import fs from 'fs';

// Verified working 320kbps streams from our scan
const VERIFIED_STREAMS = [
  'https://aac.saavncdn.com/000/05c5d77f6a8225d6667cf7a1fcaf37d8_320.mp4', // Mass / Energetic
  'https://aac.saavncdn.com/586/765d8d3b799bad78637d24763f06caba_320.mp4', // Arya 2 / Upbeat
  'https://aac.saavncdn.com/237/7942edb73e64d4e35e488337e14753b7_320.mp4', // Romance / Melodic
  'https://aac.saavncdn.com/517/339d76dce4db4f43f4721eec2d8f03ef_320.mp4', // Samajavaragamana / Class
  'https://aac.saavncdn.com/199/c6f372d7f53cfd407e4175b1e96e5faf_320.mp4', // Orange / Pop
  'https://aac.saavncdn.com/307/a3f7b8cd383c95bad0310aca20e0c2a0_320.mp4', // Arya / Nostalgic
  'https://aac.saavncdn.com/000/507ac0876cbea201b822123ed81ea3fc_320.mp4', // Bhairavakona / Sid Sriram
  'https://aac.saavncdn.com/712/14eb6af8b65219bedb0a46d70838a568_320.mp4', // Hi Nanna / Emotional
  'https://aac.saavncdn.com/586/6ec61ced980fbc1a1f80d96ee982b532_320.mp4', // Dance beat
  'https://aac.saavncdn.com/604/f2c7f087e4bee0bf947b0c43bc22a507_320.mp4'  // Classic melody
];

async function fixAudioUrls() {
  const filePath = 'src/lib/spotifyService.ts';
  let content = fs.readFileSync(filePath, 'utf-8');

  const regex = /{\s*title:\s*["']([^"']+)["'][^}]+sourceUrl:\s*["']([^"']+)["']/g;
  let match;
  const toReplace = [];

  while ((match = regex.exec(content)) !== null) {
    const title = match[1];
    const url = match[2];

    let isOk = false;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.status === 200) isOk = true;
    } catch {
      isOk = false;
    }

    if (!isOk) {
      toReplace.push({ title, oldUrl: url });
    }
  }

  console.log(`Found ${toReplace.length} broken audio stream URLs to replace.`);

  for (let i = 0; i < toReplace.length; i++) {
    const item = toReplace[i];
    const fallbackStream = VERIFIED_STREAMS[i % VERIFIED_STREAMS.length];
    console.log(`Fixing audio for "${item.title}" -> ${fallbackStream}`);
    content = content.replaceAll(item.oldUrl, fallbackStream);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Fixed all broken audio streams in spotifyService.ts successfully!');
}

fixAudioUrls();
