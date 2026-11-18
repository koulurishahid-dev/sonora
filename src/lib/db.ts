import Dexie, { type Table } from 'dexie';
import JSZip from 'jszip';
import { cleanMusicTag, searchVerifiedArtwork } from './metadata';
import {
  Song,
  Album,
  Artist,
  Playlist,
  PlaylistSong,
  Favorite,
  ListeningHistory,
  SongLyrics,
  AppSettings,
  DownloadItem,
} from '@/types/music';

export class SonoraDatabase extends Dexie {
  songs!: Table<Song, string>;
  albums!: Table<Album, string>;
  artists!: Table<Artist, string>;
  playlists!: Table<Playlist, string>;
  playlistSongs!: Table<PlaylistSong, string>;
  favorites!: Table<Favorite, string>;
  listeningHistory!: Table<ListeningHistory, string>;
  lyrics!: Table<SongLyrics, string>;
  settings!: Table<{ key: string; value: any }, string>;
  downloads!: Table<DownloadItem, string>;

  constructor() {
    super('SonoraMusicDB');
    this.version(1).stores({
      songs: 'id, title, artist, album, year, genre, hash, isLocal, dateAdded, playCount, lastPlayedAt, isFavorite, isOfflineAvailable',
      albums: 'id, title, artist, year',
      artists: 'id, name',
      playlists: 'id, title, createdAt, updatedAt',
      playlistSongs: 'id, playlistId, songId, [playlistId+order]',
      favorites: 'id, songId, addedAt',
      listeningHistory: 'id, songId, playedAt',
      lyrics: 'id, songId, updatedAt',
      settings: 'key',
      downloads: 'id, songId, downloadedAt, status',
    });
  }
}

export const db = new SonoraDatabase();

// In-memory cache for ObjectURLs to prevent memory leaks and recreate cleanly
const objectUrlCache = new Map<string, string>();

export function getAudioObjectUrl(song: Song): string {
  // 1. Prioritize original audio stream sourceUrl (real original vocals & studio master)
  if (song.sourceUrl) {
    return song.sourceUrl;
  }
  // 2. For local uploaded files, use the blob object URL
  if (song.audioBlob) {
    const cacheKey = `audio_${song.id}`;
    if (objectUrlCache.has(cacheKey)) {
      return objectUrlCache.get(cacheKey)!;
    }
    const url = URL.createObjectURL(song.audioBlob);
    objectUrlCache.set(cacheKey, url);
    return url;
  }
  return '';
}

export function getArtworkObjectUrl(songOrArtwork: Song | Album | Artist | Playlist | Blob | undefined): string | undefined {
  if (!songOrArtwork) return undefined;
  
  if (songOrArtwork instanceof Blob) {
    const url = URL.createObjectURL(songOrArtwork);
    return url;
  }

  // 1. Prioritize permanent artworkBlob by generating a live, valid Object URL!
  if ('artworkBlob' in songOrArtwork && songOrArtwork.artworkBlob instanceof Blob) {
    const cacheKey = `art_${(songOrArtwork as any).id || (songOrArtwork as any).title}`;
    if (objectUrlCache.has(cacheKey)) {
      return objectUrlCache.get(cacheKey)!;
    }
    const url = URL.createObjectURL(songOrArtwork.artworkBlob);
    objectUrlCache.set(cacheKey, url);
    return url;
  }

  // 2. Only use artworkUrl if it is a valid remote (http/https) or data: URL.
  // Stale 'blob:' URLs from previous sessions MUST be ignored because they are dead on page reload!
  if ('artworkUrl' in songOrArtwork && songOrArtwork.artworkUrl) {
    if (!songOrArtwork.artworkUrl.startsWith('blob:')) {
      return songOrArtwork.artworkUrl;
    }
  }

  if ('customArtwork' in songOrArtwork && songOrArtwork.customArtwork) {
    if (!songOrArtwork.customArtwork.startsWith('blob:')) {
      return songOrArtwork.customArtwork;
    }
  }

  // 3. Dynamic Spotify fallback for any track or playlist missing artwork
  if ('category' in songOrArtwork || 'genre' in songOrArtwork) {
    const cat = (((songOrArtwork as any).category || (songOrArtwork as any).genre) || '').toLowerCase();
    if (cat.includes('love') || cat.includes('romance')) return '/covers/telugu_romance.jpg';
    if (cat.includes('mass') || cat.includes('beat') || cat.includes('party')) return '/covers/mass_party_beats.jpg';
    if (cat.includes('sid sriram')) return '/covers/sid_sriram_essentials.jpg';
    if (cat.includes('blockbuster') || cat.includes('composer')) return '/covers/blockbuster_hits.jpg';
    if (cat.includes('folk') || cat.includes('teenmaar')) return '/covers/folk_beats.jpg';
    if (cat.includes('90s') || cat.includes('vintage')) return '/covers/classics_90s.jpg';
    if (cat.includes('devotional') || cat.includes('spiritual')) return '/covers/devotional_classics.jpg';
    if (cat.includes('classic') || cat.includes('nostalgia')) return '/covers/golden_classics.jpg';
    if (cat.includes('melod')) return '/covers/soulful_melodies.jpg';
    return '/covers/hot_hits_telugu.jpg';
  }

  return '/covers/hot_hits_telugu.jpg';
}

export function revokeAudioObjectUrl(songId: string) {
  const cacheKey = `audio_${songId}`;
  const url = objectUrlCache.get(cacheKey);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(cacheKey);
  }
}

// Rebuild albums and artists indexes based on all current songs (with concurrency guard & bulkPut)
let syncPromise: Promise<void> | null = null;

export async function syncAlbumsAndArtists(): Promise<void> {
  if (syncPromise) {
    return syncPromise;
  }

  syncPromise = (async () => {
    try {
      const allSongs = await db.songs.toArray();
      const albumsMap = new Map<string, { artist: string; year?: number; artworkBlob?: Blob; count: number; duration: number }>();
      const artistsMap = new Map<string, { artworkBlob?: Blob; songs: Set<string>; albums: Set<string> }>();

      for (const song of allSongs) {
        // Albums grouping by title+artist
        const albumTitle = song.album || 'Unknown Album';
        const albumKey = `${albumTitle}:::${song.artist || 'Unknown Artist'}`.toLowerCase();
        
        if (!albumsMap.has(albumKey)) {
          albumsMap.set(albumKey, {
            artist: song.artist || 'Unknown Artist',
            year: song.year,
            artworkBlob: song.artworkBlob,
            count: 1,
            duration: song.duration,
          });
        } else {
          const existing = albumsMap.get(albumKey)!;
          existing.count += 1;
          existing.duration += song.duration;
          if (!existing.artworkBlob && song.artworkBlob) {
            existing.artworkBlob = song.artworkBlob;
          }
        }

        // Artists grouping
        const artistName = song.artist || 'Unknown Artist';
        const artistKey = artistName.toLowerCase();
        if (!artistsMap.has(artistKey)) {
          artistsMap.set(artistKey, {
            artworkBlob: song.artworkBlob,
            songs: new Set([song.id]),
            albums: new Set([albumTitle]),
          });
        } else {
          const existing = artistsMap.get(artistKey)!;
          existing.songs.add(song.id);
          existing.albums.add(albumTitle);
          if (!existing.artworkBlob && song.artworkBlob) {
            existing.artworkBlob = song.artworkBlob;
          }
        }
      }

      // Save to albums & artists tables atomically using a transaction and bulkPut
      await db.transaction('rw', [db.albums, db.artists], async () => {
        const newAlbums: Album[] = [];
        albumsMap.forEach((val, key) => {
          const title = key.split(':::')[0];
          newAlbums.push({
            id: `album_${key}`,
            title: title.charAt(0).toUpperCase() + title.slice(1),
            artist: val.artist,
            year: val.year,
            artworkBlob: val.artworkBlob,
            songCount: val.count,
            duration: Math.round(val.duration),
          });
        });

        await db.albums.clear();
        if (newAlbums.length > 0) {
          await db.albums.bulkPut(newAlbums);
        }

        const newArtists: Artist[] = [];
        artistsMap.forEach((val, key) => {
          newArtists.push({
            id: `artist_${key}`,
            name: key.charAt(0).toUpperCase() + key.slice(1),
            artworkBlob: val.artworkBlob,
            songCount: val.songs.size,
            albumCount: val.albums.size,
          });
        });

        await db.artists.clear();
        if (newArtists.length > 0) {
          await db.artists.bulkPut(newArtists);
        }
      });
    } catch (err) {
      console.warn('syncAlbumsAndArtists error:', err);
    } finally {
      syncPromise = null;
    }
  })();

  return syncPromise;
}

// Auto-repairs missing/broken artwork, clears dead blob: URLs, and cleans junk tags from titles
export async function repairLibraryArtworkAndTitles(
  onProgress?: (msg: string, percent: number) => void
): Promise<number> {
  const songs = await db.songs.toArray();
  let updatedCount = 0;
  const total = songs.length;

  let massAndClassics: any[] = [];
  let curatedSongs: any[] = [];
  try {
    const sp = await import('./spotifyService');
    const as = await import('./audioSynthesis');
    massAndClassics = sp.SPOTIFY_TELUGU_MASS_AND_CLASSICS || [];
    curatedSongs = as.CURATED_TELUGU_SONGS || [];
  } catch {
    // Non-blocking
  }

  for (let i = 0; i < total; i++) {
    const song = songs[i];
    let needsUpdate = false;
    let newArtworkUrl = song.artworkUrl;
    const newTitle = cleanMusicTag(song.title);
    const newArtist = cleanMusicTag(song.artist);
    const newAlbum = cleanMusicTag(song.album);

    if (newTitle !== song.title || newArtist !== song.artist || newAlbum !== song.album) {
      needsUpdate = true;
    }

    // Clear stale blob: URLs so permanent artworkBlob or verified artwork is used
    if (newArtworkUrl && newArtworkUrl.startsWith('blob:')) {
      newArtworkUrl = undefined;
      needsUpdate = true;
    }

    // Automatically synchronize with latest verified high-res iTunes artwork & active audio streams
    let newSourceUrl = song.sourceUrl;
    const curatedMatch =
      massAndClassics.find(
        c => c.title.toLowerCase().trim() === newTitle.toLowerCase().trim()
      ) ||
      curatedSongs.find(
        c => c.title.toLowerCase().trim() === newTitle.toLowerCase().trim()
      );

    if (curatedMatch) {
      if (curatedMatch.artworkUrl && song.artworkUrl !== curatedMatch.artworkUrl) {
        newArtworkUrl = curatedMatch.artworkUrl;
        needsUpdate = true;
      }
      if (curatedMatch.sourceUrl && song.sourceUrl !== curatedMatch.sourceUrl) {
        newSourceUrl = curatedMatch.sourceUrl;
        needsUpdate = true;
      }
    }

    // If no artworkBlob and no valid artworkUrl, search verified movie artwork!
    if (!song.artworkBlob && !newArtworkUrl) {
      if (onProgress) {
        onProgress(`Searching cover for ${newTitle}...`, Math.round(((i + 1) / total) * 100));
      }
      try {
        const query = `${newTitle} ${
          newAlbum && newAlbum !== 'Single' && newAlbum !== 'Unknown Album' ? newAlbum : ''
        }`.trim();
        const results = await searchVerifiedArtwork(query);
        if (results.length > 0 && results[0].artworkUrl) {
          newArtworkUrl = results[0].artworkUrl;
          needsUpdate = true;
        } else {
          // Try searching just album or title
          const subQuery =
            newAlbum && newAlbum !== 'Single' && newAlbum !== 'Unknown Album' ? newAlbum : newTitle;
          const subResults = await searchVerifiedArtwork(subQuery);
          if (subResults.length > 0 && subResults[0].artworkUrl) {
            newArtworkUrl = subResults[0].artworkUrl;
            needsUpdate = true;
          }
        }
      } catch {
        // Non-blocking
      }
    }

    if (needsUpdate) {
      await db.songs.update(song.id, {
        title: newTitle,
        artist: newArtist,
        album: newAlbum,
        artworkUrl: newArtworkUrl,
        sourceUrl: newSourceUrl,
      });
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    await syncAlbumsAndArtists();
  }

  return updatedCount;
}

// Storage space calculation
export async function getStorageEstimate(): Promise<{ usage: number; quota: number; percent: number }> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      const percent = quota > 0 ? (usage / quota) * 100 : 0;
      return { usage, quota, percent: Math.round(percent * 10) / 10 };
    } catch {
      return { usage: 0, quota: 0, percent: 0 };
    }
  }
  return { usage: 0, quota: 0, percent: 0 };
}

// Request persistent storage
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

// Database Export & Import
export async function exportDatabaseToJson(): Promise<string> {
  const songs = await db.songs.toArray();
  const playlists = await db.playlists.toArray();
  const playlistSongs = await db.playlistSongs.toArray();
  const favorites = await db.favorites.toArray();
  const listeningHistory = await db.listeningHistory.toArray();
  const lyrics = await db.lyrics.toArray();
  const settings = await db.settings.toArray();

  // Export metadata without huge binary blobs for lightweight backup
  const cleanSongs = songs.map(s => {
    const { audioBlob, artworkBlob, ...meta } = s;
    return meta;
  });

  const exportData = {
    version: 1,
    exportedAt: Date.now(),
    type: 'sonora-metadata-backup',
    data: {
      songs: cleanSongs,
      playlists,
      playlistSongs,
      favorites,
      listeningHistory,
      lyrics,
      settings,
    },
  };

  return JSON.stringify(exportData, null, 2);
}

export async function importDatabaseFromJson(jsonString: string): Promise<{ success: boolean; importedCount: number; message: string }> {
  try {
    const backup = JSON.parse(jsonString);
    if (!backup || !backup.data || (!backup.data.songs && !backup.data.playlists)) {
      return { success: false, importedCount: 0, message: 'Invalid Sonora backup file format.' };
    }

    const { songs = [], playlists = [], playlistSongs = [], favorites = [], lyrics = [], settings = [] } = backup.data;
    let count = 0;

    for (const song of songs) {
      const exists = await db.songs.get(song.id);
      if (!exists) {
        await db.songs.add(song);
        count++;
      }
    }

    for (const pl of playlists) {
      const exists = await db.playlists.get(pl.id);
      if (!exists) {
        await db.playlists.add(pl);
      }
    }

    for (const ps of playlistSongs) {
      const exists = await db.playlistSongs.get(ps.id);
      if (!exists) {
        await db.playlistSongs.add(ps);
      }
    }

    for (const fav of favorites) {
      const exists = await db.favorites.get(fav.id);
      if (!exists) {
        await db.favorites.add(fav);
      }
    }

    for (const lyr of lyrics) {
      const exists = await db.lyrics.get(lyr.id);
      if (!exists) {
        await db.lyrics.add(lyr);
      }
    }

    for (const st of settings) {
      await db.settings.put(st);
    }

    await syncAlbumsAndArtists();
    return { success: true, importedCount: count, message: `Successfully restored ${count} songs and metadata.` };
  } catch (err: any) {
    return { success: false, importedCount: 0, message: err?.message || 'Failed to parse backup JSON.' };
  }
}

// Complete Full Backup (Audio Files + Artwork + Metadata) in compressed ZIP
export async function exportFullLibraryZip(
  onProgress?: (percent: number, message: string) => void
): Promise<Blob> {
  const zip = new JSZip();
  const songs = await db.songs.toArray();
  const playlists = await db.playlists.toArray();
  const playlistSongs = await db.playlistSongs.toArray();
  const favorites = await db.favorites.toArray();
  const listeningHistory = await db.listeningHistory.toArray();
  const lyrics = await db.lyrics.toArray();
  const settings = await db.settings.toArray();

  if (onProgress) onProgress(10, 'Packing library metadata...');

  const metadataSongs = songs.map(s => {
    const { audioBlob, artworkBlob, ...rest } = s;
    return {
      ...rest,
      hasAudio: !!audioBlob,
      hasArtwork: !!artworkBlob,
    };
  });

  zip.file(
    'metadata.json',
    JSON.stringify(
      {
        version: 1,
        exportedAt: Date.now(),
        type: 'sonora-full-archive',
        data: {
          songs: metadataSongs,
          playlists,
          playlistSongs,
          favorites,
          listeningHistory,
          lyrics,
          settings,
        },
      },
      null,
      2
    )
  );

  const audioFolder = zip.folder('audio');
  const artworkFolder = zip.folder('artwork');

  let processed = 0;
  const total = Math.max(1, songs.length);

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    if (song.audioBlob && audioFolder) {
      audioFolder.file(`${song.id}.bin`, song.audioBlob);
    }
    if (song.artworkBlob && artworkFolder) {
      artworkFolder.file(`${song.id}.bin`, song.artworkBlob);
    }
    processed++;
    if (onProgress) {
      onProgress(10 + Math.round((processed / total) * 50), `Adding ${song.title}...`);
    }
  }

  if (onProgress) onProgress(65, 'Compressing audio archive...');

  const content = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    metadata => {
      if (onProgress) {
        onProgress(65 + Math.round(metadata.percent * 0.35), `Finalizing ZIP (${Math.round(metadata.percent)}%)`);
      }
    }
  );

  return content;
}

export async function importFullLibraryZip(
  file: File,
  onProgress?: (percent: number, message: string) => void
): Promise<{ success: boolean; importedCount: number; message: string }> {
  try {
    if (onProgress) onProgress(10, 'Reading archive...');
    const zip = await JSZip.loadAsync(file);

    const metaFile = zip.file('metadata.json');
    if (!metaFile) {
      return { success: false, importedCount: 0, message: 'Invalid backup archive: metadata.json missing.' };
    }

    if (onProgress) onProgress(30, 'Parsing library metadata...');
    const metaText = await metaFile.async('text');
    const backup = JSON.parse(metaText);

    const { songs = [], playlists = [], playlistSongs = [], favorites = [], lyrics = [], settings = [] } =
      backup.data || {};

    let count = 0;
    const total = Math.max(1, songs.length);

    for (let i = 0; i < songs.length; i++) {
      const s = songs[i];
      let audioBlob: Blob | undefined;
      let artworkBlob: Blob | undefined;

      const audioInZip = zip.file(`audio/${s.id}.bin`);
      if (audioInZip) {
        audioBlob = await audioInZip.async('blob');
      }

      const artInZip = zip.file(`artwork/${s.id}.bin`);
      if (artInZip) {
        artworkBlob = await artInZip.async('blob');
      }

      const songToSave: Song = {
        ...s,
        audioBlob: audioBlob || s.audioBlob,
        artworkBlob: artworkBlob || s.artworkBlob,
        artworkUrl: artworkBlob ? URL.createObjectURL(artworkBlob) : s.artworkUrl,
      };

      const exists = await db.songs.get(s.id);
      if (!exists) {
        await db.songs.add(songToSave);
        count++;
      } else {
        await db.songs.update(s.id, songToSave);
      }

      if (onProgress) {
        onProgress(30 + Math.round(((i + 1) / total) * 60), `Restoring ${s.title}...`);
      }
    }

    for (const pl of playlists) {
      const exists = await db.playlists.get(pl.id);
      if (!exists) await db.playlists.add(pl);
    }
    for (const ps of playlistSongs) {
      const exists = await db.playlistSongs.get(ps.id);
      if (!exists) await db.playlistSongs.add(ps);
    }
    for (const fav of favorites) {
      const exists = await db.favorites.get(fav.id);
      if (!exists) await db.favorites.add(fav);
    }
    for (const lyr of lyrics) {
      const exists = await db.lyrics.get(lyr.id);
      if (!exists) await db.lyrics.add(lyr);
    }
    for (const st of settings) {
      await db.settings.put(st);
    }

    if (onProgress) onProgress(95, 'Rebuilding albums and artists...');
    await syncAlbumsAndArtists();
    if (onProgress) onProgress(100, 'Restore complete!');

    return {
      success: true,
      importedCount: count,
      message: `Successfully restored ${count} songs with complete audio files & artwork!`,
    };
  } catch (err: any) {
    return { success: false, importedCount: 0, message: err?.message || 'Failed to extract backup archive.' };
  }
}

// Remove only generated sample songs
export async function resetGeneratedSampleSongs(): Promise<number> {
  const sampleSongs = await db.songs
    .filter(s => s.id.startsWith('sample_') || s.hash.startsWith('synth_'))
    .toArray();
  const ids = sampleSongs.map(s => s.id);
  if (ids.length > 0) {
    await db.songs.bulkDelete(ids);
    for (const id of ids) {
      await db.playlistSongs.where('songId').equals(id).delete();
      await db.favorites.where('songId').equals(id).delete();
      await db.listeningHistory.where('songId').equals(id).delete();
      await db.lyrics.where('songId').equals(id).delete();
      revokeAudioObjectUrl(id);
    }
    await syncAlbumsAndArtists();
  }
  return ids.length;
}

// Reset all songs completely from the library
export async function resetAllSongs(): Promise<number> {
  const all = await db.songs.toArray();
  const count = all.length;
  await db.songs.clear();
  await db.playlists.clear();
  await db.playlistSongs.clear();
  await db.favorites.clear();
  await db.listeningHistory.clear();
  await db.lyrics.clear();
  await db.albums.clear();
  await db.artists.clear();
  return count;
}

// Scans the library, identifies any duplicate song entries by title or audio URL, and deletes redundant copies
export async function deduplicateSongsInLibrary(): Promise<number> {
  const all = await db.songs.toArray();
  const seenKeys = new Map<string, Song>();
  const duplicateIdsToDelete: string[] = [];

  for (const song of all) {
    const normTitle = (song.title || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const normSource = song.sourceUrl ? song.sourceUrl.split('?')[0].split('/').pop() : '';
    const key = normSource || normTitle;

    if (seenKeys.has(key)) {
      duplicateIdsToDelete.push(song.id);
    } else {
      seenKeys.set(key, song);
    }
  }

  if (duplicateIdsToDelete.length > 0) {
    await db.songs.bulkDelete(duplicateIdsToDelete);
    for (const id of duplicateIdsToDelete) {
      await db.playlistSongs.where('songId').equals(id).delete();
      await db.favorites.where('songId').equals(id).delete();
      await db.listeningHistory.where('songId').equals(id).delete();
      await db.lyrics.where('songId').equals(id).delete();
      revokeAudioObjectUrl(id);
    }
    await syncAlbumsAndArtists();
  }

  return duplicateIdsToDelete.length;
}
