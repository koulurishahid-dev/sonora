'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { Play, Pause, Activity, Radio, Volume2, Sparkles, Disc, Zap } from 'lucide-react';

export function GlassVisualizerHero() {
  const { currentSong, isPlaying, togglePlay, playSong, queue, getFrequencyData, getTimeDomainData } = usePlayer();
  const [activeVisualizerMode, setActiveVisualizerMode] = useState<'bars' | 'wave' | 'pulse' | 'particles'>('bars');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Peak hold data for bars
  const peakCapsRef = useRef<number[]>([]);
  const peakDecayRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = 200);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = 200;
    };
    window.addEventListener('resize', handleResize);

    const barCount = 48;
    if (peakCapsRef.current.length !== barCount) {
      peakCapsRef.current = new Array(barCount).fill(0);
      peakDecayRef.current = new Array(barCount).fill(0);
    }

    let angle = 0;

    const render = () => {
      angle += 0.03;
      ctx.clearRect(0, 0, width, height);

      const freqData = getFrequencyData();
      const timeData = getTimeDomainData();

      // Synthesize rich beat harmonics if idle or paused
      let effectiveFreq: Uint8Array | number[];
      if (isPlaying && freqData) {
        effectiveFreq = freqData;
      } else {
        const synth = [];
        for (let i = 0; i < 128; i++) {
          const beat = Math.sin(angle * 1.5 + i * 0.15) * 60 + Math.cos(angle * 0.8 - i * 0.08) * 40 + 70;
          synth.push(Math.max(10, Math.min(255, beat)));
        }
        effectiveFreq = synth;
      }

      if (activeVisualizerMode === 'bars') {
        const gap = 4;
        const totalGap = gap * (barCount - 1);
        const barWidth = Math.max(3, (width - totalGap) / barCount);
        const step = Math.floor(effectiveFreq.length / barCount);

        for (let i = 0; i < barCount; i++) {
          const val = effectiveFreq[i * step] || 15;
          const targetHeight = Math.max(6, (val / 255) * (height - 24));
          const x = i * (barWidth + gap);
          const y = height - targetHeight;

          // Peak caps
          if (targetHeight >= (peakCapsRef.current[i] || 0)) {
            peakCapsRef.current[i] = targetHeight;
            peakDecayRef.current[i] = 0;
          } else {
            peakDecayRef.current[i] = (peakDecayRef.current[i] || 0) + 0.35;
            peakCapsRef.current[i] = Math.max(0, peakCapsRef.current[i] - peakDecayRef.current[i]);
          }

          // Dynamic Neon Gradient
          const grad = ctx.createLinearGradient(x, height, x, y);
          const hue = 150 + (i / barCount) * 120; // Emerald to Cyan to Violet
          grad.addColorStop(0, `hsla(${hue}, 90%, 45%, 0.85)`);
          grad.addColorStop(0.6, `hsla(${hue}, 100%, 60%, 0.95)`);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.95)');

          ctx.fillStyle = grad;
          ctx.shadowColor = `hsla(${hue}, 100%, 55%, 0.6)`;
          ctx.shadowBlur = 12;

          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, targetHeight, [4, 4, 1, 1]);
          ctx.fill();

          // Draw Peak Hold Cap
          const capY = height - (peakCapsRef.current[i] || 0) - 3;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
          ctx.shadowBlur = 8;
          ctx.fillRect(x, Math.max(2, capY), barWidth, 2.5);
        }
      } else if (activeVisualizerMode === 'wave') {
        const sliceWidth = width / (effectiveFreq.length || 64);
        ctx.lineWidth = 3.5;

        // Wave Fill Area Gradient
        const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
        fillGrad.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
        fillGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.2)');
        fillGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        const strokeGrad = ctx.createLinearGradient(0, 0, width, 0);
        strokeGrad.addColorStop(0, '#06B6D4');
        strokeGrad.addColorStop(0.5, '#1ED760');
        strokeGrad.addColorStop(1, '#A855F7');

        ctx.strokeStyle = strokeGrad;
        ctx.fillStyle = fillGrad;
        ctx.shadowColor = '#06B6D4';
        ctx.shadowBlur = 16;

        ctx.beginPath();
        let x = 0;
        ctx.moveTo(0, height);

        for (let i = 0; i < effectiveFreq.length; i++) {
          const v = (effectiveFreq[i] || 128) / 255.0;
          const y = height / 2 + (v - 0.5) * height * 0.9;

          if (i === 0) ctx.lineTo(x, y);
          else ctx.lineTo(x, y);

          x += sliceWidth;
        }

        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (activeVisualizerMode === 'pulse') {
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(centerX, centerY) * 0.45;

        let totalEnergy = 0;
        for (let i = 0; i < 32; i++) totalEnergy += effectiveFreq[i] || 0;
        const avgEnergy = totalEnergy / (32 * 255);

        // Multiple concentric pulsating rings
        for (let r = 0; r < 4; r++) {
          const pulseR = baseRadius * (0.6 + r * 0.35) * (1 + avgEnergy * 0.5);
          ctx.beginPath();
          ctx.arc(centerX, centerY, pulseR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(6, 182, 212, ${0.7 - r * 0.16})`;
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#06B6D4';
          ctx.shadowBlur = 15;
          ctx.stroke();
        }

        // Circular Frequency Spikes
        const ringCount = 36;
        for (let i = 0; i < ringCount; i++) {
          const val = effectiveFreq[i * 2] || 20;
          const barLen = (val / 255) * 45 + 5;
          const a = (i / ringCount) * Math.PI * 2 + angle;

          const x1 = centerX + Math.cos(a) * baseRadius;
          const y1 = centerY + Math.sin(a) * baseRadius;
          const x2 = centerX + Math.cos(a) * (baseRadius + barLen);
          const y2 = centerY + Math.sin(a) * (baseRadius + barLen);

          ctx.strokeStyle = '#1ED760';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else {
        // Particles mode
        const pCount = 50;
        for (let i = 0; i < pCount; i++) {
          const val = effectiveFreq[i % effectiveFreq.length] || 30;
          const speed = (val / 255) * 3 + 1;
          const px = (width * 0.5) + Math.cos(angle * speed + i) * (width * 0.4);
          const py = (height * 0.5) + Math.sin(angle * speed * 0.8 + i) * (height * 0.4);
          const pRadius = (val / 255) * 7 + 2;

          ctx.fillStyle = i % 2 === 0 ? '#1ED760' : '#06B6D4';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(px, py, pRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, activeVisualizerMode, getFrequencyData, getTimeDomainData]);

  const handleStartMusic = () => {
    if (isPlaying) {
      togglePlay();
    } else if (currentSong) {
      togglePlay();
    } else if (queue.length > 0) {
      playSong(queue[0]);
    }
  };

  return (
    <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden glass-pure border border-white/12 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
      {/* Specular glassy reflection gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] via-transparent to-black/20 pointer-events-none" />

      {/* Top Header & Mode Switchers */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-[var(--accent)] text-[11px] font-bold uppercase tracking-wider shadow-sm mb-1.5">
            <Radio className="w-3.5 h-3.5 fill-[var(--accent)] animate-pulse" />
            Live Sonic Visualizer Stage
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Dynamic Equalizer & Audio Reactor
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
          </h2>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Real-time multi-frequency spectrum analyser reacting to your private library.
          </p>
        </div>

        {/* Visualizer Mode Switchers (Pure Glass Pills) */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl glass-pure border border-white/10 self-stretch sm:self-auto justify-center">
          {[
            { id: 'bars' as const, label: '48-Ch EQ' },
            { id: 'wave' as const, label: 'Fluid Wave' },
            { id: 'pulse' as const, label: 'Acoustic Pulse' },
            { id: 'particles' as const, label: 'Particles' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => setActiveVisualizerMode(m.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeVisualizerMode === m.id
                  ? 'bg-[var(--accent)] text-black shadow-lg shadow-[var(--accent)]/25 scale-105'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-white/10'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas Display Area */}
      <div className="relative z-10 my-4 h-[200px] w-full flex items-center justify-center">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Bottom Control Bar */}
      <div className="relative z-10 pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Track info or status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl glass-pure flex items-center justify-center border border-white/15 text-[var(--accent)]">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              {currentSong ? currentSong.title : 'Harmonic Engine Ready'}
              {isPlaying && (
                <span className="flex items-end gap-0.5 h-3" title="Playing">
                  <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-1 h-3" />
                  <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-2 h-3" />
                  <span className="w-0.5 bg-[var(--accent)] rounded-full animate-eq-3 h-3" />
                </span>
              )}
            </p>
            <p className="text-[11px] text-[#A1A1AA]">
              {currentSong ? `${currentSong.artist} • ${currentSong.album}` : 'Select any song to witness high-frequency reactivity'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={handleStartMusic}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-2xl bg-[var(--accent)] text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-[var(--accent)]/30"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-black" /> Pause Sonic Stream
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-black ml-0.5" /> {currentSong ? 'Resume Sonic Stream' : 'Play Music Wave'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
