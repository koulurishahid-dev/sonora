'use client';

import React, { useEffect, useState } from 'react';
import { Song, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { formatDuration, formatDate } from '@/lib/utils';
import { Play, Shuffle, Heart, Music2, MoreVertical, Pause } from 'lucide-react';

interface LikedSongsViewProps {
  onNavigate: (view: ViewType, param?: string) => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
  onOpenUpload: () => void;
}

export function LikedSongsView({
  onNavigate,
  onSongContextMenu,
  onOpenUpload,
}: LikedSongsViewProps) {
  const { playSong, currentSong, isPlaying, togglePlay, toggleFavorite } = usePlayer();
  const [songs, setSongs] = useState<Song[]>([]);

  const loadData = async () => {
    const favs = await db.favorites.toArray();
    const songList: Song[] = [];
    for (const f of favs) {
      const s = await db.songs.get(f.songId);
      if (s) songList.push(s);
    }
    setSongs(songList);
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const topArt = songs.length > 0 ? getArtworkObjectUrl(songs[0]) : null;

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

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Hero Banner */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6 border-b border-[#303038]/60">
        <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shrink-0 shadow-2xl relative border border-white/10 group">
          {topArt ? (
            <>
              <img src={topArt} alt="Top favorite" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                <div className="w-10 h-10 rounded-full bg-rose-600/90 text-white flex items-center justify-center shadow-lg backdrop-blur-md">
                  <Heart className="w-5 h-5 fill-white" />
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-rose-600 via-pink-600 to-indigo-700 flex items-center justify-center">
              <Heart className="w-20 h-20 fill-white text-white drop-shadow-md" />
            </div>
          )}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <span className="text-xs uppercase font-bold tracking-widest text-rose-400">
            Personal Keepsakes
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Loved Songs
          </h1>
          <p className="text-xs text-[#A1A1AA] italic">
            Songs that stay with you forever • Memories hidden in melodies
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-[#71717A] pt-1">
            <span>{songs.length} {songs.length === 1 ? 'song' : 'songs'}</span>
            <span>•</span>
            <span>{formatDuration(totalDuration)} total duration</span>
          </div>

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
          </div>
        </div>
      </div>

      {/* Song List */}
      <div>
        {songs.length === 0 ? (
          <div className="text-center py-16 text-[#A1A1AA] border border-dashed border-[#303038] rounded-2xl">
            <Heart className="w-12 h-12 text-[#303038] mx-auto mb-3" />
            <p className="text-base font-semibold text-white">No liked songs yet</p>
            <p className="text-xs text-[#71717A] mt-1 mb-4">
              Tap the heart icon on any track to save it here for quick listening.
            </p>
            <button
              onClick={() => onNavigate('library')}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-black text-xs font-bold"
            >
              Browse Library
            </button>
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
                  <th className="py-2.5 px-3 w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303038]/30">
                {songs.map((song, idx) => {
                  const isCur = currentSong?.id === song.id;
                  const artworkUrl = getArtworkObjectUrl(song);

                  return (
                    <tr
                      key={song.id}
                      onContextMenu={e => onSongContextMenu(e, song)}
                      onClick={() => (isCur ? togglePlay() : playSong(song, songs))}
                      className={`group hover:bg-[#19191F]/90 cursor-pointer transition-colors ${
                        isCur ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : ''
                      }`}
                    >
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

                      <td className="py-2.5 px-3 hidden md:table-cell text-[#A1A1AA] truncate max-w-xs">
                        {song.album}
                      </td>

                      <td className="py-2.5 px-3 text-right text-[#A1A1AA] font-mono text-[11px]">
                        {formatDuration(song.duration)}
                      </td>

                      <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={async () => {
                              await toggleFavorite(song.id);
                              await loadData();
                            }}
                            className="p-1 rounded text-rose-500 hover:scale-110 transition-transform"
                            title="Remove from Liked Songs"
                          >
                            <Heart className="w-3.5 h-3.5 fill-rose-500" />
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
          </div>
        )}
      </div>
    </div>
  );
}
