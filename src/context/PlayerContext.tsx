'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
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

interface PlayerContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  queue: Song[];
  queueIndex: number;
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
  playSong: (song: Song, newQueue?: Song[]) => Promise<void>;
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
  addToQueue: (song: Song) => void;
  playNext: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
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
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<'off' | 'one' | 'all'>('off');
  const [queue, setQueue] = useState<Song[]>([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [isNowPlayingOpen, setIsNowPlayingOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isSideViewOpen, setIsSideViewOpen] = useState(false);

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
        // Gradual fade out over the final 15 seconds
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

      // Auto-resume AudioContext if the browser attempts to suspend it during screen off or background tabs
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
      // source -> 60Hz -> 250Hz -> 1kHz -> 4kHz -> 12kHz -> analyser -> masterGain -> destination
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
      // Attributes for background audio playback on mobile browsers (iOS & Android)
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
      setAudioError('Audio stream unavailable. Skipping to next playable track...');
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
      setTimeout(() => {
        nextTrackRef.current();
      }, 1200);
    };

    // Auto-resume AudioContext when app is placed in recent tabs or screen turns off/on
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
            setQueue([song]);
            setQueueIndex(0);
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

  // Save current time and track to localStorage periodically (throttled to at most every 5 seconds)
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

  // Update Media Session API for lock screen and native media controls (Android, iOS, Windows, macOS)
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
        album: currentSong.album || 'Naa Paatalu Studio',
        artwork: artworkList,
      });

      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Full action handlers for native lock screen & notification controls
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
  }, [currentSong, isPlaying, syncPositionState]);

  // Visualizer data extractors (reusing typed arrays to eliminate frame garbage collection)
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

  // Play Song action
  const playSong = async (song: Song, newQueue?: Song[]) => {
    setAudioError(null);
    if (!audioRef.current) return;

    // Resume AudioContext non-blockingly so playback start is instantaneous even in background tabs
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    } else {
      initWebAudio();
    }

    let activeQueue = newQueue || queue;
    let idx = activeQueue.findIndex(s => s.id === song.id);

    if (newQueue) {
      setQueue(newQueue);
      if (idx === -1) {
        setQueue([song, ...newQueue]);
        idx = 0;
      }
      setQueueIndex(idx);
    } else if (idx === -1) {
      setQueue(prev => [...prev, song]);
      setQueueIndex(queue.length);
    } else {
      setQueueIndex(idx);
    }

    setCurrentSong(song);
    setDuration(song.duration || 0);

    // If official YouTube embed, handle separately without HTML5 Audio tag conflict
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

      // Track play count and listening history
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
        setAudioError('Unable to start playback. Check browser autoplay permissions.');
      }
    }
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
  };

  // Next Track
  const nextTrack = useCallback(() => {
    if (queue.length === 0) return;

    if (repeat === 'one' && currentSong) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    let nextIdx: number;
    if (shuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = queueIndex + 1;
    }

    if (nextIdx >= queue.length) {
      if (repeat === 'all') {
        nextIdx = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }

    playSong(queue[nextIdx]);
  }, [queue, queueIndex, repeat, shuffle, currentSong]);

  // Keep refs synchronized for native MediaSession background callbacks
  useEffect(() => {
    nextTrackRef.current = nextTrack;
  }, [nextTrack]);

  // Previous Track
  const prevTrack = useCallback(() => {
    if (!audioRef.current) return;
    // If more than 3 seconds played, restart track
    if (audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    if (queue.length === 0) return;
    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = repeat === 'all' ? queue.length - 1 : 0;
    }
    playSong(queue[prevIdx]);
  }, [queue, queueIndex, repeat]);

  useEffect(() => {
    prevTrackRef.current = prevTrack;
  }, [prevTrack]);

  // Handle Track Ended
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
  }, [nextTrack]);

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

  const toggleShuffle = () => setShuffle(prev => !prev);

  const toggleRepeat = () => {
    setRepeat(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  // Queue Operations
  const addToQueue = (song: Song) => {
    setQueue(prev => [...prev, song]);
    if (!currentSong) {
      playSong(song);
    }
  };

  const playNext = (song: Song) => {
    if (!currentSong) {
      playSong(song);
      return;
    }
    setQueue(prev => {
      const copy = [...prev];
      copy.splice(queueIndex + 1, 0, song);
      return copy;
    });
  };

  const removeFromQueue = (index: number) => {
    setQueue(prev => {
      const copy = [...prev];
      copy.splice(index, 1);
      return copy;
    });
    if (index < queueIndex) {
      setQueueIndex(prev => prev - 1);
    }
  };

  const clearQueue = () => {
    if (currentSong) {
      setQueue([currentSong]);
      setQueueIndex(0);
    } else {
      setQueue([]);
      setQueueIndex(-1);
    }
  };

  const reorderQueue = (newQueue: Song[]) => {
    setQueue(newQueue);
    if (currentSong) {
      const newIdx = newQueue.findIndex(s => s.id === currentSong.id);
      if (newIdx !== -1) setQueueIndex(newIdx);
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
    // Update queue items
    setQueue(prev => prev.map(s => s.id === songId ? { ...s, isFavorite: nextFav } : s));
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
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
            // '?' shortcut
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
