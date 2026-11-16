'use client';

import React, { useState, useEffect } from 'react';
import { Song, Album, Artist, Playlist, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { formatDuration } from '@/lib/utils';
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
} from 'lucide-react';

interface SearchViewProps {
  initialQuery?: string;
  onNavigate: (view: ViewType, param?: string) => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
}

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
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Search Input Bar */}
      <div className="relative max-w-2xl">
        <Search className="w-5 h-5 text-[#71717A] absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          autoFocus
          placeholder="Search songs, artists, albums, or playlists..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-[#19191F] border border-[#303038] text-white text-sm focus:border-[var(--accent)] outline-none shadow-xl"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-[#71717A] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Chips */}
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
                : 'bg-[#19191F] text-[#A1A1AA] hover:text-white border border-[#303038]'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Empty Query State */}
      {!query && (
        <div className="text-center py-20 text-[#A1A1AA] space-y-4">
          <Search className="w-12 h-12 text-[#303038] mx-auto" />
          <h2 className="text-lg font-bold text-white">Find anything in your music universe</h2>
          <p className="text-xs text-[#71717A] max-w-sm mx-auto">
            Search songs by title, artists by name, albums, genres, or custom playlists.
          </p>
        </div>
      )}

      {/* No Results Found */}
      {query && totalResults === 0 && (
        <div className="text-center py-20 text-[#A1A1AA] space-y-3">
          <Search className="w-12 h-12 text-[#303038] mx-auto" />
          <h2 className="text-lg font-bold text-white">No results found for &quot;{query}&quot;</h2>
          <p className="text-xs text-[#71717A]">
            Check for spelling errors or try searching for another artist or track name.
          </p>
        </div>
      )}

      {/* Search Results Display */}
      {query && totalResults > 0 && (
        <div className="space-y-8">
          {/* Top Songs */}
          {(filterType === 'all' || filterType === 'songs') && results.songs.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-white mb-3">Songs</h2>
              <div className="divide-y divide-[#303038]/40 border border-[#303038] rounded-2xl bg-[#19191F]/60 overflow-hidden">
                {results.songs.map(song => {
                  const isCur = currentSong?.id === song.id;
                  const artworkUrl = getArtworkObjectUrl(song);

                  return (
                    <div
                      key={song.id}
                      onContextMenu={e => onSongContextMenu(e, song)}
                      onClick={() => (isCur ? togglePlay() : playSong(song, results.songs))}
                      className={`flex items-center justify-between p-3 hover:bg-[#25252D] cursor-pointer transition-colors ${
                        isCur ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#25252D] shrink-0 flex items-center justify-center relative">
                          {artworkUrl ? (
                            <img src={artworkUrl} alt={song.title} className="w-full h-full object-cover" />
                          ) : (
                            <Music2 className="w-5 h-5 text-[#71717A]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-white">{song.title}</p>
                          <p className="text-xs text-[#A1A1AA] truncate">{song.artist} • {song.album}</p>
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

          {/* Artists */}
          {(filterType === 'all' || filterType === 'artists') && results.artists.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-white mb-3">Artists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {results.artists.map(art => {
                  const artUrl = getArtworkObjectUrl(art);
                  return (
                    <div
                      key={art.id}
                      onClick={() => onNavigate('artist-detail', art.name)}
                      className="p-3 rounded-2xl bg-[#19191F] hover:bg-[#25252D] cursor-pointer transition-all flex flex-col items-center text-center group border border-[#303038]/60"
                    >
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-[#25252D] mb-2.5 flex items-center justify-center">
                        {artUrl ? (
                          <img src={artUrl} alt={art.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-[#71717A]" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-white truncate w-full group-hover:text-[var(--accent)]">
                        {art.name}
                      </p>
                      <p className="text-[11px] text-[#A1A1AA]">{art.songCount} songs</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Albums */}
          {(filterType === 'all' || filterType === 'albums') && results.albums.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-white mb-3">Albums</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {results.albums.map(alb => {
                  const artUrl = getArtworkObjectUrl(alb);
                  return (
                    <div
                      key={alb.id}
                      onClick={() => onNavigate('album-detail', alb.title)}
                      className="p-3 rounded-2xl bg-[#19191F] hover:bg-[#25252D] cursor-pointer transition-all flex flex-col group border border-[#303038]/60"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden bg-[#25252D] mb-2.5 flex items-center justify-center">
                        {artUrl ? (
                          <img src={artUrl} alt={alb.title} className="w-full h-full object-cover" />
                        ) : (
                          <Disc className="w-8 h-8 text-[#71717A]" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-white truncate">{alb.title}</p>
                      <p className="text-[11px] text-[#A1A1AA] truncate">{alb.artist}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Playlists */}
          {(filterType === 'all' || filterType === 'playlists') && results.playlists.length > 0 && (
            <div>
              <h2 className="text-base font-bold text-white mb-3">Playlists</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {results.playlists.map(pl => {
                  const artUrl = getArtworkObjectUrl(pl);
                  return (
                    <div
                      key={pl.id}
                      onClick={() => onNavigate('playlist-detail', pl.id)}
                      className="p-3 rounded-2xl bg-[#19191F] hover:bg-[#25252D] cursor-pointer transition-all flex flex-col group border border-[#303038]/60"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden bg-[#25252D] mb-2.5 flex items-center justify-center">
                        {artUrl ? (
                          <img src={artUrl} alt={pl.title} className="w-full h-full object-cover" />
                        ) : (
                          <ListMusic className="w-8 h-8 text-[#71717A]" />
                        )}
                      </div>
                      <p className="text-xs font-bold text-white truncate">{pl.title}</p>
                      <p className="text-[11px] text-[#A1A1AA] truncate">Playlist</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
