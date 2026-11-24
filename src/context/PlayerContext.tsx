'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Song, VisualizerMode, EqBands, EqPresetName } from '@/types/music';
import { db, getAudioObjectUrl, getArtworkObjectUrl } from '@/lib/db';
import { useTheme } from './ThemeContext';

export const EQ_PRESETS: Record<Exclude<EqPresetName, 'custom'>, EqBands> = {
  'normal': { band60: 0, band250: 0, band1k: 0, band4k: 0, band12k: 0 },
  'bass-boost': { band60: 6, band250: 4, band1k: 0, band4k: -1, band12k: -2 },
  'treble-boost': { band60: -2, band250: -1, band1k: 1, band4k: 4, band12k: 6 },
  'vocal': { band60: -3, band250: 1, band1k: 4, band4k: 3, band12k: 1 },
  'classical': { band60: 4, band250: 2, band1k: -1, band4k: 2, band12k: 4 },
};

/**
 * Fisher-Yates True Random Permutation (Spotify/JioSaavn standard)
 */
export function fisherYatesShuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';

  // Spotify 2-Tier Queue & Context Model
  queue: Song[]; // Derived active queue for backwards compatibility
  queueIndex: number;
  userQueue: Song[]; // Explicit user-added queue (Play Next / Add to Queue)
  contextQueue: Song[]; // Natural album/playlist tracklist
  contextIndex: number; // Position in context tracklist
  contextName: string; // e.g. "Romantic songs in Telugu", "Sid Sriram Hits"

  isNowPlayingOpen: boolean;
  isQueueOpen: boolean;
  isLyricsOpen: boolean;
  isSideViewOpen: boolean;
  visualizerMode: VisualizerMode;
  audioError: string | null;
  playbackRate: number;
  eqBands: EqBands;
  eqPreset: EqPresetName;

  // Advanced Listening: Sleep Timer & Crossfade
  sleepTimerOption: number | 'end-of-track' | null;
  sleepTimerRemaining: number | null; // in seconds
  setSleepTimer: (option: number | 'end-of-track' | null) => void;
  crossfadeDuration: number; // in seconds (0 to 12)
  setCrossfadeDuration: (sec: number) => void;
  isShortcutsOpen: boolean;
  setIsShortcutsOpen: (open: boolean) => void;

  // Actions
  playSong: (song: Song, newQueue?: Song[], contextTitle?: string) => Promise<void>;
  playContextWithShuffle: (songs: Song[], contextTitle?: string, startSong?: Song) => Promise<void>;
  playQueueIndex: (index: number) => Promise<void>;
  togglePlay: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seek: (time: number) => void;
  setVolume: (val: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setPlaybackRate: (rate: number) => void;
  setEqBand: (band: keyof EqBands, val: number) => void;
  setEqPreset: (preset: Exclude<EqPresetName, 'custom'>) => void;
  resetEq: () => void;

  // Queue Operations
  addToQueue: (song: Song) => void;
  playNext: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  clearUserQueue: () => void;
  removeUserQueueItem: (index: number) => void;
  reorderUserQueue: (newQueue: Song[]) => void;
  reorderQueue: (newQueue: Song[]) => void;

  toggleFavorite: (songId: string) => Promise<void>;
  setIsNowPlayingOpen: (open: boolean) => void;
  setIsQueueOpen: (open: boolean) => void;
  setIsLyricsOpen: (open: boolean) => void;
  setIsSideViewOpen: (open: boolean) => void;
  toggleSideView: () => void;
  setVisualizerMode: (mode: VisualizerMode) => void;
  getFrequencyData: () => Uint8Array | null;
  getTimeDomainData: () => Uint8Array | null;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useTheme();

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  const [shuffle, setShuffleState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('naa_paatalu_shuffle') === 'true';
    }
    return false;
  });

  const [repeat, setRepeatState] = useState<'off' | 'one' | 'all'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('naa_paatalu_repeat') as 'off' | 'one' | 'all';
      if (saved === 'off' || saved === 'one' || saved === 'all') return saved;
    }
    return 'off';
  });

  // Spotify 2-Tier Queue System:
  // 1. userQueue: tracks explicitly added by user ("Play Next" / "Add to Queue")
  // 2. contextQueue: original tracklist sequence of the active album/playlist/shelf
  // 3. contextIndex: position inside contextQueue
  // 4. shuffledContextIndices: randomized order of remaining context tracks when shuffle is on
  const [userQueue, setUserQueue] = useState<Song[]>([]);
  const [contextQueue, setContextQueue] = useState<Song[]>([]);
  const [contextIndex, setContextIndex] = useState<number>(-1);
  const [contextName, setContextName] = useState<string>('Music Collection');
  const [shuffledContextIndices, setShuffledContextIndices] = useState<number[]>([]);

  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isSideViewOpen, setIsSideViewOpen] = useState(false);

  // Synchronized Refs for event listeners & callbacks
  const userQueueRef = useRef<Song[]>([]);
  const contextQueueRef = useRef<Song[]>([]);
  const contextIndexRef = useRef<number>(-1);
  const shuffledIndicesRef = useRef<number[]>([]);
  const shuffleRef = useRef<boolean>(shuffle);
  const repeatRef = useRef<'off' | 'one' | 'all'>(repeat);
  const historyStackRef = useRef<Song[]>([]);
  const currentSongRef = useRef<Song | null>(null);
  const autoSkipCountRef = useRef<number>(0);

  useEffect(() => {
    userQueueRef.current = userQueue;
  }, [userQueue]);

  useEffect(() => {
    contextQueueRef.current = contextQueue;
  }, [contextQueue]);

  useEffect(() => {
    contextIndexRef.current = contextIndex;
  }, [contextIndex]);

  useEffect(() => {
    shuffledIndicesRef.current = shuffledContextIndices;
  }, [shuffledContextIndices]);

  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);

  useEffect(() => {
    repeatRef.current = repeat;
  }, [repeat]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  // Derived unified queue for UI components (Spotify Model: Now Playing + User Queue + Upcoming Context)
  const queue = useMemo(() => {
    const list: Song[] = [];
    if (currentSong) list.push(currentSong);
    list.push(...userQueue);

    if (contextQueue.length > 0) {
      if (shuffle && shuffledContextIndices.length > 0) {
        for (const idx of shuffledContextIndices) {
          if (idx >= 0 && idx < contextQueue.length) {
            const s = contextQueue[idx];
            if (s.id !== currentSong?.id && !userQueue.some(u => u.id === s.id)) {
              list.push(s);
            }
          }
        }
      } else {
        const start = Math.max(0, contextIndex + 1);
        for (let i = start; i < contextQueue.length; i++) {
          const s = contextQueue[i];
          if (s.id !== currentSong?.id && !userQueue.some(u => u.id === s.id)) {
            list.push(s);
          }
        }
      }
    }
    return list;
  }, [currentSong, userQueue, contextQueue, contextIndex, shuffle, shuffledContextIndices]);

  // Derived active queue index (Current song is always at 0 in the combined upcoming view)
  const queueIndex = useMemo(() => (currentSong ? 0 : -1), [currentSong]);

  // Auto-open sidebar on desktop screens (>=1024px), keep closed on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsSideViewOpen(true);
    }
  }, []);

  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('bars');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRateState] = useState<number>(1);
  const [eqPreset, setEqPresetState] = useState<EqPresetName>('normal');
  const [eqBands, setEqBands] = useState<EqBands>({
    band60: 0,
    band250: 0,
    band1k: 0,
    band4k: 0,
    band12k: 0,
  });

  // Advanced Listening Features State
  const [sleepTimerOption, setSleepTimerOption] = useState<number | 'end-of-track' | null>(null);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(null);
  const originalVolumeBeforeFadeRef = useRef<number>(0.8);
  const [crossfadeDuration, setCrossfadeDurationState] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('naa_paatalu_crossfade_duration');
      if (saved) return parseInt(saved, 10);
    }
    return 2; // Default 2 seconds
  });
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Audio elements and Web Audio API nodes
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const band60Ref = useRef<BiquadFilterNode | null>(null);
  const band250Ref = useRef<BiquadFilterNode | null>(null);
  const band1kRef = useRef<BiquadFilterNode | null>(null);
  const band4kRef = useRef<BiquadFilterNode | null>(null);
  const band12kRef = useRef<BiquadFilterNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isSwitchingTrackRef = useRef(false);
  const nextTrackRef = useRef<() => void>(() => {});
  const prevTrackRef = useRef<() => void>(() => {});

  const setCrossfadeDuration = useCallback((sec: number) => {
    const clamped = Math.max(0, Math.min(12, sec));
    setCrossfadeDurationState(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('naa_paatalu_crossfade_duration', clamped.toString());
    }
  }, []);

  const setSleepTimer = useCallback((option: number | 'end-of-track' | null) => {
    setSleepTimerOption(option);
    if (audioRef.current) {
      originalVolumeBeforeFadeRef.current = audioRef.current.volume || 0.8;
    }
    if (option === null) {
      setSleepTimerRemaining(null);
      if (audioRef.current) {
        audioRef.current.volume = originalVolumeBeforeFadeRef.current;
      }
    } else if (option === 'end-of-track') {
      setSleepTimerRemaining(null);
    } else {
      setSleepTimerRemaining(option * 60);
    }
  }, []);

  // Sleep Timer Countdown & Smooth Volume Fadeout Loop
  useEffect(() => {
    if (typeof sleepTimerRemaining !== 'number') return;
    if (sleepTimerRemaining <= 0) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.volume = originalVolumeBeforeFadeRef.current;
      }
      setIsPlaying(false);
      setSleepTimerOption(null);
      setSleepTimerRemaining(null);
      return;
    }

    const timer = setInterval(() => {
      setSleepTimerRemaining(prev => {
        if (prev === null) return null;
        const next = prev - 1;
        if (next <= 15 && next > 0 && audioRef.current) {
          const fadeRatio = next / 15;
          audioRef.current.volume = originalVolumeBeforeFadeRef.current * fadeRatio;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sleepTimerRemaining]);

  // Initialize Web Audio API 5-Band Equalizer nodes
  const initWebAudio = useCallback(() => {
    if (!audioRef.current || audioCtxRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      ctx.onstatechange = () => {
        if (ctx.state === 'suspended' && audioRef.current && !audioRef.current.paused) {
          ctx.resume().catch(() => {});
        }
      };

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // 60 Hz Sub-bass (lowshelf)
      const f60 = ctx.createBiquadFilter();
      f60.type = 'lowshelf';
      f60.frequency.value = 60;
      f60.gain.value = eqBands.band60;
      band60Ref.current = f60;

      // 250 Hz Bass (peaking)
      const f250 = ctx.createBiquadFilter();
      f250.type = 'peaking';
      f250.frequency.value = 250;
      f250.Q.value = 1.0;
      f250.gain.value = eqBands.band250;
      band250Ref.current = f250;

      // 1000 Hz Midrange (peaking)
      const f1k = ctx.createBiquadFilter();
      f1k.type = 'peaking';
      f1k.frequency.value = 1000;
      f1k.Q.value = 1.0;
      f1k.gain.value = eqBands.band1k;
      band1kRef.current = f1k;

      // 4000 Hz Treble / Presence (peaking)
      const f4k = ctx.createBiquadFilter();
      f4k.type = 'peaking';
      f4k.frequency.value = 4000;
      f4k.Q.value = 1.0;
      f4k.gain.value = eqBands.band4k;
      band4kRef.current = f4k;

      // 12000 Hz Brilliance / Air (highshelf)
      const f12k = ctx.createBiquadFilter();
      f12k.type = 'highshelf';
      f12k.frequency.value = 12000;
      f12k.gain.value = eqBands.band12k;
      band12kRef.current = f12k;

      // Master Gain for smooth crossfade transitions
      const masterGain = ctx.createGain();
      masterGain.gain.value = 1.0;
      masterGainRef.current = masterGain;

      // Connect 5-band filter pipeline:
      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;
      source.connect(f60);
      f60.connect(f250);
      f250.connect(f1k);
      f1k.connect(f4k);
      f4k.connect(f12k);
      f12k.connect(analyser);
      analyser.connect(masterGain);
      masterGain.connect(ctx.destination);
    } catch (e) {
      console.warn('Web Audio initialization error (may already be bound):', e);
    }
  }, [eqBands]);

  // Apply changes to EQ bands in real-time
  const setEqBand = useCallback((band: keyof EqBands, val: number) => {
    setEqBands(prev => {
      const next = { ...prev, [band]: val };
      if (band === 'band60' && band60Ref.current) band60Ref.current.gain.value = val;
      if (band === 'band250' && band250Ref.current) band250Ref.current.gain.value = val;
      if (band === 'band1k' && band1kRef.current) band1kRef.current.gain.value = val;
      if (band === 'band4k' && band4kRef.current) band4kRef.current.gain.value = val;
      if (band === 'band12k' && band12kRef.current) band12kRef.current.gain.value = val;
      return next;
    });
    setEqPresetState('custom');
  }, []);

  const setEqPreset = useCallback((preset: Exclude<EqPresetName, 'custom'>) => {
    const target = EQ_PRESETS[preset];
    if (!target) return;
    setEqPresetState(preset);
    setEqBands(target);
    if (band60Ref.current) band60Ref.current.gain.value = target.band60;
    if (band250Ref.current) band250Ref.current.gain.value = target.band250;
    if (band1kRef.current) band1kRef.current.gain.value = target.band1k;
    if (band4kRef.current) band4kRef.current.gain.value = target.band4k;
    if (band12kRef.current) band12kRef.current.gain.value = target.band12k;
  }, []);

  const resetEq = useCallback(() => {
    setEqPreset('normal');
  }, [setEqPreset]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  }, []);

  // Helper to sync MediaSession position state for lock screen / recent tabs
  const syncPositionState = useCallback(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !('setPositionState' in navigator.mediaSession)) return;
    if (!audioRef.current) return;
    const d = audioRef.current.duration;
    if (!isNaN(d) && isFinite(d) && d > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: d,
          playbackRate: audioRef.current.playbackRate || 1,
          position: Math.min(Math.max(0, audioRef.current.currentTime), d),
        });
      } catch (err) {}
    }
  }, []);

  // Create persistent Audio Element configured for background playback & screen-off persistence
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let audio = document.getElementById('sonora-core-audio') as HTMLAudioElement | null;
    if (!audio) {
      audio = new Audio();
      audio.id = 'sonora-core-audio';
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      audio.setAttribute('x-webkit-airplay', 'allow');
      audio.style.display = 'none';
      if (document.body) {
        document.body.appendChild(audio);
      }
    }
    audioRef.current = audio;

    const onPlay = () => {
      setIsPlaying(true);
      setAudioError(null);
      autoSkipCountRef.current = 0;
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
      syncPositionState();
    };

    const onPause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
      syncPositionState();
    };

    const onTimeUpdate = () => {
      if (audioRef.current && !isSwitchingTrackRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    const onDurationChange = () => {
      if (audioRef.current) {
        const d = audioRef.current.duration;
        if (!isNaN(d) && d > 0) {
          setDuration(d);
          syncPositionState();
        }
      }
    };

    const onError = (e: Event) => {
      console.warn('Audio playback notice (source link temporarily unavailable or interrupted):', e);
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }

      // Spotify resilient recovery: auto-skip to next playable track (with 4-skip circuit breaker)
      if (autoSkipCountRef.current < 4) {
        autoSkipCountRef.current += 1;
        setAudioError('Stream unavailable. Automatically advancing to next track...');
        setTimeout(() => {
          nextTrackRef.current();
        }, 500);
      } else {
        setAudioError('Network or audio stream unavailable. Check connection.');
        autoSkipCountRef.current = 0;
      }
    };

    const onVisibilityChange = async () => {
      if (audioRef.current && !audioRef.current.paused) {
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          try {
            await audioCtxRef.current.resume();
          } catch (e) {
            console.warn('Auto-resuming AudioContext on visibility change:', e);
          }
        }
        if ('mediaSession' in navigator) {
          navigator.mediaSession.playbackState = 'playing';
        }
      }
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('error', onError);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Restore last played track and position from local storage
    const restoreSavedSession = async () => {
      try {
        const lastSongId = localStorage.getItem('sonora_last_song_id');
        const lastTime = parseFloat(localStorage.getItem('sonora_last_time') || '0');
        const lastVol = parseFloat(localStorage.getItem('sonora_volume') || '0.8');

        if (audio) {
          audio.volume = lastVol;
        }
        setVolumeState(lastVol);

        if (lastSongId) {
          const song = await db.songs.get(lastSongId);
          if (song && audio) {
            setCurrentSong(song);
            setContextQueue([song]);
            setContextIndex(0);
            setDuration(song.duration);
            const url = getAudioObjectUrl(song);
            audio.src = url;
            if (lastTime > 0 && lastTime < song.duration) {
              audio.currentTime = lastTime;
              setCurrentTime(lastTime);
            }
          }
        }
      } catch (err) {
        console.warn('Failed restoring playback session:', err);
      }
    };
    restoreSavedSession();

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('error', onError);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [syncPositionState]);

  // Save current time and track to localStorage periodically
  const lastSaveTimeRef = useRef<number>(0);
  useEffect(() => {
    if (!currentSong || currentTime <= 0) return;
    const now = Date.now();
    if (now - lastSaveTimeRef.current >= 5000) {
      lastSaveTimeRef.current = now;
      try {
        localStorage.setItem('sonora_last_song_id', currentSong.id);
        localStorage.setItem('sonora_last_time', currentTime.toString());
      } catch {}
    }
  }, [currentSong, currentTime]);

  // Update Media Session API for lock screen and native media controls
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !currentSong) return;

    try {
      const artworkSrc = getArtworkObjectUrl(currentSong);
      const artworkList: MediaImage[] = [];

      if (artworkSrc) {
        artworkList.push(
          { src: artworkSrc, sizes: '96x96', type: 'image/jpeg' },
          { src: artworkSrc, sizes: '128x128', type: 'image/jpeg' },
          { src: artworkSrc, sizes: '192x192', type: 'image/jpeg' },
          { src: artworkSrc, sizes: '256x256', type: 'image/jpeg' },
          { src: artworkSrc, sizes: '384x384', type: 'image/jpeg' },
          { src: artworkSrc, sizes: '512x512', type: 'image/jpeg' }
        );
      } else {
        artworkList.push({ src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' });
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album || contextName || 'Naa Paatalu Studio',
        artwork: artworkList,
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      navigator.mediaSession.setActionHandler('play', async () => {
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume().catch(() => {});
        }
        try {
          await audioRef.current?.play();
        } catch (e) {}
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prevTrackRef.current();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        nextTrackRef.current();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
          syncPositionState();
        }
      });

      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        if (audioRef.current) {
          const offset = details.seekOffset || 10;
          const target = Math.max(0, audioRef.current.currentTime - offset);
          audioRef.current.currentTime = target;
          setCurrentTime(target);
          syncPositionState();
        }
      });

      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        if (audioRef.current) {
          const offset = details.seekOffset || 10;
          const maxD = audioRef.current.duration || 0;
          const target = Math.min(maxD, audioRef.current.currentTime + offset);
          audioRef.current.currentTime = target;
          setCurrentTime(target);
          syncPositionState();
        }
      });

      navigator.mediaSession.setActionHandler('stop', () => {
        audioRef.current?.pause();
        setIsPlaying(false);
      });
    } catch (e) {
      console.warn('MediaSession configuration error:', e);
    }
  }, [currentSong, isPlaying, contextName, syncPositionState]);

  // Visualizer data extractors
  const cachedFreqDataRef = useRef<Uint8Array | null>(null);
  const cachedTimeDataRef = useRef<Uint8Array | null>(null);

  const getFrequencyData = useCallback((): Uint8Array | null => {
    if (!analyserRef.current) return null;
    const count = analyserRef.current.frequencyBinCount;
    if (!cachedFreqDataRef.current || cachedFreqDataRef.current.length !== count) {
      cachedFreqDataRef.current = new Uint8Array(count);
    }
    analyserRef.current.getByteFrequencyData(cachedFreqDataRef.current as any);
    return cachedFreqDataRef.current;
  }, []);

  const getTimeDomainData = useCallback((): Uint8Array | null => {
    if (!analyserRef.current) return null;
    const count = analyserRef.current.frequencyBinCount;
    if (!cachedTimeDataRef.current || cachedTimeDataRef.current.length !== count) {
      cachedTimeDataRef.current = new Uint8Array(count);
    }
    analyserRef.current.getByteTimeDomainData(cachedTimeDataRef.current as any);
    return cachedTimeDataRef.current;
  }, []);

  // Smart Autoplay recommendations for when a playlist reaches the end (Spotify Autoplay)
  const fetchAutoplayRecommendations = async (lastSong: Song, currentContext: Song[]): Promise<Song[]> => {
    try {
      const existingIds = new Set(currentContext.map(s => s.id));
      let candidates: Song[] = [];
      if (lastSong.artist) {
        const byArtist = await db.songs.where('artist').equalsIgnoreCase(lastSong.artist).toArray();
        candidates.push(...byArtist.filter(s => !existingIds.has(s.id)));
      }
      if (candidates.length < 5 && lastSong.genre) {
        const byGenre = await db.songs.where('genre').equalsIgnoreCase(lastSong.genre).toArray();
        for (const s of byGenre) {
          if (!existingIds.has(s.id) && !candidates.some(c => c.id === s.id)) {
            candidates.push(s);
            if (candidates.length >= 10) break;
          }
        }
      }
      if (candidates.length < 5) {
        const fallbackSongs = await db.songs.limit(25).toArray();
        for (const s of fallbackSongs) {
          if (!existingIds.has(s.id) && !candidates.some(c => c.id === s.id)) {
            candidates.push(s);
            if (candidates.length >= 8) break;
          }
        }
      }
      return fisherYatesShuffle(candidates).slice(0, 5);
    } catch {
      return [];
    }
  };

  // Core audio player starter with smooth crossfading & stats logging
  const startAudioPlayback = async (song: Song) => {
    setAudioError(null);
    if (!audioRef.current) return;

    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    } else {
      initWebAudio();
    }

    setCurrentSong(song);
    setDuration(song.duration || 0);

    // If official YouTube embed, handle without HTML5 Audio conflict
    if (song.providerType === 'youtube') {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setIsPlaying(true);
      setCurrentTime(0);
      setIsNowPlayingOpen(true);
      await db.songs.update(song.id, {
        playCount: (song.playCount || 0) + 1,
        lastPlayedAt: Date.now(),
      });
      await db.listeningHistory.add({
        id: `${Date.now()}_${song.id}`,
        songId: song.id,
        playedAt: Date.now(),
        completed: false,
        durationPlayed: 0,
      });
      return;
    }

    const audioUrl = getAudioObjectUrl(song);
    if (!audioUrl) {
      setAudioError('Audio source is missing or unavailable.');
      return;
    }

    isSwitchingTrackRef.current = true;

    // Crossfade ramp-out on current track if actively playing
    if (crossfadeDuration > 0 && isPlaying && masterGainRef.current && audioCtxRef.current) {
      try {
        const now = audioCtxRef.current.currentTime;
        const halfFade = Math.min(1.5, crossfadeDuration / 2);
        masterGainRef.current.gain.cancelScheduledValues(now);
        masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, now);
        masterGainRef.current.gain.linearRampToValueAtTime(0.01, now + halfFade);
        await new Promise(r => setTimeout(r, halfFade * 1000));
      } catch (e) {}
    }

    audioRef.current.src = audioUrl;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      isSwitchingTrackRef.current = false;

      // Crossfade ramp-in on new track
      if (crossfadeDuration > 0 && masterGainRef.current && audioCtxRef.current) {
        try {
          const now = audioCtxRef.current.currentTime;
          const halfFade = Math.min(1.5, crossfadeDuration / 2);
          masterGainRef.current.gain.cancelScheduledValues(now);
          masterGainRef.current.gain.setValueAtTime(0.01, now);
          masterGainRef.current.gain.linearRampToValueAtTime(1.0, now + halfFade);
        } catch (e) {}
      } else if (masterGainRef.current) {
        masterGainRef.current.gain.value = 1.0;
      }

      await db.songs.update(song.id, {
        playCount: (song.playCount || 0) + 1,
        lastPlayedAt: Date.now(),
      });
      await db.listeningHistory.add({
        id: `${Date.now()}_${song.id}`,
        songId: song.id,
        playedAt: Date.now(),
        completed: false,
        durationPlayed: 0,
      });
    } catch (err: any) {
      isSwitchingTrackRef.current = false;
      console.warn('Playback play request was prevented or failed:', err);
      if (err.name !== 'AbortError') {
        setAudioError('Audio playback restricted. Tap anywhere to allow audio.');
      }
    }
  };

  /**
   * Play Song action (Spotify 2-Tier Architecture):
   * Sets the context queue (original album/playlist), determines the starting song,
   * respects current shuffle state, and pushes to listening history.
   */
  const playSong = async (song: Song, newQueue?: Song[], contextTitle?: string) => {
    if (currentSong && currentSong.id !== song.id) {
      historyStackRef.current.push(currentSong);
      if (historyStackRef.current.length > 100) historyStackRef.current.shift();
    }

    if (contextTitle) {
      setContextName(contextTitle);
    }

    if (newQueue && newQueue.length > 0) {
      setContextQueue(newQueue);
      const songIdx = newQueue.findIndex(s => s.id === song.id);
      const targetIdx = songIdx !== -1 ? songIdx : 0;
      setContextIndex(targetIdx);

      // If shuffle is active, create randomized upcoming sequence while keeping current song first
      if (shuffleRef.current) {
        const remainingIndices: number[] = [];
        for (let i = 0; i < newQueue.length; i++) {
          if (i !== targetIdx) remainingIndices.push(i);
        }
        const shuffled = fisherYatesShuffle(remainingIndices);
        setShuffledContextIndices([targetIdx, ...shuffled]);
      } else {
        setShuffledContextIndices([]);
      }
    } else {
      // Single track click without context list
      const idx = contextQueueRef.current.findIndex(s => s.id === song.id);
      if (idx !== -1) {
        setContextIndex(idx);
      } else {
        setContextQueue([song]);
        setContextIndex(0);
        setShuffledContextIndices([]);
      }
    }

    await startAudioPlayback(song);
  };

  /**
   * Spotify-style "Shuffle Play" action for Playlist/Album/Artist pages:
   * Turns shuffle ON, preserves natural order in contextQueue, picks a starting song,
   * and creates a randomized sequence for the rest.
   */
  const playContextWithShuffle = async (songs: Song[], contextTitle?: string, startSong?: Song) => {
    if (songs.length === 0) return;

    if (contextTitle) {
      setContextName(contextTitle);
    }

    // Turn shuffle ON
    setShuffleState(true);
    shuffleRef.current = true;
    if (typeof window !== 'undefined') {
      localStorage.setItem('naa_paatalu_shuffle', 'true');
    }

    // Preserve original tracklist in contextQueue
    setContextQueue(songs);

    // Pick starting song (either explicit startSong or random index)
    const initialIdx = startSong
      ? Math.max(0, songs.findIndex(s => s.id === startSong.id))
      : Math.floor(Math.random() * songs.length);

    const selectedSong = songs[initialIdx];
    setContextIndex(initialIdx);

    // Shuffle remaining indices
    const otherIndices: number[] = [];
    for (let i = 0; i < songs.length; i++) {
      if (i !== initialIdx) otherIndices.push(i);
    }
    const shuffledRemainder = fisherYatesShuffle(otherIndices);
    setShuffledContextIndices([initialIdx, ...shuffledRemainder]);

    await startAudioPlayback(selectedSong);
  };

  /**
   * Play directly from an index in the combined queue:
   * Checks if it's within userQueue or contextQueue and handles transition smoothly.
   */
  const playQueueIndex = async (index: number) => {
    if (index < 0 || index >= queue.length) return;
    const targetSong = queue[index];

    if (currentSong && currentSong.id !== targetSong.id) {
      historyStackRef.current.push(currentSong);
      if (historyStackRef.current.length > 100) historyStackRef.current.shift();
    }

    // Check if targetSong was in userQueue
    const userQIdx = userQueue.findIndex(s => s.id === targetSong.id);
    if (userQIdx !== -1) {
      // Remove all user queue items up to and including this one
      setUserQueue(prev => prev.slice(userQIdx + 1));
    } else {
      // Find within contextQueue
      const ctxIdx = contextQueue.findIndex(s => s.id === targetSong.id);
      if (ctxIdx !== -1) {
        setContextIndex(ctxIdx);
        if (shuffleRef.current) {
          const remainingIndices: number[] = [];
          for (let i = 0; i < contextQueue.length; i++) {
            if (i !== ctxIdx) remainingIndices.push(i);
          }
          const shuffled = fisherYatesShuffle(remainingIndices);
          setShuffledContextIndices([ctxIdx, ...shuffled]);
        }
      }
    }

    await startAudioPlayback(targetSong);
  };

  // Toggle Play/Pause
  const togglePlay = async () => {
    if (!audioRef.current) return;
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (!currentSong && queue.length > 0) {
        await playSong(queue[0]);
      } else if (audioRef.current.src) {
        try {
          await audioRef.current.play();
        } catch (e) {
          console.warn('Playback error:', e);
        }
      }
    }
  };

  // Seek
  const seek = (time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
    syncPositionState();
  };

  /**
   * Toggle Shuffle (Spotify Model):
   * When turned ON: randomizes upcoming context indices, keeping current track and user queue intact.
   * When turned OFF: immediately restores natural tracklist order from current position onwards.
   */
  const toggleShuffle = () => {
    const nextShuffle = !shuffleRef.current;
    shuffleRef.current = nextShuffle;
    setShuffleState(nextShuffle);
    if (typeof window !== 'undefined') {
      localStorage.setItem('naa_paatalu_shuffle', nextShuffle ? 'true' : 'false');
    }

    if (nextShuffle) {
      // ON: Generate randomized order for remaining context tracks
      if (contextQueueRef.current.length > 1) {
        const curIdx = contextIndexRef.current >= 0 ? contextIndexRef.current : 0;
        const otherIndices: number[] = [];
        for (let i = 0; i < contextQueueRef.current.length; i++) {
          if (i !== curIdx) otherIndices.push(i);
        }
        const shuffled = fisherYatesShuffle(otherIndices);
        setShuffledContextIndices([curIdx, ...shuffled]);
      }
    } else {
      // OFF: Revert to natural playlist order
      setShuffledContextIndices([]);
    }
  };

  // Toggle Repeat: 'off' -> 'all' -> 'one' -> 'off'
  const toggleRepeat = () => {
    setRepeatState(prev => {
      let next: 'off' | 'all' | 'one' = 'off';
      if (prev === 'off') next = 'all';
      else if (prev === 'all') next = 'one';
      else next = 'off';

      repeatRef.current = next;
      if (typeof window !== 'undefined') {
        localStorage.setItem('naa_paatalu_repeat', next);
      }
      return next;
    });
  };

  /**
   * Next Track (Spotify Progression):
   * 1. If repeat === 'one': loop current track.
   * 2. If userQueue has items: play next user-queued item.
   * 3. Else play next from contextQueue (shuffled or sequential).
   * 4. If end of context reached:
   *    - If repeat === 'all': loop context back to start.
   *    - If repeat === 'off': Smart Autoplay recommendations.
   */
  const nextTrack = useCallback(async () => {
    // 1. Single track repeat
    if (repeatRef.current === 'one' && currentSongRef.current) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
      return;
    }

    // 2. Play next song from User Queue (highest priority)
    if (userQueueRef.current.length > 0) {
      if (currentSongRef.current) {
        historyStackRef.current.push(currentSongRef.current);
        if (historyStackRef.current.length > 100) historyStackRef.current.shift();
      }
      const [nextSong, ...remainingUserQueue] = userQueueRef.current;
      setUserQueue(remainingUserQueue);
      await startAudioPlayback(nextSong);
      return;
    }

    // 3. Context queue progression
    const ctx = contextQueueRef.current;
    if (ctx.length > 0) {
      if (shuffleRef.current && shuffledIndicesRef.current.length > 0) {
        const curOrderPos = shuffledIndicesRef.current.findIndex(idx => idx === contextIndexRef.current);
        const nextOrderPos = curOrderPos !== -1 ? curOrderPos + 1 : 1;

        if (nextOrderPos < shuffledIndicesRef.current.length) {
          const nextTargetIdx = shuffledIndicesRef.current[nextOrderPos];
          if (nextTargetIdx >= 0 && nextTargetIdx < ctx.length) {
            if (currentSongRef.current) {
              historyStackRef.current.push(currentSongRef.current);
              if (historyStackRef.current.length > 100) historyStackRef.current.shift();
            }
            setContextIndex(nextTargetIdx);
            await startAudioPlayback(ctx[nextTargetIdx]);
            return;
          }
        }
      } else {
        // Sequential natural order
        const nextIdx = contextIndexRef.current + 1;
        if (nextIdx < ctx.length) {
          if (currentSongRef.current) {
            historyStackRef.current.push(currentSongRef.current);
            if (historyStackRef.current.length > 100) historyStackRef.current.shift();
          }
          setContextIndex(nextIdx);
          await startAudioPlayback(ctx[nextIdx]);
          return;
        }
      }

      // 4. End of context reached
      if (repeatRef.current === 'all') {
        if (currentSongRef.current) historyStackRef.current.push(currentSongRef.current);
        if (shuffleRef.current && ctx.length > 1) {
          const allIndices = ctx.map((_, i) => i);
          const freshShuffle = fisherYatesShuffle(allIndices);
          setShuffledContextIndices(freshShuffle);
          setContextIndex(freshShuffle[0]);
          await startAudioPlayback(ctx[freshShuffle[0]]);
        } else {
          setContextIndex(0);
          await startAudioPlayback(ctx[0]);
        }
        return;
      }
    }

    // 5. Smart Autoplay when playlist ends (Spotify feature)
    if (currentSongRef.current) {
      const recs = await fetchAutoplayRecommendations(currentSongRef.current, ctx);
      if (recs.length > 0) {
        historyStackRef.current.push(currentSongRef.current);
        const updated = [...ctx, ...recs];
        setContextQueue(updated);
        const nextPos = ctx.length;
        setContextIndex(nextPos);
        await startAudioPlayback(recs[0]);
        return;
      }
    }

    setIsPlaying(false);
  }, []);

  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  /**
   * Previous Track (Spotify 3-Second Rule):
   * 1. If played > 3 seconds, restart current track from 0:00.
   * 2. If <= 3 seconds, pop previous track from historyStack.
   * 3. Fallback: previous track in context queue.
   */
  const prevTrack = useCallback(async () => {
    if (!audioRef.current) return;

    // 1. Spotify 3-second restart rule
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      syncPositionState();
      return;
    }

    // 2. Pop from real listening history (Spotify behavior)
    if (historyStackRef.current.length > 0) {
      const prevSong = historyStackRef.current.pop()!;
      const idxInCtx = contextQueueRef.current.findIndex(s => s.id === prevSong.id);
      if (idxInCtx !== -1) {
        setContextIndex(idxInCtx);
      }
      await startAudioPlayback(prevSong);
      return;
    }

    // 3. Fallback: previous slot in context
    const ctx = contextQueueRef.current;
    if (shuffleRef.current && shuffledIndicesRef.current.length > 0) {
      const curOrderPos = shuffledIndicesRef.current.findIndex(idx => idx === contextIndexRef.current);
      if (curOrderPos > 0) {
        const prevTargetIdx = shuffledIndicesRef.current[curOrderPos - 1];
        setContextIndex(prevTargetIdx);
        await startAudioPlayback(ctx[prevTargetIdx]);
        return;
      }
    } else if (contextIndexRef.current > 0) {
      const prevIdx = contextIndexRef.current - 1;
      setContextIndex(prevIdx);
      await startAudioPlayback(ctx[prevIdx]);
      return;
    }

    // 4. Wrap to end of context if repeat === 'all'
    if (repeatRef.current === 'all' && ctx.length > 0) {
      const lastIdx = ctx.length - 1;
      setContextIndex(lastIdx);
      await startAudioPlayback(ctx[lastIdx]);
      return;
    }

    audioRef.current.currentTime = 0;
    setCurrentTime(0);
  }, [syncPositionState]);

  useEffect(() => {
    prevTrackRef.current = prevTrack;
  }, [prevTrack]);

  // Handle Track Ended (triggers next track or sleep timer finish)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (sleepTimerOption === 'end-of-track') {
        if (audioRef.current) audioRef.current.pause();
        setIsPlaying(false);
        setSleepTimerOption(null);
        setSleepTimerRemaining(null);
        return;
      }
      nextTrack();
    };

    audio.addEventListener('ended', onEnded);
    return () => audio.removeEventListener('ended', onEnded);
  }, [nextTrack, sleepTimerOption]);

  // Volume
  const setVolume = (val: number) => {
    const v = Math.max(0, Math.min(1, val));
    setVolumeState(v);
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : v;
    }
    localStorage.setItem('sonora_volume', v.toString());
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioRef.current.volume = nextMuted ? 0 : volume;
  };

  /**
   * Spotify User Queue Operations:
   * addToQueue: appends to userQueue (plays next after other user-queued songs, before playlist resumes).
   * playNext: inserts at index 0 of userQueue (plays immediately next).
   */
  const addToQueue = (song: Song) => {
    if (!currentSong) {
      playSong(song);
      return;
    }
    setUserQueue(prev => [...prev, song]);
  };

  const playNext = (song: Song) => {
    if (!currentSong) {
      playSong(song);
      return;
    }
    setUserQueue(prev => [song, ...prev]);
  };

  const removeFromQueue = (index: number) => {
    // If index is within userQueue
    if (index > 0 && index <= userQueue.length) {
      const userQIdx = index - 1;
      setUserQueue(prev => prev.filter((_, i) => i !== userQIdx));
      return;
    }

    // If removing from upcoming context tracks
    const contextOffset = index - 1 - userQueue.length;
    if (contextOffset >= 0 && contextOffset < contextQueue.length) {
      setContextQueue(prev => {
        const copy = [...prev];
        copy.splice(contextIndex + 1 + contextOffset, 1);
        return copy;
      });
    }
  };

  const clearUserQueue = () => {
    setUserQueue([]);
  };

  const removeUserQueueItem = (index: number) => {
    setUserQueue(prev => prev.filter((_, i) => i !== index));
  };

  const reorderUserQueue = (newQueue: Song[]) => {
    setUserQueue(newQueue);
  };

  const clearQueue = () => {
    setUserQueue([]);
    if (currentSong) {
      setContextQueue([currentSong]);
      setContextIndex(0);
      setShuffledContextIndices([]);
    } else {
      setContextQueue([]);
      setContextIndex(-1);
      setShuffledContextIndices([]);
    }
  };

  const reorderQueue = (newQueue: Song[]) => {
    // If reordering the unified queue, update userQueue with any tracks between current and context
    if (currentSong && newQueue.length > 1) {
      const withoutCurrent = newQueue.filter(s => s.id !== currentSong.id);
      setUserQueue(withoutCurrent.slice(0, userQueue.length));
    }
  };

  // Toggle favorite
  const toggleFavorite = async (songId: string) => {
    const song = await db.songs.get(songId);
    if (!song) return;
    const nextFav = !song.isFavorite;
    await db.songs.update(songId, { isFavorite: nextFav });
    if (nextFav) {
      await db.favorites.put({ id: `fav_${songId}`, songId, addedAt: Date.now() });
    } else {
      await db.favorites.delete(`fav_${songId}`);
    }

    if (currentSong && currentSong.id === songId) {
      setCurrentSong(prev => prev ? { ...prev, isFavorite: nextFav } : null);
    }
    setUserQueue(prev => prev.map(s => s.id === songId ? { ...s, isFavorite: nextFav } : s));
    setContextQueue(prev => prev.map(s => s.id === songId ? { ...s, isFavorite: nextFav } : s));
  };

  // Global Keyboard Shortcuts (Space, Arrow keys, N, P, S, R, M, L, Q, F, ?)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seek(Math.max(0, currentTime - 5));
          break;
        case 'ArrowRight':
          e.preventDefault();
          seek(Math.min(duration, currentTime + 5));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyS':
          e.preventDefault();
          toggleShuffle();
          break;
        case 'KeyR':
          e.preventDefault();
          toggleRepeat();
          break;
        case 'KeyH':
          if (currentSong) {
            e.preventDefault();
            toggleFavorite(currentSong.id);
          }
          break;
        case 'KeyL':
          e.preventDefault();
          setIsLyricsOpen(prev => !prev);
          break;
        case 'KeyQ':
          e.preventDefault();
          setIsQueueOpen(prev => !prev);
          break;
        case 'KeyF':
          e.preventDefault();
          setIsNowPlayingOpen(prev => !prev);
          break;
        case 'Slash':
          if (e.shiftKey) {
            e.preventDefault();
            setIsShortcutsOpen(prev => !prev);
          }
          break;
        case 'KeyN':
          e.preventDefault();
          nextTrack();
          break;
        case 'KeyP':
          e.preventDefault();
          prevTrack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, volume, nextTrack, prevTrack, currentSong, isPlaying, toggleMute, toggleShuffle, toggleRepeat, toggleFavorite]);

  const toggleSideView = useCallback(() => {
    setIsSideViewOpen(prev => !prev);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        volume,
        isMuted,
        shuffle,
        repeat,
        queue,
        queueIndex,
        userQueue,
        contextQueue,
        contextIndex,
        contextName,
        isNowPlayingOpen,
        isQueueOpen,
        isLyricsOpen,
        isSideViewOpen,
        visualizerMode,
        audioError,
        playbackRate,
        eqBands,
        eqPreset,
        sleepTimerOption,
        sleepTimerRemaining,
        setSleepTimer,
        crossfadeDuration,
        setCrossfadeDuration,
        isShortcutsOpen,
        setIsShortcutsOpen,
        playSong,
        playContextWithShuffle,
        playQueueIndex,
        togglePlay,
        nextTrack,
        prevTrack,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        setPlaybackRate,
        setEqBand,
        setEqPreset,
        resetEq,
        addToQueue,
        playNext,
        removeFromQueue,
        clearQueue,
        clearUserQueue,
        removeUserQueueItem,
        reorderUserQueue,
        reorderQueue,
        toggleFavorite,
        setIsNowPlayingOpen,
        setIsQueueOpen,
        setIsLyricsOpen,
        setIsSideViewOpen,
        toggleSideView,
        setVisualizerMode,
        getFrequencyData,
        getTimeDomainData,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
