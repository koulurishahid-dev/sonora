'use client';

import React from 'react';

export function SkeletonSongCard() {
  return (
    <div className="p-3 rounded-2xl bg-[#11131A] border border-white/[0.06] flex flex-col animate-pulse">
      <div className="aspect-square w-full rounded-xl bg-white/[0.04] mb-2.5 relative overflow-hidden">
        {/* Shimmer sweep bar */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
      </div>
      <div className="h-4 bg-white/[0.07] rounded-md w-4/5 mb-1.5" />
      <div className="h-3 bg-white/[0.04] rounded-md w-3/5 mb-3" />
      <div className="flex justify-between pt-2 border-t border-white/[0.04]">
        <div className="h-2.5 bg-white/[0.04] rounded w-10" />
        <div className="h-2.5 bg-white/[0.04] rounded w-12" />
      </div>
    </div>
  );
}
