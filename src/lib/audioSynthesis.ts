import { Song, Playlist } from '@/types/music';
import { generateId } from './utils';
import { db, syncAlbumsAndArtists } from './db';
import { parseLrc } from '@/components/player/LyricsPanel';

// Helper to write a valid PCM 16-bit stereo WAV file from AudioBuffer
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const length = buffer.length;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  
  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);
  
  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }
  
  // RIFF header
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  
  // fmt subchunk
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  
  // data subchunk
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Interleave and write 16-bit PCM samples
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Generate warm acoustic/melodic audio buffer for any song
export async function synthesizeMelodyAudio(
  baseFreq: number,
  bpm: number,
  seconds: number
): Promise<Blob> {
  const sampleRate = 44100;
  const length = sampleRate * seconds;
  const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.7, 0);
  masterGain.gain.linearRampToValueAtTime(0.7, seconds - 2);
  masterGain.gain.linearRampToValueAtTime(0.001, seconds);
  masterGain.connect(offlineCtx.destination);

  // Soft Indian / Carnatic inspired acoustic scale intervals (major & minor pentatonic harmonics)
  const intervals = [0, 2, 4, 7, 9, 12, 14, 16];
  const beatDuration = 60 / bpm;
  const numNotes = Math.floor(seconds / (beatDuration * 2));

  for (let i = 0; i < numNotes; i++) {
    const time = i * beatDuration * 2;
    const noteInterval = intervals[i % intervals.length];
    const rootFreq = baseFreq * Math.pow(2, noteInterval / 12);

    // Warm Rhodes / Tanpura style harmonic tones
    [0, 7, 12].forEach((chordInterval, idx) => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();

      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(rootFreq * Math.pow(2, chordInterval / 12), time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.16, time + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.02, time + beatDuration * 2 - 0.1);
      gain.gain.linearRampToValueAtTime(0.0001, time + beatDuration * 2);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(time);
      osc.stop(time + beatDuration * 2);
    });

    // Warm deep bass note
    const bassOsc = offlineCtx.createOscillator();
    const bassGain = offlineCtx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(rootFreq / 2, time);

    bassGain.gain.setValueAtTime(0.001, time);
    bassGain.gain.linearRampToValueAtTime(0.2, time + 0.08);
    bassGain.gain.exponentialRampToValueAtTime(0.03, time + beatDuration * 2 - 0.1);
    bassGain.gain.linearRampToValueAtTime(0.0001, time + beatDuration * 2);

    bassOsc.connect(bassGain);
    bassGain.connect(masterGain);

    bassOsc.start(time);
    bassOsc.stop(time + beatDuration * 2);
  }

  // Soft vinyl ambience crackle / acoustic texture
  const noiseLength = seconds;
  const noiseBuffer = offlineCtx.createBuffer(1, sampleRate * noiseLength, sampleRate);
  const out = noiseBuffer.getChannelData(0);
  for (let s = 0; s < noiseBuffer.length; s++) {
    out[s] = (Math.random() * 2 - 1) * 0.008;
  }
  const noiseSource = offlineCtx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  const noiseFilter = offlineCtx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = 1000;
  noiseSource.connect(noiseFilter);
  noiseFilter.connect(masterGain);
  noiseSource.start(0);

  const rendered = await offlineCtx.startRendering();
  return audioBufferToWav(rendered);
}

export interface CuratedTrackDefinition {
  title: string;
  artist: string;
  movie: string;
  year: number;
  mood: string;
  artworkUrl: string;
  bpm: number;
  baseFreq: number;
  seconds: number;
  lyrics: string;
}

export const CURATED_TELUGU_SONGS: CuratedTrackDefinition[] = [
  {
    title: 'Inkem Inkem Inkem Kaavaale',
    artist: 'Sid Sriram',
    movie: 'Geetha Govindam',
    year: 2018,
    mood: 'Romantic Telugu Melodies',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/68/f1/52/68f1523b-3c40-f2cc-7d4a-376642897adb/cover.jpg/600x600bb.jpg',
    bpm: 96,
    baseFreq: 246.94, // B3
    seconds: 32,
    lyrics: `[00:00.00] Inkem Inkem Inkem Kaavaale...
[00:06.00] Chaalidi Chaale...
[00:10.50] Neekai Nuvve Vachhi Vaalave
[00:16.00] Kannula Munde...
[00:20.00] Gundellona Guvva Guvvai Vaalave...
[00:26.00] Vachhi Vaalave...`,
  },
  {
    title: 'Samajavaragamana',
    artist: 'Sid Sriram',
    movie: 'Ala Vaikunthapurramuloo',
    year: 2020,
    mood: 'Soulful Melodies',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/46/14/df/4614df1c-3f61-6bf5-5c3e-ee304895cfca/cover.jpg/600x600bb.jpg',
    bpm: 88,
    baseFreq: 261.63, // C4
    seconds: 30,
    lyrics: `[00:00.00] Samajavaragamana...
[00:06.00] Ninu Choosi Aagagalana...
[00:12.00] Manasu Meeda Vayasukunna Maata Cheppana...
[00:18.00] Nee Kaallani Pattukuni Vadalanannavi Choode Naa Kallu...
[00:24.00] Choode Naa Kallu...`,
  },
  {
    title: 'Vachindamma',
    artist: 'Sid Sriram',
    movie: 'Geetha Govindam',
    year: 2018,
    mood: 'Romantic Telugu Melodies',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/68/f1/52/68f1523b-3c40-f2cc-7d4a-376642897adb/cover.jpg/600x600bb.jpg',
    bpm: 92,
    baseFreq: 220, // A3
    seconds: 28,
    lyrics: `[00:00.00] Vachindamma Ee Janmaki Padahaaranaala Teerani Varame...
[00:08.00] Mechhindamma Naa Gundeki Saripoda Inka Ee Chirunavve...
[00:16.00] Vachindamma... Naa Pranama...`,
  },
  {
    title: 'Adiga Adiga',
    artist: 'Sid Sriram',
    movie: 'Ninnu Kori',
    year: 2017,
    mood: 'Heart Touching Songs',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/98/81/43/988143ca-e902-4e8a-977c-3e31eefcfaab/196925399784.jpg/600x600bb.jpg',
    bpm: 80,
    baseFreq: 196, // G3
    seconds: 30,
    lyrics: `[00:00.00] Adiga Adiga Ee Santhosham Ekkadidone...
[00:07.50] Nilisaa Nilisaa O Thuntarivai Nee Thalapulane...
[00:15.00] Nee Kallallo Chooppai Kaalam Aagindhe...
[00:22.00] Adiga Adiga...`,
  },
  {
    title: 'Maate Vinadhuga',
    artist: 'Sid Sriram',
    movie: 'Taxiwaala',
    year: 2018,
    mood: 'Late Night Vibes',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/94/1d/a0/941da079-ee93-ce60-6340-3c7d0f7633a3/cover.jpg/600x600bb.jpg',
    bpm: 90,
    baseFreq: 293.66, // D4
    seconds: 28,
    lyrics: `[00:00.00] Maate Vinadhuga Naa Manasu...
[00:06.00] Oohalake Veluthundi Vethuku...
[00:12.00] Nuvve Nannu Maarchesave...
[00:18.00] Naa Gundello Edo Melikeseve...`,
  },
  {
    title: 'Undiporaadhey',
    artist: 'Sid Sriram',
    movie: 'Hushaaru',
    year: 2018,
    mood: 'Heart Touching Songs',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/1b/41/ef/1b41ef56-4aef-56a6-bc40-648126458c8c/cover.jpg/600x600bb.jpg',
    bpm: 78,
    baseFreq: 174.61, // F3
    seconds: 30,
    lyrics: `[00:00.00] Undiporaadhey Gundene Hatthukuni...
[00:07.00] Nuvvu Leni Lokamlo Naake Emi Thochadhe...
[00:14.00] Praanam Loni Praaname Nuvve Kadaa...
[00:22.00] Undiporaadhey...`,
  },
  {
    title: 'Srivalli',
    artist: 'Sid Sriram',
    movie: 'Pushpa: The Rise',
    year: 2021,
    mood: 'Songs on Repeat',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/7e/78/81/7e78812c-0445-ebad-321c-1beebaaa328a/8902894361460_cover.jpg/600x600bb.jpg',
    bpm: 104,
    baseFreq: 246.94, // B3
    seconds: 28,
    lyrics: `[00:00.00] Choope Bangaramayene Srivalli...
[00:06.50] Maate Maanikyamayene...
[00:12.00] Nuvvu Nannu Choosina Vaipuki Lokame Tirigipoye...
[00:20.00] Srivalli...`,
  },
  {
    title: 'Kalaavathi',
    artist: 'Sid Sriram',
    movie: 'Sarkaru Vaari Paata',
    year: 2022,
    mood: 'Romantic Telugu Melodies',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/dd/13/96/dd1396a1-fd23-693c-137a-b10047cc2b78/196626439680.jpg/600x600bb.jpg',
    bpm: 95,
    baseFreq: 261.63, // C4
    seconds: 28,
    lyrics: `[00:00.00] Vanda Velavele Vennelaa...
[00:05.50] Naa Gundellona Chinduluraa...
[00:11.00] Anthaa Kalaavathi Kalavarame...
[00:16.50] Maguvaa O Kalaavathi...`,
  },
  {
    title: 'Aradhya',
    artist: 'Sid Sriram, Chinmayi',
    movie: 'Kushi',
    year: 2023,
    mood: 'Peaceful Songs',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/f5/a1/ed/f5a1ed5e-d3c2-a4dc-27df-2cedd9b159ec/197189406225.jpg/600x600bb.jpg',
    bpm: 84,
    baseFreq: 220, // A3
    seconds: 30,
    lyrics: `[00:00.00] Aradhya... Naa Premaki Aradhya...
[00:07.00] Nuvvante Naaku Praanam Kanna Ekkuva...
[00:14.00] Ee Janmaki Nuvve Naa Sathi...
[00:21.00] Aradhya...`,
  },
  {
    title: 'Okey Oka Lokam',
    artist: 'Sid Sriram',
    movie: 'Sashi',
    year: 2021,
    mood: 'Heart Touching Songs',
    artworkUrl:
      'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/c9/93/c9/c993c9fa-c5ba-f345-353b-432e9220e9ef/cover.jpg/600x600bb.jpg',
    bpm: 82,
    baseFreq: 196, // G3
    seconds: 30,
    lyrics: `[00:00.00] Okey Oka Lokam Nuvve...
[00:06.00] Lokamloni Andam Nuvve...
[00:12.00] Andaanike Hrudayam Nuvve...
[00:18.00] Naake Nuvvu Dakkavu Kadhe...
[00:24.00] Okey Oka Lokam...`,
  },
];

// Seed personal curated Telugu collection into IndexedDB
export async function seedCuratedPersonalMusic(
  onProgress?: (percent: number, trackName: string) => void
): Promise<number> {
  const songsCreated: Song[] = [];
  const total = CURATED_TELUGU_SONGS.length;

  for (let i = 0; i < total; i++) {
    const item = CURATED_TELUGU_SONGS[i];
    if (onProgress) {
      onProgress(Math.round(((i + 1) / total) * 70), `Harmonizing ${item.title}...`);
    }

    const audioBlob = await synthesizeMelodyAudio(item.baseFreq, item.bpm, item.seconds);
    const songId = `telugu_${generateId()}`;

    const song: Song = {
      id: songId,
      title: item.title,
      artist: item.artist,
      album: item.movie,
      year: item.year,
      genre: item.mood,
      duration: item.seconds,
      hash: `curated_${item.title.toLowerCase().replace(/\s+/g, '_')}`,
      isLocal: true,
      providerType: 'local',
      audioBlob,
      artworkUrl: item.artworkUrl,
      dateAdded: Date.now() - (total - i) * 1000 * 3600, // staggered timestamps
      playCount: Math.floor(Math.random() * 12) + 3,
      isFavorite: i < 5, // first 5 marked as favorite
      isOfflineAvailable: true,
    };

    await db.songs.put(song);
    songsCreated.push(song);

    // Also populate lyrics
    const parsed = parseLrc(item.lyrics);
    await db.lyrics.put({
      id: `lyrics_${songId}`,
      songId: songId,
      plainLyrics: item.lyrics,
      syncedLyrics: parsed,
      updatedAt: Date.now(),
    });

    if (song.isFavorite) {
      await db.favorites.put({
        id: `fav_${songId}`,
        songId: songId,
        addedAt: Date.now(),
      });
    }
  }

  if (onProgress) onProgress(80, 'Creating personal mixtapes...');

  // Create personal curated playlists
  const personalPlaylists = [
    {
      id: 'pl_telugu_favs',
      title: 'My Telugu Favourites',
      description: 'Songs that never get old — my cherished Telugu melodies and movie soundtracks.',
      customArtwork: CURATED_TELUGU_SONGS[0].artworkUrl,
      songIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
    {
      id: 'pl_sid_sriram',
      title: 'Sid Sriram Collection',
      description: 'The magical voice that defines my college days and late night memories.',
      customArtwork: CURATED_TELUGU_SONGS[1].artworkUrl,
      songIndices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
    {
      id: 'pl_romantic_melodies',
      title: 'Romantic Telugu Melodies',
      description: 'Warm chords, sweet lyrics, and memories hidden in melodies.',
      customArtwork: CURATED_TELUGU_SONGS[2].artworkUrl,
      songIndices: [0, 2, 7, 8],
    },
    {
      id: 'pl_late_night',
      title: 'Late Night Vibes',
      description: 'A quiet room, dim lights, and peaceful soulful tracks.',
      customArtwork: CURATED_TELUGU_SONGS[4].artworkUrl,
      songIndices: [1, 4, 5, 9],
    },
    {
      id: 'pl_heart_touching',
      title: 'Heart Touching Songs',
      description: 'Songs that evoke deep feelings and gentle nostalgia.',
      customArtwork: CURATED_TELUGU_SONGS[3].artworkUrl,
      songIndices: [3, 5, 9],
    },
  ];

  for (const p of personalPlaylists) {
    const existing = await db.playlists.get(p.id);
    if (!existing) {
      await db.playlists.add({
        id: p.id,
        title: p.title,
        description: p.description,
        customArtwork: p.customArtwork,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      for (let order = 0; order < p.songIndices.length; order++) {
        const songIdx = p.songIndices[order];
        if (songsCreated[songIdx]) {
          await db.playlistSongs.add({
            id: `${p.id}_${songsCreated[songIdx].id}`,
            playlistId: p.id,
            songId: songsCreated[songIdx].id,
            order,
            addedAt: Date.now(),
          });
        }
      }
    }
  }

  if (onProgress) onProgress(95, 'Syncing albums and artist collections...');
  await syncAlbumsAndArtists();
  if (onProgress) onProgress(100, 'Welcome to your music world!');

  return songsCreated.length;
}
