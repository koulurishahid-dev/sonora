'use client';

import React, { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { playInteractionSound } from '@/lib/interactionSound';
import { Sparkles, Moon, Sun, Flame, Brain, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ATMOSPHERES = [
  {
    id: 'night',
    name: 'Night Studio',
    desc: 'Stealth obsidian with emerald studio warmth',
    icon: Moon,
    color: 'from-emerald-500/20 to-zinc-900',
    accent: '#1ED760',
    quote: 'Lost in the music.',
  },
  {
    id: 'focus',
    name: 'Deep Focus',
    desc: 'Calm cyber indigo for distraction-free listening',
    icon: Brain,
    color: 'from-blue-600/20 to-indigo-950',
    accent: '#3B82F6',
    quote: 'Let the melody take over.',
  },
  {
    id: 'relax',
    name: 'Golden Sunset',
    desc: 'Warm amber glow & vinyl lounge acoustic comfort',
    icon: Sun,
    color: 'from-amber-500/20 to-orange-950',
    accent: '#F59E0B',
    quote: 'Your favourite moment.',
  },
  {
    id: 'energy',
    name: 'Neon Pulse',
    desc: 'Vibrant cyan & magenta energetic resonance',
    icon: Flame,
    color: 'from-fuchsia-600/20 to-cyan-950',
    accent: '#06B6D4',
    quote: 'One song, endless memories.',
  },
] as const;

export function AtmosphereSelector() {
  const { settings, updateSettings } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const currentAtmosphere = settings.atmosphere || 'night';
  const activeObj = ATMOSPHERES.find(a => a.id === currentAtmosphere) || ATMOSPHERES[0];
  const Icon = activeObj.icon;

  const handleSelect = (id: typeof ATMOSPHERES[number]['id'], accent: string) => {
    playInteractionSound(settings.hapticSoundEnabled, 'switch');
    updateSettings({ atmosphere: id, accentColor: accent });
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 hover:border-white/20 text-xs font-semibold text-white transition-all active:scale-95 shadow-sm"
        title="Listening Atmosphere"
      >
        <Icon className="w-3.5 h-3.5 text-[var(--accent)]" />
        <span className="hidden sm:inline">{activeObj.name}</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="absolute right-0 mt-2 w-72 p-2.5 rounded-2xl bg-[#12141E]/95 border border-white/15 shadow-2xl backdrop-blur-2xl z-50 flex flex-col gap-1.5"
            >
              <div className="px-2.5 py-1.5 border-b border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Listening Atmosphere
                </span>
                <span className="text-[10px] font-mono text-[var(--accent)]">
                  {activeObj.quote}
                </span>
              </div>

              {ATMOSPHERES.map(atm => {
                const AtmIcon = atm.icon;
                const isSelected = currentAtmosphere === atm.id;
                return (
                  <button
                    key={atm.id}
                    onClick={() => handleSelect(atm.id, atm.accent)}
                    className={`group flex items-start gap-3 p-2.5 rounded-xl transition-all text-left ${
                      isSelected
                        ? 'bg-white/10 border border-white/20 shadow-md'
                        : 'hover:bg-white/[0.06] border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-white/15 bg-gradient-to-br ${atm.color}`}
                    >
                      <AtmIcon className="w-4 h-4 text-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white group-hover:text-[var(--accent)] transition-colors">
                          {atm.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)]" />}
                      </div>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {atm.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
