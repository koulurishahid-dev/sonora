'use client';

import React from 'react';

interface CinematicSmokeAtmosphereProps {
  /** Optional custom className */
  className?: string;
  /** Whether this instance is for a localized stage or full screen */
  variant?: 'fullscreen' | 'stage';
  /** Optional opacity multiplier */
  intensity?: number;
}

/**
 * Static Premium Studio Backdrop
 * Clean, calm, obsidian-slate background with subtle architectural lighting
 * and zero distracting animations or canvas loops.
 */
export function CinematicSmokeAtmosphere({
  className = '',
  variant = 'fullscreen',
  intensity = 1.0,
}: CinematicSmokeAtmosphereProps) {
  const opacityScale = Math.max(0.2, Math.min(1, intensity));

  return (
    <div
      className={`pointer-events-none select-none overflow-hidden ${
        variant === 'fullscreen' ? 'fixed inset-0 z-0' : 'absolute inset-0 z-0'
      } ${className}`}
      aria-hidden="true"
    >
      {/* 1. Deep Obsidian Studio Base */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0B0B10 0%, #07070A 55%, #050507 100%)',
        }}
      />

      {/* 2. Subtle Architectural Top Spotlight (Static) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: opacityScale,
          background:
            'radial-gradient(ellipse 85% 55% at 50% -12%, rgba(167, 139, 250, 0.14) 0%, rgba(99, 102, 241, 0.06) 45%, transparent 75%)',
        }}
      />

      {/* 3. Secondary Balanced Horizon Depth (Static) */}
      <div
        className="absolute inset-0"
        style={{
          opacity: opacityScale,
          background:
            'radial-gradient(circle at 82% 18%, rgba(148, 163, 184, 0.06) 0%, transparent 45%), radial-gradient(circle at 12% 85%, rgba(139, 92, 246, 0.06) 0%, transparent 50%)',
        }}
      />

      {/* 4. Soft Perimeter Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, transparent 45%, rgba(5, 5, 8, 0.55) 100%)',
        }}
      />

      {/* 5. Hairline Architectural Grid Accent (Barely Perceptible) */}
      <div
        className="absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.85) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      />
    </div>
  );
}
