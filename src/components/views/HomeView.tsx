'use client';

import React, { useEffect, useState } from 'react';
import { Song, Playlist, Album, Artist, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl, syncAlbumsAndArtists, resetGeneratedSampleSongs } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { useToast } from '@/context/ToastContext';
import { synthesizeTrack, SAMPLE_TRACK_DEFINITIONS } from '@/lib/audioSynthesis';
import { formatDuration } from '@/lib/utils';
import {
  Play,
  Pause,
  Upload,
  Sparkles,
  Music2,
  ListMusic,
  Disc,
  Clock,
  Heart,
  MoreVertical,
  Plus,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface HomeViewProps {
  onNavigate: (view: ViewType, param?: string) => void;
  onOpenUpload: () => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
}

export function HomeView({ onNavigate, onOpenUpload, onSongContextMenu }: HomeViewProps) {
  const { playSong, currentSong, isPlaying, togglePlay, toggleFavorite } = usePlayer();
  const { showToast } = useToast();

  const [recentSongs, setRecentSongs] = useState<Song[]>([]);
  const [topSongs, setTopSongs] = useState<Song[]>([]);
  const [recentPlaylists, setRecentPlaylists] = useState<Playlist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);
  const [totalSongsCount, setTotalSongsCount] = useState(0);
  const [sampleSongsCount, setSampleSongsCount] = useState(0);

  const loadData = async () => {
    const total = await db.songs.count();
    setTotalSongsCount(total);

    const allSongs = await db.songs.toArray();
    const samples = allSongs.filter(s => s.id.startsWith('sample_') || s.hash.startsWith('synth_'));
    setSampleSongsCount(samples.length);
    // Recently added (sorted by dateAdded desc)
    const sortedRecent = [...allSongs].sort((a, b) => b.dateAdded - a.dateAdded).slice(0, 10);
    setRecentSongs(sortedRecent);

    // Top played
    const sortedTop = [...allSongs].sort((a, b) => (b.playCount || 0) - (a.playCount || 0)).slice(0, 6);
    setTopSongs(sortedTop);

    const pl = await db.playlists.toArray();
    setRecentPlaylists(pl.slice(0, 6));

    const alb = await db.albums.toArray();
    setAlbums(alb.slice(0, 6));

    const art = await db.artists.toArray();
    setArtists(art.slice(0, 6));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateSamples = async () => {
    setIsGeneratingSamples(true);
    showToast('Synthesizing Music', 'Generating high-fidelity audio tracks in browser...', 'info');

    try {
      for (const def of SAMPLE_TRACK_DEFINITIONS) {
        const song = await synthesizeTrack(
          def.title,
          def.artist,
          def.album,
          def.bpm,
          def.baseFreq,
          def.seconds,
          def.gradient
        );
        await db.songs.add(song);
      }
      await syncAlbumsAndArtists();
      await loadData();
      showToast('Samples Ready', 'Generated 4 original ambient compositions!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Generation Failed', err?.message || 'Could not synthesize tracks', 'error');
    } finally {
      setIsGeneratingSamples(false);
    }
  };

  const handleResetSamples = async () => {
    if (confirm('Reset and remove all generated sample songs from your library?')) {
      const removed = await resetGeneratedSampleSongs();
      showToast('Sample Songs Removed', `Removed ${removed} generated tracks.`, 'info');
      await loadData();
    }
  };

  // Get greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            {greeting}
          </h1>
          <p className="text-sm text-[#A1A1AA] mt-1 font-medium">
            Welcome to your private SONORA library. Enjoy lossless music and personalized listening.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {sampleSongsCount > 0 && (
            <button
              onClick={handleResetSamples}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#19191F] hover:bg-[#25252D] border border-amber-800/60 text-amber-300 text-xs font-semibold transition-all shadow-sm"
              title="Remove generated sample songs"
            >
              <span>Reset Sample Songs ({sampleSongsCount})</span>
            </button>
          )}

          {totalSongsCount === 0 && (
            <button
              onClick={handleGenerateSamples}
              disabled={isGeneratingSamples}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-all shadow-lg"
            >
              {isGeneratingSamples ? (
                <Loader2 className="w-4 h-4 animate-spin text-purple-300" />
              ) : (
                <Sparkles className="w-4 h-4 text-purple-400" />
              )}
              <span>Generate Sample Music</span>
            </button>
          )}
        </div>
      </div>

      {/* Empty State if completely empty */}
      {totalSongsCount === 0 && (
        <div className="p-8 sm:p-12 rounded-3xl bg-[#121216] border border-[#303038] text-center max-w-2xl mx-auto space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center mx-auto shadow-inner">
            <Music2 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Your music sanctuary is ready</h2>
            <p className="text-sm text-[#A1A1AA] mt-2 max-w-md mx-auto leading-relaxed">
              Import your audio files (MP3, WAV, FLAC, M4A) or add direct streams. Or generate
              instant synthetic tracks to test the player right away.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onOpenUpload}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-black text-xs font-bold hover:scale-105 transition-all shadow-md"
            >
              <Upload className="w-4 h-4" /> Upload Music Files
            </button>
            <button
              onClick={handleGenerateSamples}
              disabled={isGeneratingSamples}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25252D] hover:bg-[#303038] border border-[#303038] text-white text-xs font-semibold transition-all"
            >
              {isGeneratingSamples ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-purple-400" />
              )}
              Load Sample Audio
            </button>
          </div>
        </div>
      )}

      {/* Quick Access Top Cards Grid (Spotify / Apple Music inspired hero tiles) */}
      {topSongs.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topSongs.map(song => {
              const isCur = currentSong?.id === song.id;
              const artworkUrl = getArtworkObjectUrl(song);

              return (
                <div
                  key={song.id}
                  onClick={() => (isCur ? togglePlay() : playSong(song, topSongs))}
                  onContextMenu={e => onSongContextMenu(e, song)}
                  className={`group flex items-center gap-3.5 p-2 rounded-xl bg-[#19191F]/90 hover:bg-[#25252D] border border-transparent hover:border-[#303038] cursor-pointer transition-all shadow-md relative ${
                    isCur ? 'border-[var(--accent)]/50 bg-[var(--accent)]/5' : ''
                  }`}
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#25252D] shrink-0 flex items-center justify-center relative">
                    {artworkUrl ? (
                      <img src={artworkUrl} alt={song.title} className="w-full h-full object-cover" />
                    ) : (
                      <Music2 className="w-6 h-6 text-[#71717A]" />
                    )}
                    <div
                      className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
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

                  <div className="flex-1 min-w-0 pr-2">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isCur ? 'text-[var(--accent)]' : 'text-white'
                      }`}
                    >
                      {song.title}
                    </p>
                    <p className="text-xs text-[#A1A1AA] truncate mt-0.5">{song.artist}</p>
                  </div>

                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onSongContextMenu(e, song);
                    }}
                    className="p-1.5 rounded-lg text-[#71717A] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recently Added Section */}
      {recentSongs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Recently Added</h2>
              <p className="text-xs text-[#A1A1AA]">Fresh additions to your personal collection</p>
            </div>
            <button
              onClick={() => onNavigate('library')}
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              See all ({totalSongsCount})
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {recentSongs.slice(0, 6).map(song => {
              const isCur = currentSong?.id === song.id;
              const artworkUrl = getArtworkObjectUrl(song);

              return (
                <div
                  key={song.id}
                  onClick={() => (isCur ? togglePlay() : playSong(song, recentSongs))}
                  onContextMenu={e => onSongContextMenu(e, song)}
                  className="group p-3 rounded-2xl bg-[#19191F]/80 hover:bg-[#25252D] border border-transparent hover:border-[#303038] cursor-pointer transition-all shadow-md flex flex-col"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-[#25252D] relative mb-3 flex items-center justify-center">
                    {artworkUrl ? (
                      <img
                        src={artworkUrl}
                        alt={song.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Music2 className="w-10 h-10 text-[#71717A]" />
                    )}

                    {/* Animated hover play button */}
                    <div
                      className={`absolute bottom-2.5 right-2.5 w-10 h-10 rounded-full bg-[var(--accent)] text-black flex items-center justify-center shadow-xl transition-all duration-200 transform ${
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
                    className={`text-sm font-semibold truncate ${
                      isCur ? 'text-[var(--accent)]' : 'text-white'
                    }`}
                  >
                    {song.title}
                  </p>
                  <p className="text-xs text-[#A1A1AA] truncate mt-0.5">{song.artist}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Playlists Preview */}
      {recentPlaylists.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Your Playlists</h2>
              <p className="text-xs text-[#A1A1AA]">Curated selections from your library</p>
            </div>
            <button
              onClick={() => onNavigate('playlists')}
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              See all
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentPlaylists.map(pl => {
              const art = getArtworkObjectUrl(pl);
              return (
                <div
                  key={pl.id}
                  onClick={() => onNavigate('playlist-detail', pl.id)}
                  className="group p-3 rounded-2xl bg-[#19191F]/80 hover:bg-[#25252D] border border-transparent hover:border-[#303038] cursor-pointer transition-all shadow-md flex flex-col"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-[#25252D] relative mb-3 flex items-center justify-center">
                    {art ? (
                      <img src={art} alt={pl.title} className="w-full h-full object-cover" />
                    ) : (
                      <ListMusic className="w-10 h-10 text-[#71717A]" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{pl.title}</p>
                  <p className="text-xs text-[#A1A1AA] truncate mt-0.5">Playlist</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Albums & Artists Highlights */}
      {albums.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Albums Collection</h2>
            <button
              onClick={() => onNavigate('albums')}
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              See all
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {albums.map(alb => {
              const art = getArtworkObjectUrl(alb);
              return (
                <div
                  key={alb.id}
                  onClick={() => onNavigate('album-detail', alb.title)}
                  className="group p-3 rounded-2xl bg-[#19191F]/80 hover:bg-[#25252D] border border-transparent hover:border-[#303038] cursor-pointer transition-all shadow-md flex flex-col"
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-[#25252D] relative mb-3 flex items-center justify-center">
                    {art ? (
                      <img src={art} alt={alb.title} className="w-full h-full object-cover" />
                    ) : (
                      <Disc className="w-10 h-10 text-[#71717A]" />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{alb.title}</p>
                  <p className="text-xs text-[#A1A1AA] truncate mt-0.5">
                    {alb.artist} • {alb.songCount} {alb.songCount === 1 ? 'song' : 'songs'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
