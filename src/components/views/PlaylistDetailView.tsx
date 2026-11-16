'use client';

import React, { useEffect, useState } from 'react';
import { Playlist, Song, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { useToast } from '@/context/ToastContext';
import { formatDuration, formatDate } from '@/lib/utils';
import {
  Play,
  Shuffle,
  ListMusic,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Music2,
  MoreVertical,
  Heart,
  Pause,
} from 'lucide-react';

interface PlaylistDetailViewProps {
  playlistId: string;
  onNavigate: (view: ViewType, param?: string) => void;
  onEditPlaylist: (playlist: Playlist) => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
}

export function PlaylistDetailView({
  playlistId,
  onNavigate,
  onEditPlaylist,
  onSongContextMenu,
}: PlaylistDetailViewProps) {
  const { playSong, currentSong, isPlaying, togglePlay, toggleFavorite } = usePlayer();
  const { showToast } = useToast();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const pl = await db.playlists.get(playlistId);
    if (!pl) {
      setIsLoading(false);
      return;
    }
    setPlaylist(pl);

    // Get songs in order
    const pSongs = await db.playlistSongs
      .where('playlistId')
      .equals(playlistId)
      .sortBy('order');

    const songObjects: Song[] = [];
    for (const ps of pSongs) {
      const s = await db.songs.get(ps.songId);
      if (s) songObjects.push(s);
    }
    setSongs(songObjects);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [playlistId]);

  if (isLoading) {
    return <div className="p-8 text-center text-[#A1A1AA]">Loading playlist...</div>;
  }

  if (!playlist) {
    return (
      <div className="p-8 text-center text-[#A1A1AA]">
        <p>Playlist not found.</p>
        <button
          onClick={() => onNavigate('playlists')}
          className="mt-3 px-4 py-2 rounded-xl bg-[#25252D] text-white text-xs"
        >
          Back to Playlists
        </button>
      </div>
    );
  }

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const artworkUrl = getArtworkObjectUrl(playlist);

  const handlePlayAll = () => {
    if (songs.length > 0) {
      playSong(songs[0], songs);
    }
  };

  const handleShuffleAll = () => {
    if (songs.length > 0) {
      const shuffled = [...songs].sort(() => Math.random() - 0.5);
      playSong(shuffled[0], shuffled);
    }
  };

  const handleRemoveFromPlaylist = async (songId: string) => {
    await db.playlistSongs
      .where('playlistId')
      .equals(playlistId)
      .and(item => item.songId === songId)
      .delete();
    showToast('Removed', 'Song removed from playlist', 'info');
    await loadData();
  };

  const moveSong = async (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= songs.length) return;
    const pSongs = await db.playlistSongs
      .where('playlistId')
      .equals(playlistId)
      .sortBy('order');

    const [moved] = pSongs.splice(fromIdx, 1);
    pSongs.splice(toIdx, 0, moved);

    // Update order values in db
    for (let i = 0; i < pSongs.length; i++) {
      await db.playlistSongs.update(pSongs[i].id, { order: i });
    }
    await loadData();
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Back button */}
      <button
        onClick={() => onNavigate('playlists')}
        className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Playlists
      </button>

      {/* Playlist Hero Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6 border-b border-[#303038]/60">
        <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-[#19191F] shrink-0 shadow-2xl border border-white/10 flex items-center justify-center relative group">
          {artworkUrl ? (
            <img src={artworkUrl} alt={playlist.title} className="w-full h-full object-cover" />
          ) : (
            <ListMusic className="w-16 h-16 text-[#71717A]" />
          )}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <span className="text-xs uppercase font-bold tracking-widest text-[var(--accent)]">
            Playlist
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {playlist.title}
          </h1>
          {playlist.description && (
            <p className="text-sm text-[#A1A1AA] max-w-xl">{playlist.description}</p>
          )}

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-[#71717A] pt-2">
            <span>{songs.length} {songs.length === 1 ? 'track' : 'tracks'}</span>
            <span>•</span>
            <span>{formatDuration(totalDuration)} total length</span>
            <span>•</span>
            <span>Created {formatDate(playlist.createdAt)}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center sm:justify-start gap-3 pt-3">
            <button
              onClick={handlePlayAll}
              disabled={songs.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--accent)] text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-40"
            >
              <Play className="w-4 h-4 fill-black" /> Play
            </button>

            <button
              onClick={handleShuffleAll}
              disabled={songs.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#25252D] hover:bg-[#303038] text-white text-xs font-semibold transition-all border border-[#303038] disabled:opacity-40"
            >
              <Shuffle className="w-4 h-4" /> Shuffle
            </button>

            <button
              onClick={() => onEditPlaylist(playlist)}
              className="p-2.5 rounded-full bg-[#19191F] hover:bg-[#25252D] text-[#A1A1AA] hover:text-white transition-colors border border-[#303038]"
              title="Edit Playlist Details"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Song List */}
      <div>
        {songs.length === 0 ? (
          <div className="text-center py-16 text-[#A1A1AA] border border-dashed border-[#303038] rounded-2xl">
            <ListMusic className="w-12 h-12 text-[#303038] mx-auto mb-3" />
            <p className="text-base font-semibold text-white">This playlist is empty</p>
            <p className="text-xs text-[#71717A] mt-1">
              Add songs from your library by right-clicking on any track and choosing &quot;Add to Playlist&quot;.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead>
                <tr className="border-b border-[#303038]/60 text-[#71717A] uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Album</th>
                  <th className="py-2.5 px-3 w-20 text-right">Duration</th>
                  <th className="py-2.5 px-3 w-28 text-center">Order / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303038]/30">
                {songs.map((song, idx) => {
                  const isCur = currentSong?.id === song.id;
                  const artworkUrl = getArtworkObjectUrl(song);

                  return (
                    <tr
                      key={`${song.id}_${idx}`}
                      onContextMenu={e => onSongContextMenu(e, song)}
                      onClick={() => (isCur ? togglePlay() : playSong(song, songs))}
                      className={`group hover:bg-[#19191F]/90 cursor-pointer transition-colors ${
                        isCur ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : ''
                      }`}
                    >
                      {/* Track Number / Play */}
                      <td className="py-2.5 px-3 text-center text-[#71717A] font-mono">
                        <div className="flex items-center justify-center">
                          {isCur && isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-[var(--accent)] text-[var(--accent)]" />
                          ) : (
                            <>
                              <span className="group-hover:hidden">{idx + 1}</span>
                              <Play className="w-3.5 h-3.5 hidden group-hover:block fill-white text-white" />
                            </>
                          )}
                        </div>
                      </td>

                      {/* Title & Artist */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#25252D] shrink-0 flex items-center justify-center">
                            {artworkUrl ? (
                              <img src={artworkUrl} alt={song.title} className="w-full h-full object-cover" />
                            ) : (
                              <Music2 className="w-4 h-4 text-[#71717A]" />
                            )}
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

                      {/* Duration */}
                      <td className="py-2.5 px-3 text-right text-[#A1A1AA] font-mono text-[11px]">
                        {formatDuration(song.duration)}
                      </td>

                      {/* Reorder and Delete Actions */}
                      <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => moveSong(idx, idx - 1)}
                            disabled={idx === 0}
                            className="p-1 rounded text-[#71717A] hover:text-white disabled:opacity-20"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveSong(idx, idx + 1)}
                            disabled={idx === songs.length - 1}
                            className="p-1 rounded text-[#71717A] hover:text-white disabled:opacity-20"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveFromPlaylist(song.id)}
                            className="p-1 rounded text-[#71717A] hover:text-rose-400"
                            title="Remove from playlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => onSongContextMenu(e, song)}
                            className="p-1 rounded text-[#71717A] hover:text-white"
                            title="More"
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
          </div>
        )}
      </div>
    </div>
  );
}
