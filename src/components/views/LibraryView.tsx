'use client';

import React, { useState, useEffect } from 'react';
import { Song, ViewType, Playlist } from '@/types/music';
import { db, getArtworkObjectUrl, syncAlbumsAndArtists, repairLibraryArtworkAndTitles } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { useToast } from '@/context/ToastContext';
import { formatDuration, formatDate } from '@/lib/utils';
import { InteractiveSongCard } from '@/components/common/InteractiveSongCard';
import {
  Play,
  Pause,
  Search,
  List,
  LayoutGrid,
  Heart,
  MoreVertical,
  ArrowUpDown,
  Trash2,
  FolderPlus,
  Music2,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';

interface LibraryViewProps {
  onNavigate: (view: ViewType, param?: string) => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
  onOpenUpload: () => void;
}

export function LibraryView({
  onNavigate,
  onSongContextMenu,
  onOpenUpload,
}: LibraryViewProps) {
  const { playSong, currentSong, isPlaying, togglePlay, toggleFavorite } = usePlayer();
  const { showToast } = useToast();

  const [songs, setSongs] = useState<Song[]>([]);
  const [filterText, setFilterText] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'album' | 'duration' | 'dateAdded' | 'playCount'>('dateAdded');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showBulkPlaylistDropdown, setShowBulkPlaylistDropdown] = useState(false);
  const [visibleCount, setVisibleCount] = useState(36);

  useEffect(() => {
    setVisibleCount(36);
  }, [filterText, sortBy, sortOrder]);

  const loadSongs = async () => {
    const all = await db.songs.toArray();
    setSongs(all);
    const pl = await db.playlists.toArray();
    setPlaylists(pl);
  };

  useEffect(() => {
    loadSongs();
  }, []);

  // Filter and sort
  const filteredSongs = songs
    .filter(s => {
      const q = filterText.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q) ||
        (s.genre && s.genre.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'title') cmp = a.title.localeCompare(b.title);
      else if (sortBy === 'artist') cmp = a.artist.localeCompare(b.artist);
      else if (sortBy === 'album') cmp = a.album.localeCompare(b.album);
      else if (sortBy === 'duration') cmp = a.duration - b.duration;
      else if (sortBy === 'dateAdded') cmp = a.dateAdded - b.dateAdded;
      else if (sortBy === 'playCount') cmp = (a.playCount || 0) - (b.playCount || 0);

      return sortOrder === 'asc' ? cmp : -cmp;
    });

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredSongs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSongs.map(s => s.id)));
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(`Delete ${selectedIds.size} selected songs from library?`)) {
      for (const id of Array.from(selectedIds)) {
        await db.songs.delete(id);
        await db.playlistSongs.where('songId').equals(id).delete();
        await db.favorites.where('songId').equals(id).delete();
        await db.lyrics.where('songId').equals(id).delete();
      }
      await syncAlbumsAndArtists();
      showToast('Deleted', `Removed ${selectedIds.size} songs`, 'info');
      setSelectedIds(new Set());
      await loadSongs();
    }
  };

  // Bulk Favorite
  const handleBulkFavorite = async () => {
    if (selectedIds.size === 0) return;
    for (const id of Array.from(selectedIds)) {
      await db.songs.update(id, { isFavorite: true });
      await db.favorites.put({ id: `fav_${id}`, songId: id, addedAt: Date.now() });
    }
    showToast('Favorites', `Saved ${selectedIds.size} songs to Liked Songs`, 'success');
    setSelectedIds(new Set());
    await loadSongs();
  };

  // Bulk Add to Playlist
  const handleBulkAddToPlaylist = async (playlistId: string, playlistTitle: string) => {
    let addedCount = 0;
    for (const songId of Array.from(selectedIds)) {
      const exists = await db.playlistSongs
        .where('playlistId')
        .equals(playlistId)
        .and(item => item.songId === songId)
        .first();

      if (!exists) {
        const count = await db.playlistSongs.where('playlistId').equals(playlistId).count();
        await db.playlistSongs.add({
          id: `${playlistId}_${songId}`,
          playlistId,
          songId,
          order: count,
          addedAt: Date.now(),
        });
        addedCount++;
      }
    }

    showToast('Added to Playlist', `Added ${addedCount} tracks to "${playlistTitle}"`, 'success');
    setSelectedIds(new Set());
    setShowBulkPlaylistDropdown(false);
  };

  // Bulk Play Selected
  const handleBulkPlay = () => {
    const selectedList = songs.filter(s => selectedIds.has(s.id));
    if (selectedList.length > 0) {
      playSong(selectedList[0], selectedList);
      showToast('Playing Selection', `Playing ${selectedList.length} tracks`, 'info');
    }
  };

  return (
    <div className="p-3.5 sm:p-6 md:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">All Songs</h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            {songs.length} {songs.length === 1 ? 'song' : 'songs'} in your personal library
          </p>
        </div>

        {/* Search & View toggles */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter library..."
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              className="pl-9 pr-3.5 py-1.5 rounded-xl bg-[#19191F] border border-[#303038] text-xs text-white focus:border-[var(--accent)] outline-none w-44 sm:w-60"
            />
          </div>

          <div className="flex items-center bg-[#19191F] border border-[#303038] rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-[#25252D] text-white' : 'text-[#71717A] hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#25252D] text-white' : 'text-[#71717A] hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Multi-Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#25252D] border border-[var(--accent)]/40 shadow-xl">
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-xs font-semibold text-white flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
              <span>{selectedIds.size} selected</span>
            </button>
          </div>

          <div className="flex items-center gap-2 relative">
            <button
              onClick={handleBulkPlay}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#A855F7] hover:bg-[#C084FC] text-black transition-colors shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-black" /> Play Selected
            </button>

            <button
              onClick={handleBulkFavorite}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#19191F] hover:bg-[#303038] text-white border border-[#303038] transition-colors"
            >
              <Heart className="w-3.5 h-3.5 text-rose-400" /> Favorite All
            </button>

            {/* Bulk Add to Playlist Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowBulkPlaylistDropdown(!showBulkPlaylistDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#19191F] hover:bg-[#303038] text-white border border-[#303038] transition-colors"
              >
                <FolderPlus className="w-3.5 h-3.5 text-sky-400" /> Add to Playlist
              </button>

              {showBulkPlaylistDropdown && (
                <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-[#18181F] border border-[#303038] p-1 shadow-2xl z-30 space-y-0.5">
                  {playlists.length === 0 ? (
                    <div className="p-2 text-xs text-[#71717A]">No playlists available</div>
                  ) : (
                    playlists.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleBulkAddToPlaylist(p.id, p.title)}
                        className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-[var(--accent)] hover:text-black truncate transition-colors"
                      >
                        {p.title}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredSongs.length === 0 && (
        <div className="text-center py-16 text-[#A1A1AA] border border-dashed border-[#303038] rounded-2xl">
          <Music2 className="w-12 h-12 text-[#303038] mx-auto mb-3" />
          <p className="text-base font-semibold text-white">No songs found</p>
          <p className="text-xs text-[#71717A] mt-1 mb-4">
            {filterText ? 'Try a different filter query' : 'Upload your favorite songs to begin'}
          </p>
          {!filterText && (
            <button
              onClick={onOpenUpload}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-black text-xs font-bold"
            >
              Upload Songs
            </button>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && filteredSongs.length > 0 && (
        <div className="overflow-x-auto rounded-2xl glass-pure border border-white/10 p-2 shadow-xl">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="border-b border-white/10 text-[#A1A1AA] uppercase font-bold tracking-wider text-[10px]">
                <th className="py-2.5 px-3 w-10">
                  <button onClick={selectAll}>
                    {selectedIds.size > 0 && selectedIds.size === filteredSongs.length ? (
                      <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#71717A] hover:text-white" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-2 w-12 text-center">#</th>
                <th
                  onClick={() => {
                    setSortBy('title');
                    setSortOrder(sortBy === 'title' && sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Title</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortBy('album');
                    setSortOrder(sortBy === 'album' && sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-2.5 px-3 hidden md:table-cell cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Album</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortBy('dateAdded');
                    setSortOrder(sortBy === 'dateAdded' && sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-2.5 px-3 hidden lg:table-cell cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Date Added</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => {
                    setSortBy('duration');
                    setSortOrder(sortBy === 'duration' && sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-2.5 px-3 w-20 text-right cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Duration</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-2.5 px-3 w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredSongs.slice(0, visibleCount).map((song, idx) => {
                const isCur = currentSong?.id === song.id;
                const isSel = selectedIds.has(song.id);
                const artworkUrl = getArtworkObjectUrl(song);

                return (
                  <tr
                    key={song.id}
                    onContextMenu={e => onSongContextMenu(e, song)}
                    onClick={() => (isCur ? togglePlay() : playSong(song, filteredSongs))}
                    className={`group hover:bg-white/10 cursor-pointer transition-colors ${
                      isCur ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : ''
                    } ${isSel ? 'bg-white/10' : ''}`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3" onClick={e => toggleSelect(song.id, e)}>
                      {isSel ? (
                        <CheckSquare className="w-4 h-4 text-[var(--accent)]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#71717A] group-hover:text-white" />
                      )}
                    </td>

                    {/* Track Number / Play Icon & Dynamic EQ */}
                    <td className="py-2.5 px-2 text-center text-[#71717A] font-mono">
                      <div className="flex items-center justify-center">
                        {isCur && isPlaying ? (
                          <div className="flex items-end gap-0.5 h-3.5" title="Playing">
                            <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-1 h-3.5" />
                            <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-2 h-2.5" />
                            <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-3 h-3" />
                          </div>
                        ) : (
                          <>
                            <span className="group-hover:hidden">{idx + 1}</span>
                            <Play className="w-3.5 h-3.5 hidden group-hover:block fill-white text-white" />
                          </>
                        )}
                      </div>
                    </td>

                    {/* Artwork, Title & Artist */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#25252D] shrink-0 relative flex items-center justify-center">
                          {artworkUrl ? (
                            <img
                              src={artworkUrl}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              onError={e => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                              className="w-full h-full object-cover relative z-10"
                            />
                          ) : null}
                          <div className="absolute inset-0 flex items-center justify-center bg-[#25252D] text-[#71717A] z-0">
                            <Music2 className="w-4 h-4" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`font-semibold truncate text-xs ${
                              isCur ? 'text-[var(--accent)]' : 'text-white'
                            }`}
                          >
                            {song.title}
                          </p>
                          <p className="text-[11px] text-[#A1A1AA] truncate">{song.artist}</p>
                        </div>
                      </div>
                    </td>

                    {/* Album */}
                    <td className="py-2.5 px-3 hidden md:table-cell text-[#A1A1AA] truncate max-w-xs">
                      {song.album}
                    </td>

                    {/* Date Added */}
                    <td className="py-2.5 px-3 hidden lg:table-cell text-[#71717A] font-mono text-[11px]">
                      {formatDate(song.dateAdded)}
                    </td>

                    {/* Duration */}
                    <td className="py-2.5 px-3 text-right text-[#A1A1AA] font-mono text-[11px]">
                      {formatDuration(song.duration)}
                    </td>

                    {/* Actions: Favorite & Context Menu */}
                    <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => toggleFavorite(song.id)}
                          className="p-1 rounded text-[#71717A] hover:text-white transition-colors"
                          title={song.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              song.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                            }`}
                          />
                        </button>
                        <button
                          onClick={e => onSongContextMenu(e, song)}
                          className="p-1 rounded text-[#71717A] hover:text-white transition-colors"
                          title="Options"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredSongs.length > visibleCount && (
            <div className="flex flex-col items-center justify-center pt-4 pb-6 gap-2">
              <button
                onClick={() => setVisibleCount(prev => prev + 36)}
                className="px-6 py-2.5 rounded-full bg-[#141122] hover:bg-[#2A2140] active:scale-95 border border-[#302744] text-[#F8F5FF] text-xs font-bold transition-all shadow-md hover:border-[#A78BFA]/40 flex items-center gap-2 group"
              >
                <span>Load More Tracks</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#211A32] text-[#A78BFA] border border-[#302744] font-bold">
                  +{Math.min(36, filteredSongs.length - visibleCount)}
                </span>
              </button>
              <p className="text-[11px] text-white/40 font-mono">
                Showing {Math.min(visibleCount, filteredSongs.length)} of {filteredSongs.length} songs
              </p>
            </div>
          )}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredSongs.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4">
            {filteredSongs.slice(0, visibleCount).map((song, idx) => (
              <InteractiveSongCard
                key={song.id}
                song={song}
                queueList={filteredSongs}
                index={idx}
                onContextMenu={onSongContextMenu}
              />
            ))}
          </div>

          {filteredSongs.length > visibleCount && (
            <div className="flex flex-col items-center justify-center pt-2 pb-6 gap-2">
              <button
                onClick={() => setVisibleCount(prev => prev + 36)}
                className="px-6 py-2.5 rounded-full bg-[#141122] hover:bg-[#2A2140] active:scale-95 border border-[#302744] text-[#F8F5FF] text-xs font-bold transition-all shadow-md hover:border-[#A78BFA]/40 flex items-center gap-2 group"
              >
                <span>Load More Tracks</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#211A32] text-[#A78BFA] border border-[#302744] font-bold">
                  +{Math.min(36, filteredSongs.length - visibleCount)}
                </span>
              </button>
              <p className="text-[11px] text-white/40 font-mono">
                Showing {Math.min(visibleCount, filteredSongs.length)} of {filteredSongs.length} songs
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
