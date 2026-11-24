'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Playlist, Song, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { useToast } from '@/context/ToastContext';
import { formatDuration, formatDate } from '@/lib/utils';
import { extractColorsFromImage, ExtractedColors } from '@/lib/colorExtractor';
import { InteractiveSongCard } from '@/components/common/InteractiveSongCard';
import { Tooltip } from '@/components/common/Tooltip';
import { SPOTIFY_TELUGU_CATEGORIES, filterSpotifyCategorySongs } from '@/lib/spotifyService';
import {
  Play,
  Pause,
  Shuffle,
  ListMusic,
  Trash2,
  Edit2,
  Copy,
  Download,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Music2,
  MoreVertical,
  Heart,
  Search,
  LayoutGrid,
  List,
  Disc,
  Clock,
  Sparkles,
  Radio,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const { playSong, playContextWithShuffle, currentSong, isPlaying, togglePlay, toggleFavorite } = usePlayer();
  const { showToast } = useToast();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [colors, setColors] = useState<ExtractedColors>({
    primary: '#A78BFA',
    secondary: '#D8B4FE',
    glow: 'rgba(167, 139, 250, 0.25)',
    ambientRgb: '167, 139, 250',
  });

  const loadData = async () => {
    setIsLoading(true);
    let pl = await db.playlists.get(playlistId);

    // Auto-resolve playlist metadata if not stored yet
    const catDef = SPOTIFY_TELUGU_CATEGORIES.find(c => c.id === playlistId);
    if (!pl && catDef) {
      pl = {
        id: catDef.id,
        title: catDef.title,
        description: catDef.description,
        customArtwork: catDef.coverImage,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await db.playlists.put(pl);
    }

    if (!pl) {
      setIsLoading(false);
      return;
    }
    setPlaylist(pl);

    // Get songs sorted by playlist order
    const pSongs = await db.playlistSongs
      .where('playlistId')
      .equals(playlistId)
      .sortBy('order');

    let songObjects: Song[] = [];
    for (const ps of pSongs) {
      const s = await db.songs.get(ps.songId);
      if (s) songObjects.push(s);
    }

    // Self-healing fallback: If playlistSongs is empty, dynamically query matching songs from db.songs
    if (songObjects.length === 0 && catDef) {
      const all = await db.songs.toArray();
      songObjects = filterSpotifyCategorySongs(all, playlistId);
      if (songObjects.length > 0) {
        // Cache to playlistSongs table in background so subsequent loads are fast
        const toAdd = songObjects.map((s, idx) => ({
          id: `${playlistId}_${s.id}`,
          playlistId,
          songId: s.id,
          order: idx,
          addedAt: Date.now(),
        }));
        db.playlistSongs.bulkPut(toAdd).catch(() => {});
      }
    }

    setSongs(songObjects);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('sonora_library_updated', handleUpdate);

    // Re-check after 1 second if songs were still importing
    const timer = setTimeout(loadData, 1000);

    return () => {
      window.removeEventListener('sonora_library_updated', handleUpdate);
      clearTimeout(timer);
    };
  }, [playlistId]);

  // Extract ambient colors from the playlist artwork or the first song
  useEffect(() => {
    if (!playlist && songs.length === 0) return;
    const artUrl =
      (playlist ? getArtworkObjectUrl(playlist) : null) ||
      (songs.length > 0 ? getArtworkObjectUrl(songs[0]) : null);
    if (artUrl) {
      extractColorsFromImage(artUrl).then(setColors);
    }
  }, [playlist, songs]);

  // Total duration & filtered songs
  const totalDuration = useMemo(() => songs.reduce((acc, s) => acc + (s.duration || 0), 0), [songs]);

  const filteredSongs = useMemo(() => {
    if (!searchFilter.trim()) return songs;
    const q = searchFilter.toLowerCase().trim();
    return songs.filter(
      s =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q)
    );
  }, [songs, searchFilter]);

  if (isLoading) {
    return (
      <div className="p-12 text-center text-zinc-400 flex flex-col items-center justify-center space-y-3">
        <Disc className="w-8 h-8 text-[var(--accent)] animate-spin" />
        <p className="text-sm font-semibold text-white">Loading playlist universe...</p>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="p-12 text-center text-zinc-400 space-y-4">
        <p className="text-base font-semibold text-white">Playlist not found.</p>
        <button
          onClick={() => onNavigate('playlists')}
          className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/15 text-white text-xs font-semibold transition-colors"
        >
          Back to Playlists
        </button>
      </div>
    );
  }

  const artworkUrl =
    getArtworkObjectUrl(playlist) || (songs.length > 0 ? getArtworkObjectUrl(songs[0]) : null);
  const isPlaylistPlaying = isPlaying && songs.some(s => s.id === currentSong?.id);

  const handlePlayAll = () => {
    if (filteredSongs.length > 0) {
      playSong(filteredSongs[0], filteredSongs, playlist?.title || 'Playlist');
    }
  };

  const handleShuffleAll = () => {
    if (filteredSongs.length > 0) {
      playContextWithShuffle(filteredSongs, playlist?.title || 'Playlist');
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

    for (let i = 0; i < pSongs.length; i++) {
      await db.playlistSongs.update(pSongs[i].id, { order: i });
    }
    await loadData();
  };

  const handleDuplicatePlaylist = async () => {
    if (!playlist) return;
    const newId = `pl_copy_${Date.now()}`;
    const newPl: Playlist = {
      ...playlist,
      id: newId,
      title: `${playlist.title} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.playlists.add(newPl);

    const existingSongs = await db.playlistSongs.where('playlistId').equals(playlistId).toArray();
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
    onNavigate('playlist-detail', newId);
  };

  const handleExportPlaylist = async () => {
    if (!playlist) return;
    const data = {
      type: 'naa-paatalu-playlist-export',
      version: 1,
      playlist,
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
    a.download = `${playlist.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_playlist.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported', `Playlist saved as JSON`, 'success');
  };

  const handleDeletePlaylist = async () => {
    if (!playlist) return;
    if (confirm(`Delete playlist "${playlist.title}"? (Songs will remain in your library)`)) {
      await db.playlists.delete(playlist.id);
      await db.playlistSongs.where('playlistId').equals(playlist.id).delete();
      showToast('Deleted', `Removed playlist "${playlist.title}"`, 'info');
      onNavigate('playlists');
    }
  };

  // Format hours and minutes
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.floor((totalDuration % 3600) / 60);
  const formattedLength =
    totalHours > 0
      ? `${totalHours} hr ${totalMinutes} min`
      : `${totalMinutes} min ${Math.floor(totalDuration % 60)} sec`;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-8 max-w-7xl mx-auto select-none">
      {/* Back to Playlists Button */}
      <button
        onClick={() => onNavigate('playlists')}
        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Playlists</span>
      </button>

      {/* ========================================================= */}
      {/* 1. CINEMATIC PLAYLIST HERO HEADER                         */}
      {/* ========================================================= */}
      <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden border border-[#302744] shadow-2xl bg-gradient-to-b from-[#211A32] to-[#141122]">
        {/* Dynamic ambient color glow backdrop derived from artwork */}
        <div
          className="absolute -top-20 -left-20 w-96 h-96 rounded-full filter blur-[120px] pointer-events-none opacity-40 transition-all duration-1000"
          style={{ background: colors.primary }}
        />
        <div
          className="absolute -bottom-20 right-0 w-80 h-80 rounded-full filter blur-[100px] pointer-events-none opacity-20"
          style={{ background: colors.secondary }}
        />

        {/* Ambient fine grid overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8">
          {/* LUXURY VINYL JACKET & RECORD PRESENTATION */}
          <div
            onClick={handlePlayAll}
            className="group relative cursor-pointer shrink-0"
            title="Click to Play Playlist"
          >
            {/* Peeking Vinyl Record that spins when playing */}
            <motion.div
              animate={{
                x: isPlaylistPlaying ? 48 : 20,
                rotate: isPlaylistPlaying ? 360 : 0,
              }}
              transition={{
                x: { type: 'spring', damping: 20, stiffness: 120 },
                rotate: isPlaylistPlaying
                  ? { repeat: Infinity, duration: 3, ease: 'linear' }
                  : { duration: 0.8 },
              }}
              className="absolute top-2 left-2 w-44 sm:w-52 h-44 sm:h-52 rounded-full bg-[#08090C] border-2 border-zinc-900 shadow-2xl flex items-center justify-center pointer-events-none z-0"
              style={{
                boxShadow: '0 15px 35px rgba(0,0,0,0.9), inset 0 0 15px rgba(255,255,255,0.08)',
              }}
            >
              {/* Concentric micro-grooves */}
              <div className="absolute inset-2 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-5 rounded-full border border-white/[0.03]" />
              <div className="absolute inset-9 rounded-full border border-white/[0.04]" />
              <div className="absolute inset-13 rounded-full border border-white/[0.03]" />
              <div className="absolute inset-17 rounded-full border border-white/[0.04]" />

              {/* Center Vinyl Label */}
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/20 bg-zinc-950 flex items-center justify-center relative">
                {artworkUrl ? (
                  <img src={artworkUrl} alt="" className="w-full h-full object-cover opacity-80" />
                ) : (
                  <Disc className="w-6 h-6 text-[var(--accent)]" />
                )}
                <div className="w-3 h-3 rounded-full bg-zinc-900 border border-white/40 absolute" />
              </div>
            </motion.div>

            {/* Front Album Jacket Sleeve */}
            <div
              className="relative z-10 w-48 sm:w-56 h-48 sm:h-56 rounded-2xl overflow-hidden bg-zinc-900 border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.85)] group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.95)] transition-all duration-300"
            >
              {artworkUrl ? (
                <img
                  src={artworkUrl}
                  alt={playlist.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1E2A] to-[#0E1017] text-zinc-500">
                  <img src="/logo-icon.png" alt="" className="w-14 h-14 object-contain opacity-80 mb-2 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                  <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">Naa Paatalu Mix</span>
                </div>
              )}

              {/* Glass specular sheen overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/20 pointer-events-none" />

              {/* Play Button Overlay on Hover */}
              <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                <div className="w-14 h-14 rounded-full bg-[var(--accent)] text-black flex items-center justify-center shadow-2xl transform group-hover:scale-105 transition-transform">
                  {isPlaylistPlaying ? (
                    <Pause className="w-6 h-6 fill-black" />
                  ) : (
                    <Play className="w-6 h-6 fill-black ml-0.5" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* PLAYLIST METADATA & ACTIONS */}
          <div className="flex-1 text-center md:text-left space-y-3 min-w-0">
            {/* Header Badge */}
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[11px] font-mono font-bold tracking-wider uppercase text-[var(--accent)] shadow-sm">
                <Sparkles className="w-3 h-3 text-[var(--accent)]" />
                PLAYLIST • CURATED COLLECTION
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
              {playlist.title}
            </h1>

            {/* Description */}
            {playlist.description && (
              <p className="text-sm sm:text-base text-zinc-300 max-w-2xl leading-relaxed">
                {playlist.description}
              </p>
            )}

            {/* Stats Telemetry Row */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs font-mono text-zinc-400 pt-1">
              <span className="text-white font-semibold">{songs.length} tracks</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                {formattedLength}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-[var(--accent)] font-semibold">
                <Radio className="w-3.5 h-3.5 text-[var(--accent)]" />
                Lossless Hi-Fi 320k
              </span>
              <span>•</span>
              <span>Created {formatDate(playlist.createdAt)}</span>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-3">
              <button
                onClick={handlePlayAll}
                disabled={songs.length === 0}
                className="flex items-center gap-2 px-7 py-3 rounded-full bg-[var(--accent)] text-black text-xs sm:text-sm font-extrabold hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(30,215,96,0.45)] disabled:opacity-40 cursor-pointer"
              >
                {isPlaylistPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-black" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-black ml-0.5" /> Play All
                  </>
                )}
              </button>

              <button
                onClick={handleShuffleAll}
                disabled={songs.length === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/[0.08] hover:bg-white/15 text-white text-xs sm:text-sm font-semibold transition-all border border-white/15 disabled:opacity-40 cursor-pointer active:scale-95"
              >
                <Shuffle className="w-4 h-4 text-zinc-300" /> Shuffle
              </button>

              <Tooltip content="Edit Playlist Details">
                <button
                  onClick={() => onEditPlaylist(playlist)}
                  className="p-3 rounded-full bg-white/[0.06] hover:bg-white/15 text-zinc-300 hover:text-white transition-all border border-white/10 active:scale-90"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </Tooltip>

              <Tooltip content="Duplicate Playlist">
                <button
                  onClick={handleDuplicatePlaylist}
                  className="p-3 rounded-full bg-white/[0.06] hover:bg-purple-900/40 text-[#D8B4FE] hover:text-white transition-all border border-white/10 active:scale-90"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </Tooltip>

              <Tooltip content="Export Playlist as JSON">
                <button
                  onClick={handleExportPlaylist}
                  className="p-3 rounded-full bg-white/[0.06] hover:bg-blue-900/40 text-blue-300 hover:text-white transition-all border border-white/10 active:scale-90"
                >
                  <Download className="w-4 h-4" />
                </button>
              </Tooltip>

              <Tooltip content="Delete Playlist">
                <button
                  onClick={handleDeletePlaylist}
                  className="p-3 rounded-full bg-white/[0.06] hover:bg-rose-950/60 text-rose-400 hover:text-rose-200 transition-all border border-rose-900/30 active:scale-90"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. PLAYLIST TOOLBAR (SEARCH IN PLAYLIST & VIEW TOGGLE)    */}
      {/* ========================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Real-Time Filter inside Playlist */}
        <div className="relative flex-1 max-w-md group">
          <Search className="w-4 h-4 text-zinc-500 group-focus-within:text-[var(--accent)] transition-colors absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={`Filter ${songs.length} songs in playlist...`}
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#141122] border border-[#302744] text-[#F8F5FF] text-xs focus:border-[#A78BFA] focus:ring-1 focus:ring-[#A78BFA]/40 outline-none transition-all placeholder:text-[#A99DBE]"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A99DBE] hover:text-[#F8F5FF]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Switcher (Table vs Grid) */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto p-1 rounded-xl bg-[#141122] border border-[#302744]">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'table'
                ? 'bg-[#211A32] text-[#D8B4FE] shadow-sm'
                : 'text-[#A99DBE] hover:text-[#F8F5FF]'
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'grid'
                ? 'bg-[#211A32] text-[#D8B4FE] shadow-sm'
                : 'text-[#A99DBE] hover:text-[#F8F5FF]'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. TRACKLIST SECTION                                      */}
      {/* ========================================================= */}
      {filteredSongs.length === 0 ? (
        <div className="text-center py-20 text-zinc-400 border border-dashed border-white/10 rounded-3xl space-y-3 bg-[#0E1017]/40">
          <ListMusic className="w-12 h-12 text-zinc-600 mx-auto" />
          <p className="text-base font-bold text-white">
            {searchFilter ? `No tracks match "${searchFilter}"` : 'This playlist is empty'}
          </p>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            {searchFilter
              ? 'Try a different song or artist name.'
              : 'Add songs from your library by right-clicking any track and choosing "Add to Playlist".'}
          </p>
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              className="mt-2 px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
            >
              Clear Filter
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW (Interactive 3D Cards) */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredSongs.map((song, idx) => (
            <InteractiveSongCard
              key={`${song.id}_grid_${idx}`}
              song={song}
              queueList={filteredSongs}
              index={idx}
              onContextMenu={onSongContextMenu}
            />
          ))}
        </div>
      ) : (
        /* TABLE / LIST VIEW */
        <div className="rounded-2xl border border-white/10 bg-[#0E1017]/80 backdrop-blur-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead>
                <tr className="border-b border-white/10 text-zinc-400 uppercase font-bold tracking-wider text-[10px] bg-white/[0.02]">
                  <th className="py-3 px-2 sm:px-4 w-8 sm:w-12 text-center">#</th>
                  <th className="py-3 px-2 sm:px-4">Title</th>
                  <th className="py-3 px-4 hidden md:table-cell">Album</th>
                  <th className="py-3 px-2 sm:px-4 w-16 sm:w-24 text-right">Duration</th>
                  <th className="py-3 px-2 sm:px-4 w-16 sm:w-32 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredSongs.map((song, idx) => {
                  const isCur = currentSong?.id === song.id;
                  const trackArt = getArtworkObjectUrl(song);

                  return (
                    <tr
                      key={`${song.id}_table_${idx}`}
                      onContextMenu={e => onSongContextMenu(e, song)}
                      onClick={() => (isCur ? togglePlay() : playSong(song, filteredSongs, playlist?.title || 'Playlist'))}
                      className={`group hover:bg-white/[0.06] cursor-pointer transition-colors ${
                        isCur ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : ''
                      }`}
                    >
                      {/* # or Live Bouncing EQ / Play on Hover */}
                      <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-center text-zinc-500 font-mono">
                        <div className="flex items-center justify-center">
                          {isCur && isPlaying ? (
                            <div className="flex items-end gap-0.5 h-3.5" title="Playing">
                              <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-1 h-3.5" />
                              <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-2 h-2.5" />
                              <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-3 h-3" />
                            </div>
                          ) : (
                            <>
                              <span className="group-hover:hidden text-zinc-500">{idx + 1}</span>
                              <Play className="w-3.5 h-3.5 hidden group-hover:block fill-white text-white" />
                            </>
                          )}
                        </div>
                      </td>

                      {/* Artwork Thumbnail, Title & Artist */}
                      <td className="py-2.5 sm:py-3 px-2 sm:px-4">
                        <div className="flex items-center gap-2.5 sm:gap-3.5">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-zinc-900 shrink-0 border border-white/10 relative">
                            {trackArt ? (
                              <img src={trackArt} alt={song.title} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                            ) : (
                              <Music2 className="w-4 h-4 text-zinc-500 m-auto mt-2.5 sm:mt-3" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={`font-bold truncate text-xs sm:text-sm ${
                                isCur ? 'text-[var(--accent)]' : 'text-white group-hover:text-[var(--accent)] transition-colors'
                              }`}
                            >
                              {song.title}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate mt-0.5">{song.artist}</p>
                          </div>
                        </div>
                      </td>

                      {/* Album Name */}
                      <td className="py-2.5 sm:py-3 px-2 sm:px-4 hidden md:table-cell text-zinc-400 truncate max-w-xs">
                        {song.album}
                      </td>

                      {/* Duration */}
                      <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-right text-zinc-400 font-mono text-[10px] sm:text-[11px]">
                        {formatDuration(song.duration)}
                      </td>

                      {/* Actions Column (Favorite, Up/Down reorder, Remove, More) */}
                      <td className="py-2.5 sm:py-3 px-2 sm:px-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {/* Favorite Heart Button */}
                          <Tooltip content={song.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}>
                            <button
                              onClick={() => toggleFavorite(song.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <Heart
                                className={`w-3.5 h-3.5 ${
                                  song.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                                }`}
                              />
                            </button>
                          </Tooltip>

                          {/* Reorder Up */}
                          <Tooltip content="Move Up">
                            <button
                              onClick={() => moveSong(idx, idx - 1)}
                              disabled={idx === 0}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-white disabled:opacity-20 hover:bg-white/10 transition-colors"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>

                          {/* Reorder Down */}
                          <Tooltip content="Move Down">
                            <button
                              onClick={() => moveSong(idx, idx + 1)}
                              disabled={idx === songs.length - 1}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-white disabled:opacity-20 hover:bg-white/10 transition-colors"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>

                          {/* Remove from Playlist */}
                          <Tooltip content="Remove from playlist">
                            <button
                              onClick={() => handleRemoveFromPlaylist(song.id)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>

                          {/* More Context Options */}
                          <Tooltip content="More Options">
                            <button
                              onClick={e => onSongContextMenu(e, song)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
