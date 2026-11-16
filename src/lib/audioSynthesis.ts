import { Song } from '@/types/music';
import { generateId } from './utils';

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
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, format, true); // AudioFormat
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * blockAlign, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitDepth, true); // BitsPerSample
  
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
      // Convert float [-1.0, 1.0] to int16 [-32768, 32767]
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

// Generate an artistic modern cover image via Canvas
export function generateCoverArt(title: string, artist: string, gradientType: number): Blob {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Blob();

  const gradients = [
    ['#1A102F', '#7928CA', '#FF0080'],
    ['#0F2027', '#203A43', '#2C5364'],
    ['#141E30', '#243B55', '#1ED760'],
    ['#3A1C71', '#D76D77', '#FFAF7B'],
    ['#0B0B0D', '#3B82F6', '#9333EA'],
  ];

  const colors = gradients[gradientType % gradients.length];
  const grad = ctx.createLinearGradient(0, 0, 400, 400);
  grad.addColorStop(0, colors[0]);
  grad.addColorStop(0.5, colors[1]);
  grad.addColorStop(1, colors[2]);

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 400, 400);

  // Draw glowing geometric circles & accents
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.arc(200, 200, 140, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Subtle vinyl grooves
  for (let r = 50; r <= 130; r += 20) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(200, 200, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Draw soundwave icon in center
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  const bars = [18, 32, 50, 68, 52, 74, 45, 60, 30, 16];
  const barWidth = 6;
  const gap = 6;
  const startX = 200 - (bars.length * (barWidth + gap)) / 2;
  bars.forEach((height, idx) => {
    const x = startX + idx * (barWidth + gap);
    const y = 200 - height / 2;
    ctx.beginPath();
    ctx.roundRect(x, y, barWidth, height, 3);
    ctx.fill();
  });

  // Track title & artist overlay
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 200, 330);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '14px system-ui, -apple-system, sans-serif';
  ctx.fillText(artist, 200, 355);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
  // Convert DataURL to Blob
  const byteString = atob(dataUrl.split(',')[1]);
  const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}

// Synthesize an ambient musical composition using OfflineAudioContext
export async function synthesizeTrack(
  name: string,
  artistName: string,
  albumName: string,
  bpm: number,
  baseFreq: number,
  seconds: number,
  gradientIndex: number
): Promise<Song> {
  const sampleRate = 44100;
  const length = sampleRate * seconds;
  const offlineCtx = new OfflineAudioContext(2, length, sampleRate);

  // Master Gain & Reverb-like filter
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.7, 0);
  masterGain.gain.linearRampToValueAtTime(0.7, seconds - 1.5);
  masterGain.gain.linearRampToValueAtTime(0.001, seconds);
  masterGain.connect(offlineCtx.destination);

  // Chord Progression (e.g. i - VI - III - VII)
  const semitones = [0, 3, 7, 10, 14, 15, 19];
  const noteDuration = (60 / bpm) * 2; // 2 beats per chord
  const numNotes = Math.floor(seconds / noteDuration);

  for (let i = 0; i < numNotes; i++) {
    const time = i * noteDuration;
    const chordRoot = baseFreq * Math.pow(2, ((i % 4) * 2) / 12);
    
    // Play a 3-note chord with soft warm sine/triangle waves
    [0, 3, 7].forEach((interval, noteIdx) => {
      const osc = offlineCtx.createOscillator();
      const noteGain = offlineCtx.createGain();

      osc.type = noteIdx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(chordRoot * Math.pow(2, interval / 12), time);

      // Envelope
      noteGain.gain.setValueAtTime(0.001, time);
      noteGain.gain.linearRampToValueAtTime(0.18, time + 0.1);
      noteGain.gain.exponentialRampToValueAtTime(0.02, time + noteDuration - 0.05);
      noteGain.gain.linearRampToValueAtTime(0.0001, time + noteDuration);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(time);
      osc.stop(time + noteDuration);
    });

    // Ambient Bass note
    const bassOsc = offlineCtx.createOscillator();
    const bassGain = offlineCtx.createGain();
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(chordRoot / 2, time);

    const bassFilter = offlineCtx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.setValueAtTime(220, time);

    bassGain.gain.setValueAtTime(0.001, time);
    bassGain.gain.linearRampToValueAtTime(0.15, time + 0.08);
    bassGain.gain.exponentialRampToValueAtTime(0.04, time + noteDuration - 0.1);
    bassGain.gain.linearRampToValueAtTime(0.0001, time + noteDuration);

    bassOsc.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(masterGain);

    bassOsc.start(time);
    bassOsc.stop(time + noteDuration);
  }

  // Soft rhythmic kick & hi-hat pulses
  const beatInterval = 60 / bpm;
  const numBeats = Math.floor(seconds / beatInterval);
  for (let b = 0; b < numBeats; b++) {
    const beatTime = b * beatInterval;
    
    // Kick drum on beats 0, 2, etc.
    if (b % 2 === 0) {
      const kickOsc = offlineCtx.createOscillator();
      const kickGain = offlineCtx.createGain();
      kickOsc.frequency.setValueAtTime(140, beatTime);
      kickOsc.frequency.exponentialRampToValueAtTime(35, beatTime + 0.15);

      kickGain.gain.setValueAtTime(0.3, beatTime);
      kickGain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.2);

      kickOsc.connect(kickGain);
      kickGain.connect(masterGain);

      kickOsc.start(beatTime);
      kickOsc.stop(beatTime + 0.22);
    }

    // Hi-hat noise on each beat
    const noiseLength = 0.05;
    const noiseBuffer = offlineCtx.createBuffer(1, sampleRate * noiseLength, sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let s = 0; s < noiseBuffer.length; s++) {
      output[s] = Math.random() * 2 - 1;
    }
    const noiseSource = offlineCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = offlineCtx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 7500;

    const noiseGain = offlineCtx.createGain();
    noiseGain.gain.setValueAtTime(0.06, beatTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, beatTime + noiseLength);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);

    noiseSource.start(beatTime);
    noiseSource.stop(beatTime + noiseLength);
  }

  // Render the audio buffer
  const renderedBuffer = await offlineCtx.startRendering();
  const audioBlob = audioBufferToWav(renderedBuffer);
  const artworkBlob = generateCoverArt(name, artistName, gradientIndex);

  const songId = `sample_${generateId()}`;
  return {
    id: songId,
    title: name,
    artist: artistName,
    album: albumName,
    year: 2026,
    genre: 'Electronic / Ambient',
    duration: seconds,
    hash: `synth_${songId}`,
    isLocal: true,
    providerType: 'local',
    audioBlob,
    artworkBlob,
    artworkUrl: URL.createObjectURL(artworkBlob),
    dateAdded: Date.now(),
    playCount: 0,
    isFavorite: false,
    isOfflineAvailable: true,
  };
}

export const SAMPLE_TRACK_DEFINITIONS = [
  {
    title: 'Midnight Reverie',
    artist: 'Aetheric Soundscape',
    album: 'Nocturnal Echoes',
    bpm: 85,
    baseFreq: 220, // A3
    seconds: 24,
    gradient: 0,
  },
  {
    title: 'Neon Horizons',
    artist: 'Solaris Wave',
    album: 'Synthetic Dreams',
    bpm: 100,
    baseFreq: 261.63, // C4
    seconds: 22,
    gradient: 1,
  },
  {
    title: 'Cosmic Drift',
    artist: 'Astral Odyssey',
    album: 'Deep Space Reverie',
    bpm: 72,
    baseFreq: 196, // G3
    seconds: 25,
    gradient: 2,
  },
  {
    title: 'Cyber Chill',
    artist: 'Luna Meridian',
    album: 'Digital Sunset',
    bpm: 90,
    baseFreq: 293.66, // D4
    seconds: 20,
    gradient: 3,
  },
];
