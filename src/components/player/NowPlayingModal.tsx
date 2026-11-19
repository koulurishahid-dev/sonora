'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { useTheme } from '@/context/ThemeContext';
import { getArtworkObjectUrl } from '@/lib/db';
import { formatDuration } from '@/lib/utils';
import { extractColorsFromImage, ExtractedColors } from '@/lib/colorExtractor';
import { AudioVisualizer } from './AudioVisualizer';
import { LyricsPanel } from './LyricsPanel';
import { TurntableStudioStage } from './TurntableStudioStage';
import { CinematicSmokeAtmosphere } from '../common/CinematicSmokeAtmosphere';
import { VisualizerMode, EqPresetName, EqBands } from '@/types/music';
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
  Activity,
  Maximize2,
  Minimize2,
  Radio,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Gauge,
  Sparkles,
  Disc,
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
    reorderQueue,
    removeFromQueue,
    clearQueue,
    playbackRate,
    setPlaybackRate,
    eqBands,
    eqPreset,
    setEqBand,
    setEqPreset,
    resetEq,
  } = usePlayer();

  const { settings } = useTheme();

  const [activeTab, setActiveTab] = useState<'turntable' | 'visualizer' | 'lyrics' | 'queue' | 'eq'>('turntable');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [colors, setColors] = useState<ExtractedColors>({
    primary: '#A78BFA',
    secondary: '#D8B4FE',
    glow: 'rgba(167, 139, 250, 0.25)',
    ambientRgb: '167, 139, 250',
  });

  const modalRef = useRef<HTMLDivElement | null>(null);

  // Extract artwork dominant color whenever song changes
  useEffect(() => {
    if (!currentSong) return;
    const artUrl = getArtworkObjectUrl(currentSong);
    extractColorsFromImage(artUrl).then(setColors);
  }, [currentSong]);

  // Track Fullscreen state
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (modalRef.current?.requestFullscreen) {
          await modalRef.current.requestFullscreen();
        } else if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  if (!isNowPlayingOpen || !currentSong) return null;

  const artworkUrl = getArtworkObjectUrl(currentSong);

  const visualizerModes: { id: VisualizerMode; label: string }[] = [
    { id: 'bars', label: 'Spectrum Bars' },
    { id: 'wave', label: 'Waveform' },
    { id: 'radial', label: 'Radial' },
    { id: 'aura', label: 'Ambient Aura' },
  ];

  const eqPresetsList: { name: string; preset: Exclude<EqPresetName, 'custom'> }[] = [
    { name: 'Normal', preset: 'normal' },
    { name: 'Bass Boost', preset: 'bass-boost' },
    { name: 'Treble Boost', preset: 'treble-boost' },
    { name: 'Vocal', preset: 'vocal' },
    { name: 'Classical', preset: 'classical' },
  ];

  const bandsConfig: { key: keyof EqBands; label: string; freq: string }[] = [
    { key: 'band60', label: 'Sub', freq: '60 Hz' },
    { key: 'band250', label: 'Bass', freq: '250 Hz' },
    { key: 'band1k', label: 'Mid', freq: '1 kHz' },
    { key: 'band4k', label: 'Treble', freq: '4 kHz' },
    { key: 'band12k', label: 'Air', freq: '12 kHz' },
  ];

  const speedOptions = [0.75, 1, 1.25, 1.5, 2];

  // Up next tracks
  const upcomingQueue = queue.slice(queueIndex + 1);

  const moveQueueItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= queue.length) return;
    const newQueue = [...queue];
    const [moved] = newQueue.splice(fromIdx, 1);
    newQueue.splice(toIdx, 0, moved);
    reorderQueue(newQueue);
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-50 flex flex-col bg-[#090812] text-[#F8F5FF] overflow-hidden select-none"
      >
        {/* ========================================================= */}
        {/* BACKGROUND ATMOSPHERE (Deep obsidian listening studio)    */}
        {/* ========================================================= */}
        {/* BACKGROUND AMBIENT ATMOSPHERE WITH PURPLE SMOKE & LIGHT  */}
        {/* ========================================================= */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Dedicated Cinematic Purple Smoke Atmosphere Stage */}
          <CinematicSmokeAtmosphere variant="stage" intensity={1.15} />

          {/* Subtle blurred artwork illumination */}
          {artworkUrl && (
            <motion.div
              key={currentSong.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.16 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2 }}
              className="absolute inset-[-10%] bg-cover bg-center filter blur-[120px] saturate-150 brightness-[0.25]"
              style={{ backgroundImage: `url(${artworkUrl})` }}
            />
          )}

          {/* Deep studio midnight purple vignette framing */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#050309]/80 via-transparent to-[#050309]/90 pointer-events-none" />
        </div>

        {/* ========================================================= */}
        {/* A. TOP NAVIGATION — Fixed Height around 64–72px           */}
        {/* ========================================================= */}
        <header className="relative z-30 h-16 sm:h-18 px-3 sm:px-8 border-b border-[#302744] bg-[#110F1D]/88 backdrop-blur-2xl shrink-0 flex items-center justify-between gap-2">
          {/* Left: Minimize button, SONORA logo & status dot */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsNowPlayingOpen(false)}
              className="group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-[#141122] hover:bg-[#2A2140] border border-[#302744] hover:border-[#A78BFA]/50 text-[#C2B5D9] hover:text-[#F8F5FF] transition-all active:scale-95 shadow-md"
              title="Minimize to player dock"
            >
              <ChevronDown className="w-4 h-4 text-[#A99DBE] group-hover:text-[#A78BFA] transition-colors" />
              <span className="text-xs font-semibold tracking-wide hidden sm:inline">Minimize</span>
            </button>

            <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2">
              <span className="text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.25em] font-black uppercase text-[#F8F5FF]">
                SONORA
              </span>
              <span className="w-2 h-2 rounded-full bg-[#A78BFA] shadow-[0_0_10px_#A78BFA] animate-pulse" />
            </div>
          </div>

          {/* Center: 5 Studio Navigation Tabs */}
          <nav className="flex items-center p-0.5 sm:p-1 rounded-full bg-[#141122]/90 backdrop-blur-xl border border-[#302744] shadow-xl overflow-x-auto scrollbar-none">
            {(
              [
                { id: 'turntable', label: 'Turntable Studio', icon: Disc },
                { id: 'visualizer', label: 'Visualizer', icon: Activity },
                { id: 'lyrics', label: 'Lyrics', icon: FileText },
                { id: 'queue', label: 'Queue', icon: ListMusic },
                { id: 'eq', label: 'Equalizer', icon: Sliders },
              ] as const
            ).map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 ${
                    isActive ? 'text-[#090812]' : 'text-[#A99DBE] hover:text-[#F8F5FF]'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 bg-[#A78BFA] rounded-full shadow-[0_0_16px_rgba(167,139,250,0.5)]"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Right: Audio Quality Specs & Fullscreen Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#171326] border border-[#302744] text-[11px] font-mono text-[#C2B5D9]">
              <Radio className="w-3 h-3 text-[#A78BFA] animate-pulse" />
              <span>320 KBPS MASTER</span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-1.5 sm:p-2 rounded-full bg-[#141122] hover:bg-[#2A2140] border border-[#302744] hover:border-[#A78BFA]/50 text-[#C2B5D9] hover:text-[#F8F5FF] transition-all shadow-md active:scale-95"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* B. MAIN LISTENING STAGE — Balanced Viewport Utilization   */}
        {/* ========================================================= */}
        <main className="relative z-20 flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center p-3 sm:p-6">
          {/* TAB 1: TURNTABLE STUDIO (THE HERO 2-COLUMN EXPERIENCE) */}
          {activeTab === 'turntable' && <TurntableStudioStage />}

          {/* TAB 2: FULL VISUALIZER STUDIO */}
          {activeTab === 'visualizer' && (
            <div className="w-full h-full max-w-5xl mx-auto flex flex-col p-6 rounded-3xl bg-[#171326]/90 border border-[#302744] backdrop-blur-2xl shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-[#302744]">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#F8F5FF] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#A78BFA]" />
                    Expanded Studio Audio Analyser
                  </h2>
                  <p className="text-xs text-[#C2B5D9] mt-0.5">
                    Real-time 256-band Web Audio API Fast Fourier Transform
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#141122] border border-[#302744]">
                  {visualizerModes.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setVisualizerMode(m.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        visualizerMode === m.id
                          ? 'bg-[#A78BFA] text-[#090812] shadow-md shadow-[#A78BFA]/30'
                          : 'text-[#A99DBE] hover:text-[#F8F5FF]'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative flex-1 w-full mt-4 rounded-2xl bg-[#090812] border border-[#302744] p-4 flex items-center justify-center overflow-hidden">
                <AudioVisualizer mode={visualizerMode} accentColor="#A78BFA" secondaryColor="#D8B4FE" />
              </div>
            </div>
          )}

          {/* TAB 3: SYNCHRONIZED LYRICS PANEL */}
          {activeTab === 'lyrics' && (
            <div className="w-full h-full max-w-4xl mx-auto overflow-hidden rounded-3xl bg-[#171326]/90 border border-[#302744] backdrop-blur-2xl shadow-2xl p-6">
              <LyricsPanel song={currentSong} currentTime={currentTime} onSeek={seek} />
            </div>
          )}

          {/* TAB 4: QUEUE STUDIO */}
          {activeTab === 'queue' && (
            <div className="w-full h-full max-w-4xl mx-auto flex flex-col rounded-3xl bg-[#171326]/90 border border-[#302744] backdrop-blur-2xl shadow-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-[#302744] mb-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#F8F5FF] flex items-center gap-2">
                    <ListMusic className="w-4 h-4 text-[#A78BFA]" />
                    Studio Playback Queue ({queue.length} Tracks)
                  </h2>
                  <p className="text-xs text-[#C2B5D9] mt-0.5">
                    {upcomingQueue.length} tracks up next in listening room
                  </p>
                </div>

                {queue.length > 1 && (
                  <button
                    onClick={clearQueue}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-500/20 border border-rose-500/30 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Queue</span>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {/* Now Playing Row */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#211A32] border border-[#A78BFA]/40 shadow-md">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-[#141122] shrink-0 border border-[#302744] relative">
                      {artworkUrl && <img src={artworkUrl} alt="" className="w-full h-full object-cover" />}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-[#A78BFA] animate-pulse" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-[#D8B4FE]">
                        Now Playing
                      </span>
                      <p className="text-sm font-bold text-[#F8F5FF] truncate">{currentSong.title}</p>
                      <p className="text-xs text-[#C2B5D9] truncate">{currentSong.artist}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-[#D8B4FE] font-bold">
                    {formatDuration(duration)}
                  </span>
                </div>

                {/* Upcoming Queue Tracks */}
                {upcomingQueue.map((song, idx) => {
                  const actualIdx = queueIndex + 1 + idx;
                  const trackArt = getArtworkObjectUrl(song);
                  return (
                    <div
                      key={song.id + '_' + actualIdx}
                      className="group flex items-center justify-between p-3 rounded-2xl bg-[#141122]/70 hover:bg-[#2A2140] border border-[#302744]/60 hover:border-[#A78BFA]/40 transition-all"
                    >
                      <div
                        onClick={() => playSong(song)}
                        className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer"
                      >
                        <span className="text-xs font-mono text-[#A99DBE] w-5 text-center group-hover:hidden">
                          {idx + 1}
                        </span>
                        <Play className="w-4 h-4 text-[#A78BFA] hidden group-hover:block shrink-0" />
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#211A32] shrink-0 border border-[#302744]">
                          {trackArt ? (
                            <img src={trackArt} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Disc className="w-5 h-5 text-[#A99DBE] m-auto mt-2.5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-bold text-[#F8F5FF] truncate group-hover:text-[#D8B4FE] transition-colors">{song.title}</p>
                          <p className="text-[11px] text-[#C2B5D9] truncate">{song.artist}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono text-[#A99DBE] mr-2">
                          {formatDuration(song.duration)}
                        </span>
                        <button
                          onClick={() => moveQueueItem(actualIdx, actualIdx - 1)}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg text-[#A99DBE] hover:text-[#F8F5FF] disabled:opacity-20"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveQueueItem(actualIdx, actualIdx + 1)}
                          disabled={idx === upcomingQueue.length - 1}
                          className="p-1.5 rounded-lg text-[#A99DBE] hover:text-[#F8F5FF] disabled:opacity-20"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeFromQueue(actualIdx)}
                          className="p-1.5 rounded-lg text-[#A99DBE] hover:text-rose-400"
                          title="Remove from queue"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: EQUALIZER STUDIO */}
          {activeTab === 'eq' && (
            <div className="w-full h-full max-w-4xl mx-auto flex flex-col rounded-3xl bg-[#171326]/90 border border-[#302744] backdrop-blur-2xl shadow-2xl p-6 overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-[#302744] mb-6">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#F8F5FF] flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#A78BFA]" />
                    Studio 5-Band Parametric Equalizer
                  </h2>
                  <p className="text-xs text-[#C2B5D9] mt-0.5">
                    Active preset: <span className="font-semibold text-[#D8B4FE] capitalize">{eqPreset}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#141122] border border-[#302744]">
                    {eqPresetsList.map(p => (
                      <button
                        key={p.preset}
                        onClick={() => setEqPreset(p.preset)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                          eqPreset === p.preset
                            ? 'bg-[#A78BFA] text-[#090812] shadow-md shadow-[#A78BFA]/30'
                            : 'text-[#A99DBE] hover:text-[#F8F5FF]'
                        }`}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={resetEq}
                    className="p-2 rounded-xl bg-[#141122] hover:bg-[#2A2140] border border-[#302744] text-[#C2B5D9] hover:text-[#F8F5FF]"
                    title="Reset Equalizer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 5 Equalizer Sliders */}
              <div className="flex-1 grid grid-cols-5 gap-4 items-center justify-center p-4">
                {bandsConfig.map(b => {
                  const val = eqBands[b.key];
                  return (
                    <div
                      key={b.key}
                      className="flex flex-col items-center justify-between h-full py-4 rounded-2xl bg-[#141122] border border-[#302744]"
                    >
                      <span className="text-xs font-mono font-bold text-[#D8B4FE]">
                        {val > 0 ? `+${val}` : val} dB
                      </span>
                      <div className="h-44 flex items-center justify-center">
                        <input
                          type="range"
                          min="-12"
                          max="12"
                          step="1"
                          value={val}
                          onChange={e => setEqBand(b.key, parseInt(e.target.value))}
                          className="h-36 accent-[#A78BFA] cursor-pointer -rotate-90"
                        />
                      </div>
                      <div className="text-center mt-2">
                        <p className="text-xs font-bold text-[#F8F5FF]">{b.label}</p>
                        <p className="text-[10px] text-[#A99DBE] font-mono">{b.freq}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>

        {/* ========================================================= */}
        {/* C. BOTTOM PLAYBACK STATION — Fully Mobile Responsive      */}
        {/* ========================================================= */}
        <footer className="relative z-30 min-h-[5.5rem] md:h-22 py-2.5 md:py-0 px-3 sm:px-8 border-t border-[#302744] bg-[#110F1D]/95 backdrop-blur-2xl shrink-0 flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0 shadow-[0_-12px_32px_rgba(9,8,18,0.9)]">
          {/* Mobile Top Scrubber Timeline (Full width on mobile, hidden on desktop md:) */}
          <div className="w-full flex md:hidden items-center gap-2.5 px-1">
            <span className="text-[10px] font-mono text-[#A99DBE] w-9 text-right shrink-0">
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
                className="w-full cursor-pointer accent-[#A78BFA] h-1.5 rounded-full"
              />
            </div>
            <span className="text-[10px] font-mono text-[#A99DBE] w-9 text-left shrink-0">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Main Controls Row on Mobile / 3-Group Container on Desktop */}
          <div className="w-full md:w-auto flex items-center justify-between gap-2 md:gap-4 flex-1">
            {/* LEFT GROUP: Small Album Thumbnail, Title, Artist & Favorite */}
            <div className="flex items-center gap-2 sm:gap-3.5 min-w-0 max-w-[140px] sm:max-w-[200px] md:max-w-xs shrink-0">
              <div className="relative w-9 h-9 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-[#141122] border border-[#302744] shrink-0 shadow-md">
                {artworkUrl ? (
                  <img src={artworkUrl} alt={currentSong.title} className="w-full h-full object-cover" />
                ) : (
                  <Disc className="w-5 h-5 text-[#A99DBE] m-auto mt-2" />
                )}
                {isPlaying && (
                  <div className="absolute inset-0 border border-[#A78BFA]/50 rounded-xl pointer-events-none" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-sm font-bold text-[#F8F5FF] truncate">
                  {currentSong.title}
                </h3>
                <p className="text-[10px] sm:text-xs text-[#C2B5D9] truncate mt-0.5">
                  {currentSong.artist}
                </p>
              </div>

              <button
                onClick={() => toggleFavorite(currentSong.id)}
                className="hidden sm:block p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-all active:scale-90 shrink-0"
                title={currentSong.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  className={`w-4 h-4 ${
                    currentSong.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-[#A99DBE]'
                  }`}
                />
              </button>
            </div>

            {/* CENTER GROUP: Playback Controls & Desktop Scrubber Timeline */}
            <div className="flex-1 max-w-xl md:mx-4 flex flex-col items-center justify-center gap-1.5">
              {/* Controls row */}
              <div className="flex items-center gap-3 sm:gap-5 md:gap-6">
                <button
                  onClick={toggleShuffle}
                  className={`p-1.5 rounded-lg transition-colors ${
                    shuffle ? 'text-[#D8B4FE]' : 'text-[#A99DBE] hover:text-[#F8F5FF]'
                  }`}
                  title="Shuffle"
                >
                  <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>

                <button
                  onClick={prevTrack}
                  className="p-1 text-[#C2B5D9] hover:text-[#F8F5FF] transition-transform active:scale-90"
                  title="Previous Track"
                >
                  <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {/* Large Circular Play / Pause Button */}
                <button
                  onClick={togglePlay}
                  className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-[#A78BFA] hover:bg-[#D8B4FE] text-[#090812] flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(167,139,250,0.5)] cursor-pointer"
                  title={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={nextTrack}
                  className="p-1 text-[#C2B5D9] hover:text-[#F8F5FF] transition-transform active:scale-90"
                  title="Next Track"
                >
                  <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <button
                  onClick={toggleRepeat}
                  className={`p-1.5 rounded-lg transition-colors ${
                    repeat !== 'off' ? 'text-[#D8B4FE]' : 'text-[#A99DBE] hover:text-[#F8F5FF]'
                  }`}
                  title={`Repeat: ${repeat}`}
                >
                  {repeat === 'one' ? (
                    <Repeat1 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  ) : (
                    <Repeat className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  )}
                </button>
              </div>

              {/* Desktop-only Scrubber Timeline */}
              <div className="hidden md:flex w-full items-center gap-3">
                <span className="text-[11px] font-mono text-[#A99DBE] w-10 text-right">
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
                    className="w-full cursor-pointer accent-[#A78BFA] h-1.5 hover:h-2 transition-all rounded-full"
                  />
                </div>
                <span className="text-[11px] font-mono text-[#A99DBE] w-10 text-left">
                  {formatDuration(duration)}
                </span>
              </div>
            </div>

            {/* RIGHT GROUP: Volume, Speed & Quick Shortcuts */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              {/* Mobile Favorite button */}
              <button
                onClick={() => toggleFavorite(currentSong.id)}
                className="sm:hidden p-1.5 rounded-full hover:bg-white/10 text-[#A99DBE] hover:text-white transition-all active:scale-90"
                title={currentSong.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart
                  className={`w-4 h-4 ${
                    currentSong.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-[#A99DBE]'
                  }`}
                />
              </button>

              {/* Playback Speed Pill */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl bg-[#141122] hover:bg-[#2A2140] border border-[#302744] text-xs font-mono font-semibold text-[#C2B5D9] hover:text-[#F8F5FF] transition-colors"
                  title="Playback Speed"
                >
                  <Gauge className="w-3.5 h-3.5 text-[#A78BFA]" />
                  <span>{playbackRate}x</span>
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full mb-2 right-0 p-1.5 rounded-2xl bg-[#171326] border border-[#302744] shadow-2xl flex flex-col gap-1 z-50">
                    {speedOptions.map(s => (
                      <button
                        key={s}
                        onClick={() => {
                          setPlaybackRate(s);
                          setShowSpeedMenu(false);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors text-left ${
                          playbackRate === s
                            ? 'bg-[#A78BFA] text-[#090812] font-bold'
                            : 'text-[#C2B5D9] hover:text-[#F8F5FF] hover:bg-[#2A2140]'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Volume Slider with Mute (Desktop only) */}
              <div className="hidden lg:flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-[#A99DBE] hover:text-[#F8F5FF] transition-colors p-1"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : volume}
                  onChange={e => setVolume(parseFloat(e.target.value))}
                  className="w-16 sm:w-20 accent-[#A78BFA] h-1"
                />
              </div>

              {/* Queue Quick Toggle */}
              <button
                onClick={() => setActiveTab(activeTab === 'queue' ? 'turntable' : 'queue')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                  activeTab === 'queue'
                    ? 'bg-[#A78BFA] text-[#090812] border-transparent shadow-[0_0_12px_rgba(167,139,250,0.35)]'
                    : 'bg-[#141122] hover:bg-[#2A2140] text-[#C2B5D9] border-[#302744] hover:text-[#F8F5FF]'
                }`}
                title="Queue"
              >
                <ListMusic className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-mono">{upcomingQueue.length}</span>
              </button>
            </div>
          </div>
        </footer>
      </motion.div>
    </AnimatePresence>
  );
}
