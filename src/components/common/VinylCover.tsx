'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Disc, Music2 } from 'lucide-react';

interface VinylCoverProps {
  artworkUrl?: string | null;
  title?: string;
  artist?: string;
  isPlaying?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  className?: string;
}

export function VinylCover({
  artworkUrl,
  title = 'Unknown Track',
  artist = 'Unknown Artist',
  isPlaying = false,
  size = 'md',
  showBadge = true,
  className = '',
}: VinylCoverProps) {
  // Dimensions per size
  const dimensions = {
    sm: { container: 'w-24 h-24', sleeve: 'w-20 h-20', vinyl: 'w-20 h-20', center: 'w-7 h-7' },
    md: { container: 'w-40 h-40', sleeve: 'w-32 h-32', vinyl: 'w-32 h-32', center: 'w-11 h-11' },
    lg: { container: 'w-56 h-56', sleeve: 'w-44 h-44', vinyl: 'w-44 h-44', center: 'w-14 h-14' },
    xl: { container: 'w-72 h-72', sleeve: 'w-56 h-56', vinyl: 'w-56 h-56', center: 'w-18 h-18' },
  }[size];

  return (
    <div className={`relative flex items-center group cursor-pointer ${dimensions.container} ${className}`}>
      {/* Vinyl Disc that peeks and slides out */}
      <motion.div
        animate={{
          x: isPlaying ? '28%' : '8%',
          rotate: isPlaying ? 360 : 0,
        }}
        whileHover={{ x: '35%' }}
        transition={{
          x: { type: 'spring', damping: 20, stiffness: 120 },
          rotate: isPlaying
            ? { repeat: Infinity, duration: 8, ease: 'linear' }
            : { duration: 0.5 },
        }}
        className={`absolute top-0 left-0 ${dimensions.vinyl} rounded-full bg-[#0D0D11] border-2 border-[#202028] shadow-2xl flex items-center justify-center pointer-events-none z-0`}
        style={{
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.8), inset 0 0 12px rgba(255,255,255,0.06)',
        }}
      >
        {/* Concentric vinyl groove circles */}
        <div className="absolute inset-1.5 rounded-full border border-white/5 opacity-60" />
        <div className="absolute inset-3 rounded-full border border-white/5 opacity-40" />
        <div className="absolute inset-4.5 rounded-full border border-white/5 opacity-30" />
        <div className="absolute inset-6 rounded-full border border-white/5 opacity-20" />

        {/* Center label with miniature artwork */}
        <div
          className={`${dimensions.center} rounded-full overflow-hidden border-2 border-[var(--accent)]/40 relative shadow-inner bg-[#1A1A22] flex items-center justify-center`}
        >
          {artworkUrl ? (
            <img src={artworkUrl} alt={title} className="w-full h-full object-cover" />
          ) : (
            <Disc className="w-3.5 h-3.5 text-[var(--accent)]" />
          )}
          {/* Spindle hole */}
          <div className="w-2.5 h-2.5 rounded-full bg-[#0B0B0D] border border-white/20 absolute shadow-inner" />
        </div>
      </motion.div>

      {/* Front Album Jacket / Sleeve */}
      <div
        className={`relative z-10 ${dimensions.sleeve} rounded-2xl overflow-hidden bg-[#181820] border border-white/10 shadow-2xl transition-all duration-300 group-hover:shadow-[0_15px_35px_-5px_rgba(0,0,0,0.9)]`}
      >
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#71717A] bg-gradient-to-br from-[#1E1E26] to-[#121216]">
            <Music2 className="w-8 h-8 mb-1 text-[#3E3E4C]" />
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#525260]">Sonora</span>
          </div>
        )}

        {/* Subtle Sleeve Gloss Reflection */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-white/[0.12] pointer-events-none" />

        {/* Hi-Res Badge in corner */}
        {showBadge && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md border border-white/15 text-[8px] font-mono font-bold tracking-wider text-amber-300 shadow">
            HI-RES
          </div>
        )}
      </div>
    </div>
  );
}
