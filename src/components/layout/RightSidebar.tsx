'use client';

import React, { useState, useEffect } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { Song, Playlist } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { formatDuration } from '@/lib/utils';
import {
  Heart,
  Play,
  Pause,
  ListMusic,
  FileText,
  Volume2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Disc3,
  Music2,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RightSidebarProps {
  onOpenLyrics?: () => void;
  onOpenQueue?: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function RightSidebar({ onOpenLyrics, onOpenQueue, isOpen = true, onToggle }: RightSidebarProps) {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    playSong,
    toggleFavorite,
    queue,
    queueIndex,
    isLyricsOpen,
    setIsLyricsOpen,
    isQueueOpen,
    setIsQueueOpen,
  } = usePlayer();

  const [curatedSongs, setCuratedSongs] = useState<Song[]>([]);
  const [likesCount, setLikesCount] = useState<number>(456);

  useEffect(() => {
    async function loadRelated() {
      if (currentSong?.album) {
        const albumSongs = await db.songs.where('album').equals(currentSong.album).toArray();
        if (albumSongs.length > 0) {
          setCuratedSongs(albumSongs);
          return;
        }
      }
      // Fallback: load first 6 songs
      const all = await db.songs.limit(8).toArray();
      setCuratedSongs(all);
    }
    loadRelated();
  }, [currentSong?.id, currentSong?.album]);

  if (!isOpen) return null;

  const activeSong = currentSong || curatedSongs[0];
  const artworkUrl = activeSong ? getArtworkObjectUrl(activeSong) : null;

  return (
    <aside className="hidden xl:flex flex-col w-80 2xl:w-88 h-full bg-[#121216]/70 backdrop-blur-2xl border-l border-[#303038]/60 p-5 overflow-y-auto select-none z-10 shrink-0">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#303038]/40">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
            Curated Album
          </span>
        </div>
        {onToggle && (
          <button
            onClick={onToggle}
            className="p-1 rounded-lg text-[#71717A] hover:text-white hover:bg-[#19191F] transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Featured Artwork & Album Detail */}
      {activeSong ? (
        <div className="mt-4 space-y-4">
          {/* Album artwork card with glowing ambient drop shadow */}
          <div className="relative group mx-auto w-full aspect-square rounded-2xl overflow-hidden bg-[#181820] border border-white/10 shadow-2xl">
            {artworkUrl ? (
              <img
                src={artworkUrl}
                alt={activeSong.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1E1E26] to-[#121216] text-[#71717A]">
                <Music2 className="w-12 h-12 mb-2 text-[#3E3E4C]" />
                <span className="text-xs uppercase font-mono tracking-widest text-[#525260]">Sonora Hi-Fi</span>
              </div>
            )}

            {/* Play Overlay Button */}
            <div
              onClick={() => (currentSong?.id === activeSong.id ? togglePlay() : playSong(activeSong, curatedSongs))}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer backdrop-blur-[2px]"
            >
              <div className="w-13 h-13 rounded-full bg-[var(--accent)] text-black flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-transform">
                {isPlaying && currentSong?.id === activeSong.id ? (
                  <Pause className="w-6 h-6 fill-black" />
                ) : (
                  <Play className="w-6 h-6 fill-black ml-1" />
                )}
              </div>
            </div>

            {/* Hi-Res pill */}
            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[9px] font-mono font-bold tracking-widest text-amber-300">
              HI-RES AUDIO
            </div>
          </div>

          {/* Title & Info */}
          <div>
            <h3 className="text-lg font-extrabold text-white truncate tracking-tight">
              {activeSong.album || activeSong.title}
            </h3>
            <p className="text-xs text-[#A1A1AA] truncate mt-0.5">{activeSong.artist}</p>

            <p className="text-[11px] text-[#71717A] mt-2 line-clamp-2 leading-relaxed italic font-serif">
              Enjoy vivid emotions with this stunning personal music album. Each melody tells a story.
            </p>

            {/* Like and stats row (Image 1 style) */}
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-[#303038]/40 text-xs">
              <button
                onClick={() => toggleFavorite(activeSong.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#19191F] hover:bg-[#25252D] border border-[#303038] text-white transition-all shadow-sm"
              >
                <Heart
                  className={`w-3.5 h-3.5 transition-colors ${
                    activeSong.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-[#A1A1AA]'
                  }`}
                />
                <span className="text-[11px] font-medium">{activeSong.isFavorite ? 'Saved' : 'Like'}</span>
              </button>

              <span className="text-[11px] text-[#71717A] font-mono">
                {curatedSongs.length} {curatedSongs.length === 1 ? 'track' : 'tracks'}
              </span>
            </div>
          </div>

          {/* Mini Tracklist with animated soundwave (Image 1 style) */}
          <div className="pt-2 space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#71717A] block mb-2">
              Tracklist
            </span>

            <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
              {curatedSongs.map((s, idx) => {
                const isThisPlaying = currentSong?.id === s.id && isPlaying;
                const isThisCurrent = currentSong?.id === s.id;
                const sArt = getArtworkObjectUrl(s);

                return (
                  <div
                    key={s.id}
                    onClick={() => (isThisCurrent ? togglePlay() : playSong(s, curatedSongs))}
                    className={`group/track flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all ${
                      isThisCurrent
                        ? 'bg-[var(--accent)]/15 border border-[var(--accent)]/30'
                        : 'hover:bg-[#19191F] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Active soundwave or number / thumb */}
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#202028] shrink-0 relative flex items-center justify-center">
                        {isThisPlaying ? (
                          <div className="w-full h-full bg-[var(--accent)]/20 flex items-center justify-center gap-0.5">
                            <span className="w-0.5 bg-[var(--accent)] rounded-full animate-wave-1 h-3.5" />
                            <span className="w-0.5 bg-[var(--accent)] rounded-full animate-wave-2 h-2.5" />
                            <span className="w-0.5 bg-[var(--accent)] rounded-full animate-wave-3 h-4" />
                          </div>
                        ) : sArt ? (
                          <img src={sArt} alt={s.title} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[11px] font-mono text-[#71717A]">{idx + 1}</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <p
                          className={`text-xs font-medium truncate ${
                            isThisCurrent ? 'text-[var(--accent)] font-semibold' : 'text-white'
                          }`}
                        >
                          {s.title}
                        </p>
                        <p className="text-[10px] text-[#A1A1AA] truncate">{s.artist}</p>
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-[#71717A] shrink-0 ml-2">
                      {formatDuration(s.duration)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-[#71717A] space-y-2">
          <Disc3 className="w-10 h-10 mx-auto text-[#3E3E4C] animate-spin-slow" />
          <p className="text-xs">No active album selected</p>
          <p className="text-[11px] text-[#525260]">Select any melody from your diary to preview its tracklist</p>
        </div>
      )}
    </aside>
  );
}
