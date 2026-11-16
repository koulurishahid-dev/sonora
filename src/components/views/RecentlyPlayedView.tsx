'use client';

import React, { useEffect, useState } from 'react';
import { Song, ListeningHistory, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { useToast } from '@/context/ToastContext';
import { formatDuration, formatRelativeTime } from '@/lib/utils';
import { Clock, Play, Trash2, Music2, MoreVertical, Heart, Pause } from 'lucide-react';

interface RecentlyPlayedViewProps {
  onNavigate: (view: ViewType, param?: string) => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
}

export function RecentlyPlayedView({
  onNavigate,
  onSongContextMenu,
}: RecentlyPlayedViewProps) {
  const { playSong, currentSong, isPlaying, togglePlay, toggleFavorite } = usePlayer();
  const { showToast } = useToast();

  const [historyItems, setHistoryItems] = useState<{ history: ListeningHistory; song: Song }[]>([]);

  const loadData = async () => {
    const history = await db.listeningHistory.orderBy('playedAt').reverse().limit(50).toArray();
    const items: { history: ListeningHistory; song: Song }[] = [];

    for (const h of history) {
      const s = await db.songs.get(h.songId);
      if (s) {
        items.push({ history: h, song: s });
      }
    }
    setHistoryItems(items);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClearHistory = async () => {
    if (confirm('Clear your entire listening history?')) {
      await db.listeningHistory.clear();
      setHistoryItems([]);
      showToast('History Cleared', 'Your listening history has been reset', 'info');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Recently Played</h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Tracks you have listened to recently in SONORA
          </p>
        </div>

        {historyItems.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#19191F] hover:bg-[#25252D] border border-[#303038] text-xs font-semibold text-[#A1A1AA] hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear History
          </button>
        )}
      </div>

      {historyItems.length === 0 ? (
        <div className="text-center py-16 text-[#A1A1AA] border border-dashed border-[#303038] rounded-2xl">
          <Clock className="w-12 h-12 text-[#303038] mx-auto mb-3" />
          <p className="text-base font-semibold text-white">No listening history yet</p>
          <p className="text-xs text-[#71717A] mt-1">
            Songs will be recorded here as you listen.
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
                <th className="py-2.5 px-3 hidden sm:table-cell">Played</th>
                <th className="py-2.5 px-3 w-20 text-right">Duration</th>
                <th className="py-2.5 px-3 w-16 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#303038]/30">
              {historyItems.map(({ history, song }, idx) => {
                const isCur = currentSong?.id === song.id;
                const artworkUrl = getArtworkObjectUrl(song);

                return (
                  <tr
                    key={history.id}
                    onContextMenu={e => onSongContextMenu(e, song)}
                    onClick={() => (isCur ? togglePlay() : playSong(song))}
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

                    <td className="py-2.5 px-3 hidden sm:table-cell text-[#71717A] font-mono text-[11px]">
                      {formatRelativeTime(history.playedAt)}
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
      )}
    </div>
  );
}
