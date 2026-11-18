'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { getArtworkObjectUrl } from '@/lib/db';
import { AudioVisualizer } from './AudioVisualizer';
import { VisualizerMode } from '@/types/music';
import {
  Play,
  Pause,
  Disc,
  Heart,
  Activity,
  BarChart3,
  Waves,
  Sparkles,
  Radio,
  Sliders,
  ListMusic,
  Volume2,
  VolumeX,
  Gauge,
  Flame,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function TurntableStudioStage() {
  const {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    togglePlay,
    toggleFavorite,
    visualizerMode,
    setVisualizerMode,
    getFrequencyData,
    queue,
    queueIndex,
    playSong,
  } = usePlayer();

  const [turntableSpeed, setTurntableSpeed] = useState<'33' | '45'>('33');
  const [isPowerOn, setIsPowerOn] = useState(true);
  const [bassEnergy, setBassEnergy] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  // Audio-reactive bass energy for subtle stylus needle micro-bounce & ambient glow
  useEffect(() => {
    let active = true;
    const updateVibe = () => {
      if (!active) return;
      if (isPlaying) {
        const freq = getFrequencyData();
        if (freq && freq.length > 8) {
          const bass = (freq[0] + freq[1] + freq[2] + freq[3]) / 4;
          setBassEnergy(bass / 255);
        }
      } else {
        setBassEnergy(0);
      }
      animFrameRef.current = requestAnimationFrame(updateVibe);
    };
    animFrameRef.current = requestAnimationFrame(updateVibe);
    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, getFrequencyData]);

  // Track & Artwork details
  const artworkUrl = currentSong ? getArtworkObjectUrl(currentSong) : null;
  const isFav = currentSong?.isFavorite || false;
  const activeTitle = currentSong?.title || 'No Track Selected';
  const activeArtist = currentSong?.artist || 'Sonora Studio';
  const activeAlbum = currentSong?.album || 'Master Hi-Fi Collection';
  const activeYear = currentSong?.year;

  // Next up in queue
  const nextTrackInQueue = queue[queueIndex + 1] || null;
  const nextTrackArtwork = nextTrackInQueue ? getArtworkObjectUrl(nextTrackInQueue) : null;

  // Tonearm tracking: advances across the vinyl record as playback progresses
  const progressRatio = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0.2;
  const tonearmAngle = useMemo(() => {
    if (!isPlaying || !isPowerOn) return 7; // Parked on arm rest
    // Glide from lead-in groove (20°) to run-out groove (34°) with slight bass audio-reactive jiggle
    return 20 + progressRatio * 14 + bassEnergy * 0.4;
  }, [isPlaying, isPowerOn, progressRatio, bassEnergy]);

  const rotationDuration = turntableSpeed === '33' ? 1.8 : 1.33;

  const visualizerModes: { id: VisualizerMode; label: string; icon: React.ElementType }[] = [
    { id: 'bars', label: 'Bars', icon: BarChart3 },
    { id: 'wave', label: 'Wave', icon: Waves },
    { id: 'radial', label: 'Radial', icon: Disc },
    { id: 'aura', label: 'Aura', icon: Sparkles },
  ];

  return (
    <div className="w-full h-full max-w-[1450px] mx-auto px-4 sm:px-8 py-4 flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-10 min-h-0 overflow-y-auto lg:overflow-hidden">
      {/* ========================================================= */}
      {/* LEFT SECTION: TURNTABLE & NOW PLAYING (~46% width)         */}
      {/* ========================================================= */}
      <section className="w-full lg:w-[46%] max-w-[540px] flex flex-col items-center justify-center shrink-0">
        {/* PHYSICAL TURNTABLE PLINTH */}
        <div
          className="relative w-full rounded-[32px] p-5 sm:p-7 border border-white/[0.12] shadow-[0_24px_60px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)]"
          style={{
            background: 'linear-gradient(165deg, #181A22 0%, #12141A 50%, #0A0B0E 100%)',
          }}
        >
          {/* Subtle top edge metallic chamfer reflection */}
          <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none" />

          {/* TURNTABLE HEADER STATUS ROW */}
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1ED760] shadow-[0_0_10px_#1ED760] animate-pulse" />
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-white/90">
                DIRECT DRIVE • QUARTZ LOCK
              </span>
            </div>

            {/* Playing Status Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[10px] font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPlaying && isPowerOn ? 'bg-[#1ED760] animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className={isPlaying && isPowerOn ? 'text-[#1ED760] font-bold' : 'text-zinc-400'}>
                {isPlaying && isPowerOn ? `${turntableSpeed} RPM PLAYING` : 'PAUSED'}
              </span>
            </div>
          </div>

          {/* CIRCULAR PLATTER & ROTATING VINYL ASSEMBLY */}
          <div className="relative w-full aspect-square max-w-[380px] mx-auto flex items-center justify-center">
            {/* Outer Cast Aluminum Platter Rim with Strobe Dots */}
            <div
              className="absolute inset-0 rounded-full border-4 border-zinc-700/80 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black shadow-2xl flex items-center justify-center pointer-events-none"
              style={{
                boxShadow: '0 16px 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(255,255,255,0.06)',
              }}
            >
              {/* Precision strobe markings ring */}
              <div className="absolute inset-1.5 rounded-full border border-dashed border-zinc-500/40 opacity-70" />
              <div className="absolute inset-3 rounded-full border border-zinc-800" />
            </div>

            {/* THE ROTATING VINYL RECORD */}
            <motion.div
              animate={{
                rotate: isPlaying && isPowerOn ? 360 : 0,
              }}
              transition={{
                rotate:
                  isPlaying && isPowerOn
                    ? { repeat: Infinity, duration: rotationDuration, ease: 'linear' }
                    : { duration: 1.4, ease: 'easeOut' },
              }}
              onClick={togglePlay}
              className="relative w-[92%] h-[92%] rounded-full bg-[#08090C] border-2 border-zinc-950 flex items-center justify-center cursor-pointer shadow-2xl group"
              title={isPlaying ? 'Click vinyl to pause' : 'Click vinyl to play'}
              style={{
                boxShadow:
                  '0 20px 45px -5px rgba(0,0,0,0.95), inset 0 0 30px rgba(0,0,0,0.95)',
              }}
            >
              {/* Anisotropic Light Sheen (Specular Beam Reflections) */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none opacity-45"
                style={{
                  background:
                    'conic-gradient(from 45deg, transparent 0deg, rgba(255,255,255,0.15) 35deg, transparent 70deg, transparent 180deg, rgba(255,255,255,0.15) 215deg, transparent 250deg)',
                }}
              />

              {/* Realistic Concentric Vinyl Grooves */}
              <div className="absolute inset-2 rounded-full border border-white/[0.04] pointer-events-none" />
              <div className="absolute inset-5 rounded-full border border-white/[0.03] pointer-events-none" />
              <div className="absolute inset-8 rounded-full border border-white/[0.04] pointer-events-none" />
              <div className="absolute inset-11 rounded-full border border-white/[0.03] pointer-events-none" />
              <div className="absolute inset-14 rounded-full border border-white/[0.04] pointer-events-none" />
              <div className="absolute inset-17 rounded-full border border-white/[0.03] pointer-events-none" />
              <div className="absolute inset-20 rounded-full border border-white/[0.04] pointer-events-none" />
              <div className="absolute inset-24 rounded-full border border-white/[0.05] pointer-events-none" />

              {/* Run-out groove */}
              <div className="absolute inset-28 rounded-full border-2 border-zinc-800/80 pointer-events-none" />

              {/* PROMINENT CENTER ALBUM ARTWORK DISC LABEL */}
              <div
                className="relative w-36 sm:w-42 h-36 sm:h-42 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl bg-zinc-950 flex items-center justify-center"
                style={{
                  boxShadow:
                    '0 0 25px rgba(0,0,0,0.9), inset 0 0 10px rgba(0,0,0,0.8), 0 0 15px rgba(30,215,96,0.2)',
                }}
              >
                {artworkUrl ? (
                  <img
                    src={artworkUrl}
                    alt={activeTitle}
                    className="w-full h-full object-cover select-none transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex flex-col items-center justify-center p-2 text-center">
                    <Disc className="w-10 h-10 text-[#1ED760] opacity-80 mb-1" />
                    <span className="text-[9px] font-bold tracking-widest uppercase text-white/90">
                      SONORA HI-FI
                    </span>
                  </div>
                )}

                {/* Circular Center Label Specular Gloss */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/20 pointer-events-none" />

                {/* Precision Center Metallic Spindle */}
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-zinc-300 via-white to-zinc-400 border border-zinc-800 absolute z-20 shadow-md flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#08080A]" />
                </div>
              </div>
            </motion.div>

            {/* AUTHENTIC TONEARM ASSEMBLY (Top Right Mount) */}
            <div className="absolute -top-2 -right-3 w-28 h-56 pointer-events-none z-20">
              {/* Tonearm Base / Gimbal Ring */}
              <div className="absolute top-2 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-zinc-600 via-zinc-800 to-zinc-950 border-2 border-zinc-500 shadow-xl flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-600 shadow-inner flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#1ED760]/70" />
                </div>
              </div>

              {/* S-Shaped Aluminum Tonearm Tube */}
              <motion.div
                animate={{
                  rotate: tonearmAngle,
                }}
                transition={{
                  type: 'spring',
                  damping: 24,
                  stiffness: 90,
                }}
                style={{
                  transformOrigin: '20px 20px',
                }}
                className="absolute top-2 right-4 w-10 h-56"
              >
                {/* Metallic Tube */}
                <div
                  className="w-1.5 h-44 bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-500 rounded-full shadow-lg ml-4"
                  style={{
                    boxShadow: '2px 4px 10px rgba(0,0,0,0.85)',
                  }}
                />

                {/* Headshell & Stylus Cartridge */}
                <div className="absolute bottom-6 left-0.5 flex flex-col items-center">
                  <div className="w-4.5 h-7 bg-zinc-900 rounded-t-sm border border-zinc-600 shadow-xl flex flex-col items-center justify-between p-0.5">
                    <span className="text-[5px] font-mono text-zinc-400">SONORA</span>
                    <div className="w-2.5 h-1.5 bg-[#1ED760] rounded-b-xs shadow-[0_0_6px_#1ED760]" />
                  </div>
                  {/* Needle tip */}
                  <div className="w-0.5 h-2 bg-zinc-300" />
                  {/* Stylus Target Light */}
                  <div
                    className={`w-2 h-2 rounded-full filter blur-[0.5px] transition-all duration-300 ${
                      isPlaying && isPowerOn
                        ? 'bg-[#1ED760] shadow-[0_0_10px_#1ED760]'
                        : 'bg-zinc-600 opacity-30'
                    }`}
                  />
                </div>
              </motion.div>
            </div>
          </div>

          {/* TURNTABLE HARDWARE CONTROLS ROW */}
          <div className="mt-4 pt-4 border-t border-white/[0.08] flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPowerOn(!isPowerOn)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 hover:border-zinc-500 text-xs font-mono font-semibold transition-all active:scale-95"
                title="Direct-Drive Platter Motor Switch"
              >
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isPowerOn ? 'bg-[#1ED760] shadow-[0_0_8px_#1ED760]' : 'bg-rose-500'
                  }`}
                />
                <span className="text-zinc-300 text-[11px]">
                  {isPowerOn ? 'MOTOR ON' : 'STOPPED'}
                </span>
              </button>

              <button
                onClick={() => setTurntableSpeed(turntableSpeed === '33' ? '45' : '33')}
                className="px-2.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-700/80 hover:border-zinc-500 text-[11px] font-mono font-bold text-zinc-300 transition-all active:scale-95"
                title="Toggle RPM Speed"
              >
                {turntableSpeed} RPM
              </button>
            </div>

            {/* Favorite button on Plinth */}
            <button
              onClick={() => currentSong && toggleFavorite(currentSong.id)}
              className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-700/80 hover:border-zinc-500 text-zinc-400 hover:text-white transition-all active:scale-90"
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`w-4 h-4 ${
                  isFav ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'
                }`}
              />
            </button>
          </div>
        </div>

        {/* SONG INFORMATION & STUDIO METADATA HIERARCHY */}
        <div className="mt-4 w-full text-center px-2">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate drop-shadow-md">
            {activeTitle}
          </h1>
          <p className="text-sm font-semibold text-[#A1A1AA] mt-1 truncate">
            {activeArtist}
          </p>
          <p className="text-xs text-white/50 font-mono mt-0.5 truncate">
            {activeAlbum} {activeYear ? `• ${activeYear}` : ''}
          </p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* RIGHT SECTION: AUDIO EXPERIENCE & VISUALIZER (~54% width)  */}
      {/* ========================================================= */}
      <section className="w-full lg:w-[54%] max-w-[660px] flex flex-col gap-4 h-full min-h-0 justify-center">
        {/* 1. DEDICATED AUDIO SPECTRUM VISUALIZER CARD */}
        <div className="p-5 sm:p-6 rounded-[28px] bg-[#12141C]/85 backdrop-blur-2xl border border-white/[0.1] shadow-2xl flex flex-col">
          {/* Card Header & Visualizer Mode Switchers */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#1ED760]" />
              <h2 className="text-xs uppercase font-extrabold tracking-widest text-white">
                Live Audio Spectrum Analyser
              </h2>
            </div>

            {/* 4 Mode switcher buttons */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#090A0E] border border-white/10">
              {visualizerModes.map(m => {
                const Icon = m.icon;
                const isActive = visualizerMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setVisualizerMode(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#1ED760] text-[#08090B] font-bold shadow-md'
                        : 'text-[#A1A1AA] hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visualizer Canvas Stage */}
          <div className="relative w-full h-48 sm:h-56 mt-4 rounded-2xl bg-[#07080B] border border-white/[0.06] flex items-center justify-center overflow-hidden">
            <AudioVisualizer
              mode={visualizerMode}
              accentColor="#1ED760"
              secondaryColor="#38BDF8"
            />
          </div>
        </div>

        {/* 2. STUDIO TELEMETRY & HARDWARE AUDIO METRICS */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#12141C]/80 border border-white/[0.08] backdrop-blur-xl flex flex-col">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">AUDIO ENGINE</span>
            <span className="text-xs font-bold text-white mt-1 flex items-center gap-1.5 truncate">
              <Radio className="w-3 h-3 text-[#1ED760]" />
              DSP ANALOG PHONO
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#12141C]/80 border border-white/[0.08] backdrop-blur-xl flex flex-col">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">FIDELITY</span>
            <span className="text-xs font-bold text-white mt-1 truncate">
              320 KBPS MASTER
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#12141C]/80 border border-white/[0.08] backdrop-blur-xl flex flex-col">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">RESOLUTION</span>
            <span className="text-xs font-bold text-white mt-1 truncate">
              24-BIT / 48.0 kHz
            </span>
          </div>
        </div>

        {/* 3. UP NEXT QUEUE STRIP PREVIEW */}
        {nextTrackInQueue ? (
          <div
            onClick={() => playSong(nextTrackInQueue)}
            className="group p-3 sm:p-3.5 rounded-2xl bg-[#12141C]/70 hover:bg-[#12141C] border border-white/[0.08] hover:border-[#1ED760]/30 transition-all cursor-pointer flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0 relative">
                {nextTrackArtwork ? (
                  <img src={nextTrackArtwork} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Disc className="w-5 h-5 text-zinc-500 m-auto mt-2.5" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase text-[#1ED760] font-bold tracking-wider">
                  UP NEXT
                </span>
                <p className="text-xs font-bold text-white truncate">{nextTrackInQueue.title}</p>
                <p className="text-[11px] text-[#A1A1AA] truncate">{nextTrackInQueue.artist}</p>
              </div>
            </div>

            <span className="text-xs font-semibold text-[#1ED760] group-hover:underline pl-2 shrink-0">
              Play Now →
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-[#12141C]/50 border border-white/[0.06] text-center">
            <p className="text-xs text-zinc-500 font-mono">End of active queue • Add tracks from library</p>
          </div>
        )}
      </section>
    </div>
  );
}
