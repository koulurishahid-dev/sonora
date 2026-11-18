'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useTheme } from '@/context/ThemeContext';
import { Song, LyricLine } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { formatDuration } from '@/lib/utils';
import { playInteractionSound } from '@/lib/interactionSound';
import { Tooltip } from '@/components/common/Tooltip';
import { parseLrc } from '@/components/player/LyricsPanel';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
  Volume1,
  Maximize2,
  X,
  Disc,
  Music2,
  FileText,
  ListMusic,
  ExternalLink,
  ChevronRight,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RightSidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

type SidebarTab = 'player' | 'lyrics' | 'queue';

export function RightSidebar({ isOpen = true, onToggle }: RightSidebarProps) {
  const {
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
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    setIsNowPlayingOpen,
    playSong,
    removeFromQueue,
  } = usePlayer();

  const { settings } = useTheme();

  // Active sub-tab inside sidebar
  const [activeTab, setActiveTab] = useState<SidebarTab>('player');

  // Scrubber hover state
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  // Synced lyrics preview state
  const [syncedLines, setSyncedLines] = useState<LyricLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(-1);
  const lyricsContainerRef = useRef<HTMLDivElement | null>(null);

  // Heart burst animation state
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  // Load lyrics
  useEffect(() => {
    if (!currentSong) {
      setSyncedLines([]);
      setCurrentLineIndex(-1);
      return;
    }

    async function fetchLyrics() {
      if (!currentSong) return;
      const stored = await db.lyrics.where('songId').equals(currentSong.id).first();
      if (stored && stored.syncedLyrics && stored.syncedLyrics.length > 0) {
        setSyncedLines(stored.syncedLyrics);
      } else if (stored && stored.plainLyrics && stored.plainLyrics.includes('[')) {
        setSyncedLines(parseLrc(stored.plainLyrics));
      } else {
        setSyncedLines([]);
      }
    }
    fetchLyrics();
  }, [currentSong?.id]);

  // Update current lyric line as time updates
  useEffect(() => {
    if (syncedLines.length === 0) {
      setCurrentLineIndex(-1);
      return;
    }
    const idx = syncedLines.findLastIndex(l => currentTime >= l.time);
    setCurrentLineIndex(idx);

    // Auto-scroll lyrics if in lyrics tab
    if (activeTab === 'lyrics' && lyricsContainerRef.current && idx >= 0) {
      const activeEl = lyricsContainerRef.current.children[idx] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, syncedLines, activeTab]);

  if (!isOpen) return null;

  const artworkUrl = currentSong ? getArtworkObjectUrl(currentSong) : null;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = (offsetX / rect.width) * 100;
    const time = (offsetX / rect.width) * duration;
    setHoverTime(time);
    setHoverPercent(percent);
  };

  const handleProgressBarMouseLeave = () => {
    setHoverTime(null);
  };

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newTime = (offsetX / rect.width) * duration;
    seek(newTime);
  };

  const handleToggleFavorite = () => {
    if (!currentSong) return;
    playInteractionSound(settings.hapticSoundEnabled, 'burst');
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 900);
    toggleFavorite(currentSong.id);
  };

  return (
    <motion.aside
      initial={{ x: 380, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 380, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className="fixed lg:relative right-0 top-0 bottom-0 z-40 lg:z-30 flex flex-col w-full sm:w-92 lg:w-84 xl:w-92 2xl:w-98 h-full bg-[#0A0C11]/98 lg:bg-[#0A0C11]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-[-16px_0_40px_rgba(0,0,0,0.85)] select-none shrink-0 overflow-hidden"
    >
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-amber-500/10 via-[var(--accent)]/5 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

      {/* 1. TOP HEADER */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] z-10 shrink-0 bg-black/20">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {isPlaying && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent)]" />
          </span>
          <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-white/90">
            Player Sidebar
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30">
            320K HI-RES
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Turntable Studio Shortcut */}
          <Tooltip content="Launch Turntable Studio">
            <button
              onClick={() => setIsNowPlayingOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all active:scale-95 shadow-sm"
            >
              <Disc className={`w-3.5 h-3.5 text-amber-400 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              <span>Studio</span>
            </button>
          </Tooltip>

          {/* Close / Collapse button */}
          {onToggle && (
            <Tooltip content="Collapse Sidebar">
              <button
                onClick={onToggle}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
                aria-label="Collapse Player Sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* 2. SUB-TABS (PLAYER / LYRICS / QUEUE) */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-white/[0.06] bg-black/10 shrink-0 z-10">
        <button
          onClick={() => setActiveTab('player')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'player'
              ? 'bg-white/[0.1] text-white shadow-sm border border-white/10'
              : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <Disc className="w-3.5 h-3.5" />
          <span>Now Playing</span>
        </button>

        <button
          onClick={() => setActiveTab('lyrics')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'lyrics'
              ? 'bg-white/[0.1] text-white shadow-sm border border-white/10'
              : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Lyrics</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'queue'
              ? 'bg-white/[0.1] text-white shadow-sm border border-white/10'
              : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span>Queue ({queue.length})</span>
        </button>
      </div>

      {/* 3. TAB CONTENT */}
      <div className="flex-1 overflow-y-auto z-10">
        {currentSong ? (
          <>
            {/* TAB: PLAYER */}
            {activeTab === 'player' && (
              <div className="p-5 space-y-5">
                {/* VINYL TURNTABLE SHOWCASE */}
                <div className="relative mx-auto w-full pt-1">
                  <div className="relative w-full aspect-square max-w-[270px] mx-auto flex items-center justify-center">
                    {/* Spinning Vinyl Record (Slides out from behind sleeve when playing) */}
                    <motion.div
                      animate={{
                        x: isPlaying ? 26 : 0,
                        rotate: isPlaying ? 360 : 0,
                      }}
                      transition={{
                        x: { duration: 0.6, ease: 'easeOut' },
                        rotate: {
                          repeat: isPlaying ? Infinity : 0,
                          duration: 3.5,
                          ease: 'linear',
                        },
                      }}
                      className="absolute right-0 w-[90%] h-[90%] rounded-full shadow-2xl overflow-hidden flex items-center justify-center -z-0"
                      style={{
                        background:
                          'radial-gradient(circle at center, #1c1d22 0%, #090a0d 60%, #15161a 80%, #08090a 100%)',
                        boxShadow: '0 12px 36px rgba(0,0,0,0.85), inset 0 0 10px rgba(255,255,255,0.08)',
                      }}
                    >
                      {/* Vinyl Grooves rings */}
                      <div className="absolute inset-2 rounded-full border border-white/[0.04]" />
                      <div className="absolute inset-5 rounded-full border border-white/[0.03]" />
                      <div className="absolute inset-8 rounded-full border border-white/[0.04]" />
                      <div className="absolute inset-11 rounded-full border border-white/[0.03]" />
                      <div className="absolute inset-14 rounded-full border border-white/[0.04]" />

                      {/* Vinyl center label */}
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-700 flex items-center justify-center relative shadow-inner overflow-hidden border-2 border-black/80">
                        {artworkUrl ? (
                          <img
                            src={artworkUrl}
                            alt=""
                            className="w-full h-full object-cover opacity-85"
                          />
                        ) : (
                          <Disc className="w-8 h-8 text-black/50" />
                        )}
                        {/* Spindle hole */}
                        <div className="absolute w-3.5 h-3.5 rounded-full bg-black border border-white/20 shadow-md" />
                      </div>
                    </motion.div>

                    {/* Album Cover Sleeve (Front Layer) */}
                    <div className="relative w-[86%] h-[86%] mr-auto rounded-2xl overflow-hidden shadow-2xl border border-white/[0.12] bg-[#12141a] z-10 group cursor-pointer">
                      {artworkUrl ? (
                        <img
                          src={artworkUrl}
                          alt={currentSong.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-white/40 bg-zinc-900">
                          <Music2 className="w-12 h-12 mb-2 text-zinc-600" />
                          <span className="text-[10px] uppercase font-mono tracking-wider">Sonora</span>
                        </div>
                      )}

                      {/* Play/Pause overlay on hover */}
                      <div
                        onClick={togglePlay}
                        className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer backdrop-blur-[2px]"
                      >
                        <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-amber-500 to-[var(--accent)] text-black flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform">
                          {isPlaying ? (
                            <Pause className="w-6 h-6 fill-black" />
                          ) : (
                            <Play className="w-6 h-6 fill-black ml-0.5" />
                          )}
                        </div>
                      </div>

                      {/* Hi-Res Badge */}
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-mono font-bold tracking-wider text-amber-300">
                        HI-RES
                      </div>
                    </div>
                  </div>
                </div>

                {/* TRACK METADATA & FAVORITE BUTTON */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-white tracking-tight truncate hover:text-[var(--accent)] transition-colors">
                          {currentSong.title}
                        </h2>
                        {isPlaying && (
                          <div
                            className="flex items-end gap-0.5 h-3 shrink-0 px-1.5 py-0.5 rounded bg-[var(--accent)]/15 border border-[var(--accent)]/30"
                            title="Live Audio"
                          >
                            <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-1 h-2.5" />
                            <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-2 h-2.5" />
                            <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-3 h-2.5" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-white/60 truncate mt-0.5 font-medium">
                        {currentSong.artist}
                      </p>
                      {currentSong.album && (
                        <p className="text-[11px] text-white/40 truncate mt-0.5 font-mono">
                          {currentSong.album}
                        </p>
                      )}
                    </div>

                    {/* Favorite Heart Button with particle burst */}
                    <div className="relative shrink-0">
                      <button
                        onClick={handleToggleFavorite}
                        className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.08] transition-all hover:scale-105 active:scale-95"
                        title={currentSong.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart
                          className={`w-4 h-4 transition-colors ${
                            currentSong.isFavorite
                              ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                              : 'text-white/50 hover:text-white'
                          }`}
                        />
                      </button>

                      <AnimatePresence>
                        {showHeartBurst && (
                          <motion.div
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: 2.2, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.7, ease: 'easeOut' }}
                            className="absolute inset-0 pointer-events-none flex items-center justify-center text-rose-500"
                          >
                            ❤️
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* PROGRESS BAR & TIMESTAMPS */}
                <div className="space-y-1.5 pt-1">
                  <div
                    ref={progressBarRef}
                    onClick={handleSeekClick}
                    onMouseMove={handleProgressBarMouseMove}
                    onMouseLeave={handleProgressBarMouseLeave}
                    className="relative h-2 rounded-full bg-white/[0.08] cursor-pointer group flex items-center"
                  >
                    {/* Active progress bar */}
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 via-[var(--accent)] to-emerald-400 relative"
                      style={{ width: `${progressPercent}%` }}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Hover preview marker */}
                    {hoverTime !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white/60 pointer-events-none"
                        style={{ left: `${hoverPercent}%` }}
                      />
                    )}

                    {/* Hover time tooltip */}
                    {hoverTime !== null && (
                      <div
                        className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-[10px] font-mono text-white border border-white/20 pointer-events-none shadow-md z-20"
                        style={{ left: `${hoverPercent}%` }}
                      >
                        {formatDuration(hoverTime)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-white/50">
                    <span>{formatDuration(currentTime)}</span>
                    <span>{formatDuration(duration)}</span>
                  </div>
                </div>

                {/* FULL TRANSPORT CONTROLS */}
                <div className="flex items-center justify-between px-2 pt-1">
                  {/* Shuffle */}
                  <Tooltip content={shuffle ? 'Shuffle on' : 'Shuffle off'}>
                    <button
                      onClick={() => {
                        playInteractionSound(settings.hapticSoundEnabled, 'switch');
                        toggleShuffle();
                      }}
                      className={`p-2.5 rounded-xl transition-all ${
                        shuffle
                          ? 'text-[var(--accent)] bg-[var(--accent)]/15 border border-[var(--accent)]/30'
                          : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <Shuffle className="w-4 h-4" />
                    </button>
                  </Tooltip>

                  {/* Previous */}
                  <Tooltip content="Previous track">
                    <button
                      onClick={() => {
                        playInteractionSound(settings.hapticSoundEnabled, 'tap');
                        prevTrack();
                      }}
                      className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95"
                    >
                      <SkipBack className="w-5 h-5 fill-current" />
                    </button>
                  </Tooltip>

                  {/* Big Play / Pause Disc Button */}
                  <button
                    onClick={() => {
                      playInteractionSound(settings.hapticSoundEnabled, 'tap');
                      togglePlay();
                    }}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-500 via-[var(--accent)] to-emerald-400 text-black flex items-center justify-center shadow-[0_0_24px_rgba(245,158,11,0.35)] hover:shadow-[0_0_32px_rgba(245,158,11,0.55)] hover:scale-105 active:scale-95 transition-all"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-black" />
                    ) : (
                      <Play className="w-6 h-6 fill-black ml-0.5" />
                    )}
                  </button>

                  {/* Next */}
                  <Tooltip content="Next track">
                    <button
                      onClick={() => {
                        playInteractionSound(settings.hapticSoundEnabled, 'tap');
                        nextTrack();
                      }}
                      className="p-2.5 rounded-xl text-white/70 hover:text-white hover:bg-white/[0.08] transition-all active:scale-95"
                    >
                      <SkipForward className="w-5 h-5 fill-current" />
                    </button>
                  </Tooltip>

                  {/* Repeat */}
                  <Tooltip
                    content={
                      repeat === 'one' ? 'Repeat track' : repeat === 'all' ? 'Repeat all' : 'Repeat off'
                    }
                  >
                    <button
                      onClick={() => {
                        playInteractionSound(settings.hapticSoundEnabled, 'switch');
                        toggleRepeat();
                      }}
                      className={`p-2.5 rounded-xl transition-all ${
                        repeat !== 'off'
                          ? 'text-[var(--accent)] bg-[var(--accent)]/15 border border-[var(--accent)]/30'
                          : 'text-white/40 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {repeat === 'one' ? (
                        <Repeat1 className="w-4 h-4" />
                      ) : (
                        <Repeat className="w-4 h-4" />
                      )}
                    </button>
                  </Tooltip>
                </div>

                {/* VOLUME ROW */}
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <button
                    onClick={toggleMute}
                    className="p-1 text-white/50 hover:text-white transition-colors"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : volume < 0.5 ? (
                      <Volume1 className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>

                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={e => setVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-[var(--accent)] h-1 cursor-pointer bg-white/[0.1] rounded-full"
                    aria-label="Volume slider"
                  />
                  <span className="text-[10px] font-mono text-white/40 w-7 text-right">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>

                {/* SYNCED LYRICS MINI CARD */}
                <div
                  onClick={() => setActiveTab('lyrics')}
                  className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] space-y-2 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold tracking-wider text-white/60">
                      <FileText className="w-3 h-3 text-[var(--accent)]" />
                      Lyrics Snippet
                    </span>
                    <span className="text-[10px] font-semibold text-[var(--accent)] group-hover:underline flex items-center gap-1">
                      View All <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  {syncedLines.length > 0 && currentLineIndex >= 0 ? (
                    <div className="py-1 space-y-1">
                      {currentLineIndex > 0 && (
                        <p className="text-[11px] text-white/30 truncate">
                          {syncedLines[currentLineIndex - 1].text}
                        </p>
                      )}
                      <p className="text-xs font-semibold text-[var(--accent)] leading-snug drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                        {syncedLines[currentLineIndex].text}
                      </p>
                      {currentLineIndex < syncedLines.length - 1 && (
                        <p className="text-[11px] text-white/30 truncate">
                          {syncedLines[currentLineIndex + 1].text}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-white/40 italic py-1">
                      Click to view full lyrics for this track.
                    </p>
                  )}
                </div>

                {/* UP NEXT MINI LIST */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold tracking-wider text-white/60">
                      <ListMusic className="w-3 h-3 text-amber-400" />
                      Next In Queue
                    </span>
                    <button
                      onClick={() => setActiveTab('queue')}
                      className="text-[10px] font-semibold text-white/50 hover:text-white"
                    >
                      View All ({queue.length})
                    </button>
                  </div>

                  {queue.slice(queueIndex + 1, queueIndex + 4).length > 0 ? (
                    <div className="space-y-1.5">
                      {queue.slice(queueIndex + 1, queueIndex + 4).map((s, idx) => {
                        const sArt = getArtworkObjectUrl(s);
                        return (
                          <div
                            key={s.id + idx}
                            onClick={() => playSong(s)}
                            className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] hover:border-white/[0.1] cursor-pointer transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/40 shrink-0 border border-white/[0.08] relative">
                              {sArt ? (
                                <img src={sArt} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white/30">
                                  <Music2 className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Play className="w-3 h-3 fill-white text-white" />
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-white group-hover:text-[var(--accent)] truncate transition-colors">
                                {s.title}
                              </p>
                              <p className="text-[10px] text-white/50 truncate">{s.artist}</p>
                            </div>

                            <span className="text-[10px] font-mono text-white/40 shrink-0">
                              {formatDuration(s.duration)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-white/40 italic py-1">
                      Queue has no upcoming tracks.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB: LYRICS */}
            {activeTab === 'lyrics' && (
              <div className="p-5 flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <div>
                    <h3 className="text-sm font-bold text-white truncate">{currentSong.title}</h3>
                    <p className="text-[11px] text-white/50 truncate">{currentSong.artist}</p>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--accent)] uppercase font-semibold">
                    Live Karaoke
                  </span>
                </div>

                <div
                  ref={lyricsContainerRef}
                  className="space-y-3 max-h-[500px] overflow-y-auto pr-2 py-2"
                >
                  {syncedLines.length > 0 ? (
                    syncedLines.map((line, idx) => {
                      const isActive = idx === currentLineIndex;
                      return (
                        <div
                          key={idx}
                          onClick={() => seek(line.time)}
                          className={`cursor-pointer transition-all p-2 rounded-xl ${
                            isActive
                              ? 'text-base font-extrabold text-[var(--accent)] bg-[var(--accent)]/15 border border-[var(--accent)]/30 drop-shadow-[0_0_12px_rgba(245,158,11,0.35)] scale-[1.02]'
                              : 'text-xs text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
                          }`}
                        >
                          <p className="leading-relaxed">{line.text}</p>
                          <span className="text-[9px] font-mono opacity-50 block mt-0.5">
                            {formatDuration(line.time)}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-16 text-center text-white/40 space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-white/20" />
                      <p className="text-xs">No synced lyrics available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: QUEUE */}
            {activeTab === 'queue' && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Play Queue ({queue.length})
                  </span>
                  <span className="text-[11px] font-mono text-white/40">
                    Playing #{queueIndex + 1}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {queue.map((s, idx) => {
                    const isCur = idx === queueIndex;
                    const sArt = getArtworkObjectUrl(s);
                    return (
                      <div
                        key={s.id + idx}
                        onClick={() => playSong(s)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                          isCur
                            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                            : 'hover:bg-white/[0.06] border border-transparent text-white'
                        }`}
                      >
                        <span className="w-5 text-center text-[10px] font-mono text-white/40 shrink-0">
                          {isCur ? '▶' : idx + 1}
                        </span>

                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-black/40 shrink-0 border border-white/[0.08]">
                          {sArt ? (
                            <img src={sArt} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/30">
                              <Music2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{s.title}</p>
                          <p className="text-[10px] opacity-60 truncate">{s.artist}</p>
                        </div>

                        <span className="text-[10px] font-mono opacity-50 shrink-0">
                          {formatDuration(s.duration)}
                        </span>

                        <button
                          onClick={e => {
                            e.stopPropagation();
                            removeFromQueue(idx);
                          }}
                          className="p-1 rounded text-white/30 hover:text-rose-400 hover:bg-white/10 transition-colors"
                          title="Remove from queue"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-24 text-center space-y-3 text-white/40">
            <Disc className="w-12 h-12 mx-auto text-white/20 animate-spin-slow" />
            <p className="text-xs font-semibold text-white/70">No Track Playing</p>
            <p className="text-[11px] text-white/40 max-w-[200px] mx-auto">
              Select any song from your library or playlists to begin listening.
            </p>
          </div>
        )}
      </div>

      {/* 4. BOTTOM ACTION BAR */}
      <div className="p-3 border-t border-white/[0.08] bg-black/40 z-10 shrink-0">
        <button
          onClick={() => setIsNowPlayingOpen(true)}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-[var(--accent)]/20 hover:from-amber-500/30 hover:to-[var(--accent)]/30 border border-amber-500/30 text-amber-300 flex items-center justify-center gap-2 text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md"
        >
          <Maximize2 className="w-4 h-4 text-amber-400" />
          <span>Open Full Turntable Studio</span>
        </button>
      </div>
    </motion.aside>
  );
}
