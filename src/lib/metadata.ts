import * as mmb from 'music-metadata-browser';
import { Song } from '@/types/music';
import { generateId } from './utils';

export interface ExtractedMetadata {
  title: string;
  artist: string;
  album: string;
  year?: number;
  genre?: string;
  duration: number;
  trackNumber?: number;
  bitrate?: number;
  codec?: string;
  artworkBlob?: Blob;
  artworkUrl?: string;
  hash: string;
}

// Compute a fast SHA-256 hash from file bytes for reliable duplicate detection
export async function computeFileHash(file: File | Blob): Promise<string> {
  try {
    // Read the first 128KB and the file size to get an instant unique fingerprint
    const slice = file.slice(0, 131072);
    const buffer = await slice.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `${file.size}_${hashHex.substring(0, 24)}`;
  } catch {
    // Fallback if subtle crypto is somehow unavailable
    return `${file.size}_${file.type}_${(file as File).name || 'audio'}`;
  }
}

// Clean filename to extract plausible title & artist if ID3 tags are missing
export function parseFilename(filename: string): { title: string; artist: string } {
  // Strip extension
  const base = filename.replace(/\.[^/.]+$/, '').trim();
  
  // Look for "Artist - Title" pattern
  if (base.includes(' - ')) {
    const parts = base.split(' - ');
    const artist = parts[0].replace(/^\d+[\s.-]+/, '').trim();
    const title = parts.slice(1).join(' - ').trim();
    return { title: title || base, artist: artist || 'Unknown Artist' };
  }

  // Strip leading track numbers like "01. Song", "01 - Song", "1 - Song"
  const cleanTitle = base.replace(/^\d+[\s.-]+/, '').trim();
  return {
    title: cleanTitle || base || 'Untitled Track',
    artist: 'Unknown Artist',
  };
}

// Read ID3 metadata from audio file
export async function extractAudioMetadata(file: File): Promise<ExtractedMetadata> {
  const hash = await computeFileHash(file);
  const fallback = parseFilename(file.name);

  try {
    const metadata = await mmb.parseBlob(file, { duration: true });
    const common = metadata.common;
    const format = metadata.format;

    let artworkBlob: Blob | undefined = undefined;
    let artworkUrl: string | undefined = undefined;

    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0];
      const mimeType = pic.format || 'image/jpeg';
      artworkBlob = new Blob([pic.data as unknown as BlobPart], { type: mimeType });
      artworkUrl = URL.createObjectURL(artworkBlob);
    }

    const title = (common.title && common.title.trim()) || fallback.title;
    const artist = (common.artist && common.artist.trim()) || fallback.artist;
    const album = (common.album && common.album.trim()) || 'Single';
    const year = common.year || undefined;
    const genre = (common.genre && common.genre[0]) || undefined;
    const duration = Math.round(format.duration || 0);
    const trackNumber = common.track?.no || undefined;
    const bitrate = format.bitrate ? Math.round(format.bitrate / 1000) : undefined;
    const codec = format.codec || undefined;

    return {
      title,
      artist,
      album,
      year,
      genre,
      duration,
      trackNumber,
      bitrate,
      codec,
      artworkBlob,
      artworkUrl,
      hash,
    };
  } catch (err) {
    console.warn('Metadata parsing fell back to filename:', err);
    // If metadata parsing fails, fallback to HTML5 Audio element to at least get duration
    const duration = await getAudioDurationFallback(file);
    return {
      title: fallback.title,
      artist: fallback.artist,
      album: 'Unknown Album',
      duration,
      hash,
    };
  }
}

// Fallback duration measurement using standard HTML5 Audio
export function getAudioDurationFallback(file: File | Blob): Promise<number> {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const dur = Math.round(audio.duration || 0);
      URL.revokeObjectURL(url);
      resolve(dur);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(0);
    };
    audio.src = url;
  });
}
