'use client';

import React, { useEffect, useState } from 'react';
import { Song, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { formatDuration } from '@/lib/utils';
import { Play, Shuffle, ChevronLeft, User, Music2, Heart, MoreVertical, Pause } from 'lucide-react';

interface ArtistDetailViewProps {
  artistName: string;
  onNavigate: (view: ViewType, param?: string) => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
}

export function ArtistDetailView({
  artistName,
  onNavigate,
  onSongContextMenu,
}: ArtistDetailViewProps) {
  const { playSong, currentSong, isPlaying, togglePlay, toggleFavorite } = usePlayer();
  const [songs, setSongs] = useState<Song[]>([]);
  const [artworkUrl, setArtworkUrl] = useState<string | undefined>();

  useEffect(() => {
    async function loadArtistSongs() {
      const all = await db.songs.toArray();
      const matched = all.filter(
        s => (s.artist || 'Unknown Artist').toLowerCase() === artistName.toLowerCase()
      );
      setSongs(matched);

      if (matched.length > 0) {
        const art = getArtworkObjectUrl(matched[0]);
        setArtworkUrl(art);
      }
    }
    loadArtistSongs();
  }, [artistName]);

  const totalDuration = songs.reduce((acc, s) => acc + (s.duration || 0), 0);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      <button
        onClick={() => onNavigate('artists')}
        className="flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Artists
      </button>

      {/* Artist Hero Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pb-6 border-b border-[#303038]/60">
        <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden bg-[#19191F] shrink-0 shadow-2xl border border-white/10 flex items-center justify-center">
          {artworkUrl ? (
            <img src={artworkUrl} alt={artistName} className="w-full h-full object-cover" />
          ) : (
            <User className="w-20 h-20 text-[#71717A]" />
          )}
        </div>

        <div className="flex-1 text-center sm:text-left space-y-2">
          <span className="text-xs uppercase font-bold tracking-widest text-[var(--accent)]">
            Artist
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            {artistName}
          </h1>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs text-[#71717A] pt-1">
            <span>{songs.length} {songs.length === 1 ? 'song' : 'songs'} in library</span>
            <span>•</span>
            <span>{formatDuration(totalDuration)} total listening</span>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-3 pt-3">
            <button
              onClick={() => playSong(songs[0], songs)}
              disabled={songs.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--accent)] text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-40"
            >
              <Play className="w-4 h-4 fill-black" /> Play
            </button>
            <button
              onClick={() => {
                const shuffled = [...songs].sort(() => Math.random() - 0.5);
                playSong(shuffled[0], shuffled);
              }}
              disabled={songs.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#25252D] hover:bg-[#303038] text-white text-xs font-semibold transition-all border border-[#303038] disabled:opacity-40"
            >
              <Shuffle className="w-4 h-4" /> Shuffle
            </button>
          </div>
        </div>
      </div>

      {/* Song List */}
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
                    <p
                      className={`font-semibold text-xs truncate ${
                        isCur ? 'text-[var(--accent)]' : 'text-white'
                      }`}
                    >
                      {song.title}
                    </p>
                    <p className="text-[11px] text-[#A1A1AA] truncate">{song.album}</p>
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
                        onClick={() => toggleFavorite(song.id)}
                        className="p-1 rounded text-[#71717A] hover:text-white"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            song.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                          }`}
                        />
                      </button>
                      <button
                        onClick={e => onSongContextMenu(e, song)}
                        className="p-1 rounded text-[#71717A] hover:text-white"
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
    </div>
  );
}
