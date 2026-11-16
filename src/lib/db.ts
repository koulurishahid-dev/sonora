import Dexie, { type Table } from 'dexie';
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
  if (song.sourceUrl && !song.isLocal) {
    return song.sourceUrl;
  }
  if (!song.audioBlob) {
    return song.sourceUrl || '';
  }
  const cacheKey = `audio_${song.id}`;
  if (objectUrlCache.has(cacheKey)) {
    return objectUrlCache.get(cacheKey)!;
  }
  const url = URL.createObjectURL(song.audioBlob);
  objectUrlCache.set(cacheKey, url);
  return url;
}

export function getArtworkObjectUrl(songOrArtwork: Song | Album | Artist | Playlist | Blob | undefined): string | undefined {
  if (!songOrArtwork) return undefined;
  
  if (songOrArtwork instanceof Blob) {
    const url = URL.createObjectURL(songOrArtwork);
    return url;
  }

  if ('artworkUrl' in songOrArtwork && songOrArtwork.artworkUrl) {
    return songOrArtwork.artworkUrl;
  }

  if ('customArtwork' in songOrArtwork && songOrArtwork.customArtwork) {
    return songOrArtwork.customArtwork;
  }

  if ('artworkBlob' in songOrArtwork && songOrArtwork.artworkBlob) {
    const cacheKey = `art_${(songOrArtwork as any).id}`;
    if (objectUrlCache.has(cacheKey)) {
      return objectUrlCache.get(cacheKey)!;
    }
    const url = URL.createObjectURL(songOrArtwork.artworkBlob);
    objectUrlCache.set(cacheKey, url);
    return url;
  }

  return undefined;
}

export function revokeAudioObjectUrl(songId: string) {
  const cacheKey = `audio_${songId}`;
  const url = objectUrlCache.get(cacheKey);
  if (url) {
    URL.revokeObjectURL(url);
    objectUrlCache.delete(cacheKey);
  }
}

// Rebuild albums and artists indexes based on all current songs
export async function syncAlbumsAndArtists(): Promise<void> {
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

  // Save to albums table
  await db.albums.clear();
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
  if (newAlbums.length > 0) {
    await db.albums.bulkAdd(newAlbums);
  }

  // Save to artists table
  await db.artists.clear();
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
  if (newArtists.length > 0) {
    await db.artists.bulkAdd(newArtists);
  }
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
