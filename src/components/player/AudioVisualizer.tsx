'use client';

import React, { useEffect, useRef } from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { VisualizerMode } from '@/types/music';

interface AudioVisualizerProps {
  mode?: VisualizerMode;
  className?: string;
  accentColor?: string;
}

export function AudioVisualizer({ mode = 'bars', className = '', accentColor = '#1ED760' }: AudioVisualizerProps) {
  const { getFrequencyData, getTimeDomainData, isPlaying } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let pulseAngle = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const freqData = getFrequencyData();
      const timeData = getTimeDomainData();

      // If audio is paused or no audio engine connected, draw gentle idle wave
      if (!isPlaying || !freqData) {
        pulseAngle += 0.03;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x < width; x += 4) {
          const y = height / 2 + Math.sin(x * 0.03 + pulseAngle) * 8;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      if (mode === 'bars') {
        const barCount = 48;
        const barWidth = Math.max(2, (width / barCount) - 3);
        const step = Math.floor(freqData.length / barCount);

        for (let i = 0; i < barCount; i++) {
          const val = freqData[i * step] || 0;
          const barHeight = Math.max(3, (val / 255) * height * 0.9);
          const x = i * (barWidth + 3);
          const y = height - barHeight;

          // Gradient from accent to lighter tint
          const grad = ctx.createLinearGradient(x, height, x, y);
          grad.addColorStop(0, accentColor);
          grad.addColorStop(1, 'rgba(255, 255, 255, 0.9)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, 3);
          ctx.fill();
        }
      } else if (mode === 'wave') {
        const buffer = timeData || freqData;
        const sliceWidth = width / buffer.length;

        ctx.lineWidth = 3;
        const grad = ctx.createLinearGradient(0, 0, width, 0);
        grad.addColorStop(0, accentColor);
        grad.addColorStop(0.5, '#60A5FA');
        grad.addColorStop(1, accentColor);
        ctx.strokeStyle = grad;
        ctx.beginPath();

        let x = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = buffer[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else if (mode === 'circle') {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(centerX, centerY) * 0.45;
        const count = 64;
        const step = Math.floor(freqData.length / count);

        pulseAngle += 0.01;

        for (let i = 0; i < count; i++) {
          const val = freqData[i * step] || 0;
          const barLen = (val / 255) * (radius * 0.85) + 4;
          const angle = (i / count) * Math.PI * 2 + pulseAngle;

          const x1 = centerX + Math.cos(angle) * radius;
          const y1 = centerY + Math.sin(angle) * radius;
          const x2 = centerX + Math.cos(angle) * (radius + barLen);
          const y2 = centerY + Math.sin(angle) * (radius + barLen);

          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      } else if (mode === 'pulse') {
        // Average energy
        let sum = 0;
        for (let i = 0; i < 32; i++) sum += freqData[i];
        const avg = sum / 32;
        const radius = 30 + (avg / 255) * 60;

        const centerX = width / 2;
        const centerY = height / 2;

        const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, radius);
        grad.addColorStop(0, accentColor);
        grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.4)');
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, mode, accentColor, getFrequencyData, getTimeDomainData]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={120}
      className={`w-full h-full block ${className}`}
    />
  );
}
