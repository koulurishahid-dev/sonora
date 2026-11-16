'use client';

import React, { useEffect, useState } from 'react';
import { Artist, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { User, Music2 } from 'lucide-react';

interface ArtistsViewProps {
  onNavigate: (view: ViewType, param?: string) => void;
}

export function ArtistsView({ onNavigate }: ArtistsViewProps) {
  const [artists, setArtists] = useState<Artist[]>([]);

  useEffect(() => {
    db.artists.toArray().then(setArtists);
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Artists I Love</h1>
        <p className="text-xs text-[#A1A1AA] mt-1">
          {artists.length} {artists.length === 1 ? 'artist' : 'artists'} whose voices and compositions fill your world
        </p>
      </div>

      {artists.length === 0 ? (
        <div className="text-center py-16 text-[#A1A1AA] border border-dashed border-[#303038] rounded-2xl">
          <User className="w-12 h-12 text-[#303038] mx-auto mb-3" />
          <p className="text-base font-semibold text-white">No artists detected yet</p>
          <p className="text-xs text-[#71717A] mt-1">
            Artists will appear here automatically when you import songs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {artists.map(art => {
            const artUrl = getArtworkObjectUrl(art);

            return (
              <div
                key={art.id}
                onClick={() => onNavigate('artist-detail', art.name)}
                className="group p-4 rounded-2xl bg-[#19191F]/80 hover:bg-[#25252D] border border-transparent hover:border-[#303038] cursor-pointer transition-all shadow-md flex flex-col items-center text-center"
              >
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden bg-[#25252D] relative mb-3.5 flex items-center justify-center shadow-lg border border-white/5">
                  {artUrl ? (
                    <img
                      src={artUrl}
                      alt={art.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <User className="w-12 h-12 text-[#71717A]" />
                  )}
                </div>

                <p className="text-sm font-bold text-white truncate w-full group-hover:text-[var(--accent)] transition-colors">
                  {art.name}
                </p>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  {art.songCount} {art.songCount === 1 ? 'track' : 'tracks'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
