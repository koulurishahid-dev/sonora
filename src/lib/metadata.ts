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

// Clean junk website domains, bitrates, and track numbers from titles and artist tags
export function cleanMusicTag(str: string): string {
  if (!str) return '';
  return str
    // Remove common download site tags
    .replace(/::\s*sensongsmp3(\.com|\.co)?/gi, '')
    .replace(/\(?www\.sensongsmp3(\.com|\.co)?\)?/gi, '')
    .replace(/\[\s*sensongsmp3(\.com|\.co)?\s*\]/gi, '')
    .replace(/sensongsmp3(\.com|\.co)?/gi, '')
    .replace(/\(?www\.[a-z0-9-]+\.[a-z]{2,}\)?/gi, '')
    .replace(/\[[a-z0-9-]+\.[a-z]{2,}\]/gi, '')
    // Remove bitrates e.g. "- 320Kbps", "(128Kbps)"
    .replace(/-\s*(320|128|256)\s*kbps/gi, '')
    .replace(/\((320|128|256)\s*kbps\)/gi, '')
    // Remove leading track numbers e.g. "01 - ", "01. ", "1 - "
    .replace(/^\d+[\s.-]+/, '')
    // Remove trailing dashes or colons
    .replace(/[\s:-]+$/, '')
    .trim();
}

// Clean filename to extract plausible title & artist if ID3 tags are missing
export function parseFilename(filename: string): { title: string; artist: string } {
  // Strip extension
  const base = filename.replace(/\.[^/.]+$/, '').trim();
  
  // Look for "Artist - Title" pattern
  if (base.includes(' - ')) {
    const parts = base.split(' - ');
    const artist = cleanMusicTag(parts[0]);
    const title = cleanMusicTag(parts.slice(1).join(' - '));
    return { title: title || base, artist: artist || 'Unknown Artist' };
  }

  // Strip leading track numbers and junk
  const cleanTitle = cleanMusicTag(base);
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

    // Extract embedded ID3 picture as permanent binary Blob
    if (common.picture && common.picture.length > 0) {
      const pic = common.picture[0];
      const mimeType = pic.format || 'image/jpeg';
      artworkBlob = new Blob([pic.data as unknown as BlobPart], { type: mimeType });
      // IMPORTANT: Do NOT store temporary blob: URL in DB!
      // The artworkBlob is stored permanently in IndexedDB.
    }

    const rawTitle = (common.title && common.title.trim()) || fallback.title;
    const rawArtist = (common.artist && common.artist.trim()) || fallback.artist;
    const rawAlbum = (common.album && common.album.trim()) || 'Single';

    const title = cleanMusicTag(rawTitle);
    const artist = cleanMusicTag(rawArtist);
    const album = cleanMusicTag(rawAlbum);

    // If file has no embedded artwork, attempt automatic movie poster lookup from Apple Music
    if (!artworkBlob) {
      try {
        const query = album && album !== 'Single' && album !== 'Unknown Album' ? `${title} ${album}` : title;
        const verified = await searchVerifiedArtwork(query);
        if (verified.length > 0 && verified[0].artworkUrl) {
          artworkUrl = verified[0].artworkUrl;
        }
      } catch {
        // Non-blocking
      }
    }

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

export interface VerifiedArtworkResult {
  title: string;
  artist: string;
  album: string;
  artworkUrl: string;
}

// Search official verified album / movie soundtrack artwork from Apple Music CDN
export async function searchVerifiedArtwork(query: string): Promise<VerifiedArtworkResult[]> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=6`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.results) return [];
    return data.results
      .map((r: any) => ({
        title: r.trackName || '',
        artist: r.artistName || '',
        album: r.collectionName || '',
        artworkUrl: r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '600x600bb') : '',
      }))
      .filter((item: VerifiedArtworkResult) => item.artworkUrl);
  } catch (err) {
    console.warn('Failed to search verified artwork:', err);
    return [];
  }
}
