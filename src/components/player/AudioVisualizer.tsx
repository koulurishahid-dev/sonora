'use client';

import React, { useEffect, useRef } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { VisualizerMode } from '@/types/music';

interface AudioVisualizerProps {
  mode?: VisualizerMode;
  className?: string;
  accentColor?: string;
  secondaryColor?: string;
}

export function AudioVisualizer({
  mode = 'bars',
  className = '',
  accentColor = '#1ED760',
  secondaryColor = '#38BDF8',
}: AudioVisualizerProps) {
  const { getFrequencyData, getTimeDomainData, isPlaying } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Physics & smoothing buffers for high performance
  const barValuesRef = useRef<number[]>([]);
  const peakCapsRef = useRef<number[]>([]);
  const peakDecayRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const handleResize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth || 600;
      height = parent.clientHeight || 200;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const barCount = 56;
    if (barValuesRef.current.length !== barCount) {
      barValuesRef.current = new Array(barCount).fill(0);
      peakCapsRef.current = new Array(barCount).fill(0);
      peakDecayRef.current = new Array(barCount).fill(0);
    }

    let rotAngle = 0;
    let waveOffset = 0;

    const render = () => {
      if (!width || !height) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);

      const freqData = getFrequencyData();
      const timeData = getTimeDomainData();

      rotAngle += 0.015;
      waveOffset += 0.03;

      // Extract or synthesize frequencies
      let effectiveFreq: Uint8Array | number[];
      if (isPlaying && freqData && freqData.length > 0) {
        effectiveFreq = freqData;
      } else {
        const synth = [];
        for (let i = 0; i < 128; i++) {
          const val =
            Math.sin(rotAngle * 2 + i * 0.15) * 45 +
            Math.cos(rotAngle * 1.2 - i * 0.09) * 30 +
            55;
          synth.push(Math.max(6, Math.min(255, val)));
        }
        effectiveFreq = synth;
      }

      // Smooth decay on bar values
      const step = Math.max(1, Math.floor(effectiveFreq.length / barCount));
      for (let i = 0; i < barCount; i++) {
        const raw = effectiveFreq[i * step] || 0;
        const current = barValuesRef.current[i] || 0;
        // Fast attack, smooth decay
        if (raw > current) {
          barValuesRef.current[i] = current * 0.4 + raw * 0.6;
        } else {
          barValuesRef.current[i] = current * 0.88;
        }
      }

      // -------------------------------------------------------------
      // MODE A: SPECTRUM BARS (or 'bars')
      // -------------------------------------------------------------
      if (mode === 'bars') {
        const gap = 3.5;
        const totalGap = gap * (barCount - 1);
        const barWidth = Math.max(2, (width - totalGap) / barCount);

        for (let i = 0; i < barCount; i++) {
          const val = barValuesRef.current[i];
          const barHeight = Math.max(4, (val / 255) * height * 0.82);
          const x = i * (barWidth + gap);
          const y = height - barHeight - 4;

          // Peak caps
          if (barHeight >= (peakCapsRef.current[i] || 0)) {
            peakCapsRef.current[i] = barHeight;
            peakDecayRef.current[i] = 0;
          } else {
            peakDecayRef.current[i] = (peakDecayRef.current[i] || 0) + 0.35;
            peakCapsRef.current[i] = Math.max(0, peakCapsRef.current[i] - peakDecayRef.current[i]);
          }

          // Gradient: Neon green -> Soft white
          const grad = ctx.createLinearGradient(x, height, x, y);
          grad.addColorStop(0, accentColor);
          grad.addColorStop(0.65, '#38BDF8');
          grad.addColorStop(1, '#F5F5F5');

          ctx.fillStyle = grad;
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 1, 1]);
          ctx.fill();

          // Peak cap pill
          const capY = height - (peakCapsRef.current[i] || 0) - 6;
          ctx.fillStyle = '#FFFFFF';
          ctx.shadowColor = '#FFFFFF';
          ctx.shadowBlur = 4;
          ctx.beginPath();
          ctx.roundRect(x, Math.max(2, capY), barWidth, 2, [1, 1, 1, 1]);
          ctx.fill();
        }
      }

      // -------------------------------------------------------------
      // MODE B: WAVEFORM (or 'wave')
      // -------------------------------------------------------------
      else if (mode === 'wave') {
        const buffer = isPlaying && timeData ? timeData : effectiveFreq;
        const sliceWidth = width / (buffer.length - 1);

        // Background glow wave
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = accentColor;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 18;
        ctx.beginPath();

        let x = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i] / 128.0;
          const y = (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();

        // Foreground crisp white/cyan ribbon
        ctx.lineWidth = 2;
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.5, '#38BDF8');
        grad.addColorStop(1, accentColor);
        ctx.strokeStyle = grad;
        ctx.shadowBlur = 0;
        ctx.stroke();

        // Mirrored subtle reflection
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        x = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i] / 128.0;
          const y = height - (v * height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
        ctx.restore();
      }

      // -------------------------------------------------------------
      // MODE C: RADIAL (or 'radial' / 'circle')
      // -------------------------------------------------------------
      else if (mode === 'radial' || mode === 'circle') {
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(centerX, centerY) * 0.42;
        const count = 64;
        const fStep = Math.max(1, Math.floor(effectiveFreq.length / count));

        // Pulsing core based on bass
        let bassSum = 0;
        for (let b = 0; b < 12; b++) bassSum += effectiveFreq[b] || 0;
        const bassAvg = bassSum / 12;
        const corePulse = (bassAvg / 255) * 16;

        // Core glow
        const coreGrad = ctx.createRadialGradient(
          centerX,
          centerY,
          0,
          centerX,
          centerY,
          baseRadius * 0.65 + corePulse
        );
        coreGrad.addColorStop(0, `${accentColor}33`);
        coreGrad.addColorStop(0.7, `${secondaryColor}11`);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 0.65 + corePulse, 0, Math.PI * 2);
        ctx.fill();

        // Inner reactive audio ring
        ctx.strokeStyle = `${accentColor}88`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 0.75 + corePulse * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        // Radiating frequency lines
        for (let i = 0; i < count; i++) {
          const val = effectiveFreq[i * fStep] || 0;
          const barLen = (val / 255) * (baseRadius * 0.85) + 4;
          const angle = (i / count) * Math.PI * 2 + rotAngle;

          const x1 = centerX + Math.cos(angle) * baseRadius;
          const y1 = centerY + Math.sin(angle) * baseRadius;
          const x2 = centerX + Math.cos(angle) * (baseRadius + barLen);
          const y2 = centerY + Math.sin(angle) * (baseRadius + barLen);

          ctx.strokeStyle = i % 2 === 0 ? accentColor : '#F5F5F5';
          ctx.lineWidth = 2;
          ctx.shadowColor = accentColor;
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      }

      // -------------------------------------------------------------
      // MODE D: AMBIENT AURA (or 'aura' / 'pulse')
      // -------------------------------------------------------------
      else if (mode === 'aura' || mode === 'pulse') {
        const centerX = width / 2;
        const centerY = height / 2;

        let bassSum = 0;
        let midSum = 0;
        let highSum = 0;
        for (let i = 0; i < 16; i++) bassSum += effectiveFreq[i] || 0;
        for (let i = 16; i < 48; i++) midSum += effectiveFreq[i] || 0;
        for (let i = 48; i < 96; i++) highSum += effectiveFreq[i] || 0;

        const bassIntensity = (bassSum / 16) / 255;
        const midIntensity = (midSum / 32) / 255;
        const highIntensity = (highSum / 48) / 255;

        // Draw 3 layered organic morphing auras
        const maxRadius = Math.min(centerX, centerY) * 0.85;

        // Orb 1: Bass-reactive outer glow
        const r1 = maxRadius * (0.45 + bassIntensity * 0.45);
        const grad1 = ctx.createRadialGradient(
          centerX + Math.cos(rotAngle * 0.8) * 20,
          centerY + Math.sin(rotAngle * 0.8) * 15,
          5,
          centerX,
          centerY,
          r1
        );
        grad1.addColorStop(0, `${accentColor}80`);
        grad1.addColorStop(0.5, `${secondaryColor}40`);
        grad1.addColorStop(1, 'transparent');

        ctx.fillStyle = grad1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r1, 0, Math.PI * 2);
        ctx.fill();

        // Orb 2: Mid-range counter-rotating shape
        const r2 = maxRadius * (0.3 + midIntensity * 0.35);
        const grad2 = ctx.createRadialGradient(
          centerX + Math.sin(-rotAngle * 1.1) * 25,
          centerY + Math.cos(-rotAngle * 1.1) * 20,
          2,
          centerX,
          centerY,
          r2
        );
        grad2.addColorStop(0, '#FFFFFF99');
        grad2.addColorStop(0.6, `${accentColor}55`);
        grad2.addColorStop(1, 'transparent');

        ctx.fillStyle = grad2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r2, 0, Math.PI * 2);
        ctx.fill();

        // Orb 3: High-frequency bright center pulse
        const r3 = 18 + highIntensity * 32;
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 24;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r3, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, mode, accentColor, secondaryColor, getFrequencyData, getTimeDomainData]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full block ${className}`}
    />
  );
}
