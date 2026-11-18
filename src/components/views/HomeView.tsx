'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Song, Playlist, ViewType } from '@/types/music';
import {
  db,
  getArtworkObjectUrl,
  syncAlbumsAndArtists,
  repairLibraryArtworkAndTitles,
  deduplicateSongsInLibrary,
} from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { InteractiveSongCard } from '@/components/common/InteractiveSongCard';
import { SkeletonSongCard } from '@/components/common/SkeletonSongCard';
import { SPOTIFY_TELUGU_CATEGORIES, importAllSpotifyTeluguCategories } from '@/lib/spotifyService';
import {
  Play,
  Pause,
  Upload,
  Sparkles,
  Music2,
  ListMusic,
  Heart,
  Loader2,
  Maximize2,
  Disc,
  ChevronLeft,
  ChevronRight,
  Flame,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface HomeViewProps {
  onNavigate: (view: ViewType, param?: string) => void;
  onOpenUpload: () => void;
  onOpenSpotifyImport?: () => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
}

// Dedicated Shelf Song Card with isolated state and rock-solid image fallback
function ShelfSongCard({
  song,
  songs,
  isThisCurrent,
  isThisPlaying,
  onPlaySong,
  onTogglePlay,
  onSongContextMenu,
}: {
  song: Song;
  songs: Song[];
  isThisCurrent: boolean;
  isThisPlaying: boolean;
  onPlaySong: (song: Song, queue: Song[]) => void;
  onTogglePlay: () => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
}) {
  const cat = (song.category || song.genre || '').toLowerCase();
  const fallback =
    cat.includes('love') || cat.includes('romance')
      ? '/covers/telugu_romance.jpg'
      : cat.includes('mass') || cat.includes('beat')
      ? '/covers/mass_party_beats.jpg'
      : cat.includes('classic') || cat.includes('nostalgia')
      ? '/covers/golden_classics.jpg'
      : cat.includes('melod')
      ? '/covers/soulful_melodies.jpg'
      : '/covers/hot_hits_telugu.jpg';

  const [currentSrc, setCurrentSrc] = useState<string>(() => getArtworkObjectUrl(song) || fallback);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    const freshArt = getArtworkObjectUrl(song) || fallback;
    setCurrentSrc(freshArt);
    setHasFailed(false);
  }, [song.id, song.artworkUrl]);

  const handleImgError = () => {
    if (currentSrc !== fallback) {
      setCurrentSrc(fallback);
    } else {
      setHasFailed(true);
    }
  };

  return (
    <div
      onClick={() => (isThisCurrent ? onTogglePlay() : onPlaySong(song, songs))}
      onContextMenu={e => onSongContextMenu(e, song)}
      className="w-40 sm:w-46 shrink-0 p-3 rounded-2xl bg-[#12141C]/90 hover:bg-[#181B26] border border-white/[0.07] hover:border-[#1ED760]/40 cursor-pointer transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-1 group flex flex-col select-none"
    >
      <div className="aspect-square rounded-xl overflow-hidden bg-zinc-900 relative mb-3 flex items-center justify-center border border-white/[0.08]">
        {!hasFailed ? (
          <img
            src={currentSrc}
            alt=""
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={handleImgError}
            className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1A1D27] to-[#10121A] text-zinc-500">
            <Music2 className="w-8 h-8 text-zinc-600 mb-1" />
            <span className="text-[9px] font-bold tracking-wider text-zinc-600 uppercase">Sonora</span>
          </div>
        )}

        {/* Spotify Green Play Circle that rises on hover */}
        <div
          className={`absolute right-2.5 bottom-2.5 w-11 h-11 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-2xl transition-all duration-300 ${
            isThisPlaying
              ? 'opacity-100 scale-100'
              : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-105 active:scale-95'
          }`}
        >
          {isThisPlaying ? (
            <Pause className="w-5 h-5 fill-black" />
          ) : (
            <Play className="w-5 h-5 fill-black ml-0.5" />
          )}
        </div>

        {/* Genre Tag */}
        {song.category && (
          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider bg-black/70 backdrop-blur-md border border-white/10 text-amber-300">
            {song.category}
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h3
          className={`text-xs sm:text-sm font-bold truncate transition-colors ${
            isThisCurrent ? 'text-[#1ED760]' : 'text-white group-hover:text-white'
          }`}
        >
          {song.title}
        </h3>
        <p className="text-[11px] text-white/50 truncate mt-0.5 font-medium">
          {song.artist}
        </p>
        {song.album && (
          <p className="text-[10px] text-white/30 truncate mt-0.5 font-mono">
            {song.album}
          </p>
        )}
      </div>
    </div>
  );
}

// Spotify Horizontal Scrolling Shelf
function SpotifyShelf({
  title,
  subtitle,
  songs,
  onPlaySong,
  currentSongId,
  isPlaying,
  onTogglePlay,
  onSongContextMenu,
}: {
  title: string;
  subtitle: string;
  songs: Song[];
  onPlaySong: (song: Song, queue: Song[]) => void;
  currentSongId?: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const offset = direction === 'left' ? -420 : 420;
    scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  if (songs.length === 0) return null;

  return (
    <section className="space-y-3.5 select-none">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            {title}
          </h2>
          <p className="text-xs text-white/50 mt-0.5">{subtitle}</p>
        </div>

        {/* Scroll Arrows */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-white/70 hover:text-white transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.12] text-white/70 hover:text-white transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Shelf Track Row */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-none scroll-smooth -mx-1 px-1"
      >
        {songs.map(song => (
          <ShelfSongCard
            key={song.id}
            song={song}
            songs={songs}
            isThisCurrent={currentSongId === song.id}
            isThisPlaying={currentSongId === song.id && isPlaying}
            onPlaySong={onPlaySong}
            onTogglePlay={onTogglePlay}
            onSongContextMenu={onSongContextMenu}
          />
        ))}
      </div>
    </section>
  );
}

export function HomeView({
  onNavigate,
  onOpenUpload,
  onOpenSpotifyImport,
  onSongContextMenu,
}: HomeViewProps) {
  const { playSong, currentSong, isPlaying, togglePlay, setIsNowPlayingOpen } = usePlayer();
  const { showToast } = useToast();
  const { settings } = useTheme();

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState<{ percent: number; status: string }>({
    percent: 0,
    status: '',
  });

  const loadData = async () => {
    const songs = await db.songs.toArray();
    setAllSongs(songs);

    const pl = await db.playlists.toArray();
    setPlaylists(pl);
  };

  useEffect(() => {
    deduplicateSongsInLibrary().then(removed => {
      if (removed > 0) {
        showToast('Library Cleaned', `Removed ${removed} duplicate song entries.`, 'success');
        loadData();
      }
    });
    loadData();

    repairLibraryArtworkAndTitles().then(count => {
      if (count > 0) loadData();
    });

    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSeedAllSpotify = async () => {
    setIsSeeding(true);
    setSeedProgress({ percent: 5, status: 'Importing Spotify Telugu collection...' });

    try {
      const result = await importAllSpotifyTeluguCategories((percent, status) => {
        setSeedProgress({ percent, status });
      });
      await loadData();
      showToast('Spotify Import', `Loaded ${result.totalImported} full Telugu master tracks!`, 'success');
    } catch (err: any) {
      showToast('Error', err?.message || 'Failed to populate music collection.', 'error');
    } finally {
      setIsSeeding(false);
      setSeedProgress({ percent: 0, status: '' });
    }
  };

  // Distinct shelves
  const hotHitsSongs = allSongs.filter(
    s =>
      (s.category || s.genre || '').toLowerCase() === 'hot hits' ||
      (s.year !== undefined &&
        s.year >= 2023 &&
        (s.category === 'Mass & Beats' ||
          s.category === 'Love Songs' ||
          s.title.includes('Fear') ||
          s.title.includes('Chuttamalle') ||
          s.title.includes('Kurchi') ||
          s.title.includes('Tillu') ||
          s.title.includes('Sooseki') ||
          s.title.includes('Pushpa')))
  );

  const romanceSongs = allSongs.filter(
    s => (s.category || s.genre || '').toLowerCase() === 'love songs'
  );

  const melodySongs = allSongs.filter(
    s => (s.category || s.genre || '').toLowerCase() === 'melodies'
  );

  const massBeatsSongs = allSongs.filter(
    s => (s.category || s.genre || '').toLowerCase().includes('mass')
  );

  const classicsSongs = allSongs.filter(
    s => (s.category || s.genre || '').toLowerCase().includes('classic') || (s.year && s.year <= 2012)
  );

  const sidSriramSongs = allSongs.filter(
    s => (s.category || s.genre || '').toLowerCase() === 'sid sriram' || s.artist.toLowerCase().includes('sid sriram')
  );

  const blockbustersSongs = allSongs.filter(
    s =>
      (s.category || s.genre || '').toLowerCase() === 'blockbusters' ||
      s.artist.toLowerCase().includes('thaman') ||
      s.artist.toLowerCase().includes('devi sri prasad') ||
      s.artist.toLowerCase().includes('anirudh') ||
      s.artist.toLowerCase().includes('keeravaani')
  );

  const vintage90sSongs = allSongs.filter(
    s =>
      (s.category || s.genre || '').toLowerCase().includes('90s') ||
      (s.year !== undefined && s.year >= 1989 && s.year <= 1999)
  );

  // Master Filter & Search
  const filteredCatalog = allSongs.filter(s => {
    // Category match
    let matchesCategory = true;
    if (activeCategory !== 'All') {
      const cat = (s.category || s.genre || '').toLowerCase();
      const target = activeCategory.toLowerCase();
      if (target === 'sid sriram') {
        matchesCategory = cat === 'sid sriram' || s.artist.toLowerCase().includes('sid sriram');
      } else if (target === 'golden classics') {
        matchesCategory = cat === 'golden classics' || (s.year !== undefined && s.year <= 2012);
      } else if (target === 'mass & beats') {
        matchesCategory = cat === 'mass & beats' || cat === 'mass beats' || cat === 'party';
      } else if (target === '90s classics') {
        matchesCategory = cat.includes('90s') || (s.year !== undefined && s.year >= 1989 && s.year <= 1999);
      } else if (target === 'blockbusters') {
        matchesCategory = cat === 'blockbusters' || s.artist.toLowerCase().includes('thaman') || s.artist.toLowerCase().includes('devi sri prasad') || s.artist.toLowerCase().includes('anirudh') || s.artist.toLowerCase().includes('keeravaani');
      } else {
        matchesCategory = cat === target;
      }
    }

    // Search query match
    let matchesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      matchesSearch =
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q);
    }

    return matchesCategory && matchesSearch;
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = settings.listenerName || 'Shahid';

  return (
    <div className="p-3.5 sm:p-6 md:p-10 space-y-6 sm:space-y-9 max-w-7xl mx-auto select-none">
      {/* 1. SPOTIFY HEADER WITH GREETING & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1ED760] animate-pulse" />
            <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-[#1ED760]">
              Spotify Audio Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
            {greeting}, {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-white/50 mt-0.5">
            {allSongs.length} Full Telugu Master Tracks • Verified High-Bitrate Studio Audio
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenSpotifyImport && (
            <button
              onClick={onOpenSpotifyImport}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1ED760] hover:bg-[#1fdb63] active:scale-95 text-black text-xs font-extrabold transition-all shadow-lg shadow-[#1ED760]/25"
              title="Import all Telugu songs using Spotify"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.495 17.306c-.216.353-.674.464-1.026.25-2.812-1.718-6.353-2.106-10.523-1.154-.403.092-.803-.16-.895-.563-.092-.403.16-.803.563-.895 4.567-1.042 8.49-.602 11.63 1.336.353.216.464.674.251 1.026zm1.467-3.262c-.272.441-.852.58-1.293.308-3.22-1.979-8.127-2.551-11.935-1.395-.497.151-1.029-.136-1.18-.633-.151-.497.136-1.029.633-1.18 4.356-1.322 9.776-.682 13.467 1.587.441.272.58.852.308 1.293zm.126-3.41c-3.86-2.292-10.228-2.503-13.896-1.389-.592.18-1.226-.154-1.406-.746-.18-.592.154-1.226.746-1.406 4.218-1.281 11.253-1.034 15.696 1.603.533.316.708 1.011.392 1.544-.316.533-1.011.708-1.532.394z" />
              </svg>
              <span>Spotify Hub</span>
            </button>
          )}

          <button
            onClick={handleSeedAllSpotify}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold transition-all disabled:opacity-50"
            title="Reload complete Spotify Telugu collection"
          >
            {isSeeding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1ED760]" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-[#1ED760]" />
            )}
            <span>Reload All</span>
          </button>

          <button
            onClick={() => setIsNowPlayingOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white text-xs font-semibold transition-all"
            title="Launch Full Turntable Studio"
          >
            <Disc className="w-3.5 h-3.5 text-amber-400" />
            <span>Studio</span>
          </button>
        </div>
      </div>

      {/* Seeding Progress Bar */}
      {isSeeding && (
        <div className="p-4 rounded-2xl bg-black/40 border border-[#1ED760]/40 space-y-2">
          <div className="flex justify-between text-xs text-white">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1ED760]" />
              {seedProgress.status}
            </span>
            <span className="font-mono text-[#1ED760] font-bold">{seedProgress.percent}%</span>
          </div>
          <div className="w-full bg-white/[0.08] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#1ED760] h-full transition-all duration-300"
              style={{ width: `${seedProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. SPOTIFY SIGNATURE QUICK ACCESS TILES (ALL 10 GENRES) */}
      <section className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight flex items-center gap-2">
            <Flame className="w-4 h-4 text-[#1ED760]" />
            <span>Featured Collections</span>
          </h2>
          <span className="text-[11px] font-mono text-white/40">
            {SPOTIFY_TELUGU_CATEGORIES.length} Playlists
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2 sm:gap-3">
          {SPOTIFY_TELUGU_CATEGORIES.map(cat => {
            const playlistSongs = allSongs.filter(s => {
              const catTag = s.category || s.genre || '';
              if (cat.id === 'pl_spotify_hot_hits') return catTag === 'Hot Hits' || (s.year !== undefined && s.year >= 2023);
              if (cat.id === 'pl_spotify_romance') return catTag === 'Love Songs';
              if (cat.id === 'pl_spotify_melodies') return catTag === 'Melodies';
              if (cat.id === 'pl_spotify_mass_beats') return catTag === 'Mass & Beats';
              if (cat.id === 'pl_spotify_golden_classics') return catTag === 'Golden Classics';
              if (cat.id === 'pl_spotify_sid_sriram') return catTag === 'Sid Sriram' || s.artist.toLowerCase().includes('sid sriram');
              if (cat.id === 'pl_spotify_blockbusters') return catTag === 'Blockbusters' || s.artist.toLowerCase().includes('thaman') || s.artist.toLowerCase().includes('devi sri prasad') || s.artist.toLowerCase().includes('anirudh');
              if (cat.id === 'pl_spotify_90s_classics') return catTag === '90s Classics';
              return true;
            });

            return (
              <div
                key={cat.id}
                onClick={() => onNavigate('playlist-detail', cat.id)}
                className="flex items-center gap-2 sm:gap-3 h-14 sm:h-16 md:h-18 rounded-xl bg-[#131622]/90 hover:bg-[#1A1F30] active:bg-[#22283D] active:scale-[0.98] border border-white/[0.08] hover:border-white/20 cursor-pointer transition-all duration-200 overflow-hidden group shadow-md relative select-none"
              >
                <div className="w-14 sm:w-16 md:w-18 h-full shrink-0 relative bg-zinc-900 overflow-hidden">
                  <img
                    src={cat.coverImage}
                    alt=""
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    onError={(e) => {
                      const target = e.currentTarget;
                      target.src = '/covers/hot_hits_telugu.jpg';
                    }}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  />
                </div>

                <div className="min-w-0 flex-1 px-1.5 sm:px-2 pr-2 sm:pr-12 flex flex-col justify-center">
                  <h3 className="text-[11px] sm:text-xs md:text-sm font-bold text-white line-clamp-2 leading-tight tracking-tight">
                    {cat.shortTitle}
                  </h3>
                  <p className="text-[9px] sm:text-[10px] text-white/50 font-mono mt-0.5 truncate">
                    {playlistSongs.length} tracks
                  </p>
                </div>

                {/* Floating Spotify Play Button - Desktop Only */}
                <div
                  onClick={e => {
                    e.stopPropagation();
                    if (playlistSongs.length > 0) {
                      playSong(playlistSongs[0], playlistSongs);
                    }
                  }}
                  className="hidden sm:flex absolute right-2.5 w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#1ED760] text-black items-center justify-center shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 hover:scale-110 active:scale-95 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-black ml-0.5" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. SHELF 1: HOT HITS TELUGU (TRENDING 2024 & VIRAL CHARTBUSTERS) */}
      <SpotifyShelf
        title="⚡ Hot Hits Telugu — Trending Now"
        subtitle="Devara, Pushpa 2, Guntur Kaaram, Kalki 2898 AD, Tillu Square & chartbusters"
        songs={hotHitsSongs}
        onPlaySong={playSong}
        currentSongId={currentSong?.id}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSongContextMenu={onSongContextMenu}
      />

      {/* 4. SHELF 2: TELUGU ROMANCE & SOULFUL LOVE SONGS */}
      <SpotifyShelf
        title="💖 Telugu Romance & Soulful Love Anthems"
        subtitle="Unforgettable romantic duets, heart-touching melodies on repeat"
        songs={romanceSongs}
        onPlaySong={playSong}
        currentSongId={currentSong?.id}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSongContextMenu={onSongContextMenu}
      />

      {/* 5. SHELF 3: MASS MASALA & HIGH-ENERGY PARTY BEATS */}
      <SpotifyShelf
        title="🔥 Mass Masala & High-Energy Party Beats"
        subtitle="Thumping dance numbers, energetic gym beats & Telugu mass hits"
        songs={massBeatsSongs}
        onPlaySong={playSong}
        currentSongId={currentSong?.id}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSongContextMenu={onSongContextMenu}
      />

      {/* 6. SHELF 4: 2000s NOSTALGIA & ALL-TIME GOLDEN CLASSICS */}
      <SpotifyShelf
        title="🌟 2000s Telugu Nostalgia & Golden Classics"
        subtitle="Okkadu, Varsham, Arya, Jalsa, Ye Maya Chesave & golden memories"
        songs={classicsSongs}
        onPlaySong={playSong}
        currentSongId={currentSong?.id}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSongContextMenu={onSongContextMenu}
      />

      {/* 7. SHELF 5: ARTIST SPOTLIGHT: SID SRIRAM ESSENTIALS */}
      <SpotifyShelf
        title="🎤 Artist Spotlight: Sid Sriram Essentials"
        subtitle="Every iconic Sid Sriram chartbuster in one continuous listening room"
        songs={sidSriramSongs}
        onPlaySong={playSong}
        currentSongId={currentSong?.id}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSongContextMenu={onSongContextMenu}
      />

      {/* 8. SHELF 6: COMPOSER BLOCKBUSTERS */}
      <SpotifyShelf
        title="🎬 Composer Blockbusters: DSP, Thaman & Anirudh"
        subtitle="High-voltage Telugu chartbusters composed by the masters of Tollywood"
        songs={blockbustersSongs}
        onPlaySong={playSong}
        currentSongId={currentSong?.id}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSongContextMenu={onSongContextMenu}
      />

      {/* 9. SHELF 7: 90s GOLDEN ERA & VINTAGE CLASSICS */}
      <SpotifyShelf
        title="📻 90s Telugu Golden Era & Vintage Masterpieces"
        subtitle="SP Balasubrahmanyam, Chithra, Ilaiyaraaja, Keeravani vintage gems"
        songs={vintage90sSongs}
        onPlaySong={playSong}
        currentSongId={currentSong?.id}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSongContextMenu={onSongContextMenu}
      />

      {/* 10. MASTER CATALOG SECTION WITH REAL-TIME SEARCH & CATEGORY PILLS */}
      {/* 4. MASTER CATALOG SECTION WITH FULL 10-GENRE FILTERING */}
      <section className="space-y-4 pt-4 border-t border-white/[0.08]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>Full Master Catalog</span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#1ED760]/15 text-[#1ED760] border border-[#1ED760]/30">
                {filteredCatalog.length} songs
              </span>
            </h2>
            <p className="text-xs text-white/50 mt-0.5">
              Browse 500 verified Telugu studio master tracks across all 8 genres in 320kbps audio
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, movie, singer..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 sm:py-2.5 rounded-full bg-white/[0.06] border border-white/[0.12] focus:border-[#1ED760] text-xs text-white placeholder-white/40 focus:outline-none transition-colors shadow-sm"
            />
          </div>
        </div>

        {/* Category Pills (Spotify-style with smooth mobile touch scrolling & no word-wrapping) */}
        <div className="relative -mx-3 sm:mx-0 px-3 sm:px-0">
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none flex-nowrap scroll-smooth touch-pan-x">
            {[
              { id: 'All', label: 'All', count: allSongs.length, icon: null },
              { id: 'Hot Hits', label: 'Hot Hits', count: hotHitsSongs.length, icon: '⚡' },
              { id: 'Love Songs', label: 'Romance', count: romanceSongs.length, icon: '💖' },
              { id: 'Melodies', label: 'Melodies', count: melodySongs.length, icon: '🎵' },
              { id: 'Mass & Beats', label: 'Mass Beats', count: massBeatsSongs.length, icon: '🔥' },
              { id: 'Golden Classics', label: '2000s Classics', count: classicsSongs.length, icon: '🌟' },
              { id: 'Sid Sriram', label: 'Sid Sriram', count: sidSriramSongs.length, icon: '🎤' },
              { id: 'Blockbusters', label: 'Blockbusters', count: blockbustersSongs.length, icon: '🎬' },
              { id: '90s Classics', label: '90s Vintage', count: vintage90sSongs.length, icon: '📻' },
            ].map(tab => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveCategory(tab.id)}
                  className={`h-9 px-3.5 sm:px-4 rounded-full text-xs font-bold whitespace-nowrap shrink-0 transition-all duration-200 flex items-center gap-1.5 shadow-sm active:scale-95 select-none ${
                    isActive
                      ? 'bg-[#1ED760] text-black shadow-md shadow-[#1ED760]/25 scale-[1.02]'
                      : 'bg-[#141724] hover:bg-[#1C2133] active:bg-[#252B42] text-white/75 hover:text-white border border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  {tab.icon && <span className="text-[13px]">{tab.icon}</span>}
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-black/20 text-black'
                        : 'bg-white/[0.08] text-white/50'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Master Song Cards Grid */}
        {allSongs.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
            {Array.from({ length: 12 }).map((_, i) => (
              <SkeletonSongCard key={i} />
            ))}
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className="py-20 text-center space-y-2 text-white/40">
            <Music2 className="w-10 h-10 mx-auto text-white/20" />
            <p className="text-sm font-semibold text-white/70">No songs match your search</p>
            <p className="text-xs">Try searching another title, singer or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
            {filteredCatalog.map(song => (
              <InteractiveSongCard
                key={song.id}
                song={song}
                queueList={filteredCatalog}
                onContextMenu={e => onSongContextMenu(e, song)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
