'use client';

import React, { useState, useEffect } from 'react';
import { Song, Playlist, Artist, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { InteractiveSongCard } from '@/components/common/InteractiveSongCard';
import {
  Compass,
  Sparkles,
  Flame,
  Heart,
  Music,
  Headphones,
  Radio,
  Disc,
  Play,
  Pause,
  Shuffle,
  ChevronRight,
  TrendingUp,
  Activity,
  User,
  Sliders,
  Calendar,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ExploreViewProps {
  onNavigate: (view: ViewType, param?: string) => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
  onOpenAiGenerator?: () => void;
}

const MOOD_CATEGORIES = [
  { id: 'all', label: 'All Vibes', icon: Sparkles },
  { id: 'romance', label: 'Romance & Love', icon: Heart, color: 'from-pink-900/60 to-purple-950/80 border-pink-700/40' },
  { id: 'melodies', label: 'Soulful Melodies', icon: Music, color: 'from-indigo-900/60 to-purple-950/80 border-indigo-700/40' },
  { id: 'mass', label: 'Mass & High Energy', icon: Flame, color: 'from-amber-900/60 to-red-950/80 border-amber-700/40' },
  { id: 'travel', label: 'Travel & Road Trip', icon: Compass, color: 'from-teal-900/60 to-blue-950/80 border-teal-700/40' },
  { id: 'nostalgia', label: '90s & 2000s Classics', icon: Radio, color: 'from-violet-900/60 to-purple-950/80 border-violet-700/40' },
  { id: 'devotional', label: 'Devotional & Spiritual', icon: Disc, color: 'from-orange-900/60 to-amber-950/80 border-orange-700/40' },
  { id: 'workout', label: 'Workout & Pump', icon: Activity, color: 'from-rose-900/60 to-purple-950/80 border-rose-700/40' },
];

export function ExploreView({ onNavigate, onSongContextMenu, onOpenAiGenerator }: ExploreViewProps) {
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();

  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedMood, setSelectedMood] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    async function loadData() {
      const [songsData, plData] = await Promise.all([
        db.songs.toArray(),
        db.playlists.toArray(),
      ]);
      setAllSongs(songsData);
      setPlaylists(plData);
    }
    loadData();
  }, []);

  // Filter songs based on mood and search filter
  const filteredSongs = allSongs.filter(song => {
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchText = `${song.title} ${song.artist} ${song.album} ${song.genre || ''}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }

    if (selectedMood === 'all') return true;

    const lowerTitle = song.title.toLowerCase();
    const lowerAlbum = song.album.toLowerCase();
    const lowerGenre = (song.genre || '').toLowerCase();
    const lowerArtist = song.artist.toLowerCase();

    if (selectedMood === 'romance') {
      return (
        lowerGenre.includes('love') ||
        lowerGenre.includes('romance') ||
        lowerTitle.includes('prema') ||
        lowerTitle.includes('love') ||
        lowerTitle.includes('priya') ||
        lowerTitle.includes('chuttamalle') ||
        lowerTitle.includes('inaye')
      );
    }
    if (selectedMood === 'melodies') {
      return (
        lowerGenre.includes('melody') ||
        lowerGenre.includes('melodies') ||
        lowerArtist.includes('sid sriram') ||
        lowerArtist.includes('shreya') ||
        lowerArtist.includes('anurag')
      );
    }
    if (selectedMood === 'mass') {
      return (
        lowerGenre.includes('mass') ||
        lowerGenre.includes('beat') ||
        lowerTitle.includes('masala') ||
        lowerTitle.includes('thanda') ||
        lowerTitle.includes('kurchi') ||
        lowerTitle.includes('fear') ||
        lowerTitle.includes('tauba')
      );
    }
    if (selectedMood === 'travel') {
      return lowerGenre.includes('travel') || lowerTitle.includes('journey') || lowerTitle.includes('darshana');
    }
    if (selectedMood === 'nostalgia') {
      return (song.year && song.year < 2012) || lowerGenre.includes('nostalgia') || lowerGenre.includes('90s');
    }
    if (selectedMood === 'devotional') {
      return (
        lowerGenre.includes('devotional') ||
        lowerTitle.includes('shiva') ||
        lowerTitle.includes('govinda') ||
        lowerTitle.includes('rama')
      );
    }
    if (selectedMood === 'workout') {
      return lowerGenre.includes('mass') || lowerGenre.includes('electronic') || lowerTitle.includes('dhoom');
    }
    return true;
  });

  // Top trending tracks (first 10 trending)
  const trendingSongs = allSongs.slice(0, 10);

  // Distinct artists list with count
  const artistsMap = new Map<string, { name: string; count: number; sampleSong: Song }>();
  allSongs.forEach(s => {
    const primary = s.artist.split(',')[0].trim();
    if (!primary) return;
    if (!artistsMap.has(primary)) {
      artistsMap.set(primary, { name: primary, count: 1, sampleSong: s });
    } else {
      artistsMap.get(primary)!.count++;
    }
  });
  const popularArtists = Array.from(artistsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-10 max-w-7xl mx-auto pb-32">
      {/* 1. DISCOVERY HERO BANNER */}
      <div className="relative rounded-3xl overflow-hidden p-6 sm:p-10 border border-[#302744] bg-gradient-to-br from-[#1A0A2E]/90 via-[#10051C]/95 to-[#050309] shadow-[0_15px_40px_rgba(112,38,185,0.25)]">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-1/4 w-80 h-80 bg-purple-600/20 blur-[90px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-60 h-60 bg-[#8BE9FF]/15 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#211A32] border border-[#A855F7]/30 text-xs text-[#D8B4FE] font-medium">
            <Compass className="w-3.5 h-3.5 text-[#A855F7]" />
            <span>Music Discovery Hub</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Explore <span className="bg-gradient-to-r from-[#C084FC] via-[#E9D5FF] to-[#8BE9FF] bg-clip-text text-transparent">Naa Paatalu</span>
          </h1>

          <p className="text-xs sm:text-sm text-[#C2B5D9] leading-relaxed">
            Dive into trending Telugu blockbusters, timeless nostalgic classics, soulful melodies, and curated mood stations.
          </p>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => trendingSongs.length > 0 && playSong(trendingSongs[0], trendingSongs)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--accent)] text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--accent)]/20"
            >
              <Play className="w-4 h-4 fill-black" /> Play Trending Hits
            </button>
            <button
              onClick={() => onNavigate('search')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1F1735] hover:bg-[#2B2048] border border-[#302744] text-xs font-semibold text-white transition-all"
            >
              <Sparkles className="w-4 h-4 text-[#A855F7]" /> Advanced Search
            </button>
          </div>
        </div>
      </div>

      {/* 2. MOOD & VIBE CHIPS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Headphones className="w-5 h-5 text-[#A855F7]" /> Browse by Mood & Vibe
          </h2>
          <span className="text-xs text-[#A99DBE]">{filteredSongs.length} songs available</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {MOOD_CATEGORIES.map(mood => {
            const Icon = mood.icon;
            const isSelected = selectedMood === mood.id;
            return (
              <button
                key={mood.id}
                onClick={() => setSelectedMood(mood.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all border ${
                  isSelected
                    ? 'bg-[#A855F7] text-black border-[#A855F7] shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                    : 'bg-[#141122] hover:bg-[#211A32] text-[#D8B4FE] border-[#302744]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-black' : 'text-[#A855F7]'}`} />
                <span>{mood.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. TRENDING SONGS STRIP */}
      {selectedMood === 'all' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" /> Trending Telugu Hits
              </h2>
              <p className="text-xs text-[#A99DBE]">Hottest tracks playing right now</p>
            </div>
            <button
              onClick={() => onNavigate('all-songs')}
              className="text-xs font-semibold text-[#A855F7] hover:underline flex items-center gap-1"
            >
              See All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {trendingSongs.slice(0, 5).map(song => (
              <InteractiveSongCard
                key={song.id}
                song={song}
                queueList={trendingSongs}
                onContextMenu={e => onSongContextMenu(e, song)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. CURATED MOOD STATIONS GRID */}
      {selectedMood === 'all' && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-[#8BE9FF]" /> Curated Vibe Stations
            </h2>
            <p className="text-xs text-[#A99DBE]">Hand-crafted listening atmospheres for every moment</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {playlists.slice(0, 8).map(pl => {
              const artUrl = getArtworkObjectUrl(pl);
              return (
                <div
                  key={pl.id}
                  onClick={() => onNavigate('playlist-detail', pl.id)}
                  className="group relative p-4 rounded-2xl bg-gradient-to-br from-[#1C152E]/80 to-[#10051C]/95 border border-[#302744] hover:border-[#A855F7]/50 transition-all cursor-pointer shadow-lg hover:shadow-[0_10px_30px_rgba(112,38,185,0.3)] flex items-center gap-3.5"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#211A32] shrink-0 border border-white/10 shadow-md flex items-center justify-center">
                    {artUrl ? (
                      <img src={artUrl} alt={pl.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <Disc className="w-8 h-8 text-[#A855F7]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate group-hover:text-[#D8B4FE] transition-colors">
                      {pl.title}
                    </h3>
                    <p className="text-[11px] text-[#A99DBE] line-clamp-1 mt-0.5">
                      {pl.description || 'Curated high-res Telugu music'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. TOP ARTISTS SHOWCASE */}
      {selectedMood === 'all' && popularArtists.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-[#C084FC]" /> Popular Artists
              </h2>
              <p className="text-xs text-[#A99DBE]">Top music directors and playback singers in your library</p>
            </div>
            <button
              onClick={() => onNavigate('artists')}
              className="text-xs font-semibold text-[#A855F7] hover:underline flex items-center gap-1"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {popularArtists.map(artist => {
              const art = getArtworkObjectUrl(artist.sampleSong);
              return (
                <div
                  key={artist.name}
                  onClick={() => onNavigate('artist-detail', artist.name)}
                  className="flex flex-col items-center text-center p-3 rounded-2xl bg-[#141122]/60 hover:bg-[#211A32] border border-transparent hover:border-[#302744] transition-all cursor-pointer group"
                >
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden bg-[#211A32] border-2 border-[#302744] group-hover:border-[#A855F7] shadow-lg mb-2.5 transition-all flex items-center justify-center">
                    {art ? (
                      <img src={art} alt={artist.name} className="w-full h-full object-cover group-hover:scale-108 transition-transform" />
                    ) : (
                      <User className="w-8 h-8 text-[#A99DBE]" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-white truncate max-w-full group-hover:text-[#D8B4FE] transition-colors">
                    {artist.name}
                  </p>
                  <p className="text-[10px] text-[#A99DBE]">{artist.count} tracks</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 6. FILTERED SONGS GRID FOR SELECTED MOOD */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold text-white">
            {selectedMood === 'all' ? 'All Curated Melodies' : `${MOOD_CATEGORIES.find(m => m.id === selectedMood)?.label} Tracks`}
          </h2>
          <button
            onClick={() => filteredSongs.length > 0 && playSong(filteredSongs[0], filteredSongs)}
            disabled={filteredSongs.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#211A32] hover:bg-[#2C2344] border border-[#302744] text-xs font-semibold text-white transition-all disabled:opacity-40"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#A855F7]" /> Shuffle Play
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
          {filteredSongs.slice(0, 24).map(song => (
            <InteractiveSongCard
              key={song.id}
              song={song}
              queueList={filteredSongs}
              onContextMenu={e => onSongContextMenu(e, song)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
