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

  // Audio-reactive bass energy for subtle stylus needle micro-bounce (throttled for mobile 60fps performance)
  useEffect(() => {
    let active = true;
    let lastTime = 0;
    const updateVibe = (now: number) => {
      if (!active) return;
      if (isPlaying) {
        if (now - lastTime > 120) {
          lastTime = now;
          const freq = getFrequencyData();
          if (freq && freq.length > 8) {
            const bass = (freq[0] + freq[1] + freq[2] + freq[3]) / 4;
            setBassEnergy(bass / 255);
          }
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
          className="relative w-full rounded-[32px] p-5 sm:p-7 border border-[#302744] shadow-[0_24px_60px_rgba(9,8,18,0.95),inset_0_1px_1px_rgba(216,180,254,0.15)] overflow-hidden"
          style={{
            background: 'linear-gradient(165deg, #211A32 0%, #171326 50%, #090812 100%)',
          }}
        >
          {/* Subtle purple ambient gradient around the turntable */}
          <div className="absolute inset-0 rounded-[32px] bg-[radial-gradient(circle_at_center,rgba(167,139,250,0.15)_0%,rgba(124,58,237,0.05)_50%,transparent_75%)] pointer-events-none" />

          {/* Subtle top edge metallic chamfer reflection */}
          <div className="absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#D8B4FE]/30 to-transparent pointer-events-none" />

          {/* TURNTABLE HEADER STATUS ROW */}
          <div className="flex items-center justify-between mb-4 px-1 relative z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#A78BFA] shadow-[0_0_10px_#A78BFA] animate-pulse" />
              <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-[#F8F5FF]/90">
                DIRECT DRIVE • QUARTZ LOCK
              </span>
            </div>

            {/* Playing Status Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141122]/90 border border-[#302744] text-[10px] font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPlaying && isPowerOn ? 'bg-[#A78BFA] shadow-[0_0_8px_#A78BFA] animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className={isPlaying && isPowerOn ? 'text-[#D8B4FE] font-bold' : 'text-[#A99DBE]'}>
                {isPlaying && isPowerOn ? `${turntableSpeed} RPM PLAYING` : 'PAUSED'}
              </span>
            </div>
          </div>

          {/* CIRCULAR PLATTER & ROTATING VINYL ASSEMBLY */}
          <div className="relative w-full aspect-square max-w-[380px] mx-auto flex items-center justify-center">
            {/* Outer Cast Aluminum Platter Rim with Strobe Dots */}
            <div
              className="absolute inset-0 rounded-full border-4 border-zinc-700/80 bg-gradient-to-br from-[#1C162E] via-[#120F1F] to-[#090812] shadow-2xl flex items-center justify-center pointer-events-none"
              style={{
                boxShadow: '0 16px 40px rgba(9,8,18,0.95), inset 0 0 20px rgba(167,139,250,0.08)',
              }}
            >
              {/* Precision strobe markings ring */}
              <div className="absolute inset-1.5 rounded-full border border-dashed border-[#A78BFA]/30 opacity-60" />
              <div className="absolute inset-3 rounded-full border border-[#302744]" />
            </div>

            {/* THE ROTATING VINYL RECORD (Deep Charcoal with Elegant Purple Reflections) */}
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
              className="relative w-[92%] h-[92%] rounded-full bg-[#0C0B14] border-2 border-[#1F1930] flex items-center justify-center cursor-pointer shadow-2xl group"
              title={isPlaying ? 'Click vinyl to pause' : 'Click vinyl to play'}
              style={{
                boxShadow:
                  '0 20px 45px -5px rgba(9,8,18,0.98), inset 0 0 30px rgba(0,0,0,0.95)',
              }}
            >
              {/* Elegant Purple Specular Reflections */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none opacity-50"
                style={{
                  background:
                    'conic-gradient(from 45deg, transparent 0deg, rgba(216, 180, 254, 0.18) 35deg, transparent 70deg, transparent 180deg, rgba(167, 139, 250, 0.22) 215deg, transparent 250deg)',
                }}
              />

              {/* Realistic Concentric Vinyl Grooves */}
              <div className="absolute inset-2 rounded-full border border-white/[0.04] pointer-events-none" />
              <div className="absolute inset-5 rounded-full border border-[#A78BFA]/[0.04] pointer-events-none" />
              <div className="absolute inset-8 rounded-full border border-white/[0.04] pointer-events-none" />
              <div className="absolute inset-11 rounded-full border border-[#A78BFA]/[0.03] pointer-events-none" />
              <div className="absolute inset-14 rounded-full border border-white/[0.04] pointer-events-none" />
              <div className="absolute inset-17 rounded-full border border-[#A78BFA]/[0.03] pointer-events-none" />
              <div className="absolute inset-20 rounded-full border border-white/[0.04] pointer-events-none" />
              <div className="absolute inset-24 rounded-full border border-[#A78BFA]/[0.05] pointer-events-none" />

              {/* Run-out groove */}
              <div className="absolute inset-28 rounded-full border-2 border-[#251D38] pointer-events-none" />

              {/* PROMINENT CENTER ALBUM ARTWORK DISC LABEL WITH LAVENDER GLOW */}
              <div
                className="relative w-36 sm:w-42 h-36 sm:h-42 rounded-full overflow-hidden border-2 border-[#A78BFA]/40 shadow-2xl bg-zinc-950 flex items-center justify-center"
                style={{
                  boxShadow:
                    '0 0 25px rgba(9,8,18,0.95), inset 0 0 10px rgba(0,0,0,0.8), 0 0 20px rgba(167,139,250,0.35)',
                }}
              >
                {artworkUrl ? (
                  <img
                    src={artworkUrl}
                    alt={activeTitle}
                    className="w-full h-full object-cover select-none transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#211A32] to-[#090812] flex flex-col items-center justify-center p-2 text-center">
                    <Disc className="w-10 h-10 text-[#A78BFA] opacity-90 mb-1" />
                    <span className="text-[9px] font-bold tracking-widest uppercase text-[#F8F5FF]">
                      SONORA HI-FI
                    </span>
                  </div>
                )}

                {/* Circular Center Label Specular Gloss */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-[#D8B4FE]/20 pointer-events-none" />

                {/* Precision Center Metallic Spindle */}
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-zinc-300 via-white to-zinc-400 border border-zinc-800 absolute z-20 shadow-md flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#090812]" />
                </div>
              </div>
            </motion.div>

            {/* AUTHENTIC TONEARM ASSEMBLY (Top Right Mount) */}
            <div className="absolute -top-2 -right-3 w-28 h-56 pointer-events-none z-20">
              {/* Tonearm Base / Gimbal Ring */}
              <div className="absolute top-2 right-4 w-12 h-12 rounded-full bg-gradient-to-br from-zinc-600 via-zinc-800 to-zinc-950 border-2 border-[#302744] shadow-xl flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-600 shadow-inner flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#A78BFA]/80 shadow-[0_0_6px_#A78BFA]" />
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
                  <div className="w-4.5 h-7 bg-[#211A32] rounded-t-sm border border-[#302744] shadow-xl flex flex-col items-center justify-between p-0.5">
                    <span className="text-[5px] font-mono text-[#D8B4FE]">SONORA</span>
                    <div className="w-2.5 h-1.5 bg-[#A78BFA] rounded-b-xs shadow-[0_0_6px_#A78BFA]" />
                  </div>
                  {/* Needle tip */}
                  <div className="w-0.5 h-2 bg-zinc-300" />
                  {/* Stylus Target Light */}
                  <div
                    className={`w-2 h-2 rounded-full filter blur-[0.5px] transition-all duration-300 ${
                      isPlaying && isPowerOn
                        ? 'bg-[#A78BFA] shadow-[0_0_10px_#A78BFA]'
                        : 'bg-zinc-600 opacity-30'
                    }`}
                  />
                </div>
              </motion.div>
            </div>
          </div>

          {/* TURNTABLE HARDWARE CONTROLS ROW */}
          <div className="mt-4 pt-4 border-t border-[#302744] flex items-center justify-between px-1 relative z-10">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPowerOn(!isPowerOn)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#141122] border border-[#302744] hover:border-[#A78BFA]/50 text-xs font-mono font-semibold transition-all active:scale-95"
                title="Direct-Drive Platter Motor Switch"
              >
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isPowerOn ? 'bg-[#A78BFA] shadow-[0_0_8px_#A78BFA]' : 'bg-rose-500'
                  }`}
                />
                <span className="text-[#C2B5D9] text-[11px]">
                  {isPowerOn ? 'MOTOR ON' : 'STOPPED'}
                </span>
              </button>

              <button
                onClick={() => setTurntableSpeed(turntableSpeed === '33' ? '45' : '33')}
                className="px-2.5 py-1.5 rounded-xl bg-[#141122] border border-[#302744] hover:border-[#A78BFA]/50 text-[11px] font-mono font-bold text-[#D8B4FE] transition-all active:scale-95"
                title="Toggle RPM Speed"
              >
                {turntableSpeed} RPM
              </button>
            </div>

            {/* Favorite button on Plinth */}
            <button
              onClick={() => currentSong && toggleFavorite(currentSong.id)}
              className="p-2 rounded-xl bg-[#141122] border border-[#302744] hover:border-[#A78BFA]/50 text-[#A99DBE] hover:text-[#F8F5FF] transition-all active:scale-90"
              title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Heart
                className={`w-4 h-4 ${
                  isFav ? 'fill-rose-500 text-rose-500' : 'text-[#A99DBE]'
                }`}
              />
            </button>
          </div>
        </div>

        {/* SONG INFORMATION & STUDIO METADATA HIERARCHY */}
        <div className="mt-4 w-full text-center px-2">
          <h1 className="text-xl sm:text-2xl font-black text-[#F8F5FF] tracking-tight truncate drop-shadow-md">
            {activeTitle}
          </h1>
          <p className="text-sm font-semibold text-[#D8B4FE] mt-1 truncate">
            {activeArtist}
          </p>
          <p className="text-xs text-[#A99DBE] font-mono mt-0.5 truncate">
            {activeAlbum} {activeYear ? `• ${activeYear}` : ''}
          </p>
        </div>
      </section>

      {/* ========================================================= */}
      {/* RIGHT SECTION: AUDIO EXPERIENCE & VISUALIZER (~54% width)  */}
      {/* ========================================================= */}
      <section className="w-full lg:w-[54%] max-w-[660px] flex flex-col gap-4 h-full min-h-0 justify-center">
        {/* 1. DEDICATED AUDIO SPECTRUM VISUALIZER CARD */}
        <div className="p-5 sm:p-6 rounded-[28px] bg-[#171326]/90 backdrop-blur-2xl border border-[#302744] shadow-2xl flex flex-col">
          {/* Card Header & Visualizer Mode Switchers */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#302744]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#A78BFA]" />
              <h2 className="text-xs uppercase font-extrabold tracking-widest text-[#F8F5FF]">
                Live Audio Spectrum Analyser
              </h2>
            </div>

            {/* 4 Mode switcher buttons */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#141122] border border-[#302744]">
              {visualizerModes.map(m => {
                const Icon = m.icon;
                const isActive = visualizerMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setVisualizerMode(m.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-[#A78BFA] text-[#090812] font-bold shadow-md shadow-[#A78BFA]/30'
                        : 'text-[#A99DBE] hover:text-[#F8F5FF]'
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
          <div className="relative w-full h-48 sm:h-56 mt-4 rounded-2xl bg-[#090812] border border-[#302744] flex items-center justify-center overflow-hidden">
            <AudioVisualizer
              mode={visualizerMode}
              accentColor="#A78BFA"
              secondaryColor="#D8B4FE"
            />
          </div>
        </div>

        {/* 2. STUDIO TELEMETRY & HARDWARE AUDIO METRICS */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#171326]/85 border border-[#302744] backdrop-blur-xl flex flex-col">
            <span className="text-[10px] font-mono text-[#A99DBE] uppercase tracking-wider">AUDIO ENGINE</span>
            <span className="text-xs font-bold text-[#F8F5FF] mt-1 flex items-center gap-1.5 truncate">
              <Radio className="w-3 h-3 text-[#A78BFA]" />
              DSP ANALOG PHONO
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#171326]/85 border border-[#302744] backdrop-blur-xl flex flex-col">
            <span className="text-[10px] font-mono text-[#A99DBE] uppercase tracking-wider">FIDELITY</span>
            <span className="text-xs font-bold text-[#F8F5FF] mt-1 truncate">
              320 KBPS MASTER
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-2xl bg-[#171326]/85 border border-[#302744] backdrop-blur-xl flex flex-col">
            <span className="text-[10px] font-mono text-[#A99DBE] uppercase tracking-wider">RESOLUTION</span>
            <span className="text-xs font-bold text-[#F8F5FF] mt-1 truncate">
              24-BIT / 48.0 kHz
            </span>
          </div>
        </div>

        {/* 3. UP NEXT QUEUE STRIP PREVIEW */}
        {nextTrackInQueue ? (
          <div
            onClick={() => playSong(nextTrackInQueue)}
            className="group p-3 sm:p-3.5 rounded-2xl bg-[#171326] hover:bg-[#2A2140] border border-[#302744] hover:border-[#A78BFA]/50 transition-all cursor-pointer flex items-center justify-between shadow-lg"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#141122] border border-[#302744] shrink-0 relative">
                {nextTrackArtwork ? (
                  <img src={nextTrackArtwork} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Disc className="w-5 h-5 text-[#A99DBE] m-auto mt-2.5" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase text-[#A78BFA] font-bold tracking-wider">
                  UP NEXT
                </span>
                <p className="text-xs font-bold text-[#F8F5FF] truncate">{nextTrackInQueue.title}</p>
                <p className="text-[11px] text-[#C2B5D9] truncate">{nextTrackInQueue.artist}</p>
              </div>
            </div>

            <span className="text-xs font-semibold text-[#D8B4FE] group-hover:underline pl-2 shrink-0">
              Play Now →
            </span>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-[#171326]/60 border border-[#302744] text-center">
            <p className="text-xs text-[#A99DBE] font-mono">End of active queue • Add tracks from library</p>
          </div>
        )}
      </section>
    </div>
  );
}
