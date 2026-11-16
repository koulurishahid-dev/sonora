'use client';

import React, { useEffect, useState } from 'react';
import { Album, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { Disc, Play } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface AlbumsViewProps {
  onNavigate: (view: ViewType, param?: string) => void;
}

export function AlbumsView({ onNavigate }: AlbumsViewProps) {
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    db.albums.toArray().then(setAlbums);
  }, []);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Albums</h1>
        <p className="text-xs text-[#A1A1AA] mt-1">
          {albums.length} {albums.length === 1 ? 'album' : 'albums'} in your library
        </p>
      </div>

      {albums.length === 0 ? (
        <div className="text-center py-16 text-[#A1A1AA] border border-dashed border-[#303038] rounded-2xl">
          <Disc className="w-12 h-12 text-[#303038] mx-auto mb-3" />
          <p className="text-base font-semibold text-white">No albums detected yet</p>
          <p className="text-xs text-[#71717A] mt-1">
            Albums will appear here automatically when you import music.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {albums.map(alb => {
            const artUrl = getArtworkObjectUrl(alb);

            return (
              <div
                key={alb.id}
                onClick={() => onNavigate('album-detail', alb.title)}
                className="group p-3 rounded-2xl bg-[#19191F]/80 hover:bg-[#25252D] border border-transparent hover:border-[#303038] cursor-pointer transition-all shadow-md flex flex-col"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-[#25252D] relative mb-3 flex items-center justify-center">
                  {artUrl ? (
                    <img
                      src={artUrl}
                      alt={alb.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <Disc className="w-12 h-12 text-[#71717A]" />
                  )}
                </div>

                <p className="text-sm font-semibold text-white truncate">{alb.title}</p>
                <p className="text-xs text-[#A1A1AA] truncate mt-0.5">
                  {alb.artist} {alb.year ? `• ${alb.year}` : ''}
                </p>
                <p className="text-[11px] text-[#71717A] mt-0.5">
                  {alb.songCount} {alb.songCount === 1 ? 'track' : 'tracks'} ({formatDuration(alb.duration)})
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
