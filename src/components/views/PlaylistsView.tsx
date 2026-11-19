'use client';

import React, { useEffect, useState } from 'react';
import { Playlist, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { useToast } from '@/context/ToastContext';
import { ListMusic, Plus, Play, MoreVertical, Edit2, Trash2, Copy, Download } from 'lucide-react';
import { SPOTIFY_TELUGU_CATEGORIES, filterSpotifyCategorySongs } from '@/lib/spotifyService';

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
  const [playlistArtworks, setPlaylistArtworks] = useState<Record<string, string>>({});

  const loadData = async () => {
    let list = await db.playlists.toArray();

    // Ensure all predefined Spotify category playlists exist
    if (list.length < SPOTIFY_TELUGU_CATEGORIES.length) {
      for (const cat of SPOTIFY_TELUGU_CATEGORIES) {
        if (!list.some(p => p.id === cat.id)) {
          const newPl: Playlist = {
            id: cat.id,
            title: cat.title,
            description: cat.description,
            customArtwork: cat.coverImage,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await db.playlists.put(newPl);
          list.push(newPl);
        }
      }
    }

    setPlaylists(list);

    const counts: Record<string, number> = {};
    const arts: Record<string, string> = {};
    const all = await db.songs.toArray();

    for (const pl of list) {
      let count = await db.playlistSongs.where('playlistId').equals(pl.id).count();

      // Self-healing fallback if playlistSongs table was not yet populated
      if (count === 0) {
        const matches = filterSpotifyCategorySongs(all, pl.id);
        count = matches.length;
        if (count > 0) {
          const toAdd = matches.map((s, idx) => ({
            id: `${pl.id}_${s.id}`,
            playlistId: pl.id,
            songId: s.id,
            order: idx,
            addedAt: Date.now(),
          }));
          db.playlistSongs.bulkPut(toAdd).catch(() => {});
        }
      }

      counts[pl.id] = count;

      // If no custom artwork, grab artwork from Spotify category or first song
      const customUrl = getArtworkObjectUrl(pl);
      if (customUrl) {
        arts[pl.id] = customUrl;
      } else {
        const catDef = SPOTIFY_TELUGU_CATEGORIES.find(c => c.id === pl.id);
        if (catDef?.coverImage) {
          arts[pl.id] = catDef.coverImage;
        } else {
          const firstPs = await db.playlistSongs.where('playlistId').equals(pl.id).first();
          if (firstPs) {
            const song = await db.songs.get(firstPs.songId);
            if (song) {
              const songArt = getArtworkObjectUrl(song);
              if (songArt) arts[pl.id] = songArt;
            }
          }
        }
      }
    }
    setSongCounts(counts);
    setPlaylistArtworks(arts);
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('sonora_library_updated', handleUpdate);

    const timer = setTimeout(loadData, 1200);

    return () => {
      window.removeEventListener('sonora_library_updated', handleUpdate);
      clearTimeout(timer);
    };
  }, []);

  const handleDuplicate = async (e: React.MouseEvent, pl: Playlist) => {
    e.stopPropagation();
    const newId = `pl_copy_${Date.now()}`;
    const newPl: Playlist = {
      ...pl,
      id: newId,
      title: `${pl.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.playlists.add(newPl);

    const existingSongs = await db.playlistSongs.where('playlistId').equals(pl.id).toArray();
    if (existingSongs.length > 0) {
      const clonedSongs = existingSongs.map(s => ({
        ...s,
        id: `${newId}_${s.songId}`,
        playlistId: newId,
        addedAt: Date.now(),
      }));
      await db.playlistSongs.bulkAdd(clonedSongs);
    }
    showToast('Playlist Duplicated', `Created "${newPl.title}"`, 'success');
    await loadData();
  };

  const handleExportPlaylist = async (e: React.MouseEvent, pl: Playlist) => {
    e.stopPropagation();
    const plSongs = await db.playlistSongs.where('playlistId').equals(pl.id).toArray();
    const songIds = plSongs.map(s => s.songId);
    const songs = await db.songs.where('id').anyOf(songIds).toArray();
    const data = {
      type: 'naa-paatalu-playlist-export',
      version: 1,
      playlist: pl,
      songs: songs.map(s => ({
        title: s.title,
        artist: s.artist,
        album: s.album,
        duration: s.duration,
        genre: s.genre,
        year: s.year,
      })),
      exportedAt: Date.now(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pl.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_playlist.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported', `Playlist saved as JSON`, 'success');
  };

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
    <div className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">Personal Mixtapes & Playlists</h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5 sm:mt-1">
            Handcrafted collections of memories, moods, and repeat favourites
          </p>
        </div>

        <button
          onClick={onOpenCreatePlaylist}
          className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[var(--accent)] text-black text-xs font-bold hover:scale-105 transition-all shadow-md self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Create Mixtape
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Create Card */}
        <div
          onClick={onOpenCreatePlaylist}
          className="p-4 rounded-2xl bg-[#19191F]/40 hover:bg-[#19191F] border-2 border-dashed border-[#303038] hover:border-[var(--accent)] cursor-pointer flex flex-col items-center justify-center text-center transition-all group aspect-square"
        >
          <div className="w-12 h-12 rounded-full bg-[#25252D] group-hover:bg-[var(--accent)] text-[#A1A1AA] group-hover:text-black flex items-center justify-center mb-2.5 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-white">New Mixtape</p>
          <p className="text-xs text-[#71717A] mt-1">Create custom mix</p>
        </div>

        {/* Existing Playlists */}
        {playlists.map(pl => {
          const artUrl = playlistArtworks[pl.id] || getArtworkObjectUrl(pl);
          const count = songCounts[pl.id] || 0;

          return (
            <div
              key={pl.id}
              onClick={() => onNavigate('playlist-detail', pl.id)}
              className="group p-3 rounded-2xl bg-[#171326] hover:bg-[#2A2140] border border-[#302744] hover:border-[#A78BFA]/50 cursor-pointer transition-all duration-300 shadow-md hover:shadow-2xl hover:shadow-[rgba(167,139,250,0.15)] hover:-translate-y-1.5 flex flex-col relative select-none"
            >
              <div className="aspect-square rounded-xl overflow-hidden bg-[#141122] relative mb-3 flex items-center justify-center border border-[#302744]">
                {artUrl ? (
                  <img
                    src={artUrl}
                    alt={pl.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                  />
                ) : (
                  <ListMusic className="w-12 h-12 text-[#A99DBE]" />
                )}

                {/* Spotify Badge */}
                {pl.id.startsWith('pl_spotify_') && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#090812]/80 backdrop-blur-md border border-[#A78BFA]/40 text-[9px] font-mono font-bold tracking-wider text-[#D8B4FE] z-20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-pulse" />
                    SPOTIFY
                  </div>
                )}

                {/* Floating Play Button on Hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                  <div className="w-11 h-11 rounded-full bg-[#A78BFA] hover:bg-[#D8B4FE] text-[#090812] flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform">
                    <Play className="w-5 h-5 fill-[#090812] ml-0.5" />
                  </div>
                </div>

                {/* Edit, Duplicate, Export & Delete Action Buttons */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                  <button
                    onClick={e => handleDuplicate(e, pl)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-purple-900/90 text-[#D8B4FE] backdrop-blur-md transition-transform active:scale-90"
                    title="Duplicate Playlist"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => handleExportPlaylist(e, pl)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-blue-900/90 text-blue-300 backdrop-blur-md transition-transform active:scale-90"
                    title="Export Playlist JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onEditPlaylist(pl);
                    }}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-white backdrop-blur-md transition-transform active:scale-90"
                    title="Edit Playlist"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={e => handleDelete(e, pl)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-rose-900/90 text-rose-300 backdrop-blur-md transition-transform active:scale-90"
                    title="Delete Playlist"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs sm:text-sm font-bold text-white group-hover:text-[var(--accent)] transition-colors truncate">
                {pl.title}
              </p>
              <p className="text-[11px] text-[#A1A1AA] truncate mt-0.5 font-medium">
                {count} {count === 1 ? 'song' : 'songs'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
