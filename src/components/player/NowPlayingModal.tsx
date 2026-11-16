'use client';

import React, { useState } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useTheme } from '@/context/ThemeContext';
import { getArtworkObjectUrl } from '@/lib/db';
import { formatDuration } from '@/lib/utils';
import { AudioVisualizer } from './AudioVisualizer';
import { LyricsPanel } from './LyricsPanel';
import { VinylCover } from '@/components/common/VinylCover';
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Heart,
  Volume2,
  VolumeX,
  ListMusic,
  FileText,
  Sliders,
  Music2,
  Activity,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function NowPlayingModal() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    isNowPlayingOpen,
    setIsNowPlayingOpen,
    visualizerMode,
    setVisualizerMode,
    playSong,
    togglePlay,
    nextTrack,
    prevTrack,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    toggleRepeat,
    toggleFavorite,
    queue,
    queueIndex,
  } = usePlayer();

  const { settings, updateSettings } = useTheme();

  const [activeTab, setActiveTab] = useState<'visualizer' | 'lyrics' | 'queue' | 'eq'>('visualizer');

  if (!isNowPlayingOpen || !currentSong) return null;

  const artworkUrl = getArtworkObjectUrl(currentSong);

  const visualizerModes = [
    { id: 'bars' as const, label: 'Bars' },
    { id: 'wave' as const, label: 'Waveform' },
    { id: 'circle' as const, label: 'Radial' },
    { id: 'pulse' as const, label: 'Aura' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
        className="fixed inset-0 z-50 flex flex-col bg-[#0B0B0D] overflow-hidden select-none"
      >
        {/* Dynamic blurred ambient background from artwork or accent */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
          {artworkUrl ? (
            <div
              className="absolute inset-0 scale-125 filter blur-[90px] brightness-75 transition-all duration-1000"
              style={{
                backgroundImage: `url(${artworkUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ) : (
            <div
              className="absolute inset-0 filter blur-[120px] transition-all duration-1000"
              style={{
                background: `radial-gradient(circle at 50% 50%, var(--accent) 0%, transparent 70%)`,
              }}
            />
          )}
          <div className="absolute inset-0 bg-black/60" />
        </div>

        {/* Top Bar */}
        <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-[#303038]/40">
          <button
            onClick={() => setIsNowPlayingOpen(false)}
            className="p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
          >
            <ChevronDown className="w-6 h-6" />
            <span className="text-sm font-medium hidden sm:inline">Minimize</span>
          </button>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#19191F]/80 rounded-xl border border-[#303038]">
            <button
              onClick={() => setActiveTab('visualizer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'visualizer'
                  ? 'bg-[var(--accent)] text-black shadow-md'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> Visualizer
            </button>
            <button
              onClick={() => setActiveTab('lyrics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'lyrics'
                  ? 'bg-[var(--accent)] text-black shadow-md'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Lyrics
            </button>
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'queue'
                  ? 'bg-[var(--accent)] text-black shadow-md'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" /> Queue
            </button>
            <button
              onClick={() => setActiveTab('eq')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'eq'
                  ? 'bg-[var(--accent)] text-black shadow-md'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Audio EQ
            </button>
          </div>

          <div className="w-20 hidden sm:block text-right">
            <span className="text-xs uppercase font-bold tracking-wider text-[#A1A1AA]">
              {currentSong.codec || (currentSong.isLocal ? 'Lossless' : 'Stream')}
            </span>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="relative z-10 flex-1 flex flex-col md:flex-row items-center justify-center p-6 md:p-12 overflow-hidden gap-8 max-w-6xl mx-auto w-full">
          {/* Left Column: Artwork & Info (Reference Image 2 & 4 style) */}
          <div className="flex flex-col items-center max-w-md w-full shrink-0">
            {/* Album Artwork with Spinning Vinyl or YouTube Embed */}
            {currentSong.providerType === 'youtube' && currentSong.youtubeId ? (
              <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-[#19191F]">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${currentSong.youtubeId}?autoplay=1`}
                  title={currentSong.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center p-2">
                <VinylCover
                  artworkUrl={artworkUrl}
                  title={currentSong.title}
                  artist={currentSong.artist}
                  isPlaying={isPlaying}
                  size="xl"
                  showBadge={true}
                />
              </div>
            )}

            {/* Song Meta */}
            <div className="mt-6 text-center w-full px-4">
              <div className="flex items-center justify-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white truncate max-w-[280px] sm:max-w-xs tracking-tight">
                  {currentSong.title}
                </h1>
                <button
                  onClick={() => toggleFavorite(currentSong.id)}
                  className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                >
                  <Heart
                    className={`w-5 h-5 transition-all ${
                      currentSong.isFavorite
                        ? 'fill-rose-500 text-rose-500 scale-110'
                        : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  />
                </button>
              </div>

              {/* Format & Genre Pill (Reference Image 2 style) */}
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-medium text-[#D4D4D8]">
                  {currentSong.artist}
                </span>
                {currentSong.album && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-[#A1A1AA]">
                    {currentSong.album}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[9px] font-mono font-bold text-[var(--accent)]">
                  {currentSong.codec?.toUpperCase() || (currentSong.isLocal ? 'LOSSLESS' : 'WEB AUDIO')}
                </span>
              </div>

              {/* Open External Source button if external or YouTube */}
              {currentSong.sourceUrl && !currentSong.isLocal && (
                <div className="pt-2">
                  <a
                    href={currentSong.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#19191F] hover:bg-[#25252D] border border-[#303038] text-[11px] font-semibold text-[#A1A1AA] hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 text-sky-400" /> Open External Source
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Visualizer / Lyrics / Queue / EQ Tab */}
          <div className="flex-1 w-full h-[320px] sm:h-[400px] flex flex-col rounded-2xl bg-[#121216]/80 backdrop-blur-xl border border-[#303038] overflow-hidden">
            {activeTab === 'visualizer' && (
              <div className="flex flex-col h-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase font-bold tracking-wider text-[#A1A1AA]">
                    Live Audio Spectrum (Web Audio API)
                  </span>
                  <div className="flex gap-1.5">
                    {visualizerModes.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setVisualizerMode(m.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                          visualizerMode === m.id
                            ? 'bg-[var(--accent)] text-black font-semibold'
                            : 'bg-[#25252D] text-[#A1A1AA] hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex-1 w-full rounded-xl bg-[#0B0B0D]/50 border border-[#303038]/50 p-4 flex items-center justify-center overflow-hidden">
                  <AudioVisualizer mode={visualizerMode} accentColor={settings.accentColor} />
                </div>
              </div>
            )}

            {activeTab === 'lyrics' && (
              <LyricsPanel song={currentSong} currentTime={currentTime} onSeek={seek} />
            )}

            {activeTab === 'queue' && (
              <div className="flex flex-col h-full p-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#A1A1AA] mb-4">
                  Upcoming Queue ({queue.length - 1 - queueIndex} tracks remaining)
                </h3>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                  {queue.slice(queueIndex + 1).map((s, idx) => (
                    <div
                      key={`${s.id}_${idx}`}
                      onClick={() => playSong(s)}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#19191F] hover:bg-[#25252D] border border-transparent hover:border-[#303038] cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-[#71717A] w-5 text-center">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{s.title}</p>
                          <p className="text-xs text-[#A1A1AA] truncate">{s.artist}</p>
                        </div>
                      </div>
                      <span className="text-xs text-[#A1A1AA] font-mono shrink-0">
                        {formatDuration(s.duration)}
                      </span>
                    </div>
                  ))}
                  {queue.length - 1 <= queueIndex && (
                    <div className="text-center py-12 text-[#A1A1AA] text-sm">
                      No more tracks in queue. Add songs from your library!
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'eq' && (
              <div className="flex flex-col h-full p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Audio Equalizer & Enhancement</h3>
                  <p className="text-xs text-[#A1A1AA]">
                    Fine-tune the real-time BiquadFilter frequency response of your audio engine.
                  </p>
                </div>

                {/* EQ Presets */}
                <div>
                  <label className="text-xs uppercase font-bold tracking-wider text-[#A1A1AA] block mb-2">
                    EQ Presets
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {[
                      { name: 'Flat', preset: 'flat', bass: 0, treble: 0 },
                      { name: 'Bass Boost', preset: 'bass-boost', bass: 6, treble: 1 },
                      { name: 'Electronic', preset: 'electronic', bass: 5, treble: 4 },
                      { name: 'Vocal', preset: 'vocal', bass: -2, treble: 3 },
                      { name: 'Rock', preset: 'rock', bass: 4, treble: 5 },
                    ].map(p => (
                      <button
                        key={p.name}
                        onClick={() => {
                          updateSettings({
                            eqPreset: p.preset as any,
                            bassGain: p.bass,
                            trebleGain: p.treble,
                          });
                        }}
                        className={`p-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                          settings.eqPreset === p.preset
                            ? 'bg-[var(--accent)] text-black border-transparent shadow-md'
                            : 'bg-[#19191F] text-[#A1A1AA] border-[#303038] hover:text-white hover:bg-[#25252D]'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders for Bass and Treble */}
                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-white mb-1.5">
                      <span>Low End / Bass (250Hz LowShelf)</span>
                      <span className="font-mono text-[var(--accent)]">{settings.bassGain > 0 ? `+${settings.bassGain}` : settings.bassGain} dB</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="1"
                      value={settings.bassGain}
                      onChange={e => updateSettings({ bassGain: parseInt(e.target.value) })}
                      className="w-full accent-[var(--accent)]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-white mb-1.5">
                      <span>High End / Treble (4000Hz HighShelf)</span>
                      <span className="font-mono text-[var(--accent)]">{settings.trebleGain > 0 ? `+${settings.trebleGain}` : settings.trebleGain} dB</span>
                    </div>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="1"
                      value={settings.trebleGain}
                      onChange={e => updateSettings({ trebleGain: parseInt(e.target.value) })}
                      className="w-full accent-[var(--accent)]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Bottom Playback Controls */}
        <footer className="relative z-10 px-8 py-6 border-t border-[#303038]/60 bg-[#121216]/90 backdrop-blur-xl max-w-4xl mx-auto w-full">
          {/* Progress Bar */}
          <div className="flex items-center gap-3 w-full mb-4">
            <span className="text-xs text-[#A1A1AA] font-mono w-10 text-right">
              {formatDuration(currentTime)}
            </span>
            <div className="relative flex-1 group">
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={e => seek(parseFloat(e.target.value))}
                className="w-full cursor-pointer accent-[var(--accent)]"
              />
            </div>
            <span className="text-xs text-[#A1A1AA] font-mono w-10">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Primary Controls */}
          <div className="flex items-center justify-between">
            {/* Shuffle & Volume */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleShuffle}
                className={`p-2 rounded-lg transition-colors ${
                  shuffle ? 'text-[var(--accent)]' : 'text-[#A1A1AA] hover:text-white'
                }`}
                title="Shuffle"
              >
                <Shuffle className="w-5 h-5" />
              </button>
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-[#A1A1AA] hover:text-white transition-colors"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={e => setVolume(parseFloat(e.target.value))}
                  className="w-24 accent-[var(--accent)]"
                />
              </div>
            </div>

            {/* Play / Next / Prev */}
            <div className="flex items-center gap-6">
              <button
                onClick={prevTrack}
                className="p-2 text-[#A1A1AA] hover:text-white transition-transform active:scale-95"
                title="Previous Track"
              >
                <SkipBack className="w-7 h-7" />
              </button>

              <button
                onClick={togglePlay}
                className="w-14 h-14 rounded-full bg-[var(--accent)] text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl accent-glow"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-black" />
                ) : (
                  <Play className="w-7 h-7 fill-black ml-1" />
                )}
              </button>

              <button
                onClick={nextTrack}
                className="p-2 text-[#A1A1AA] hover:text-white transition-transform active:scale-95"
                title="Next Track"
              >
                <SkipForward className="w-7 h-7" />
              </button>
            </div>

            {/* Repeat */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleRepeat}
                className={`p-2 rounded-lg transition-colors ${
                  repeat !== 'off' ? 'text-[var(--accent)]' : 'text-[#A1A1AA] hover:text-white'
                }`}
                title={`Repeat: ${repeat}`}
              >
                {repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
