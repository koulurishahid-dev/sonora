'use client';

import React, { useEffect, useState } from 'react';
import { Song, ListeningHistory, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { formatDuration } from '@/lib/utils';
import {
  BarChart3,
  Clock,
  Flame,
  Music2,
  Play,
  TrendingUp,
  User,
  Calendar,
  Sparkles,
  Trash2,
  Headphones,
  CheckCircle2,
} from 'lucide-react';

interface ListeningAnalyticsViewProps {
  onNavigate: (view: ViewType, param?: string) => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
}

export function ListeningAnalyticsView({ onNavigate, onSongContextMenu }: ListeningAnalyticsViewProps) {
  const { playSong } = usePlayer();

  const [historyItems, setHistoryItems] = useState<(ListeningHistory & { song?: Song })[]>([]);
  const [mostPlayedSongs, setMostPlayedSongs] = useState<Song[]>([]);
  const [topArtists, setTopArtists] = useState<{ artist: string; count: number; sampleSong?: Song }[]>([]);
  const [totalListeningMinutes, setTotalListeningMinutes] = useState(0);

  useEffect(() => {
    async function loadStats() {
      const [history, allSongs] = await Promise.all([
        db.listeningHistory.orderBy('playedAt').reverse().limit(100).toArray(),
        db.songs.toArray(),
      ]);

      const songMap = new Map(allSongs.map(s => [s.id, s]));

      // Join history with songs
      const joinedHistory = history.map(h => ({
        ...h,
        song: songMap.get(h.songId),
      }));
      setHistoryItems(joinedHistory);

      // Total estimated listening duration
      const totalSeconds = joinedHistory.reduce((acc, h) => acc + (h.durationPlayed || h.song?.duration || 180), 0);
      setTotalListeningMinutes(Math.round(totalSeconds / 60));

      // Most played songs
      const sortedByPlays = [...allSongs]
        .filter(s => (s.playCount || 0) > 0)
        .sort((a, b) => (b.playCount || 0) - (a.playCount || 0))
        .slice(0, 10);
      setMostPlayedSongs(sortedByPlays);

      // Top artists by plays and history
      const artistCounts = new Map<string, { count: number; sampleSong: Song }>();
      allSongs.forEach(s => {
        const primary = s.artist.split(',')[0].trim();
        const plays = s.playCount || 0;
        if (!artistCounts.has(primary)) {
          artistCounts.set(primary, { count: plays, sampleSong: s });
        } else {
          artistCounts.get(primary)!.count += plays;
        }
      });

      const sortedArtists = Array.from(artistCounts.entries())
        .map(([artist, data]) => ({ artist, count: data.count, sampleSong: data.sampleSong }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setTopArtists(sortedArtists);
    }

    loadStats();
  }, []);

  const handleClearHistory = async () => {
    if (confirm('Clear your entire listening history log?')) {
      await db.listeningHistory.clear();
      setHistoryItems([]);
      setTotalListeningMinutes(0);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-10 max-w-7xl mx-auto pb-32">
      {/* 1. HEADER & SUMMARY METRICS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-[#302744]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#211A32] border border-[#A855F7]/30 text-xs text-[#D8B4FE] font-medium mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-[#A855F7]" />
            <span>Listening Universe Analytics</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Listening History & Stats
          </h1>
          <p className="text-xs text-[#A99DBE] mt-1">
            Track your music sessions, top Telugu artists, and most replayed melodies
          </p>
        </div>

        {historyItems.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#211A32] hover:bg-rose-950/70 border border-[#302744] hover:border-rose-800 text-xs text-[#A99DBE] hover:text-rose-300 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear History
          </button>
        )}
      </div>

      {/* 2. STATS TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1C152E]/90 to-[#10051C] border border-[#302744] shadow-lg space-y-2">
          <div className="w-10 h-10 rounded-xl bg-purple-900/40 border border-purple-700/40 flex items-center justify-center text-[#C084FC]">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-xs text-[#A99DBE] font-medium">Total Time Listened</p>
          <p className="text-2xl font-black text-white">{totalListeningMinutes} <span className="text-xs font-semibold text-[#A99DBE]">mins</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1C152E]/90 to-[#10051C] border border-[#302744] shadow-lg space-y-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-900/40 border border-indigo-700/40 flex items-center justify-center text-indigo-400">
            <Headphones className="w-5 h-5" />
          </div>
          <p className="text-xs text-[#A99DBE] font-medium">Logged Sessions</p>
          <p className="text-2xl font-black text-white">{historyItems.length} <span className="text-xs font-semibold text-[#A99DBE]">plays</span></p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1C152E]/90 to-[#10051C] border border-[#302744] shadow-lg space-y-2">
          <div className="w-10 h-10 rounded-xl bg-amber-900/40 border border-amber-700/40 flex items-center justify-center text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <p className="text-xs text-[#A99DBE] font-medium">Top Played Track</p>
          <p className="text-sm font-bold text-white truncate">
            {mostPlayedSongs[0]?.title || 'No plays yet'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1C152E]/90 to-[#10051C] border border-[#302744] shadow-lg space-y-2">
          <div className="w-10 h-10 rounded-xl bg-teal-900/40 border border-teal-700/40 flex items-center justify-center text-teal-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-xs text-[#A99DBE] font-medium">Top Artist</p>
          <p className="text-sm font-bold text-white truncate">
            {topArtists[0]?.artist || 'None yet'}
          </p>
        </div>
      </div>

      {/* 3. MOST PLAYED SONGS */}
      {mostPlayedSongs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" /> Most Played Melodies
            </h2>
            <button
              onClick={() => playSong(mostPlayedSongs[0], mostPlayedSongs)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#A855F7] text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-black" /> Play All
            </button>
          </div>

          <div className="space-y-1.5">
            {mostPlayedSongs.map((song, idx) => {
              const art = getArtworkObjectUrl(song);
              return (
                <div
                  key={song.id}
                  onClick={() => playSong(song, mostPlayedSongs)}
                  onContextMenu={e => onSongContextMenu(e, song)}
                  className="group flex items-center justify-between p-2.5 rounded-2xl bg-[#141122]/70 hover:bg-[#211A32] border border-transparent hover:border-[#302744] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-center text-xs font-mono font-bold text-[#A855F7]">{idx + 1}</span>
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#211A32] shrink-0 border border-white/10 flex items-center justify-center">
                      {art ? (
                        <img src={art} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <Music2 className="w-5 h-5 text-[#A99DBE]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-[#D8B4FE]">
                        {song.title}
                      </p>
                      <p className="text-[11px] text-[#A99DBE] truncate">{song.artist} • {song.album}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs text-[#A99DBE]">
                    <span className="font-semibold text-purple-300">{song.playCount || 1} plays</span>
                    <span className="font-mono hidden sm:inline">{formatDuration(song.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. RECENT PLAYBACK HISTORY LIST */}
      <section className="space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#8BE9FF]" /> Recent Listening Timeline
        </h2>

        {historyItems.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-[#141122]/40 border border-dashed border-[#302744] text-[#A99DBE]">
            <Headphones className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold">No listening history recorded yet</p>
            <p className="text-xs mt-1">Start playing any melody to see your live timeline</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {historyItems.slice(0, 20).map((item, idx) => {
              if (!item.song) return null;
              const song = item.song;
              const art = getArtworkObjectUrl(song);
              const playedDate = new Date(item.playedAt);
              const timeString = playedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateString = playedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

              return (
                <div
                  key={item.id || idx}
                  onClick={() => playSong(song)}
                  onContextMenu={e => onSongContextMenu(e, song)}
                  className="group flex items-center justify-between p-2.5 rounded-2xl bg-[#141122]/50 hover:bg-[#211A32] border border-transparent hover:border-[#302744] transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#211A32] shrink-0 border border-white/10 flex items-center justify-center">
                      {art ? (
                        <img src={art} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <Music2 className="w-4 h-4 text-[#A99DBE]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-white truncate group-hover:text-[#D8B4FE]">
                        {song.title}
                      </p>
                      <p className="text-[11px] text-[#A99DBE] truncate">{song.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-xs text-[#A99DBE]">
                    <span className="text-[11px] text-[#71717A]">{dateString} at {timeString}</span>
                    <span className="font-mono">{formatDuration(song.duration)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
