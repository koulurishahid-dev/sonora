'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Song, Playlist, Album, Artist, ViewType } from '@/types/music';
import {
  db,
  getArtworkObjectUrl,
  syncAlbumsAndArtists,
  resetGeneratedSampleSongs,
  repairLibraryArtworkAndTitles,
} from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { useToast } from '@/context/ToastContext';
import { useTheme } from '@/context/ThemeContext';
import { seedCuratedPersonalMusic, CURATED_TELUGU_SONGS } from '@/lib/audioSynthesis';
import { VinylCover } from '@/components/common/VinylCover';
import { formatDuration } from '@/lib/utils';
import {
  Play,
  Pause,
  Upload,
  Sparkles,
  Music2,
  ListMusic,
  Disc,
  Heart,
  MoreVertical,
  Plus,
  Loader2,
  Calendar,
  Compass,
  Headphones,
  Moon,
  CloudRain,
  Flame,
  Radio,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface HomeViewProps {
  onNavigate: (view: ViewType, param?: string) => void;
  onOpenUpload: () => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
}

// Resilient cover image with instant fallback preventing broken image icons
function SongCardImage({ song, className = '' }: { song: Song; className?: string }) {
  const [hasError, setHasError] = useState(false);
  const art = getArtworkObjectUrl(song);

  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden bg-[#202028]">
      {art && !hasError ? (
        <img
          src={art}
          alt=""
          onError={() => setHasError(true)}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 relative z-10 ${className}`}
        />
      ) : null}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1E1E26] to-[#121216] text-[#71717A] z-0">
        <Music2 className="w-10 h-10 text-[#404052]" />
      </div>
    </div>
  );
}

export function HomeView({ onNavigate, onOpenUpload, onSongContextMenu }: HomeViewProps) {
  const { playSong, currentSong, isPlaying, togglePlay, toggleFavorite, setIsNowPlayingOpen } =
    usePlayer();
  const { showToast } = useToast();
  const { settings } = useTheme();

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [favoriteSongs, setFavoriteSongs] = useState<Song[]>([]);
  const [recentPlayedSongs, setRecentPlayedSongs] = useState<Song[]>([]);
  const [recentAddedSongs, setRecentAddedSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [activeMood, setActiveMood] = useState<string>('All');
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState<{ percent: number; status: string }>({
    percent: 0,
    status: '',
  });

  const scrollRefFavs = useRef<HTMLDivElement | null>(null);
  const scrollRefPlaylists = useRef<HTMLDivElement | null>(null);
  const scrollRefArtists = useRef<HTMLDivElement | null>(null);
  const scrollRefMood = useRef<HTMLDivElement | null>(null);

  const loadData = async () => {
    const songs = await db.songs.toArray();
    setAllSongs(songs);

    // Favorites
    const favs = songs.filter(s => s.isFavorite);
    setFavoriteSongs(favs);

    // Recently Added
    const added = [...songs].sort((a, b) => b.dateAdded - a.dateAdded).slice(0, 12);
    setRecentAddedSongs(added);

    // Recently Played from history
    const history = await db.listeningHistory.orderBy('playedAt').reverse().limit(10).toArray();
    const historySongList: Song[] = [];
    for (const h of history) {
      const s = songs.find(x => x.id === h.songId);
      if (s && !historySongList.some(x => x.id === s.id)) {
        historySongList.push(s);
      }
    }
    setRecentPlayedSongs(historySongList.length > 0 ? historySongList : songs.slice(0, 6));

    const pl = await db.playlists.toArray();
    setPlaylists(pl);

    const art = await db.artists.toArray();
    setArtists(art);

    const alb = await db.albums.toArray();
    setAlbums(alb);
  };

  const [isFixingCovers, setIsFixingCovers] = useState(false);
  const [fixStatus, setFixStatus] = useState('');

  useEffect(() => {
    loadData();
    // Auto-repair missing artwork and clean junk tags in background once on mount
    repairLibraryArtworkAndTitles().then(count => {
      if (count > 0) loadData();
    });
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleFixCovers = async () => {
    setIsFixingCovers(true);
    try {
      const fixed = await repairLibraryArtworkAndTitles((msg, pct) => {
        setFixStatus(`${msg} (${pct}%)`);
      });
      await loadData();
      showToast(
        'Covers Updated',
        fixed > 0
          ? `Fixed and fetched verified movie covers for ${fixed} songs!`
          : 'All song covers in your library are valid.',
        'success'
      );
    } catch (err: any) {
      showToast('Error', err?.message || 'Failed to update covers', 'error');
    } finally {
      setIsFixingCovers(false);
      setFixStatus('');
    }
  };

  const handleSeedTeluguCollection = async () => {
    setIsSeeding(true);
    setSeedProgress({ percent: 5, status: 'Opening music journal...' });

    try {
      const count = await seedCuratedPersonalMusic((percent, status) => {
        setSeedProgress({ percent, status });
      });
      await loadData();
      showToast('Welcome Home', `Loaded ${count} personal Telugu tracks with official movie artwork!`, 'success');
    } catch (err: any) {
      showToast('Error', err?.message || 'Failed to populate music collection.', 'error');
    } finally {
      setIsSeeding(false);
      setSeedProgress({ percent: 0, status: '' });
    }
  };

  const handleScroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const offset = direction === 'left' ? -340 : 340;
      ref.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Quotes rotation
  const quotes = [
    '“A little music, a little peace.”',
    '“Memories hidden in melodies.”',
    '“Songs that never get old.”',
    '“A quiet night, dim lights, and soulful chords.”',
    '“My private corner of melodies.”',
  ];
  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Spotlight Hero track (either currently playing, or first favorite, or first song)
  const spotlightSong = currentSong || favoriteSongs[0] || allSongs[0] || null;
  const spotlightArt = spotlightSong ? getArtworkObjectUrl(spotlightSong) : null;

  // Filter songs by mood
  const moodFilters = ['All', 'Romantic Telugu Melodies', 'Soulful Melodies', 'Late Night Vibes', 'Heart Touching Songs', 'Peaceful Songs'];
  const moodSongs = activeMood === 'All'
    ? allSongs
    : allSongs.filter(s => s.genre?.toLowerCase().includes(activeMood.toLowerCase()));

  return (
    <div className="p-6 md:p-10 space-y-12 max-w-7xl mx-auto select-none">
      {/* Top Personal Greeting Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-[#303038]/40">
        <div>
          <div className="flex items-center gap-2.5 text-xs font-semibold text-[var(--accent)] tracking-wider mb-1.5">
            <span className="flex h-2 w-2 rounded-full bg-[var(--accent)] animate-ping" />
            <span className="uppercase tracking-widest text-[10px]">Private Music Corner</span>
            <span>•</span>
            <span className="text-[#A1A1AA] flex items-center gap-1 font-mono text-[11px]">
              <Calendar className="w-3 h-3 text-[#71717A]" /> {todayStr}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {settings.listenerAvatar && (
              <span className="text-3xl sm:text-4xl filter drop-shadow-md select-none">{settings.listenerAvatar}</span>
            )}
            <div>
              <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
                <span>
                  {settings.listenerName
                    ? `Hey ${settings.listenerName}, welcome to your music world.`
                    : 'Hey, welcome to my music world.'}
                </span>
                <span className="text-2xl md:text-3xl animate-bounce">✨</span>
              </h1>
              {settings.listenerBio && (
                <p className="text-xs text-[var(--accent)] font-medium mt-1">
                  {settings.listenerBio}
                </p>
              )}
            </div>
          </div>

          <p className="text-sm md:text-base text-[#A1A1AA] mt-2 italic font-serif leading-relaxed">
            {quotes[new Date().getDay() % quotes.length]}
          </p>
        </div>

        {/* Quick Action Pills */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {allSongs.length === 0 ? (
            <button
              onClick={handleSeedTeluguCollection}
              disabled={isSeeding}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50"
            >
              {isSeeding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span>Fill My Music Journal (Telugu Favourites)</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleFixCovers}
                disabled={isFixingCovers}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#19191F] hover:bg-[#25252D] border border-[#303038] text-[#D4D4D8] hover:text-white text-xs font-semibold transition-all shadow-sm disabled:opacity-50"
                title="Auto-fetch official verified movie covers from Apple Music for your songs"
              >
                {isFixingCovers ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>{isFixingCovers ? (fixStatus || 'Fetching...') : 'Auto-Fetch Missing Covers'}</span>
              </button>

              <button
                onClick={onOpenUpload}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#19191F] hover:bg-[#25252D] border border-[#303038] text-white text-xs font-semibold transition-all shadow-sm"
              >
                <Upload className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>Add to Collection</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress indicator when seeding */}
      {isSeeding && (
        <div className="p-4 rounded-2xl bg-[#19191F] border border-[var(--accent)]/40 space-y-2 animate-pulse">
          <div className="flex justify-between text-xs text-white">
            <span className="flex items-center gap-2 font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
              {seedProgress.status}
            </span>
            <span className="font-mono text-[var(--accent)]">{seedProgress.percent}%</span>
          </div>
          <div className="w-full bg-[#121216] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[var(--accent)] h-full transition-all duration-300"
              style={{ width: `${seedProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Empty State when no songs exist */}
      {allSongs.length === 0 && !isSeeding && (
        <div className="p-10 md:p-14 rounded-3xl bg-[#121216]/90 border border-[#303038] text-center max-w-2xl mx-auto space-y-6 shadow-2xl relative overflow-hidden">
          <div className="w-18 h-18 rounded-3xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center mx-auto shadow-inner">
            <Headphones className="w-9 h-9" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Your music diary is ready to begin</h2>
            <p className="text-sm text-[#A1A1AA] mt-2 max-w-md mx-auto leading-relaxed">
              Fill your journal with your favourite Telugu melodies, or upload your own MP3 and WAV
              files. Every song will feature its correct movie cover poster.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleSeedTeluguCollection}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--accent)] text-black text-xs font-bold hover:scale-105 transition-all shadow-lg"
            >
              <Sparkles className="w-4 h-4" /> Load My Telugu Collection
            </button>
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#25252D] hover:bg-[#303038] border border-[#303038] text-white text-xs font-semibold transition-all"
            >
              <Upload className="w-4 h-4 text-sky-400" /> Upload Local MP3s
            </button>
          </div>
        </div>
      )}

      {/* Spotlight Hero Card (Image 1 & 4 Style: Aurora Mesh + Spinning Vinyl Sleeve) */}
      {spotlightSong && (
        <div className="relative rounded-3xl p-6 sm:p-10 overflow-hidden border border-white/10 bg-[#121216]/90 shadow-2xl">
          {/* Animated Aurora Fluid Mesh Glow (Image 1 style) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-45">
            <div
              className="absolute -top-24 -left-24 w-96 h-96 rounded-full filter blur-[110px] animate-aurora pointer-events-none"
              style={{
                background: 'radial-gradient(circle, rgba(var(--accent-rgb), 0.55) 0%, rgba(6, 182, 212, 0.3) 50%, transparent 75%)',
              }}
            />
            <div
              className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full filter blur-[120px] animate-aurora pointer-events-none"
              style={{
                animationDelay: '-5s',
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, rgba(var(--accent-rgb), 0.25) 50%, transparent 75%)',
              }}
            />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 lg:gap-12">
            {/* Vinyl Cover with Sliding & Spinning Record */}
            <div
              onClick={() =>
                currentSong?.id === spotlightSong.id ? togglePlay() : playSong(spotlightSong, allSongs)
              }
              className="shrink-0"
              title={isPlaying && currentSong?.id === spotlightSong.id ? 'Pause' : 'Play'}
            >
              <VinylCover
                artworkUrl={spotlightArt}
                title={spotlightSong.title}
                artist={spotlightSong.artist}
                isPlaying={isPlaying && currentSong?.id === spotlightSong.id}
                size="lg"
                showBadge={true}
              />
            </div>

            <div className="flex-1 text-center md:text-left space-y-3.5 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] text-[11px] font-bold uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3.5 h-3.5 fill-[var(--accent)]" /> Your Wave • Spotlight Track
              </div>

              <div>
                <h2 className="text-3xl sm:text-5xl font-black text-white truncate tracking-tight">
                  {spotlightSong.title}
                </h2>
                <p className="text-base sm:text-lg text-[#D4D4D8] font-semibold mt-1">
                  {spotlightSong.artist} • <span className="text-[#A1A1AA] font-normal">{spotlightSong.album}</span>
                </p>
              </div>

              <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-lg italic font-serif leading-relaxed">
                &quot;Memories wrapped in melody — songs that never get old on endless repeat.&quot;
              </p>

              <div className="flex items-center justify-center md:justify-start gap-3.5 pt-2 flex-wrap">
                <button
                  onClick={() =>
                    currentSong?.id === spotlightSong.id
                      ? togglePlay()
                      : playSong(spotlightSong, allSongs)
                  }
                  className="flex items-center gap-2.5 px-7 py-3 rounded-full bg-[var(--accent)] text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[var(--accent)]/20"
                >
                  {currentSong?.id === spotlightSong.id && isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-black" /> Pause Wave
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-black ml-0.5" /> Play Your Wave
                    </>
                  )}
                </button>

                <button
                  onClick={() => toggleFavorite(spotlightSong.id)}
                  className="p-3 rounded-full bg-[#181820] hover:bg-[#25252D] text-white border border-[#303038] hover:border-white/20 transition-all shadow-md"
                  title="Save to Favourites"
                >
                  <Heart
                    className={`w-4 h-4 transition-colors ${
                      spotlightSong.isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : 'text-[#A1A1AA]'
                    }`}
                  />
                </button>

                <button
                  onClick={() => setIsNowPlayingOpen(true)}
                  className="px-5 py-3 rounded-full bg-[#181820] hover:bg-[#25252D] text-xs font-semibold text-[#A1A1AA] hover:text-white border border-[#303038] transition-all shadow-sm"
                >
                  Immersive Player
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Explore Vibes & Curations Pill Cards (Reference Image 1) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#A1A1AA]">
              Explore Vibes & Composers
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            {
              name: 'Sid Sriram',
              subtitle: 'Soulful Vocals',
              gradient: 'from-emerald-950/40 to-teal-900/20 border-emerald-800/40 text-emerald-300',
            },
            {
              name: 'Devi Sri Prasad',
              subtitle: 'Energetic Beats',
              gradient: 'from-amber-950/40 to-yellow-900/20 border-amber-800/40 text-amber-300',
            },
            {
              name: 'Anirudh',
              subtitle: 'Electric Waves',
              gradient: 'from-purple-950/40 to-indigo-900/20 border-purple-800/40 text-purple-300',
            },
            {
              name: 'Thaman S',
              subtitle: 'Melody & Bass',
              gradient: 'from-rose-950/40 to-pink-900/20 border-rose-800/40 text-rose-300',
            },
            {
              name: 'A.R. Rahman',
              subtitle: 'Timeless Masterpieces',
              gradient: 'from-blue-950/40 to-cyan-900/20 border-blue-800/40 text-blue-300',
            },
          ].map(artist => (
            <div
              key={artist.name}
              onClick={() => onNavigate('artist-detail', artist.name)}
              className={`p-3.5 rounded-2xl bg-gradient-to-br ${artist.gradient} border hover:border-white/40 cursor-pointer transition-all duration-300 shadow-md group hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">
                  Artist Spotlight
                </span>
                <Radio className="w-3.5 h-3.5 opacity-60 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-sm font-black text-white truncate">{artist.name}</p>
              <p className="text-[11px] opacity-75 truncate">{artist.subtitle}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 1: My Favourite Songs (Horizontal Carousel) */}
      {favoriteSongs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                <h2 className="text-xl font-bold text-white tracking-tight">My Favourite Songs</h2>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5 font-serif italic">
                Songs that never get old — my repeat collection
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleScroll(scrollRefFavs, 'left')}
                className="p-2 rounded-xl bg-[#19191F] hover:bg-[#25252D] border border-[#303038] text-[#A1A1AA] hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll(scrollRefFavs, 'right')}
                className="p-2 rounded-xl bg-[#19191F] hover:bg-[#25252D] border border-[#303038] text-[#A1A1AA] hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRefFavs}
            className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
          >
            {favoriteSongs.map(song => {
              const isCur = currentSong?.id === song.id;
              const art = getArtworkObjectUrl(song);

              return (
                <div
                  key={song.id}
                  onClick={() => (isCur ? togglePlay() : playSong(song, favoriteSongs))}
                  onContextMenu={e => onSongContextMenu(e, song)}
                  className={`w-44 sm:w-48 shrink-0 p-3 rounded-2xl bg-[#19191F]/90 hover:bg-[#25252D] border cursor-pointer transition-all duration-300 shadow-md group flex flex-col ${
                    isCur
                      ? 'border-[var(--accent)] shadow-lg shadow-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30'
                      : 'border-[#303038] hover:border-white/20'
                  }`}
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-[#25252D] relative mb-3 flex items-center justify-center">
                    <SongCardImage song={song} />

                    <div
                      className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-[var(--accent)] text-black flex items-center justify-center shadow-xl transition-all duration-300 transform z-20 ${
                        isCur
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                      }`}
                    >
                      {isCur && isPlaying ? (
                        <Pause className="w-5 h-5 fill-black" />
                      ) : (
                        <Play className="w-5 h-5 fill-black ml-0.5" />
                      )}
                    </div>
                  </div>

                  <p
                    className={`text-sm font-bold truncate ${
                      isCur ? 'text-[var(--accent)]' : 'text-white'
                    }`}
                  >
                    {song.title}
                  </p>
                  <p className="text-xs text-[#A1A1AA] truncate mt-0.5">
                    {song.artist} • <span className="text-[#71717A]">{song.album}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 2: Personal Mixtapes (Playlists) */}
      {playlists.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ListMusic className="w-4 h-4 text-sky-400" />
                <h2 className="text-xl font-bold text-white tracking-tight">Personal Mixtapes</h2>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5 font-serif italic">
                Memories bundled together into custom themes
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleScroll(scrollRefPlaylists, 'left')}
                className="p-2 rounded-xl bg-[#19191F] hover:bg-[#25252D] border border-[#303038] text-[#A1A1AA] hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll(scrollRefPlaylists, 'right')}
                className="p-2 rounded-xl bg-[#19191F] hover:bg-[#25252D] border border-[#303038] text-[#A1A1AA] hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div
            ref={scrollRefPlaylists}
            className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
          >
            {playlists.map(pl => {
              const art = getArtworkObjectUrl(pl);
              return (
                <div
                  key={pl.id}
                  onClick={() => onNavigate('playlist-detail', pl.id)}
                  className="w-48 sm:w-52 shrink-0 p-3.5 rounded-2xl bg-[#19191F]/90 hover:bg-[#25252D] border border-[#303038] hover:border-sky-500/40 cursor-pointer transition-all shadow-md group flex flex-col"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-[#25252D] relative mb-3 flex items-center justify-center">
                    {art ? (
                      <img
                        src={art}
                        alt={pl.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <ListMusic className="w-12 h-12 text-[#71717A]" />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white truncate group-hover:text-sky-300 transition-colors">
                    {pl.title}
                  </h3>
                  <p className="text-[11px] text-[#A1A1AA] line-clamp-2 mt-1 leading-relaxed">
                    {pl.description || 'Custom playlist'}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 3: Songs for My Mood */}
      {allSongs.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-purple-400" />
                <h2 className="text-xl font-bold text-white tracking-tight">Songs for My Mood</h2>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-0.5 font-serif italic">
                From late night feelings to peaceful afternoon quiet
              </p>
            </div>

            {/* Mood selector pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {moodFilters.map(mood => (
                <button
                  key={mood}
                  onClick={() => setActiveMood(mood)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    activeMood === mood
                      ? 'bg-[var(--accent)] text-black shadow-md'
                      : 'bg-[#19191F] text-[#A1A1AA] hover:text-white border border-[#303038]'
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={scrollRefMood}
            className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
          >
            {moodSongs.map(song => {
              const isCur = currentSong?.id === song.id;
              const art = getArtworkObjectUrl(song);

              return (
                <div
                  key={song.id}
                  onClick={() => (isCur ? togglePlay() : playSong(song, moodSongs))}
                  onContextMenu={e => onSongContextMenu(e, song)}
                  className={`w-44 sm:w-48 shrink-0 p-3 rounded-2xl bg-[#19191F]/90 hover:bg-[#25252D] border cursor-pointer transition-all duration-300 shadow-md group flex flex-col ${
                    isCur
                      ? 'border-[var(--accent)] shadow-lg shadow-[var(--accent)]/10 ring-1 ring-[var(--accent)]/30'
                      : 'border-[#303038] hover:border-white/20'
                  }`}
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-[#25252D] relative mb-3 flex items-center justify-center">
                    <SongCardImage song={song} />

                    <div
                      className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-[var(--accent)] text-black flex items-center justify-center shadow-xl transition-all duration-300 transform z-20 ${
                        isCur
                          ? 'opacity-100 scale-100'
                          : 'opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0'
                      }`}
                    >
                      {isCur && isPlaying ? (
                        <Pause className="w-5 h-5 fill-black" />
                      ) : (
                        <Play className="w-5 h-5 fill-black ml-0.5" />
                      )}
                    </div>
                  </div>

                  <p
                    className={`text-sm font-bold truncate ${
                      isCur ? 'text-[var(--accent)]' : 'text-white'
                    }`}
                  >
                    {song.title}
                  </p>
                  <p className="text-xs text-[#A1A1AA] truncate mt-0.5">
                    {song.artist} • <span className="text-[#71717A]">{song.album}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 4: Artists I Love */}
      {artists.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Artists I Love</h2>
              <p className="text-xs text-[#A1A1AA] mt-0.5 font-serif italic">
                Voices that soothe my heart
              </p>
            </div>
            <button
              onClick={() => onNavigate('artists')}
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              See all ({artists.length})
            </button>
          </div>

          <div
            ref={scrollRefArtists}
            className="flex gap-5 overflow-x-auto pb-4 no-scrollbar scroll-smooth"
          >
            {artists.map(art => {
              const artUrl = getArtworkObjectUrl(art);
              return (
                <div
                  key={art.id}
                  onClick={() => onNavigate('artist-detail', art.name)}
                  className="w-32 sm:w-36 shrink-0 p-3 rounded-2xl bg-[#19191F]/70 hover:bg-[#25252D] border border-transparent hover:border-[#303038] cursor-pointer transition-all flex flex-col items-center text-center group"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-[#25252D] mb-2.5 relative shadow-lg border border-white/5">
                    {artUrl ? (
                      <img
                        src={artUrl}
                        alt={art.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                        {art.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-bold text-white truncate w-full group-hover:text-[var(--accent)] transition-colors">
                    {art.name}
                  </p>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5">
                    {art.songCount} {art.songCount === 1 ? 'melody' : 'melodies'}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 5: Recently Added to My Collection */}
      {recentAddedSongs.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Recently Added</h2>
              <p className="text-xs text-[#A1A1AA] mt-0.5 font-serif italic">
                Fresh melodies brought into my corner
              </p>
            </div>
            <button
              onClick={() => onNavigate('all-songs')}
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              View all ({allSongs.length})
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentAddedSongs.slice(0, 6).map(song => {
              const isCur = currentSong?.id === song.id;
              const art = getArtworkObjectUrl(song);

              return (
                <div
                  key={song.id}
                  onClick={() => (isCur ? togglePlay() : playSong(song, recentAddedSongs))}
                  onContextMenu={e => onSongContextMenu(e, song)}
                  className={`flex items-center justify-between p-3 rounded-2xl bg-[#19191F]/90 hover:bg-[#25252D] border cursor-pointer transition-all shadow-md group ${
                    isCur
                      ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                      : 'border-[#303038] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#25252D] shrink-0 relative flex items-center justify-center">
                      <SongCardImage song={song} />
                      <div
                        className={`absolute inset-0 bg-black/40 flex items-center justify-center z-20 ${
                          isCur ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {isCur && isPlaying ? (
                          <Pause className="w-4 h-4 fill-white text-white" />
                        ) : (
                          <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                        )}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p
                        className={`text-sm font-bold truncate ${
                          isCur ? 'text-[var(--accent)]' : 'text-white'
                        }`}
                      >
                        {song.title}
                      </p>
                      <p className="text-xs text-[#A1A1AA] truncate mt-0.5">
                        {song.artist} • <span className="text-[#71717A]">{song.album}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-mono text-[#71717A] shrink-0 pl-2">
                    {formatDuration(song.duration)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
