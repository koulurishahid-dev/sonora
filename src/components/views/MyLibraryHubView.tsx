'use client';

import React, { useEffect, useState } from 'react';
import { Song, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { formatDuration } from '@/lib/utils';
import {
  Library,
  Music2,
  Heart,
  ListMusic,
  Disc,
  User,
  WifiOff,
  Upload,
  Link2,
  Play,
  Pause,
  ChevronRight,
} from 'lucide-react';

interface MyLibraryHubViewProps {
  onNavigate: (view: ViewType, param?: string) => void;
  onOpenUpload: () => void;
  onOpenAddLink: () => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
}

export function MyLibraryHubView({
  onNavigate,
  onOpenUpload,
  onOpenAddLink,
  onSongContextMenu,
}: MyLibraryHubViewProps) {
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();

  const [stats, setStats] = useState({
    songs: 0,
    playlists: 0,
    albums: 0,
    artists: 0,
    liked: 0,
    offline: 0,
  });
  const [recentSongs, setRecentSongs] = useState<Song[]>([]);

  useEffect(() => {
    async function loadStats() {
      const allSongs = await db.songs.toArray();
      const plCount = await db.playlists.count();
      const albCount = await db.albums.count();
      const artCount = await db.artists.count();
      const favCount = await db.favorites.count();
      const offCount = allSongs.filter(s => s.isLocal && s.audioBlob).length;

      setStats({
        songs: allSongs.length,
        playlists: plCount,
        albums: albCount,
        artists: artCount,
        liked: favCount,
        offline: offCount,
      });

      const sorted = [...allSongs].sort((a, b) => b.dateAdded - a.dateAdded).slice(0, 8);
      setRecentSongs(sorted);
    }
    loadStats();
  }, []);

  const sections: { view: ViewType; title: string; count: number; desc: string; icon: any; color: string }[] = [
    {
      view: 'all-songs',
      title: 'All Songs',
      count: stats.songs,
      desc: 'Complete song collection with multi-select & sorting',
      icon: Music2,
      color: 'from-[#A78BFA]/20 to-[#D8B4FE]/20 border-[#A78BFA]/30 text-[#D8B4FE]',
    },
    {
      view: 'playlists',
      title: 'Playlists',
      count: stats.playlists,
      desc: 'Custom mixes, themes & organized playlists',
      icon: ListMusic,
      color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400',
    },
    {
      view: 'liked',
      title: 'Liked Songs',
      count: stats.liked,
      desc: 'Your hand-picked personal favorites',
      icon: Heart,
      color: 'from-rose-500/20 to-pink-500/20 border-rose-500/30 text-rose-400',
    },
    {
      view: 'albums',
      title: 'Albums',
      count: stats.albums,
      desc: 'Discographies and curated album releases',
      icon: Disc,
      color: 'from-purple-500/20 to-violet-500/20 border-purple-500/30 text-purple-400',
    },
    {
      view: 'artists',
      title: 'Artists',
      count: stats.artists,
      desc: 'Performers and musical composers in your library',
      icon: User,
      color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400',
    },
    {
      view: 'offline',
      title: 'Offline Music',
      count: stats.offline,
      desc: 'Locally cached tracks playable without internet',
      icon: WifiOff,
      color: 'from-cyan-500/20 to-sky-500/20 border-cyan-500/30 text-cyan-400',
    },
  ];

  return (
    <div className="p-3.5 sm:p-6 md:p-8 space-y-5 sm:space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[var(--accent)] text-xs font-bold uppercase tracking-wider mb-1">
            <Library className="w-4 h-4" /> Personal Vault
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            My Library
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-1">
            Overview of your private music collection, categories, and recent activity
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAddLink}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#19191F] hover:bg-[#25252D] border border-[#303038] text-xs font-semibold text-white transition-all shadow-sm"
          >
            <Link2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Add Link</span>
          </button>
          <button
            onClick={onOpenUpload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-black text-xs font-bold hover:scale-105 transition-all shadow-md"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Music</span>
          </button>
        </div>
      </div>

      {/* Library Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(sec => {
          const Icon = sec.icon;
          return (
            <div
              key={sec.view}
              onClick={() => onNavigate(sec.view)}
              className={`p-5 rounded-2xl bg-gradient-to-br ${sec.color} hover:scale-[1.02] border cursor-pointer transition-all flex flex-col justify-between shadow-lg relative group`}
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center backdrop-blur-md">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-white/80 group-hover:text-white group-hover:translate-x-1 transition-all">
                  <span className="font-mono text-base">{sec.count}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-lg font-bold text-white">{sec.title}</h3>
                <p className="text-xs text-[#A1A1AA] mt-0.5 leading-relaxed">{sec.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recently Added Section */}
      {recentSongs.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Recently Added Tracks</h2>
            <button
              onClick={() => onNavigate('all-songs')}
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              View all ({stats.songs})
            </button>
          </div>

          <div className="divide-y divide-[#303038]/40 border border-[#303038] rounded-2xl bg-[#19191F]/60 overflow-hidden shadow-md">
            {recentSongs.map(song => {
              const isCur = currentSong?.id === song.id;
              const artworkUrl = getArtworkObjectUrl(song);

              return (
                <div
                  key={song.id}
                  onContextMenu={e => onSongContextMenu(e, song)}
                  onClick={() => (isCur ? togglePlay() : playSong(song, recentSongs))}
                  className={`flex items-center justify-between p-3.5 hover:bg-[#25252D] cursor-pointer transition-colors ${
                    isCur ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-lg overflow-hidden bg-[#25252D] shrink-0 flex items-center justify-center relative group">
                      {artworkUrl ? (
                        <img src={artworkUrl} alt={song.title} className="w-full h-full object-cover" />
                      ) : (
                        <Music2 className="w-5 h-5 text-[#71717A]" />
                      )}
                      <div
                        className={`absolute inset-0 bg-black/40 flex items-center justify-center ${
                          isCur ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isCur && isPlaying ? (
                          <Pause className="w-5 h-5 fill-white text-white" />
                        ) : (
                          <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-semibold truncate ${
                          isCur ? 'text-[var(--accent)]' : 'text-white'
                        }`}
                      >
                        {song.title}
                      </p>
                      <p className="text-xs text-[#A1A1AA] truncate mt-0.5">
                        {song.artist} • {song.album}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-[#A1A1AA] shrink-0">
                    {formatDuration(song.duration)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
