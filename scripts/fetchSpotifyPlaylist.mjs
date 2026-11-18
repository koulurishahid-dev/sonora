import fs from 'fs';

async function fetchPlaylist() {
  // First try embed URL which gives server-rendered track list JSON!
  const embedUrl = 'https://open.spotify.com/embed/playlist/1BoRpOjbTUlsXSdAWOueXZ';
  console.log('Fetching embed URL:', embedUrl);
  const res = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const html = await res.text();
  console.log('Embed HTML length:', html.length);

  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (match) {
    const data = JSON.parse(match[1]);
    const entity = data?.props?.pageProps?.state?.data?.entity;
    console.log('Entity Name:', entity?.name);
    console.log('Entity Subtitle/Description:', entity?.description || entity?.subtitle);
    console.log('Total trackList count:', entity?.trackList?.length);
    if (entity?.trackList && entity.trackList.length > 0) {
      fs.writeFileSync('scripts/spotify_travel.json', JSON.stringify(entity.trackList, null, 2));
      console.log('Sample track 0:', entity.trackList[0]);
      return;
    }
  }

  // Fallback to main playlist page
  const mainUrl = 'https://open.spotify.com/playlist/1BoRpOjbTUlsXSdAWOueXZ';
  const mainRes = await fetch(mainUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });
  const mainHtml = await mainRes.text();
  const titleM = mainHtml.match(/<title>([^<]+)<\/title>/);
  console.log('Main Page Title:', titleM?.[1]);
  fs.writeFileSync('scripts/spotify_travel_raw.html', mainHtml);
}

fetchPlaylist();
