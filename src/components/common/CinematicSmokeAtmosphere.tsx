'use client';

import React, { useEffect, useRef, useState } from 'react';
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
  /** Whether this instance is for a localized stage (e.g. Turntable modal) or full screen */
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

  // Parallax offsets
  const parallaxRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const isTouchDeviceRef = useRef(false);

  // Audio energy smoothing refs (to prevent abrupt pops or flickers)
  const smoothedBassRef = useRef(0);
  const smoothedMidRef = useRef(0);
  const audioPulseRef = useRef(0);

  // Song transition color modulation
  const songHueShiftRef = useRef(0);

  useEffect(() => {
    // Check touch device
    if (typeof window !== 'undefined') {
      isTouchDeviceRef.current = window.matchMedia('(pointer: coarse)').matches;
    }
  }, []);

  // Subtle song transition hue modulation while staying anchored in deep purple/violet
  useEffect(() => {
    if (currentSong?.title) {
      // Deterministic slight hue variation (-8deg to +8deg) per song for organic ambient uniqueness
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

    // Prefers reduced motion check
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Handle high DPI display with performance ceiling
    let dpr = Math.min(window.devicePixelRatio || 1, 1.75);
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
      if (isTouchDeviceRef.current) return;
      const nx = (e.clientX / window.innerWidth - 0.5) * 2;
      const ny = (e.clientY / window.innerHeight - 0.5) * 2;
      parallaxRef.current.targetX = nx;
      parallaxRef.current.targetY = ny;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // =========================================================================
    // 1. GENERATE PROCEDURAL ORGANIC SMOKE SPRITES (OFFSCREEN CANVASES)
    // =========================================================================
    // Real smoke puffs have turbulent fractal edges, feathered wisps, and dense cores.
    // Pre-generating 6 unique smoke sprites allows blazingly fast 60fps composite rendering.
    const spriteSize = 340;
    const sprites: HTMLCanvasElement[] = [];

    const smokeColors = [
      // 0: Deep violet haze
      { core: 'rgba(112, 38, 185, 0.42)', mid: 'rgba(78, 22, 138, 0.22)', edge: 'rgba(16, 5, 28, 0.0)' },
      // 1: Electric purple billow
      { core: 'rgba(168, 85, 247, 0.48)', mid: 'rgba(139, 92, 246, 0.25)', edge: 'rgba(112, 38, 185, 0.0)' },
      // 2: Soft lavender cloud
      { core: 'rgba(192, 132, 252, 0.52)', mid: 'rgba(168, 85, 247, 0.26)', edge: 'rgba(112, 38, 185, 0.0)' },
      // 3: Illuminated cyan-lavender wisp (direct spotlight scatter)
      { core: 'rgba(139, 233, 255, 0.46)', mid: 'rgba(192, 132, 252, 0.28)', edge: 'rgba(112, 38, 185, 0.0)' },
      // 4: Ambient dark purple fog wash
      { core: 'rgba(92, 30, 158, 0.35)', mid: 'rgba(38, 12, 68, 0.18)', edge: 'rgba(5, 3, 9, 0.0)' },
      // 5: Fine curling smoke plume
      { core: 'rgba(168, 85, 247, 0.40)', mid: 'rgba(192, 132, 252, 0.20)', edge: 'rgba(78, 22, 138, 0.0)' },
    ];

    for (let s = 0; s < 6; s++) {
      const sCanvas = document.createElement('canvas');
      sCanvas.width = spriteSize;
      sCanvas.height = spriteSize;
      const sCtx = sCanvas.getContext('2d');
      if (!sCtx) continue;

      const center = spriteSize / 2;
      const col = smokeColors[s];

      // Build organic multi-blob puff
      const blobCount = 7 + s;
      for (let b = 0; b < blobCount; b++) {
        const angle = (b / blobCount) * Math.PI * 2 + (s * 0.4);
        const dist = (b === 0 ? 0 : 25 + (b % 4) * 16);
        const bx = center + Math.cos(angle) * dist;
        const by = center + Math.sin(angle) * dist * 0.85;
        const radius = (b === 0 ? 95 : 55 + (b % 3) * 20);

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
    // 2. INITIALIZE PARTICLES (BACKGROUND, MIDGROUND, FOREGROUND WISPS)
    // =========================================================================
    const isMobile = width < 768;
    const particleCount = variant === 'stage' ? 36 : (isMobile ? 32 : 56);
    const particles: SmokeParticle[] = [];

    const createParticle = (initialRandomY = false): SmokeParticle => {
      const depth = Math.random() < 0.35 ? 0 : Math.random() < 0.75 ? 1 : 2;
      const baseScale = depth === 0
        ? (isMobile ? 260 : 380) + Math.random() * (isMobile ? 140 : 260) // Background: large soft sheets
        : depth === 1
        ? (isMobile ? 180 : 260) + Math.random() * (isMobile ? 100 : 180) // Midground: rolling billows
        : (isMobile ? 110 : 160) + Math.random() * (isMobile ? 80 : 140);  // Foreground: wispy curls

      // Upward convective drift + Left-to-right atmospheric flow
      const baseVy = depth === 0
        ? -(0.25 + Math.random() * 0.35)
        : depth === 1
        ? -(0.45 + Math.random() * 0.55)
        : -(0.65 + Math.random() * 0.75);

      const baseVx = 0.18 + Math.random() * 0.45; // Natural flow from left to right

      const baseOpacity = depth === 0
        ? 0.14 + Math.random() * 0.12
        : depth === 1
        ? 0.22 + Math.random() * 0.16
        : 0.18 + Math.random() * 0.14;

      // Sprites selection by depth
      let spriteIndex = Math.floor(Math.random() * 6);
      if (depth === 0) spriteIndex = Math.random() < 0.6 ? 4 : 0;
      else if (depth === 2) spriteIndex = Math.random() < 0.5 ? 3 : 5;

      return {
        x: Math.random() * (width + 300) - 150,
        y: initialRandomY ? Math.random() * (height + 200) : height + 100 + Math.random() * 100,
        vx: baseVx,
        vy: baseVy,
        baseVx,
        baseVy,
        size: baseScale,
        baseSize: baseScale,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * (depth === 2 ? 0.008 : 0.004),
        opacity: baseOpacity,
        baseOpacity,
        spriteIndex,
        depth,
        phase: Math.random() * Math.PI * 2,
        curlFreq: 0.002 + Math.random() * 0.0025,
        curlAmp: (12 + Math.random() * 20) * (depth + 1) * 0.5,
        life: initialRandomY ? Math.random() * 1000 : 0,
        maxLife: 800 + Math.random() * 600,
      };
    };

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(true));
    }

    // =========================================================================
    // 3. FLOATING DUST MOTES (ILLUMINATED SPECK PARTICLES IN LIGHT SHAFT)
    // =========================================================================
    const dustCount = isMobile ? 22 : 44;
    const dustMotes: DustMote[] = [];
    const dustColors = [
      'rgba(139, 233, 255, 0.85)', // Cyan highlight
      'rgba(192, 132, 252, 0.90)', // Soft lavender
      'rgba(168, 85, 247, 0.80)', // Electric purple
      'rgba(248, 245, 255, 0.95)', // Pure luminous white
    ];

    for (let i = 0; i < dustCount; i++) {
      dustMotes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0.1 + Math.random() * 0.35,
        vy: -(0.2 + Math.random() * 0.45),
        size: 1.0 + Math.random() * 2.2,
        baseOpacity: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        color: dustColors[Math.floor(Math.random() * dustColors.length)],
      });
    }

    // =========================================================================
    // 4. VOLUMETRIC LIGHT RAYS (SHAFTS PASSING THROUGH SMOKE)
    // =========================================================================
    const rayCount = 6;
    const volumetricRays: VolumetricRay[] = [
      { angle: 0.92, width: 0.16, length: 1100, baseAlpha: 0.09, phase: 0.0, speed: 0.4, colorStop: 'rgba(139, 233, 255, 0.22)' },
      { angle: 1.15, width: 0.22, length: 1250, baseAlpha: 0.13, phase: 1.2, speed: 0.3, colorStop: 'rgba(192, 132, 252, 0.25)' },
      { angle: 1.38, width: 0.28, length: 1400, baseAlpha: 0.18, phase: 2.5, speed: 0.5, colorStop: 'rgba(168, 85, 247, 0.24)' },
      { angle: 1.62, width: 0.24, length: 1300, baseAlpha: 0.14, phase: 3.8, speed: 0.35, colorStop: 'rgba(112, 38, 185, 0.20)' },
      { angle: 1.88, width: 0.18, length: 1150, baseAlpha: 0.10, phase: 4.9, speed: 0.45, colorStop: 'rgba(139, 233, 255, 0.16)' },
      { angle: 2.12, width: 0.14, length: 950, baseAlpha: 0.07, phase: 5.7, speed: 0.6, colorStop: 'rgba(192, 132, 252, 0.15)' },
    ];

    // =========================================================================
    // 5. ANIMATION & RENDER LOOP
    // =========================================================================
    let time = 0;
    let isTabVisible = true;

    const handleVisibility = () => {
      isTabVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const render = () => {
      if (!isTabVisible) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      time += prefersReducedMotion ? 0.003 : 0.014;

      // Smooth mouse parallax interpolation
      const pr = parallaxRef.current;
      pr.x += (pr.targetX - pr.x) * 0.04;
      pr.y += (pr.targetY - pr.y) * 0.04;

      // --- Audio Energy Extraction with Exponential Smoothing ---
      let targetBass = 0;
      let targetMid = 0;

      if (isPlaying) {
        const freqData = getFrequencyData();
        if (freqData && freqData.length > 16) {
          // Sub & Bass bins: index 0 to 6 (approx 20-150Hz)
          let bSum = 0;
          for (let i = 0; i < 7; i++) bSum += freqData[i];
          targetBass = bSum / (7 * 255);

          // Vocal & Mid bins: index 7 to 28 (approx 160-900Hz)
          let mSum = 0;
          for (let i = 7; i < 28; i++) mSum += freqData[i];
          targetMid = mSum / (21 * 255);
        } else {
          // Procedural gentle music pulse fallback
          targetBass = 0.18 + Math.sin(time * 2.2) * 0.08;
          targetMid = 0.14 + Math.cos(time * 3.1) * 0.06;
        }
      } else {
        // Resting ambient state: very slow breathing rhythm
        targetBass = 0.04 + Math.sin(time * 0.8) * 0.03;
        targetMid = 0.03 + Math.cos(time * 0.6) * 0.02;
      }

      // Exponential smoothing (alpha = 0.09) to prevent abrupt flashes or strobe
      smoothedBassRef.current += (targetBass - smoothedBassRef.current) * 0.09;
      smoothedMidRef.current += (targetMid - smoothedMidRef.current) * 0.07;

      const smoothBass = smoothedBassRef.current;
      const smoothMid = smoothedMidRef.current;
      audioPulseRef.current = smoothBass * 0.7 + smoothMid * 0.3;

      // Dynamic speed multiplier: slightly increases during playback, calms down during pause
      const speedMultiplier = (prefersReducedMotion ? 0.2 : 1.0) * (1.0 + smoothBass * 0.4);

      // Light source origin coordinates (Upper-center/upper-right as in reference image)
      const lightX = width * 0.63 + pr.x * 12;
      const lightY = height * 0.04 + pr.y * 8;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // =========================================================================
      // A. DEEP BLACK & DARK PURPLE BACKGROUND (#050309 to #10051C)
      // =========================================================================
      ctx.fillStyle = '#050309';
      ctx.fillRect(0, 0, width, height);

      // Background ambient gradient centered on the light direction
      const bgGrad = ctx.createRadialGradient(
        lightX,
        lightY,
        width * 0.08,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.95
      );
      bgGrad.addColorStop(0, '#22083D'); // Luminous deep purple under light source
      bgGrad.addColorStop(0.35, '#130524'); // Rich dark purple
      bgGrad.addColorStop(0.75, '#080311'); // Deep shadow
      bgGrad.addColorStop(1, '#050309'); // Deep obsidian black corners
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // =========================================================================
      // B. VOLUMETRIC LIGHT SHAFTS (PASSING THROUGH SMOKE)
      // =========================================================================
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      volumetricRays.forEach(ray => {
        const dynamicAlpha =
          (ray.baseAlpha + Math.sin(time * ray.speed + ray.phase) * 0.035 + smoothBass * 0.06) *
          intensity;

        const rayGrad = ctx.createRadialGradient(
          lightX,
          lightY,
          10,
          lightX,
          lightY,
          ray.length
        );
        rayGrad.addColorStop(0, 'rgba(139, 233, 255, 0.45)');
        rayGrad.addColorStop(0.2, ray.colorStop);
        rayGrad.addColorStop(0.7, 'rgba(112, 38, 185, 0.06)');
        rayGrad.addColorStop(1, 'rgba(5, 3, 9, 0)');

        ctx.fillStyle = rayGrad;
        ctx.globalAlpha = Math.max(0, Math.min(1, dynamicAlpha));

        const rayAngle = ray.angle + Math.sin(time * 0.4 + ray.phase) * 0.04 + pr.x * 0.04;
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

      // =========================================================================
      // C. RENDER MULTI-LAYERED ANIMATED SMOKE (BACKGROUND, MIDGROUND, FOREGROUND)
      // =========================================================================
      // Sort particles by depth for realistic volumetric layering
      particles.sort((a, b) => a.depth - b.depth);

      particles.forEach(p => {
        // 1. Physics update: convective upward drift + left-to-right flow + harmonic curling
        const curlX = Math.sin(p.y * p.curlFreq + time * 0.7 + p.phase) * p.curlAmp;
        const curlY = Math.cos(p.x * p.curlFreq * 1.3 - time * 0.6 + p.phase) * (p.curlAmp * 0.5);

        // Attraction toward upper light column
        const toLightX = (lightX - p.x) * 0.00018;

        p.x += (p.vx + curlX * 0.04 + toLightX) * speedMultiplier;
        p.y += (p.vy + curlY * 0.03) * speedMultiplier;
        p.rotation += p.rotSpeed * speedMultiplier;
        p.life += speedMultiplier;

        // Continuous density & shape morphing
        const breathe = Math.sin(time * 0.9 + p.phase);
        const dynamicScale = p.baseSize * (1 + breathe * 0.14 + smoothBass * 0.08);

        // 2. Recycling when particle drifts off-screen or outlives maxLife
        if (p.y < -dynamicScale * 0.8 || p.x > width + dynamicScale || p.life > p.maxLife) {
          const fresh = createParticle(false);
          // Spawn near bottom or left
          if (Math.random() < 0.75) {
            fresh.y = height + dynamicScale * 0.4 + Math.random() * 80;
            fresh.x = Math.random() * (width * 0.85);
          } else {
            fresh.x = -dynamicScale * 0.6 - Math.random() * 80;
            fresh.y = height * 0.4 + Math.random() * (height * 0.6);
          }
          Object.assign(p, fresh);
        }

        // 3. Proximity to upper light source: particles catch brighter cyan/lavender highlights
        const distToLight = Math.hypot(p.x - lightX, p.y - lightY);
        const lightBeamSpread = Math.max(width * 0.75, 700);
        const lightProximity = Math.max(0, 1 - distToLight / lightBeamSpread);

        // Parallax offset per depth layer
        const layerParallaxFactor = (p.depth + 1) * 14;
        const drawX = p.x + pr.x * layerParallaxFactor;
        const drawY = p.y + pr.y * layerParallaxFactor;

        // Dynamic alpha with fade in/out
        const lifeRatio = p.life / p.maxLife;
        const fadeIn = Math.min(1, p.life / 60);
        const fadeOut = Math.min(1, (p.maxLife - p.life) / 90);
        const envelope = fadeIn * fadeOut;

        const dynamicAlpha =
          p.baseOpacity *
          envelope *
          (1 + lightProximity * 0.55 + smoothBass * 0.25) *
          intensity;

        const sprite = sprites[p.spriteIndex];
        if (sprite && dynamicAlpha > 0.01) {
          ctx.save();
          ctx.translate(drawX, drawY);
          ctx.rotate(p.rotation);

          // Subtle blending modes for realistic stage fog
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

      // =========================================================================
      // D. FLOATING DUST PARTICLES (MOTES DRIFTING THROUGH THE PURPLE LIGHT)
      // =========================================================================
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      dustMotes.forEach(m => {
        m.x += (m.vx + Math.sin(time + m.phase) * 0.15) * speedMultiplier;
        m.y += m.vy * speedMultiplier;

        // Boundary recycle
        if (m.y < -20) {
          m.y = height + 20;
          m.x = Math.random() * width;
        }
        if (m.x > width + 20) m.x = -20;

        // Dust motes glow brighter when inside the overhead light cone
        const distFromLight = Math.hypot(m.x - lightX, m.y - lightY);
        const inBeam = Math.max(0, 1 - distFromLight / (width * 0.55));
        const twinkle = 0.5 + Math.sin(time * 3 + m.phase) * 0.5;
        const moteAlpha = m.baseOpacity * (0.4 + inBeam * 0.9 + twinkle * 0.3);

        ctx.fillStyle = m.color;
        ctx.globalAlpha = Math.min(0.95, Math.max(0, moteAlpha * intensity));
        ctx.beginPath();
        ctx.arc(m.x + pr.x * 22, m.y + pr.y * 22, m.size * (1 + inBeam * 0.4), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // =========================================================================
      // E. OVERHEAD SPOTLIGHT & SOFT CYAN GLOW CORE (AS IN REFERENCE PHOTO)
      // =========================================================================
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      const lightPulse = 1.0 + audioPulseRef.current * 0.28;

      // 1. Large Diffused Violet/Purple Bloom
      const outerGlowRadius = (width < 768 ? 360 : 620) * lightPulse;
      const outerGlow = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, outerGlowRadius);
      outerGlow.addColorStop(0, 'rgba(168, 85, 247, 0.42)');
      outerGlow.addColorStop(0.3, 'rgba(112, 38, 185, 0.28)');
      outerGlow.addColorStop(0.65, 'rgba(38, 12, 68, 0.12)');
      outerGlow.addColorStop(1, 'rgba(5, 3, 9, 0)');

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(lightX, lightY, outerGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      // 2. Electric Lavender Mid-Glow
      const midGlowRadius = (width < 768 ? 160 : 280) * lightPulse;
      const midGlow = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, midGlowRadius);
      midGlow.addColorStop(0, 'rgba(192, 132, 252, 0.65)');
      midGlow.addColorStop(0.45, 'rgba(168, 85, 247, 0.38)');
      midGlow.addColorStop(1, 'rgba(112, 38, 185, 0)');

      ctx.fillStyle = midGlow;
      ctx.beginPath();
      ctx.arc(lightX, lightY, midGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Crisp Soft Cyan Highlight Core (Reference Image Signature Light Source)
      const cyanCoreRadius = (width < 768 ? 55 : 95) * lightPulse;
      const cyanCore = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, cyanCoreRadius);
      cyanCore.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      cyanCore.addColorStop(0.2, 'rgba(139, 233, 255, 0.85)'); // #8BE9FF
      cyanCore.addColorStop(0.6, 'rgba(192, 132, 252, 0.45)'); // #C084FC
      cyanCore.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.fillStyle = cyanCore;
      ctx.beginPath();
      ctx.arc(lightX, lightY, cyanCoreRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // =========================================================================
      // F. CINEMATIC VIGNETTE (DEEP BLACK CORNERS TO KEEP UI CRISP & READABLE)
      // =========================================================================
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

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, getFrequencyData, variant, intensity]);

  return (
    <div
      className={`fixed inset-0 pointer-events-none select-none overflow-hidden z-0 ${className}`}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Subtle fine film grain texture overlay for analog vinyl cinema warmth */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.9) 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
}
