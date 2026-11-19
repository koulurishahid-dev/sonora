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
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden"
        onClick={onToggle}
      />
      <motion.aside
        initial={{ x: 380, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 380, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="fixed lg:relative right-0 top-0 bottom-0 z-50 lg:z-30 flex flex-col w-[85vw] max-w-sm sm:w-92 lg:w-84 xl:w-92 2xl:w-98 h-full bg-[#10051C]/95 lg:bg-[#10051C]/75 backdrop-blur-2xl border-l border-[#302744]/70 shadow-[-16px_0_40px_rgba(5,3,9,0.85)] select-none shrink-0 overflow-hidden"
      >
      {/* Background ambient glow with cyan-purple spotlight scattering */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#8BE9FF]/15 via-[#A855F7]/15 to-transparent rounded-full blur-3xl pointer-events-none -z-0" />

      {/* 1. TOP HEADER */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#302744] z-10 shrink-0 bg-[#090812]/50">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {isPlaying && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A78BFA] opacity-75" />
            )}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#A78BFA]" />
          </span>
          <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-[#F8F5FF]">
            Player Sidebar
          </span>
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider bg-[#211A32] text-[#A78BFA] border border-[#302744]">
            320K HI-RES
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Turntable Studio Shortcut */}
          <Tooltip content="Launch Turntable Studio">
            <button
              onClick={() => setIsNowPlayingOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-semibold bg-[#211A32] border border-[#302744] hover:border-[#A78BFA]/40 text-[#D8B4FE] hover:bg-[#2A2140] transition-all active:scale-95 shadow-sm"
            >
              <Disc className={`w-3.5 h-3.5 text-[#A78BFA] ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
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
      <div className="flex items-center gap-1 px-4 py-2 border-b border-[#302744] bg-[#090812]/30 shrink-0 z-10">
        <button
          onClick={() => setActiveTab('player')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'player'
              ? 'bg-[#211A32] text-[#D8B4FE] shadow-sm border border-[#302744]'
              : 'text-[#A99DBE] hover:text-[#F8F5FF] hover:bg-[#141122]'
          }`}
        >
          <Disc className="w-3.5 h-3.5 text-[#A78BFA]" />
          <span>Now Playing</span>
        </button>

        <button
          onClick={() => setActiveTab('lyrics')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'lyrics'
              ? 'bg-[#211A32] text-[#D8B4FE] shadow-sm border border-[#302744]'
              : 'text-[#A99DBE] hover:text-[#F8F5FF] hover:bg-[#141122]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-[#A78BFA]" />
          <span>Lyrics</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'queue'
              ? 'bg-[#211A32] text-[#D8B4FE] shadow-sm border border-[#302744]'
              : 'text-[#A99DBE] hover:text-[#F8F5FF] hover:bg-[#141122]'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5 text-[#A78BFA]" />
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
                  {/* Atmospheric Purple & Cyan Ambient Bounce Behind Showcase */}
                  <div
                    className="absolute -inset-4 -z-10 rounded-3xl blur-2xl transition-opacity duration-700 pointer-events-none"
                    style={{
                      background:
                        'radial-gradient(ellipse at 65% 25%, rgba(139, 233, 255, 0.18) 0%, rgba(168, 85, 247, 0.3) 45%, rgba(112, 38, 185, 0.15) 75%, transparent 90%)',
                      opacity: isPlaying ? 0.95 : 0.5,
                    }}
                  />
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
                          'radial-gradient(circle at center, #160726 0%, #050309 60%, #10051C 80%, #050309 100%)',
                        boxShadow: '0 16px 40px rgba(5,3,9,0.95), inset 0 0 14px rgba(168,85,247,0.22)',
                      }}
                    >
                      {/* Realistic Purple & Cyan Specular Sheen (Matching Spotlight Angle) */}
                      <div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          background:
                            'conic-gradient(from 35deg, transparent 0deg, rgba(192, 132, 252, 0.35) 25deg, rgba(139, 233, 255, 0.22) 42deg, rgba(168, 85, 247, 0.38) 60deg, transparent 95deg, transparent 180deg, rgba(112, 38, 185, 0.28) 210deg, transparent 255deg)',
                          opacity: 0.8,
                        }}
                      />
                      {/* Radial Sheen Across Grooves */}
                      <div
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          background:
                            'radial-gradient(circle at 75% 25%, rgba(139, 233, 255, 0.2) 0%, rgba(168, 85, 247, 0.16) 35%, transparent 65%)',
                        }}
                      />

                      {/* Vinyl Grooves rings */}
                      <div className="absolute inset-2 rounded-full border border-white/[0.04]" />
                      <div className="absolute inset-5 rounded-full border border-[#A855F7]/[0.05]" />
                      <div className="absolute inset-8 rounded-full border border-white/[0.04]" />
                      <div className="absolute inset-11 rounded-full border border-[#A855F7]/[0.05]" />
                      <div className="absolute inset-14 rounded-full border border-white/[0.04]" />

                      {/* Vinyl center label */}
                      <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#7026B9] via-[#A855F7] to-[#C084FC] flex items-center justify-center relative shadow-inner overflow-hidden border-2 border-black/80">
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
                    <div className="relative w-[86%] h-[86%] mr-auto rounded-2xl overflow-hidden shadow-2xl border border-[#302744] bg-[#171326] z-10 group cursor-pointer">
                      {artworkUrl ? (
                        <img
                          src={artworkUrl}
                          alt={currentSong.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-[#A99DBE] bg-[#141122]">
                          <img src="/logo-icon.png" alt="" className="w-12 h-12 object-contain opacity-70 mb-2 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)]" />
                          <span className="text-[10px] uppercase font-mono tracking-wider">Naa Paatalu</span>
                        </div>
                      )}

                      {/* Play/Pause overlay on hover */}
                      <div
                        onClick={togglePlay}
                        className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer backdrop-blur-[2px]"
                      >
                        <div className="w-13 h-13 rounded-full bg-[#A78BFA] hover:bg-[#D8B4FE] text-[#090812] flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform">
                          {isPlaying ? (
                            <Pause className="w-6 h-6 fill-[#090812]" />
                          ) : (
                            <Play className="w-6 h-6 fill-[#090812] ml-0.5" />
                          )}
                        </div>
                      </div>

                      {/* Hi-Res Badge */}
                      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-[#090812]/80 backdrop-blur-md border border-[#302744] text-[9px] font-mono font-bold tracking-wider text-[#D8B4FE]">
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
                        <h2 className="text-base font-extrabold text-[#F8F5FF] tracking-tight truncate hover:text-[#D8B4FE] transition-colors">
                          {currentSong.title}
                        </h2>
                        {isPlaying && (
                          <div
                            className="flex items-end gap-0.5 h-3 shrink-0 px-1.5 py-0.5 rounded bg-[#A78BFA]/15 border border-[#A78BFA]/30"
                            title="Live Audio"
                          >
                            <span className="w-0.5 bg-[#A78BFA] rounded-full animate-eq-1 h-2.5" />
                            <span className="w-0.5 bg-[#A78BFA] rounded-full animate-eq-2 h-2.5" />
                            <span className="w-0.5 bg-[#A78BFA] rounded-full animate-eq-3 h-2.5" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-[#C2B5D9] truncate mt-0.5 font-medium">
                        {currentSong.artist}
                      </p>
                      {currentSong.album && (
                        <p className="text-[11px] text-[#A99DBE] truncate mt-0.5 font-mono">
                          {currentSong.album}
                        </p>
                      )}
                    </div>

                    {/* Favorite Heart Button with particle burst */}
                    <div className="relative shrink-0">
                      <button
                        onClick={handleToggleFavorite}
                        className="p-2.5 rounded-xl bg-[#171326] hover:bg-[#2A2140] border border-[#302744] transition-all hover:scale-105 active:scale-95"
                        title={currentSong.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Heart
                          className={`w-4 h-4 transition-colors ${
                            currentSong.isFavorite
                              ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]'
                              : 'text-[#A99DBE] hover:text-[#F8F5FF]'
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
                    className="relative h-2 rounded-full bg-[#211A32] cursor-pointer group flex items-center border border-[#302744]"
                  >
                    {/* Active progress bar */}
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] via-[#A78BFA] to-[#D8B4FE] relative"
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
                        className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded bg-[#090812]/90 text-[10px] font-mono text-[#F8F5FF] border border-[#302744] pointer-events-none shadow-md z-20"
                        style={{ left: `${hoverPercent}%` }}
                      >
                        {formatDuration(hoverTime)}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#A99DBE]">
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
                          ? 'text-[#090812] bg-[#A78BFA] shadow-sm shadow-[#A78BFA]/30'
                          : 'text-[#A99DBE] hover:text-[#F8F5FF] hover:bg-[#141122]'
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
                      className="p-2.5 rounded-xl text-[#C2B5D9] hover:text-[#F8F5FF] hover:bg-[#141122] transition-all active:scale-95"
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
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#7C3AED] via-[#A78BFA] to-[#D8B4FE] text-[#090812] flex items-center justify-center shadow-[0_0_24px_rgba(167,139,250,0.35)] hover:shadow-[0_0_32px_rgba(167,139,250,0.55)] hover:scale-105 active:scale-95 transition-all"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6 fill-[#090812]" />
                    ) : (
                      <Play className="w-6 h-6 fill-[#090812] ml-0.5" />
                    )}
                  </button>

                  {/* Next */}
                  <Tooltip content="Next track">
                    <button
                      onClick={() => {
                        playInteractionSound(settings.hapticSoundEnabled, 'tap');
                        nextTrack();
                      }}
                      className="p-2.5 rounded-xl text-[#C2B5D9] hover:text-[#F8F5FF] hover:bg-[#141122] transition-all active:scale-95"
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
                          ? 'text-[#090812] bg-[#A78BFA] shadow-sm shadow-[#A78BFA]/30'
                          : 'text-[#A99DBE] hover:text-[#F8F5FF] hover:bg-[#141122]'
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
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#171326] border border-[#302744]">
                  <button
                    onClick={toggleMute}
                    className="p-1 text-[#A99DBE] hover:text-[#F8F5FF] transition-colors"
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
                    className="flex-1 accent-[#A78BFA] h-1 cursor-pointer bg-[#211A32] rounded-full"
                    aria-label="Volume slider"
                  />
                  <span className="text-[10px] font-mono text-[#A99DBE] w-7 text-right">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>

                {/* SYNCED LYRICS MINI CARD */}
                <div
                  onClick={() => setActiveTab('lyrics')}
                  className="p-3.5 rounded-2xl bg-[#171326] hover:bg-[#2A2140] border border-[#302744] hover:border-[#A78BFA]/40 space-y-2 cursor-pointer transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold tracking-wider text-[#A99DBE]">
                      <FileText className="w-3 h-3 text-[#A78BFA]" />
                      Lyrics Snippet
                    </span>
                    <span className="text-[10px] font-semibold text-[#A78BFA] group-hover:text-[#D8B4FE] group-hover:underline flex items-center gap-1">
                      View All <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>

                  {syncedLines.length > 0 && currentLineIndex >= 0 ? (
                    <div className="py-1 space-y-1">
                      {currentLineIndex > 0 && (
                        <p className="text-[11px] text-[#A99DBE]/60 truncate">
                          {syncedLines[currentLineIndex - 1].text}
                        </p>
                      )}
                      <p className="text-xs font-semibold text-[#D8B4FE] leading-snug drop-shadow-[0_0_8px_rgba(167,139,250,0.35)]">
                        {syncedLines[currentLineIndex].text}
                      </p>
                      {currentLineIndex < syncedLines.length - 1 && (
                        <p className="text-[11px] text-[#A99DBE]/60 truncate">
                          {syncedLines[currentLineIndex + 1].text}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#A99DBE] italic py-1">
                      Click to view full lyrics for this track.
                    </p>
                  )}
                </div>

                {/* UP NEXT MINI LIST */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase font-mono font-bold tracking-wider text-[#A99DBE]">
                      <ListMusic className="w-3 h-3 text-[#A78BFA]" />
                      Next In Queue
                    </span>
                    <button
                      onClick={() => setActiveTab('queue')}
                      className="text-[10px] font-semibold text-[#C2B5D9] hover:text-[#F8F5FF]"
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
                            className="flex items-center gap-2.5 p-2 rounded-xl bg-[#171326] hover:bg-[#2A2140] border border-[#302744] hover:border-[#A78BFA]/40 cursor-pointer transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#141122] shrink-0 border border-[#302744] relative">
                              {sArt ? (
                                <img src={sArt} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[#A99DBE]">
                                  <Music2 className="w-3.5 h-3.5" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Play className="w-3 h-3 fill-[#F8F5FF] text-[#F8F5FF]" />
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-[#F8F5FF] group-hover:text-[#D8B4FE] truncate transition-colors">
                                {s.title}
                              </p>
                              <p className="text-[10px] text-[#C2B5D9] truncate">{s.artist}</p>
                            </div>

                            <span className="text-[10px] font-mono text-[#A99DBE] shrink-0">
                              {formatDuration(s.duration)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#A99DBE] italic py-1">
                      Queue has no upcoming tracks.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB: LYRICS */}
            {activeTab === 'lyrics' && (
              <div className="p-5 flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#302744]">
                  <div>
                    <h3 className="text-sm font-bold text-[#F8F5FF] truncate">{currentSong.title}</h3>
                    <p className="text-[11px] text-[#C2B5D9] truncate">{currentSong.artist}</p>
                  </div>
                  <span className="text-[10px] font-mono text-[#A78BFA] uppercase font-semibold">
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
                              ? 'text-base font-extrabold text-[#D8B4FE] bg-[#211A32] border border-[#A78BFA]/40 drop-shadow-[0_0_12px_rgba(167,139,250,0.35)] scale-[1.02]'
                              : 'text-xs text-[#A99DBE]/60 hover:text-[#F8F5FF] hover:bg-[#141122]'
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
                    <div className="py-16 text-center text-[#A99DBE] space-y-2">
                      <FileText className="w-8 h-8 mx-auto text-[#A99DBE]/40" />
                      <p className="text-xs">No synced lyrics available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: QUEUE */}
            {activeTab === 'queue' && (
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#302744]">
                  <span className="text-xs font-bold text-[#F8F5FF] uppercase tracking-wider font-mono">
                    Play Queue ({queue.length})
                  </span>
                  <span className="text-[11px] font-mono text-[#A99DBE]">
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
                            ? 'bg-[#211A32] border border-[#A78BFA]/40 text-[#D8B4FE]'
                            : 'hover:bg-[#141122] border border-transparent text-[#F8F5FF]'
                        }`}
                      >
                        <span className="w-5 text-center text-[10px] font-mono text-[#A99DBE] shrink-0">
                          {isCur ? '▶' : idx + 1}
                        </span>

                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#141122] shrink-0 border border-[#302744]">
                          {sArt ? (
                            <img src={sArt} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#A99DBE]">
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
                          className="p-1 rounded text-[#A99DBE] hover:text-rose-400 hover:bg-[#171326] transition-colors"
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
          <div className="py-24 text-center space-y-3 text-[#A99DBE]">
            <Disc className="w-12 h-12 mx-auto text-[#A99DBE]/30 animate-spin-slow" />
            <p className="text-xs font-semibold text-[#F8F5FF]">No Track Playing</p>
            <p className="text-[11px] text-[#A99DBE] max-w-[200px] mx-auto">
              Select any song from your library or playlists to begin listening.
            </p>
          </div>
        )}
      </div>

      {/* 4. BOTTOM ACTION BAR */}
      <div className="p-3 border-t border-[#302744] bg-[#090812]/70 z-10 shrink-0">
        <button
          onClick={() => setIsNowPlayingOpen(true)}
          className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#7C3AED]/25 to-[#A78BFA]/25 hover:from-[#7C3AED]/35 hover:to-[#A78BFA]/35 border border-[#A78BFA]/30 text-[#D8B4FE] flex items-center justify-center gap-2 text-xs font-bold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-md shadow-[#A78BFA]/10"
        >
          <Maximize2 className="w-4 h-4 text-[#A78BFA]" />
          <span>Open Full Turntable Studio</span>
        </button>
      </div>
    </motion.aside>
    </>
  );
}
