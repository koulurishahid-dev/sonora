'use client';

import React, { useEffect, useRef } from 'react';
import { usePlayer } from '@/context/PlayerContext';

interface ParticleNote {
  x: number;
  y: number;
  speedY: number;
  speedX: number;
  symbol: string;
  size: number;
  opacity: number;
  rotation: number;
  rotSpeed: number;
  color: string;
}

export function BackgroundMusicCanvas() {
  const { isPlaying, getFrequencyData, getTimeDomainData } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Dynamic Orbs
    const orbs = [
      { x: width * 0.2, y: height * 0.3, radius: 260, color: 'rgba(6, 182, 212, 0.18)', vx: 0.3, vy: 0.2 },
      { x: width * 0.8, y: height * 0.4, radius: 320, color: 'rgba(139, 92, 246, 0.16)', vx: -0.25, vy: 0.35 },
      { x: width * 0.5, y: height * 0.8, radius: 280, color: 'rgba(30, 215, 96, 0.14)', vx: 0.2, vy: -0.3 },
      { x: width * 0.85, y: height * 0.85, radius: 240, color: 'rgba(236, 72, 153, 0.12)', vx: -0.3, vy: -0.2 },
    ];

    // Floating Music Note Particles
    const symbols = ['♪', '♫', '♬', '♩', '✧', '✦', '𝄞'];
    const colors = [
      'rgba(30, 215, 96, 0.7)',
      'rgba(6, 182, 212, 0.7)',
      'rgba(168, 85, 247, 0.7)',
      'rgba(244, 63, 94, 0.65)',
      'rgba(255, 255, 255, 0.6)',
    ];

    const particles: ParticleNote[] = [];
    const maxParticles = 24;

    for (let i = 0; i < maxParticles; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speedY: 0.4 + Math.random() * 0.9,
        speedX: (Math.random() - 0.5) * 0.5,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        size: 14 + Math.random() * 16,
        opacity: 0.15 + Math.random() * 0.45,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.02,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // 1. Draw Deep Obsidian Glass Canvas Base
      ctx.fillStyle = '#06070B';
      ctx.fillRect(0, 0, width, height);

      // 2. Audio Energy Reactivity
      const freqData = getFrequencyData();
      let bassEnergy = 0;
      let midEnergy = 0;

      if (isPlaying && freqData) {
        let bassSum = 0;
        for (let i = 0; i < 12; i++) bassSum += freqData[i];
        bassEnergy = bassSum / (12 * 255);

        let midSum = 0;
        for (let i = 12; i < 48; i++) midSum += freqData[i];
        midEnergy = midSum / (36 * 255);
      } else {
        // Procedural gentle breathing rhythm
        bassEnergy = 0.12 + Math.sin(time * 1.5) * 0.06;
        midEnergy = 0.1 + Math.cos(time * 2) * 0.04;
      }

      // 3. Render Fluid Glass Glow Orbs
      orbs.forEach(orb => {
        orb.x += orb.vx * (1 + bassEnergy * 0.8);
        orb.y += orb.vy * (1 + bassEnergy * 0.8);

        if (orb.x < -100) orb.x = width + 100;
        if (orb.x > width + 100) orb.x = -100;
        if (orb.y < -100) orb.y = height + 100;
        if (orb.y > height + 100) orb.y = -100;

        const dynamicRadius = orb.radius * (1 + bassEnergy * 0.35);
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, dynamicRadius);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(0.6, orb.color.replace(/[\d\.]+\)$/, '0.05)'));
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, dynamicRadius, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4. Render Heavy Flowing Soundwave Ribbons Across Screen
      const waveCount = 3;
      for (let w = 0; w < waveCount; w++) {
        const waveBaseY = height * (0.45 + w * 0.18);
        const waveAmp = (40 + w * 25) * (1 + bassEnergy * 1.4);
        const waveFreq = 0.003 - w * 0.0007;
        const waveSpeed = time * (1.2 + w * 0.6);

        ctx.beginPath();
        ctx.moveTo(0, waveBaseY);

        for (let x = 0; x <= width; x += 12) {
          // Multi-harmonic sine waves
          const harmonic1 = Math.sin(x * waveFreq + waveSpeed);
          const harmonic2 = Math.cos(x * waveFreq * 2.1 - waveSpeed * 0.8) * 0.5;
          const harmonic3 = Math.sin(x * 0.008 + time * 2) * (bassEnergy * 20);
          const y = waveBaseY + (harmonic1 + harmonic2) * waveAmp + harmonic3;
          ctx.lineTo(x, y);
        }

        const waveGrad = ctx.createLinearGradient(0, 0, width, 0);
        if (w === 0) {
          waveGrad.addColorStop(0, 'rgba(6, 182, 212, 0.0)');
          waveGrad.addColorStop(0.3, 'rgba(6, 182, 212, 0.25)');
          waveGrad.addColorStop(0.7, 'rgba(30, 215, 96, 0.35)');
          waveGrad.addColorStop(1, 'rgba(30, 215, 96, 0.0)');
        } else if (w === 1) {
          waveGrad.addColorStop(0, 'rgba(139, 92, 246, 0.0)');
          waveGrad.addColorStop(0.4, 'rgba(168, 85, 247, 0.28)');
          waveGrad.addColorStop(0.8, 'rgba(236, 72, 153, 0.22)');
          waveGrad.addColorStop(1, 'rgba(236, 72, 153, 0.0)');
        } else {
          waveGrad.addColorStop(0, 'rgba(30, 215, 96, 0.0)');
          waveGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.2)');
          waveGrad.addColorStop(1, 'rgba(147, 51, 234, 0.0)');
        }

        ctx.strokeStyle = waveGrad;
        ctx.lineWidth = 2.5 + w;
        ctx.stroke();
      }

      // 5. Floating Music Note Particles
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      particles.forEach(p => {
        p.y -= p.speedY * (1 + bassEnergy * 1.5);
        p.x += p.speedX + Math.sin(time + p.y * 0.02) * 0.4;
        p.rotation += p.rotSpeed;

        if (p.y < -30) {
          p.y = height + 30;
          p.x = Math.random() * width;
          p.opacity = 0.15 + Math.random() * 0.45;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.font = `${p.size}px -apple-system, sans-serif`;
        ctx.fillStyle = p.color.replace(/[\d\.]+\)$/, `${p.opacity})`);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.fillText(p.symbol, 0, 0);
        ctx.restore();
      });

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, getFrequencyData]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
}
