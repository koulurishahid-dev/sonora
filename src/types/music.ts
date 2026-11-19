export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  year?: number;
  genre?: string;
  duration: number; // in seconds
  trackNumber?: number;
  bitrate?: number;
  codec?: string;
  fileSize?: number;
  hash: string; // for duplicate detection
  isLocal: boolean;
  sourceUrl?: string; // for stream/external links or object URLs
  providerType?: 'local' | 'stream' | 'external' | 'youtube' | 'spotify';
  youtubeId?: string; // extracted YouTube video ID for official embed
  spotifyId?: string; // extracted Spotify ID
  spotifyUrl?: string;
  category?: string; // e.g. 'Love Songs', 'Melodies', 'Mass & Beats', 'Golden Classics'
  artworkUrl?: string; // base64 or blob URL
  artworkBlob?: Blob;
  audioBlob?: Blob;
  dateAdded: number; // timestamp
  playCount: number;
  lastPlayedAt?: number;
  isFavorite: boolean;
  isOfflineAvailable: boolean;
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  year?: number;
  artworkUrl?: string;
  artworkBlob?: Blob;
  songCount: number;
  duration: number;
}

export interface Artist {
  id: string;
  name: string;
  artworkUrl?: string;
  artworkBlob?: Blob;
  songCount: number;
  albumCount: number;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  customArtwork?: string; // base64 or url
  artworkBlob?: Blob;
  createdAt: number;
  updatedAt: number;
  songIds?: string[];
}

export interface PlaylistSong {
  id: string;
  playlistId: string;
  songId: string;
  order: number;
  addedAt: number;
}

export interface Favorite {
  id: string;
  songId: string;
  addedAt: number;
}

export interface ListeningHistory {
  id: string;
  songId: string;
  playedAt: number;
  completed: boolean;
  durationPlayed: number;
}

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export interface SongLyrics {
  id: string;
  songId: string;
  plainLyrics?: string;
  syncedLyrics?: LyricLine[];
  updatedAt: number;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'amoled';
  accentColor: string; // hex code
  defaultVolume: number;
  crossfadeEnabled: boolean;
  crossfadeDuration: number; // seconds (1-10)
  autoplay: boolean;
  playbackMode: 'normal' | 'repeat-all' | 'repeat-one' | 'shuffle';
  eqPreset: 'flat' | 'bass-boost' | 'electronic' | 'vocal' | 'rock';
  bassGain: number; // -10 to +10 dB
  trebleGain: number; // -10 to +10 dB
  privacyLockEnabled?: boolean;
  privacyPasscode?: string;
  deviceSyncNoticeDismissed?: boolean;
  listenerName?: string;
  listenerAvatar?: string;
  listenerBio?: string;
  atmosphere?: 'night' | 'focus' | 'relax' | 'energy' | 'lavender' | 'amethyst' | 'obsidian';
  hapticSoundEnabled?: boolean;
}

export interface DownloadItem {
  id: string;
  songId: string;
  downloadedAt: number;
  size: number;
  status: 'pending' | 'completed' | 'failed';
}

export type ViewType = 
  | 'home'
  | 'explore'
  | 'search'
  | 'library'
  | 'all-songs'
  | 'playlists'
  | 'playlist-detail'
  | 'liked'
  | 'albums'
  | 'album-detail'
  | 'artists'
  | 'artist-detail'
  | 'recently-played'
  | 'analytics'
  | 'offline'
  | 'now-playing'
  | 'settings';

export type VisualizerMode = 'bars' | 'wave' | 'radial' | 'aura' | 'circle' | 'pulse';

export type EqPresetName = 'normal' | 'bass-boost' | 'treble-boost' | 'vocal' | 'classical' | 'custom';

export interface EqBands {
  band60: number;
  band250: number;
  band1k: number;
  band4k: number;
  band12k: number;
}
