'use client';

import React from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { getArtworkObjectUrl } from '@/lib/db';
import { VinylCover } from '@/components/common/VinylCover';
import { formatDuration } from '@/lib/utils';
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
} from 'lucide-react';

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
  } = usePlayer();

  if (!currentSong) {
    return (
      <div className="h-20 bg-[#121216] border-t border-[#303038] flex items-center justify-between px-6 text-[#71717A] text-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-[#19191F] flex items-center justify-center border border-[#303038]/50">
            <Music2 className="w-5 h-5 text-[#303038]" />
          </div>
          <div>
            <p className="font-medium text-[#A1A1AA]">No track selected</p>
            <p className="text-[11px] text-[#71717A]">Choose a song to begin listening</p>
          </div>
        </div>
      </div>
    );
  }

  const artworkUrl = getArtworkObjectUrl(currentSong);

  return (
    <div className="h-24 bg-[#121216]/95 backdrop-blur-xl border-t border-[#303038] flex flex-col justify-between px-4 sm:px-6 py-2 relative z-30 shadow-2xl">
      {/* Audio Error Alert Banner */}
      {audioError && (
        <div className="absolute -top-9 left-6 right-6 bg-rose-950/90 border border-rose-800 text-rose-200 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 backdrop-blur-md">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{audioError}</span>
        </div>
      )}

      {/* Main Row */}
      <div className="flex items-center justify-between gap-4 h-full">
        {/* Left: Track Information with Mini Vinyl Cover (Image 1 & 4 style) */}
        <div className="flex items-center gap-3.5 w-1/4 min-w-[200px]">
          <div
            onClick={() => setIsNowPlayingOpen(true)}
            className="cursor-pointer shrink-0"
            title="Expand Immersive Player"
          >
            <VinylCover
              artworkUrl={artworkUrl}
              title={currentSong.title}
              isPlaying={isPlaying}
              size="sm"
              showBadge={false}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p
                onClick={() => setIsNowPlayingOpen(true)}
                className="text-sm font-bold text-white truncate cursor-pointer hover:underline hover:text-[var(--accent)] transition-colors tracking-tight"
              >
                {currentSong.title}
              </p>
              {isPlaying && (
                <div className="flex items-end gap-0.5 h-3 shrink-0" title="Playing">
                  <span className="w-0.5 bg-[var(--accent)] rounded-full animate-wave-1" />
                  <span className="w-0.5 bg-[var(--accent)] rounded-full animate-wave-2" />
                  <span className="w-0.5 bg-[var(--accent)] rounded-full animate-wave-3" />
                </div>
              )}
            </div>
            <p className="text-xs text-[#A1A1AA] truncate mt-0.5 font-medium">{currentSong.artist}</p>
          </div>

          <button
            onClick={() => toggleFavorite(currentSong.id)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
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
        </div>

        {/* Center: Playback Controls & Progress Bar */}
        <div className="flex flex-col items-center justify-center max-w-xl w-2/4">
          <div className="flex items-center gap-5 mb-1.5">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-lg transition-colors ${
                shuffle ? 'text-[var(--accent)]' : 'text-[#A1A1AA] hover:text-white'
              }`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>

            <button
              onClick={prevTrack}
              className="p-1.5 text-[#A1A1AA] hover:text-white transition-colors active:scale-90"
              title="Previous Track"
            >
              <SkipBack className="w-5 h-5" />
            </button>

            <button
              onClick={togglePlay}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-black" />
              ) : (
                <Play className="w-5 h-5 fill-black ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              className="p-1.5 text-[#A1A1AA] hover:text-white transition-colors active:scale-90"
              title="Next Track"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <button
              onClick={toggleRepeat}
              className={`p-1.5 rounded-lg transition-colors ${
                repeat !== 'off' ? 'text-[var(--accent)]' : 'text-[#A1A1AA] hover:text-white'
              }`}
              title={`Repeat: ${repeat}`}
            >
              {repeat === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>
          </div>

          {/* Seekbar and Times */}
          <div className="flex items-center gap-2.5 w-full">
            <span className="text-[11px] font-mono text-[#A1A1AA] w-9 text-right shrink-0">
              {formatDuration(currentTime)}
            </span>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={e => seek(parseFloat(e.target.value))}
              className="w-full cursor-pointer accent-[var(--accent)]"
              aria-label="Seek time"
            />
            <span className="text-[11px] font-mono text-[#A1A1AA] w-9 shrink-0">
              {formatDuration(duration)}
            </span>
          </div>
        </div>

        {/* Right: Extra Controls (Lyrics, Queue, Volume, Fullscreen) */}
        <div className="flex items-center justify-end gap-3 w-1/4 min-w-[180px]">
          {/* Lyrics button */}
          <button
            onClick={() => setIsLyricsOpen(!isLyricsOpen)}
            className={`p-2 rounded-lg transition-colors ${
              isLyricsOpen ? 'text-[var(--accent)] bg-[var(--accent)]/10' : 'text-[#A1A1AA] hover:text-white'
            }`}
            title="Lyrics (L)"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Queue button */}
          <button
            onClick={() => setIsQueueOpen(!isQueueOpen)}
            className={`p-2 rounded-lg transition-colors ${
              isQueueOpen ? 'text-[var(--accent)] bg-[var(--accent)]/10' : 'text-[#A1A1AA] hover:text-white'
            }`}
            title="Queue (Q)"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Volume Slider */}
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="text-[#A1A1AA] hover:text-white transition-colors"
              title="Mute / Unmute (M)"
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
              className="w-20 accent-[var(--accent)]"
              aria-label="Volume"
            />
          </div>

          {/* Expand Fullscreen */}
          <button
            onClick={() => setIsNowPlayingOpen(true)}
            className="p-2 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-white/10 transition-colors"
            title="Full Screen (F)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
