'use client';

import React, { useEffect, useState } from 'react';
import { Playlist, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { useToast } from '@/context/ToastContext';
import { ListMusic, Plus, Play, MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface PlaylistsViewProps {
  onNavigate: (view: ViewType, param?: string) => void;
  onOpenCreatePlaylist: () => void;
  onEditPlaylist: (playlist: Playlist) => void;
}

export function PlaylistsView({
  onNavigate,
  onOpenCreatePlaylist,
  onEditPlaylist,
}: PlaylistsViewProps) {
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [songCounts, setSongCounts] = useState<Record<string, number>>({});

  const loadData = async () => {
    const list = await db.playlists.toArray();
    setPlaylists(list);

    const counts: Record<string, number> = {};
    for (const pl of list) {
      counts[pl.id] = await db.playlistSongs.where('playlistId').equals(pl.id).count();
    }
    setSongCounts(counts);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (e: React.MouseEvent, pl: Playlist) => {
    e.stopPropagation();
    if (confirm(`Delete playlist "${pl.title}"? (Songs will remain in your library)`)) {
      await db.playlists.delete(pl.id);
      await db.playlistSongs.where('playlistId').equals(pl.id).delete();
      showToast('Deleted', `Removed playlist "${pl.title}"`, 'info');
      await loadData();
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Your Playlists</h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Organize your library into custom themes and moods
          </p>
        </div>

        <button
          onClick={onOpenCreatePlaylist}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-black text-xs font-bold hover:scale-105 transition-all shadow-md"
        >
          <Plus className="w-4 h-4" /> Create Playlist
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {/* Create Card */}
        <div
          onClick={onOpenCreatePlaylist}
          className="p-4 rounded-2xl bg-[#19191F]/40 hover:bg-[#19191F] border-2 border-dashed border-[#303038] hover:border-[var(--accent)] cursor-pointer flex flex-col items-center justify-center text-center transition-all group aspect-square"
        >
          <div className="w-12 h-12 rounded-full bg-[#25252D] group-hover:bg-[var(--accent)] text-[#A1A1AA] group-hover:text-black flex items-center justify-center mb-2.5 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-white">New Playlist</p>
          <p className="text-xs text-[#71717A] mt-1">Create custom mix</p>
        </div>

        {/* Existing Playlists */}
        {playlists.map(pl => {
          const artUrl = getArtworkObjectUrl(pl);
          const count = songCounts[pl.id] || 0;

          return (
            <div
              key={pl.id}
              onClick={() => onNavigate('playlist-detail', pl.id)}
              className="group p-3 rounded-2xl bg-[#19191F]/80 hover:bg-[#25252D] border border-transparent hover:border-[#303038] cursor-pointer transition-all shadow-md flex flex-col relative"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-[#25252D] relative mb-3 flex items-center justify-center">
                {artUrl ? (
                  <img
                    src={artUrl}
                    alt={pl.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <ListMusic className="w-12 h-12 text-[#71717A]" />
                )}

                {/* Edit & Delete Action Buttons */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onEditPlaylist(pl);
                    }}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white backdrop-blur-md"
                    title="Edit Playlist"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => handleDelete(e, pl)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-900/90 text-rose-300 backdrop-blur-md"
                    title="Delete Playlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-sm font-semibold text-white truncate">{pl.title}</p>
              <p className="text-xs text-[#A1A1AA] truncate mt-0.5">
                {count} {count === 1 ? 'song' : 'songs'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
