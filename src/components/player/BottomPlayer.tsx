'use client';

import React, { useState, useRef } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useTheme } from '@/context/ThemeContext';
import { getArtworkObjectUrl } from '@/lib/db';
import { formatDuration } from '@/lib/utils';
import { playInteractionSound } from '@/lib/interactionSound';
import { Tooltip } from '@/components/common/Tooltip';
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
  ListMusic,
  FileText,
  Maximize2,
  Music2,
  AlertCircle,
  Disc,
  PanelRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function BottomPlayer() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    isQueueOpen,
    isLyricsOpen,
    isSideViewOpen,
    audioError,
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
    setIsQueueOpen,
    setIsLyricsOpen,
    toggleSideView,
  } = usePlayer();

  const { settings } = useTheme();

  // Scrubber hover time preview
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosPercent, setHoverPosPercent] = useState<number>(0);
  const progressContainerRef = useRef<HTMLDivElement | null>(null);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  if (!currentSong) {
    return (
      <div className="h-20 w-full bg-[#0B0D12] border-t border-white/[0.08] flex items-center justify-between px-6 text-zinc-500 text-xs select-none">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/[0.04] flex items-center justify-center border border-white/[0.08]">
            <Music2 className="w-5 h-5 text-zinc-600" />
          </div>
          <div>
            <p className="font-semibold text-white/80">No track selected</p>
            <p className="text-[11px] text-zinc-500">Select any melody to begin playback</p>
          </div>
        </div>
      </div>
    );
  }

  const artworkUrl = getArtworkObjectUrl(currentSong);

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressContainerRef.current || !duration) return;
    const rect = progressContainerRef.current.getBoundingClientRect();
    const offsetX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percent = (offsetX / rect.width) * 100;
    const time = (offsetX / rect.width) * duration;
    setHoverTime(time);
    setHoverPosPercent(percent);
  };

  const handleProgressBarMouseLeave = () => {
    setHoverTime(null);
  };

  const handleToggleFavorite = () => {
    playInteractionSound(settings.hapticSoundEnabled, 'burst');
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 700);
    toggleFavorite(currentSong.id);
  };

  const handlePlayToggle = () => {
    playInteractionSound(settings.hapticSoundEnabled, 'tap');
    togglePlay();
  };

  return (
    <footer className="h-24 w-full bg-[#0A0C11]/95 border-t border-white/[0.08] backdrop-blur-2xl flex flex-col justify-between px-4 sm:px-6 py-2.5 relative z-40 shadow-[0_-16px_45px_rgba(0,0,0,0.95)] select-none">
      {/* Specular glass reflection bar */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

      {/* Audio Error Alert Banner */}
      {audioError && (
        <div className="absolute -top-9 left-6 right-6 bg-rose-950/80 border border-rose-700 text-rose-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-xl">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{audioError}</span>
        </div>
      )}

      {/* Main Row */}
      <div className="flex items-center justify-between gap-4 h-full">
        {/* Left: Track Information with Clean Square Cover */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[220px]">
          <div
            onClick={() => setIsNowPlayingOpen(true)}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-[#101216] border border-white/10 shrink-0 relative cursor-pointer group shadow-md hover:scale-105 transition-transform"
            title="Open Immersive Player"
          >
            {artworkUrl ? (
              <img src={artworkUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500">
                <Music2 className="w-6 h-6" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p
                onClick={() => setIsNowPlayingOpen(true)}
                className="text-xs sm:text-sm font-bold text-white truncate cursor-pointer hover:underline hover:text-[var(--accent)] transition-colors tracking-tight"
                title={currentSong.title}
              >
                {currentSong.title}
              </p>
              {isPlaying && (
                <div className="flex items-end gap-0.5 h-3 shrink-0 px-1.5 py-0.5 rounded bg-[var(--accent)]/15 border border-[var(--accent)]/30" title="Live Playing">
                  <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-1 h-2.5" />
                  <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-2 h-2.5" />
                  <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-3 h-2.5" />
                </div>
              )}
            </div>
            <p className="text-xs text-[#A1A1AA] truncate mt-0.5 font-medium">{currentSong.artist}</p>
          </div>

          {/* Favorite Button with Particle Burst */}
          <div className="relative shrink-0">
            <button
              onClick={handleToggleFavorite}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              title={currentSong.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`w-4 h-4 transition-all ${
                  currentSong.isFavorite
                    ? 'fill-rose-500 text-rose-500 scale-110'
                    : 'text-[#A1A1AA] hover:text-white'
                }`}
              />
            </button>

            <AnimatePresence>
              {showHeartBurst && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 1 }}
                  animate={{ scale: 2.2, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <Heart className="w-5 h-5 fill-rose-500 text-rose-500 filter drop-shadow-[0_0_8px_#f43f5e]" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Center: Playback Controls & Progress Bar */}
        <div className="flex flex-col items-center justify-center max-w-xl w-2/4">
          <div className="flex items-center gap-5 mb-1.5">
            <Tooltip content={shuffle ? 'Shuffle: On' : 'Shuffle: Off'}>
              <button
                onClick={toggleShuffle}
                className={`p-1.5 rounded-lg transition-colors active:scale-90 ${
                  shuffle ? 'text-[var(--accent)]' : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                <Shuffle className="w-4 h-4" />
              </button>
            </Tooltip>

            <Tooltip content="Previous Track">
              <button
                onClick={prevTrack}
                className="p-1.5 text-[#A1A1AA] hover:text-white transition-colors active:scale-90"
              >
                <SkipBack className="w-5 h-5" />
              </button>
            </Tooltip>

            {/* Centerpiece Animated Play / Pause Disc Button */}
            <Tooltip content={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
              <button
                onClick={handlePlayToggle}
                className="relative w-10 h-10 rounded-full bg-[var(--accent)] text-black flex items-center justify-center hover:scale-108 active:scale-95 transition-all shadow-lg shadow-[var(--accent)]/35 border border-white/30 cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 fill-black" />
                ) : (
                  <Play className="w-5 h-5 fill-black ml-0.5" />
                )}
                {isPlaying && (
                  <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-ping opacity-30 pointer-events-none" />
                )}
              </button>
            </Tooltip>

            <Tooltip content="Next Track">
              <button
                onClick={nextTrack}
                className="p-1.5 text-[#A1A1AA] hover:text-white transition-colors active:scale-90"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </Tooltip>

            <Tooltip content={`Repeat: ${repeat}`}>
              <button
                onClick={toggleRepeat}
                className={`p-1.5 rounded-lg transition-colors active:scale-90 ${
                  repeat !== 'off' ? 'text-[var(--accent)]' : 'text-[#A1A1AA] hover:text-white'
                }`}
              >
                {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
              </button>
            </Tooltip>
          </div>

          {/* Seekbar and Times with Hover Tooltip Preview */}
          <div className="flex items-center gap-2.5 w-full">
            <span className="text-[11px] font-mono text-[#A1A1AA] w-9 text-right shrink-0">
              {formatDuration(currentTime)}
            </span>

            <div
              ref={progressContainerRef}
              onMouseMove={handleProgressBarMouseMove}
              onMouseLeave={handleProgressBarMouseLeave}
              className="relative flex-1 flex items-center group py-1"
            >
              {/* Floating Timeline Hover Preview Badge */}
              {hoverTime !== null && (
                <div
                  className="absolute bottom-full mb-2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#161822] border border-white/20 text-[10px] font-mono text-white shadow-xl pointer-events-none z-30"
                  style={{ left: `${hoverPosPercent}%` }}
                >
                  {formatDuration(hoverTime)}
                </div>
              )}

              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={e => seek(parseFloat(e.target.value))}
                className="w-full cursor-pointer accent-[var(--accent)] h-1.5 hover:h-2 transition-all rounded-full"
                aria-label="Seek time"
              />
            </div>

            <span className="text-[11px] font-mono text-[#A1A1AA] w-9 shrink-0">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Right: Extra Controls (Lyrics, Queue, Volume, Turntable, Fullscreen) */}
        <div className="flex items-center justify-end gap-2.5 w-1/4 min-w-[180px]">
          {/* Lyrics button */}
          <Tooltip content="Lyrics">
            <button
              onClick={() => setIsLyricsOpen(!isLyricsOpen)}
              className={`p-2 rounded-lg transition-colors ${
                isLyricsOpen ? 'text-[var(--accent)] bg-[var(--accent)]/15' : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
            </button>
          </Tooltip>

          {/* Queue button */}
          <Tooltip content="Queue">
            <button
              onClick={() => setIsQueueOpen(!isQueueOpen)}
              className={`p-2 rounded-lg transition-colors ${
                isQueueOpen ? 'text-[var(--accent)] bg-[var(--accent)]/15' : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <ListMusic className="w-4 h-4" />
            </button>
          </Tooltip>

          {/* Volume Slider */}
          <div className="hidden lg:flex items-center gap-2">
            <Tooltip content={isMuted ? 'Unmute' : 'Mute'}>
              <button
                onClick={toggleMute}
                className="text-[#A1A1AA] hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            </Tooltip>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              className="w-18 accent-[var(--accent)] h-1"
              aria-label="Volume"
            />
          </div>

          {/* Side View Toggle */}
          <Tooltip content={isSideViewOpen ? 'Close Side View' : 'Now Playing Side View'}>
            <button
              onClick={() => {
                playInteractionSound(settings.hapticSoundEnabled, 'tap');
                toggleSideView();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all shadow-sm active:scale-95 ${
                isSideViewOpen
                  ? 'bg-[var(--accent)]/20 border border-[var(--accent)]/40 text-[var(--accent)] shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-white/10 border border-transparent'
              }`}
            >
              <PanelRight className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">Side View</span>
            </button>
          </Tooltip>

          {/* Turntable Studio Shortcut */}
          <Tooltip content="Turntable Studio">
            <button
              onClick={() => setIsNowPlayingOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all shadow-sm active:scale-95"
            >
              <Disc className={`w-3.5 h-3.5 text-amber-400 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
              <span className="hidden xl:inline">Studio</span>
            </button>
          </Tooltip>

          {/* Expand Fullscreen */}
          <Tooltip content="Expand Player">
            <button
              onClick={() => setIsNowPlayingOpen(true)}
              className="p-2 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-white/10 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>
    </footer>
  );
}
