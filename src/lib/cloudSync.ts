import { db } from './db';
import { Song, Playlist, PlaylistSong, Favorite, ListeningHistory } from '@/types/music';

export interface CloudStatus {
  isConnected: boolean;
  database?: string;
  error?: string;
  hint?: string;
  counts?: {
    songs: number;
    playlists: number;
  };
}

// Check MongoDB health and connection status
export async function checkCloudDatabaseHealth(): Promise<CloudStatus> {
  try {
    const res = await fetch('/api/health', { cache: 'no-store' });
    const data = await res.json();
    if (res.ok && data.success) {
      return {
        isConnected: true,
        database: data.database,
        counts: data.counts,
      };
    } else {
      return {
        isConnected: false,
        error: data.error || 'Database unavailable',
        hint: data.hint,
      };
    }
  } catch (err: any) {
    return {
      isConnected: false,
      error: err?.message || 'Could not reach server API',
    };
  }
}

// Sync local IndexedDB records to MongoDB Atlas
export async function syncLocalToMongoDB(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    // 1. Check health first
    const health = await checkCloudDatabaseHealth();
    if (!health.isConnected) {
      return {
        success: false,
        error: health.error || 'MongoDB Atlas is not reachable. Check IP Whitelist.',
      };
    }

    // 2. Fetch local records (strip Blobs before sending JSON)
    const [rawSongs, rawPlaylists, playlistSongs, favorites, history] = await Promise.all([
      db.songs.toArray(),
      db.playlists.toArray(),
      db.playlistSongs.toArray(),
      db.favorites.toArray(),
      db.listeningHistory.toArray(),
    ]);

    const songs = rawSongs.map((s: Song) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { audioBlob, artworkBlob, ...rest } = s;
      return rest;
    });

    const playlists = rawPlaylists.map((p: Playlist) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { artworkBlob, ...rest } = p;
      return rest;
    });

    // 3. Post to /api/sync
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songs,
        playlists,
        playlistSongs,
        favorites,
        history,
      }),
    });

    const result = await res.json();
    if (res.ok && result.success) {
      return {
        success: true,
        message: `Successfully synced ${songs.length} songs and ${playlists.length} playlists to MongoDB Atlas!`,
      };
    } else {
      return {
        success: false,
        error: result.error || 'Sync request failed',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error during cloud sync',
    };
  }
}

// Background auto-sync trigger
let syncDebounceTimer: any = null;

export function triggerBackgroundCloudSync(delayMs = 3000) {
  if (typeof window === 'undefined') return;
  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);

  syncDebounceTimer = setTimeout(() => {
    syncLocalToMongoDB()
      .then(res => {
        if (res.success) {
          console.log('[MongoDB Cloud Sync]', res.message);
        } else {
          console.warn('[MongoDB Cloud Sync]', res.error);
        }
      })
      .catch(() => {});
  }, delayMs);
}
