'use client';

import React, { useEffect, useRef } from 'react';
import { usePlayer } from '@/context/PlayerContext';

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  size: number;
  baseSize: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  baseOpacity: number;
  spriteIndex: number;
  depth: number; // 0: background, 1: midground, 2: foreground
  phase: number;
  curlFreq: number;
  curlAmp: number;
  life: number;
  maxLife: number;
}

interface DustMote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseOpacity: number;
  phase: number;
  color: string;
}

interface VolumetricRay {
  angle: number; // radians
  width: number; // radians spread
  length: number;
  baseAlpha: number;
  phase: number;
  speed: number;
  colorStop: string;
}

interface CinematicSmokeAtmosphereProps {
  /** Optional custom className */
  className?: string;
  /** Whether this instance is for a localized stage or full screen */
  variant?: 'fullscreen' | 'stage';
  /** Optional opacity multiplier */
  intensity?: number;
}

export function CinematicSmokeAtmosphere({
  className = '',
  variant = 'fullscreen',
  intensity = 1.0,
}: CinematicSmokeAtmosphereProps) {
  const { isPlaying, getFrequencyData, currentSong } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sync props to refs to avoid tearing down the canvas loop on state changes
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const intensityRef = useRef(intensity);
  intensityRef.current = intensity;
  const getFrequencyDataRef = useRef(getFrequencyData);
  getFrequencyDataRef.current = getFrequencyData;

  // Parallax offsets
  const parallaxRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const isTouchDeviceRef = useRef(false);

  // Audio energy smoothing refs
  const smoothedBassRef = useRef(0);
  const audioPulseRef = useRef(0);

  // Song transition color modulation
  const songHueShiftRef = useRef(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      isTouchDeviceRef.current =
        window.matchMedia('(pointer: coarse)').matches ||
        /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }
  }, []);

  useEffect(() => {
    if (currentSong?.title) {
      let hash = 0;
      for (let i = 0; i < currentSong.title.length; i++) {
        hash = (hash << 5) - hash + currentSong.title.charCodeAt(i);
        hash |= 0;
      }
      songHueShiftRef.current = (hash % 16) - 8;
    }
  }, [currentSong?.id, currentSong?.title]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile =
      window.innerWidth < 768 ||
      isTouchDeviceRef.current ||
      /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    // PERFORMANCE CEILING: Mobile runs at 1.0 DPR (eliminates 4x fill-rate penalty)
    const dpr = isMobile ? 1.0 : Math.min(window.devicePixelRatio || 1, 1.25);
    let width = 0;
    let height = 0;

    const resize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    // Desktop Mouse Parallax Listener
    const handleMouseMove = (e: MouseEvent) => {
      if (isMobile) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      parallaxRef.current.targetX = nx;
      parallaxRef.current.targetY = ny;
    };
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    // =========================================================================
    // 1. GENERATE PROCEDURAL SMOKE SPRITES (OFFSCREEN CANVASES)
    // =========================================================================
    // Smaller sprite size on mobile saves VRAM and texture upload bandwidth
    const spriteSize = isMobile ? 180 : 280;
    const sprites: HTMLCanvasElement[] = [];

    const smokeColors = [
      { core: 'rgba(112, 38, 185, 0.40)', mid: 'rgba(78, 22, 138, 0.20)', edge: 'rgba(16, 5, 28, 0.0)' },
      { core: 'rgba(168, 85, 247, 0.45)', mid: 'rgba(139, 92, 246, 0.22)', edge: 'rgba(112, 38, 185, 0.0)' },
      { core: 'rgba(192, 132, 252, 0.48)', mid: 'rgba(168, 85, 247, 0.24)', edge: 'rgba(112, 38, 185, 0.0)' },
      { core: 'rgba(139, 233, 255, 0.42)', mid: 'rgba(192, 132, 252, 0.25)', edge: 'rgba(112, 38, 185, 0.0)' },
      { core: 'rgba(92, 30, 158, 0.32)', mid: 'rgba(38, 12, 68, 0.16)', edge: 'rgba(5, 3, 9, 0.0)' },
      { core: 'rgba(168, 85, 247, 0.38)', mid: 'rgba(192, 132, 252, 0.18)', edge: 'rgba(78, 22, 138, 0.0)' },
    ];

    const spriteCount = isMobile ? 4 : 6;
    for (let s = 0; s < spriteCount; s++) {
      const sCanvas = document.createElement('canvas');
      sCanvas.width = spriteSize;
      sCanvas.height = spriteSize;
      const sCtx = sCanvas.getContext('2d');
      if (!sCtx) continue;

      const center = spriteSize / 2;
      const col = smokeColors[s];
      const blobCount = isMobile ? 5 : 7 + (s % 3);

      for (let b = 0; b < blobCount; b++) {
        const angle = (b / blobCount) * Math.PI * 2 + s * 0.4;
        const dist = b === 0 ? 0 : (isMobile ? 14 : 22) + (b % 3) * 12;
        const bx = center + Math.cos(angle) * dist;
        const by = center + Math.sin(angle) * dist * 0.85;
        const radius = b === 0 ? (isMobile ? 55 : 85) : (isMobile ? 32 : 50) + (b % 3) * 16;

        const radGrad = sCtx.createRadialGradient(bx, by, radius * 0.1, bx, by, radius);
        radGrad.addColorStop(0, col.core);
        radGrad.addColorStop(0.5, col.mid);
        radGrad.addColorStop(1, col.edge);

        sCtx.fillStyle = radGrad;
        sCtx.beginPath();
        sCtx.arc(bx, by, radius, 0, Math.PI * 2);
        sCtx.fill();
      }

      sprites.push(sCanvas);
    }

    // =========================================================================
    // 2. INITIALIZE PARTICLES (OPTIMIZED COUNTS FOR MOBILE)
    // =========================================================================
    const particleCount = variant === 'stage' ? (isMobile ? 10 : 24) : (isMobile ? 14 : 36);
    const particles: SmokeParticle[] = [];

    const createParticle = (initialRandomY = false): SmokeParticle => {
      const depth = Math.random() < 0.4 ? 0 : Math.random() < 0.8 ? 1 : 2;
      const baseScale =
        depth === 0
          ? (isMobile ? 220 : 340) + Math.random() * (isMobile ? 100 : 200)
          : depth === 1
          ? (isMobile ? 150 : 240) + Math.random() * (isMobile ? 80 : 140)
          : (isMobile ? 90 : 150) + Math.random() * (isMobile ? 60 : 100);

      const baseVy =
        depth === 0
          ? -(0.25 + Math.random() * 0.3)
          : depth === 1
          ? -(0.4 + Math.random() * 0.45)
          : -(0.55 + Math.random() * 0.6);

      const baseVx = 0.16 + Math.random() * 0.35;

      const baseOpacity =
        depth === 0
          ? 0.14 + Math.random() * 0.1
          : depth === 1
          ? 0.2 + Math.random() * 0.14
          : 0.16 + Math.random() * 0.12;

      let spriteIndex = Math.floor(Math.random() * sprites.length);

      return {
        x: Math.random() * (width + 200) - 100,
        y: initialRandomY ? Math.random() * (height + 150) : height + 80 + Math.random() * 80,
        vx: baseVx,
        vy: baseVy,
        baseVx,
        baseVy,
        size: baseScale,
        baseSize: baseScale,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * (depth === 2 ? 0.006 : 0.003),
        opacity: baseOpacity,
        baseOpacity,
        spriteIndex,
        depth,
        phase: Math.random() * Math.PI * 2,
        curlFreq: 0.002 + Math.random() * 0.002,
        curlAmp: (10 + Math.random() * 16) * (depth + 1) * 0.5,
        life: initialRandomY ? Math.random() * 800 : 0,
        maxLife: 700 + Math.random() * 500,
      };
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(true));
    }

    // PRE-SORT ONCE by depth to avoid sorting on every 16ms frame!
    particles.sort((a, b) => a.depth - b.depth);

    // =========================================================================
    // 3. INITIALIZE DUST MOTES
    // =========================================================================
    const dustMotesCount = isMobile ? 8 : 22;
    const dustMotes: DustMote[] = [];
    const dustColors = [
      'rgba(192, 132, 252, 0.75)',
      'rgba(139, 233, 255, 0.85)',
      'rgba(168, 85, 247, 0.7)',
    ];

    for (let i = 0; i < dustMotesCount; i++) {
      dustMotes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0.1 + Math.random() * 0.35,
        vy: -(0.2 + Math.random() * 0.5),
        size: 0.8 + Math.random() * (isMobile ? 1.4 : 2.2),
        baseOpacity: 0.25 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
        color: dustColors[i % dustColors.length],
      });
    }

    // =========================================================================
    // 4. VOLUMETRIC LIGHT SHAFTS
    // =========================================================================
    const rayCount = isMobile ? 3 : 5;
    const volumetricRays: VolumetricRay[] = [];
    const rayAngles = isMobile ? [1.1, 1.35, 1.6] : [0.95, 1.15, 1.35, 1.55, 1.75];
    for (let r = 0; r < rayCount; r++) {
      volumetricRays.push({
        angle: rayAngles[r],
        width: 0.18 + Math.random() * 0.12,
        length: Math.max(width, height) * 0.85,
        baseAlpha: 0.08 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.3,
        colorStop: r % 2 === 0 ? 'rgba(168, 85, 247, 0.18)' : 'rgba(139, 233, 255, 0.15)',
      });
    }

    // =========================================================================
    // 5. ANIMATION & RENDER LOOP WITH FRAME-THROTTLING
    // =========================================================================
    let time = 0;
    let lastFrameTime = performance.now();
    const frameInterval = isMobile ? 30 : 16; // ~33 FPS on mobile keeps touch threads 100% responsive

    const render = (now: number) => {
      // Visibility Check: Pause when tab is inactive to preserve battery & CPU
      if (document.hidden) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const elapsed = now - lastFrameTime;
      if (elapsed < frameInterval) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }
      lastFrameTime = now - (elapsed % frameInterval);

      const playing = isPlayingRef.current;
      const currentIntensity = intensityRef.current;
      time += 0.016;

      // Audio analysis
      let rawBass = 0;
      if (playing) {
        const getFreq = getFrequencyDataRef.current;
        const freqData = getFreq();
        if (freqData && freqData.length >= 8) {
          rawBass = (freqData[0] + freqData[1] + freqData[2] + freqData[3]) / (4 * 255);
        } else {
          rawBass = 0.25 + Math.sin(time * 2.2) * 0.15;
        }
      }

      smoothedBassRef.current += (rawBass - smoothedBassRef.current) * 0.08;
      const smoothBass = smoothedBassRef.current;
      audioPulseRef.current += (smoothBass - audioPulseRef.current) * 0.06;

      // Smooth parallax
      const pr = parallaxRef.current;
      if (!isMobile) {
        pr.x += (pr.targetX - pr.x) * 0.04;
        pr.y += (pr.targetY - pr.y) * 0.04;
      }

      const speedMultiplier = (prefersReducedMotion ? 0.2 : 1.0) * (1.0 + smoothBass * 0.35);
      const lightX = width * 0.62 + pr.x * 10;
      const lightY = height * 0.04 + pr.y * 6;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // A. Deep Black & Purple Background (#050309 to #10051C)
      ctx.fillStyle = '#050309';
      ctx.fillRect(0, 0, width, height);

      const bgGrad = ctx.createRadialGradient(
        lightX,
        lightY,
        width * 0.08,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.95
      );
      bgGrad.addColorStop(0, '#22083D');
      bgGrad.addColorStop(0.35, '#130524');
      bgGrad.addColorStop(0.75, '#080311');
      bgGrad.addColorStop(1, '#050309');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // B. Volumetric Light Shafts
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      volumetricRays.forEach(ray => {
        const dynamicAlpha =
          (ray.baseAlpha + Math.sin(time * ray.speed + ray.phase) * 0.03 + smoothBass * 0.05) *
          currentIntensity;

        const rayGrad = ctx.createRadialGradient(
          lightX,
          lightY,
          10,
          lightX,
          lightY,
          ray.length
        );
        rayGrad.addColorStop(0, 'rgba(139, 233, 255, 0.4)');
        rayGrad.addColorStop(0.2, ray.colorStop);
        rayGrad.addColorStop(0.7, 'rgba(112, 38, 185, 0.05)');
        rayGrad.addColorStop(1, 'rgba(5, 3, 9, 0)');

        ctx.fillStyle = rayGrad;
        ctx.globalAlpha = Math.max(0, Math.min(1, dynamicAlpha));

        const rayAngle = ray.angle + Math.sin(time * 0.4 + ray.phase) * 0.03 + pr.x * 0.03;
        const halfWidth = ray.width * 0.5;

        ctx.beginPath();
        ctx.moveTo(lightX, lightY);
        ctx.lineTo(
          lightX + Math.cos(rayAngle - halfWidth) * ray.length,
          lightY + Math.sin(rayAngle - halfWidth) * ray.length
        );
        ctx.lineTo(
          lightX + Math.cos(rayAngle + halfWidth) * ray.length,
          lightY + Math.sin(rayAngle + halfWidth) * ray.length
        );
        ctx.closePath();
        ctx.fill();
      });
      ctx.restore();

      // C. Render Multi-Layered Smoke Particles
      particles.forEach(p => {
        const curlX = Math.sin(p.y * p.curlFreq + time * 0.7 + p.phase) * p.curlAmp;
        const curlY = Math.cos(p.x * p.curlFreq * 1.3 - time * 0.6 + p.phase) * (p.curlAmp * 0.5);
        const toLightX = (lightX - p.x) * 0.00015;

        p.x += (p.vx + curlX * 0.04 + toLightX) * speedMultiplier;
        p.y += (p.vy + curlY * 0.03) * speedMultiplier;
        p.rotation += p.rotSpeed * speedMultiplier;
        p.life += speedMultiplier;

        const breathe = Math.sin(time * 0.9 + p.phase);
        const dynamicScale = p.baseSize * (1 + breathe * 0.12 + smoothBass * 0.06);

        if (p.y < -dynamicScale * 0.8 || p.x > width + dynamicScale || p.life > p.maxLife) {
          const fresh = createParticle(false);
          if (Math.random() < 0.75) {
            fresh.y = height + dynamicScale * 0.4 + Math.random() * 60;
            fresh.x = Math.random() * (width * 0.85);
          } else {
            fresh.x = -dynamicScale * 0.6 - Math.random() * 60;
            fresh.y = height * 0.4 + Math.random() * (height * 0.6);
          }
          Object.assign(p, fresh);
        }

        const distToLight = Math.hypot(p.x - lightX, p.y - lightY);
        const lightBeamSpread = Math.max(width * 0.75, 600);
        const lightProximity = Math.max(0, 1 - distToLight / lightBeamSpread);

        const layerParallaxFactor = (p.depth + 1) * 10;
        const drawX = p.x + pr.x * layerParallaxFactor;
        const drawY = p.y + pr.y * layerParallaxFactor;

        const fadeIn = Math.min(1, p.life / 50);
        const fadeOut = Math.min(1, (p.maxLife - p.life) / 80);
        const envelope = fadeIn * fadeOut;

        const dynamicAlpha =
          p.baseOpacity *
          envelope *
          (1 + lightProximity * 0.5 + smoothBass * 0.2) *
          currentIntensity;

        const sprite = sprites[p.spriteIndex];
        if (sprite && dynamicAlpha > 0.01) {
          ctx.save();
          ctx.translate(drawX, drawY);
          ctx.rotate(p.rotation);

          if (p.depth === 2 || lightProximity > 0.4) {
            ctx.globalCompositeOperation = 'screen';
          } else {
            ctx.globalCompositeOperation = 'source-over';
          }

          ctx.globalAlpha = Math.min(0.85, Math.max(0, dynamicAlpha));
          const halfSize = dynamicScale / 2;
          ctx.drawImage(sprite, -halfSize, -halfSize, dynamicScale, dynamicScale);
          ctx.restore();
        }
      });

      // D. Floating Dust Particles
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      dustMotes.forEach(m => {
        m.x += (m.vx + Math.sin(time + m.phase) * 0.15) * speedMultiplier;
        m.y += m.vy * speedMultiplier;

        if (m.y < -20) {
          m.y = height + 20;
          m.x = Math.random() * width;
        }
        if (m.x > width + 20) m.x = -20;

        const distFromLight = Math.hypot(m.x - lightX, m.y - lightY);
        const inBeam = Math.max(0, 1 - distFromLight / (width * 0.55));
        const twinkle = 0.5 + Math.sin(time * 3 + m.phase) * 0.5;
        const moteAlpha = m.baseOpacity * (0.4 + inBeam * 0.9 + twinkle * 0.3);

        ctx.fillStyle = m.color;
        ctx.globalAlpha = Math.min(0.95, Math.max(0, moteAlpha * currentIntensity));
        ctx.beginPath();
        ctx.arc(m.x + pr.x * 16, m.y + pr.y * 16, m.size * (1 + inBeam * 0.4), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // E. Overhead Spotlight & Cyan Core
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      const lightPulse = 1.0 + audioPulseRef.current * 0.25;

      const outerGlowRadius = (isMobile ? 300 : 580) * lightPulse;
      const outerGlow = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, outerGlowRadius);
      outerGlow.addColorStop(0, 'rgba(168, 85, 247, 0.40)');
      outerGlow.addColorStop(0.3, 'rgba(112, 38, 185, 0.25)');
      outerGlow.addColorStop(0.65, 'rgba(38, 12, 68, 0.10)');
      outerGlow.addColorStop(1, 'rgba(5, 3, 9, 0)');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(lightX, lightY, outerGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      const midGlowRadius = (isMobile ? 140 : 260) * lightPulse;
      const midGlow = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, midGlowRadius);
      midGlow.addColorStop(0, 'rgba(192, 132, 252, 0.6)');
      midGlow.addColorStop(0.45, 'rgba(168, 85, 247, 0.35)');
      midGlow.addColorStop(1, 'rgba(112, 38, 185, 0)');
      ctx.fillStyle = midGlow;
      ctx.beginPath();
      ctx.arc(lightX, lightY, midGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      const cyanCoreRadius = (isMobile ? 45 : 85) * lightPulse;
      const cyanCore = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, cyanCoreRadius);
      cyanCore.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      cyanCore.addColorStop(0.2, 'rgba(139, 233, 255, 0.85)');
      cyanCore.addColorStop(0.6, 'rgba(192, 132, 252, 0.45)');
      cyanCore.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = cyanCore;
      ctx.beginPath();
      ctx.arc(lightX, lightY, cyanCoreRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // F. Cinematic Vignette (Crisp Readability)
      ctx.save();
      const vignette = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        Math.min(width, height) * 0.35,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.78
      );
      vignette.addColorStop(0, 'rgba(5, 3, 9, 0)');
      vignette.addColorStop(0.65, 'rgba(5, 3, 9, 0.35)');
      vignette.addColorStop(1, 'rgba(5, 3, 9, 0.88)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    const handleVisibility = () => {
      if (document.hidden) {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      } else if (!animFrameRef.current) {
        lastFrameTime = performance.now();
        animFrameRef.current = requestAnimationFrame(render);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('resize', resize);
      if (!isMobile) {
        window.removeEventListener('mousemove', handleMouseMove);
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [variant]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.9) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}
