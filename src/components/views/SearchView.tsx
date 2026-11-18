'use client';

import React, { useState, useEffect } from 'react';
import { Song, Album, Artist, Playlist, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { formatDuration } from '@/lib/utils';
import { InteractiveSongCard } from '@/components/common/InteractiveSongCard';
import {
  Search,
  Music2,
  Disc,
  User,
  ListMusic,
  Play,
  Pause,
  X,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface SearchViewProps {
  initialQuery?: string;
  onNavigate: (view: ViewType, param?: string) => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-[var(--accent)]/30 text-[var(--accent)] rounded px-0.5 font-bold">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

const POPULAR_SEARCHES = ['Sid Sriram', 'Melodies', 'Love Songs', 'A.R. Rahman', 'Anirudh', 'Rock', 'Acoustic'];

export function SearchView({ initialQuery = '', onNavigate, onSongContextMenu }: SearchViewProps) {
  const { playSong, currentSong, isPlaying, togglePlay } = usePlayer();

  const [query, setQuery] = useState(initialQuery);
  const [filterType, setFilterType] = useState<'all' | 'songs' | 'artists' | 'albums' | 'playlists'>('all');

  const [results, setResults] = useState<{
    songs: Song[];
    albums: Album[];
    artists: Artist[];
    playlists: Playlist[];
  }>({
    songs: [],
    albums: [],
    artists: [],
    playlists: [],
  });

  useEffect(() => {
    async function performSearch() {
      if (!query.trim()) {
        setResults({ songs: [], albums: [], artists: [], playlists: [] });
        return;
      }

      const q = query.toLowerCase().trim();

      const allSongs = await db.songs.toArray();
      const matchedSongs = allSongs.filter(
        s =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q) ||
          (s.genre && s.genre.toLowerCase().includes(q))
      );

      const allAlbums = await db.albums.toArray();
      const matchedAlbums = allAlbums.filter(
        a => a.title.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q)
      );

      const allArtists = await db.artists.toArray();
      const matchedArtists = allArtists.filter(ar => ar.name.toLowerCase().includes(q));

      const allPlaylists = await db.playlists.toArray();
      const matchedPlaylists = allPlaylists.filter(
        p => p.title.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q))
      );

      setResults({
        songs: matchedSongs,
        albums: matchedAlbums,
        artists: matchedArtists,
        playlists: matchedPlaylists,
      });
    }

    performSearch();
  }, [query]);

  const totalResults =
    results.songs.length +
    results.albums.length +
    results.artists.length +
    results.playlists.length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto select-none">
      {/* Search Input Bar with Focus Glow */}
      <div className="relative max-w-2xl group">
        <Search className="w-5 h-5 text-zinc-500 group-focus-within:text-[var(--accent)] transition-colors absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          autoFocus
          placeholder="Search songs, artists, albums, or playlists..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-[#12141C] border border-white/10 text-white text-sm focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 outline-none shadow-2xl transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggested Search Chips */}
      {!query && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-zinc-500 flex items-center gap-1.5 mr-1">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--accent)]" />
            Popular:
          </span>
          {POPULAR_SEARCHES.map(item => (
            <button
              key={item}
              onClick={() => setQuery(item)}
              className="px-3 py-1 rounded-full text-xs font-medium bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white transition-all active:scale-95"
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* Filter Chips */}
      {query && (
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all' as const, label: 'All Results' },
            { id: 'songs' as const, label: `Songs (${results.songs.length})` },
            { id: 'albums' as const, label: `Albums (${results.albums.length})` },
            { id: 'artists' as const, label: `Artists (${results.artists.length})` },
            { id: 'playlists' as const, label: `Playlists (${results.playlists.length})` },
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setFilterType(chip.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                filterType === chip.id
                  ? 'bg-[var(--accent)] text-black shadow-md'
                  : 'bg-white/[0.05] text-[#A1A1AA] hover:text-white border border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {/* Empty Query State */}
      {!query && (
        <div className="text-center py-20 text-zinc-400 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto shadow-xl">
            <Search className="w-8 h-8 text-[var(--accent)] opacity-80" />
          </div>
          <h2 className="text-lg font-bold text-white">Explore your personal music universe</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Search across Telugu melodies, master recordings, albums, playlists, and artists.
          </p>
        </div>
      )}

      {/* No Results Found */}
      {query && totalResults === 0 && (
        <div className="text-center py-20 text-zinc-400 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto shadow-xl">
            <Music2 className="w-8 h-8 text-zinc-600" />
          </div>
          <h2 className="text-lg font-bold text-white">No results found for &quot;{query}&quot;</h2>
          <p className="text-xs text-zinc-500">
            Check for spelling or try searching for a different keyword or genre.
          </p>
        </div>
      )}

      {/* Search Results Display */}
      {query && totalResults > 0 && (
        <div className="space-y-8">
          {/* Top Songs as Interactive Cards */}
          {(filterType === 'all' || filterType === 'songs') && results.songs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Music2 className="w-4 h-4 text-[var(--accent)]" />
                Matched Songs ({results.songs.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5">
                {results.songs.map((song, idx) => (
                  <InteractiveSongCard
                    key={song.id}
                    song={song}
                    queueList={results.songs}
                    index={idx}
                    onContextMenu={onSongContextMenu}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Artists */}
          {(filterType === 'all' || filterType === 'artists') && results.artists.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-[var(--accent)]" />
                Artists ({results.artists.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {results.artists.map(art => {
                  const artUrl = getArtworkObjectUrl(art);
                  return (
                    <div
                      key={art.id}
                      onClick={() => onNavigate('artist-detail', art.name)}
                      className="p-3.5 rounded-2xl bg-[#12141C] hover:bg-[#181B26] cursor-pointer transition-all flex flex-col items-center text-center group border border-white/10 hover:border-white/20 shadow-md hover:-translate-y-1"
                    >
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-zinc-900 mb-2.5 flex items-center justify-center border border-white/10 group-hover:border-[var(--accent)] transition-colors">
                        {artUrl ? (
                          <img src={artUrl} alt={art.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <User className="w-8 h-8 text-zinc-500" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-white group-hover:text-[var(--accent)] transition-colors truncate w-full">
                        <HighlightText text={art.name} query={query} />
                      </p>
                      <span className="text-[10px] text-zinc-500 mt-0.5">Artist</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Albums */}
          {(filterType === 'all' || filterType === 'albums') && results.albums.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Disc className="w-4 h-4 text-[var(--accent)]" />
                Albums ({results.albums.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {results.albums.map(alb => {
                  const albUrl = getArtworkObjectUrl(alb);
                  return (
                    <div
                      key={alb.id}
                      onClick={() => onNavigate('album-detail', alb.id)}
                      className="p-3.5 rounded-2xl bg-[#12141C] hover:bg-[#181B26] cursor-pointer transition-all group border border-white/10 hover:border-white/20 shadow-md hover:-translate-y-1"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden bg-zinc-900 mb-2.5 flex items-center justify-center border border-white/10">
                        {albUrl ? (
                          <img src={albUrl} alt={alb.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <Disc className="w-10 h-10 text-zinc-500" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-white group-hover:text-[var(--accent)] transition-colors truncate">
                        <HighlightText text={alb.title} query={query} />
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate mt-0.5">{alb.artist}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
