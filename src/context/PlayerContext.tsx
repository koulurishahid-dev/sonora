'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Song, VisualizerMode } from '@/types/music';
import { db, getAudioObjectUrl } from '@/lib/db';
import { useTheme } from './ThemeContext';

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
  visualizerMode: VisualizerMode;
  audioError: string | null;

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
  addToQueue: (song: Song) => void;
  playNext: (song: Song) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  reorderQueue: (newQueue: Song[]) => void;
  toggleFavorite: (songId: string) => Promise<void>;
  setIsNowPlayingOpen: (open: boolean) => void;
  setIsQueueOpen: (open: boolean) => void;
  setIsLyricsOpen: (open: boolean) => void;
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
  const [visualizerMode, setVisualizerMode] = useState<VisualizerMode>('bars');
  const [audioError, setAudioError] = useState<string | null>(null);

  // Audio elements and Web Audio API nodes
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const trebleFilterRef = useRef<BiquadFilterNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const isSwitchingTrackRef = useRef(false);

  // Initialize Web Audio API nodes
  const initWebAudio = useCallback(() => {
    if (!audioRef.current || audioCtxRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const bassFilter = ctx.createBiquadFilter();
      bassFilter.type = 'lowshelf';
      bassFilter.frequency.value = 250;
      bassFilter.gain.value = settings.bassGain || 0;
      bassFilterRef.current = bassFilter;

      const trebleFilter = ctx.createBiquadFilter();
      trebleFilter.type = 'highshelf';
      trebleFilter.frequency.value = 4000;
      trebleFilter.gain.value = settings.trebleGain || 0;
      trebleFilterRef.current = trebleFilter;

      // Connect: audio source -> bass -> treble -> analyser -> destination
      const source = ctx.createMediaElementSource(audioRef.current);
      sourceNodeRef.current = source;
      source.connect(bassFilter);
      bassFilter.connect(trebleFilter);
      trebleFilter.connect(analyser);
      analyser.connect(ctx.destination);
    } catch (e) {
      console.warn('Web Audio initialization error (may already be bound):', e);
    }
  }, [settings.bassGain, settings.trebleGain]);

  // Adjust EQ gain when settings change
  useEffect(() => {
    if (bassFilterRef.current) {
      bassFilterRef.current.gain.value = settings.bassGain || 0;
    }
    if (trebleFilterRef.current) {
      trebleFilterRef.current.gain.value = settings.trebleGain || 0;
    }
  }, [settings.bassGain, settings.trebleGain]);

  // Create persistent Audio Element
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      if (audioRef.current && !isSwitchingTrackRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };
    const onDurationChange = () => {
      if (audioRef.current) {
        const d = audioRef.current.duration;
        if (!isNaN(d) && d > 0) setDuration(d);
      }
    };
    const onError = (e: Event) => {
      console.error('Audio playback error:', e);
      setAudioError('Failed to play audio source. The file may be corrupt or link unavailable.');
      setIsPlaying(false);
    };

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('error', onError);

    // Restore last played track and position from local storage
    const restoreSavedSession = async () => {
      try {
        const lastSongId = localStorage.getItem('sonora_last_song_id');
        const lastTime = parseFloat(localStorage.getItem('sonora_last_time') || '0');
        const lastVol = parseFloat(localStorage.getItem('sonora_volume') || '0.8');

        audio.volume = lastVol;
        setVolumeState(lastVol);

        if (lastSongId) {
          const song = await db.songs.get(lastSongId);
          if (song) {
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
      audio.pause();
    };
  }, []);

  // Save current time and track to localStorage periodically
  useEffect(() => {
    if (currentSong && currentTime > 0) {
      localStorage.setItem('sonora_last_song_id', currentSong.id);
      localStorage.setItem('sonora_last_time', currentTime.toString());
    }
  }, [currentSong, currentTime]);

  // Update Media Session API for lock screen and native media controls
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !currentSong) return;

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        album: currentSong.album,
        artwork: currentSong.artworkUrl
          ? [{ src: currentSong.artworkUrl, sizes: '512x512', type: 'image/jpeg' }]
          : [],
      });

      navigator.mediaSession.setActionHandler('play', () => {
        audioRef.current?.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioRef.current?.pause();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prevTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        nextTrack();
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && audioRef.current) {
          audioRef.current.currentTime = details.seekTime;
          setCurrentTime(details.seekTime);
        }
      });
    } catch (e) {
      console.warn('MediaSession error:', e);
    }
  }, [currentSong]);

  // Visualizer data extractors
  const getFrequencyData = useCallback((): Uint8Array | null => {
    if (!analyserRef.current) return null;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    return data;
  }, []);

  const getTimeDomainData = useCallback((): Uint8Array | null => {
    if (!analyserRef.current) return null;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(data);
    return data;
  }, []);

  // Play Song action
  const playSong = async (song: Song, newQueue?: Song[]) => {
    setAudioError(null);
    if (!audioRef.current) return;

    // Resume AudioContext if suspended (browser autoplay policy)
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
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

    const audioUrl = getAudioObjectUrl(song);
    if (!audioUrl) {
      setAudioError('Audio source is missing or unavailable.');
      return;
    }

    isSwitchingTrackRef.current = true;
    audioRef.current.src = audioUrl;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);

    try {
      await audioRef.current.play();
      setIsPlaying(true);
      isSwitchingTrackRef.current = false;

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

  // Handle Track Ended
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
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
        case 'KeyN':
          if (e.shiftKey) {
            e.preventDefault();
            nextTrack();
          }
          break;
        case 'KeyP':
          if (e.shiftKey) {
            e.preventDefault();
            prevTrack();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, volume, nextTrack, prevTrack, currentSong, isPlaying]);

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
        visualizerMode,
        audioError,
        playSong,
        togglePlay,
        nextTrack,
        prevTrack,
        seek,
        setVolume,
        toggleMute,
        toggleShuffle,
        toggleRepeat,
        addToQueue,
        playNext,
        removeFromQueue,
        clearQueue,
        reorderQueue,
        toggleFavorite,
        setIsNowPlayingOpen,
        setIsQueueOpen,
        setIsLyricsOpen,
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
