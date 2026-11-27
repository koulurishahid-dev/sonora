'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Song } from '@/types/music';
import { getArtworkObjectUrl } from '@/lib/db';
import { formatDuration } from '@/lib/utils';
import { usePlayer } from '@/context/PlayerContext';
import { useTheme } from '@/context/ThemeContext';
import { playInteractionSound } from '@/lib/interactionSound';
import { Play, Pause, Heart, MoreVertical, Music2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InteractiveSongCardProps {
  song: Song;
  queueList?: Song[];
  contextTitle?: string;
  index?: number;
  onContextMenu: (e: React.MouseEvent, song: Song) => void;
  className?: string;
}

export function InteractiveSongCard({
  song,
  queueList,
  contextTitle,
  index = 0,
  onContextMenu,
  className = '',
}: InteractiveSongCardProps) {
  const { playSong, currentSong, isPlaying, togglePlay, toggleFavorite } = usePlayer();
  const { settings } = useTheme();

  const cat = (song.category || song.genre || '').toLowerCase();
  const fallback =
    cat.includes('love') || cat.includes('romance')
      ? '/covers/telugu_romance.jpg'
      : cat.includes('mass') || cat.includes('beat')
      ? '/covers/mass_party_beats.jpg'
      : cat.includes('classic') || cat.includes('nostalgia')
      ? '/covers/golden_classics.jpg'
      : cat.includes('melod')
      ? '/covers/soulful_melodies.jpg'
      : '/covers/hot_hits_telugu.jpg';

  const artUrl = getArtworkObjectUrl(song) || fallback;
  const [imgSrc, setImgSrc] = useState<string>(artUrl);
  const [hasError, setHasError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  // 3D Tilt calculation & mouse spotlight
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [spotlightPos, setSpotlightPos] = useState({ x: 50, y: 50 });

  const isCurrent = currentSong?.id === song.id;
  const isFav = song.isFavorite;

  useEffect(() => {
    const freshArt = getArtworkObjectUrl(song) || fallback;
    setImgSrc(freshArt);
    setHasError(false);
  }, [song.id, song.artworkUrl]);

  const handleImageError = () => {
    if (imgSrc !== fallback) {
      setImgSrc(fallback);
    } else {
      setHasError(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || typeof window === 'undefined') return;
    if (window.matchMedia('(pointer: coarse)').matches) return; // Skip 3D tilt on mobile touch to keep scrolling 100% fluid!
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Smooth tilt angles (-8 to +8 degrees)
    const rotX = ((y - centerY) / centerY) * -7;
    const rotY = ((x - centerX) / centerX) * 7;

    setRotateX(rotX);
    setRotateY(rotY);
    setSpotlightPos({ x, y });
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  const handleClickPlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    playInteractionSound(settings.hapticSoundEnabled, 'tap');
    if (isCurrent) {
      togglePlay();
    } else {
      playSong(song, queueList, contextTitle);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    playInteractionSound(settings.hapticSoundEnabled, 'burst');
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 800);
    toggleFavorite(song.id);
  };

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={handleClickPlay}
      onContextMenu={e => onContextMenu(e, song)}
      className={`interactive-song-card group relative p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.07] border transition-colors duration-150 cursor-pointer flex flex-col shadow-sm select-none ${
        isCurrent
          ? 'border-[#A78BFA]/70 bg-white/[0.06]'
          : 'border-white/[0.07] hover:border-white/[0.16]'
      } ${className}`}
    >
      {/* 1. ARTWORK CONTAINER */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#0E0E14] border border-white/[0.06] mb-2.5 flex items-center justify-center">
        {!hasError ? (
          <img
            src={imgSrc}
            alt=""
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={handleImageError}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 bg-[#14141C]">
            <img src="/logo-icon.png" alt="" className="w-7 h-7 object-contain opacity-70 mb-1" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#94A3B8]">Naa Paatalu</span>
          </div>
        )}

        {/* Static Playing Indicator */}
        {isCurrent && isPlaying && (
          <div className="absolute top-2 left-2 z-20 flex items-end gap-0.5 px-2 py-1 rounded-md bg-black/70 border border-white/15">
            <span className="w-0.5 bg-[#A78BFA] rounded-full h-2.5" />
            <span className="w-0.5 bg-[#A78BFA] rounded-full h-3.5" />
            <span className="w-0.5 bg-[#A78BFA] rounded-full h-2" />
          </div>
        )}

        {/* Crisp Centered Play/Pause Button */}
        <div
          className={`absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-150 ${
            isCurrent
              ? 'opacity-100 bg-black/35'
              : 'opacity-0 group-hover:opacity-100 bg-black/40'
          }`}
        >
          <div className="w-11 h-11 rounded-full bg-white hover:bg-[#E2E8F0] text-[#07070A] flex items-center justify-center shadow-lg cursor-pointer">
            {isCurrent && isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </div>
        </div>

        {/* Quick Top Right Action Buttons Revealed on Hover */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={handleToggleFavorite}
            className="p-1.5 rounded-full bg-black/70 hover:bg-black/90 text-white border border-white/10"
            title={isFav ? 'Remove Favorite' : 'Add to Favorites'}
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                isFav ? 'fill-rose-500 text-rose-500' : 'text-zinc-300 hover:text-white'
              }`}
            />
          </button>

          <button
            onClick={e => {
              e.stopPropagation();
              onContextMenu(e, song);
            }}
            className="p-1.5 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md text-zinc-300 hover:text-white border border-white/10 transition-transform active:scale-80"
            title="More Options"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Heart Burst Particle Effect Animation */}
        <AnimatePresence>
          {showHeartBurst && (
            <motion.div
              initial={{ scale: 0.5, opacity: 1 }}
              animate={{ scale: 2.2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-12 h-12 fill-rose-500 text-rose-500 filter drop-shadow-[0_0_12px_#f43f5e]" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. SONG METADATA */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-xs sm:text-sm font-bold truncate transition-colors ${
            isCurrent ? 'text-[#D8B4FE]' : 'text-[#F8F5FF] group-hover:text-[#D8B4FE]'
          }`}
          title={song.title}
        >
          {song.title}
        </p>
        <p className="text-[11px] text-[#C2B5D9] truncate font-medium mt-0.5">
          {song.artist}
        </p>
      </div>

      {/* 3. DURATION & SUBTLE FOOTER */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.06] text-[10px] font-mono text-[#94A3B8]">
        <span>{formatDuration(song.duration)}</span>
        <span className="opacity-0 group-hover:opacity-100 text-[#C4B5FD] font-semibold transition-opacity">
          Hi-Fi 320k
        </span>
      </div>
    </div>
  );
}
