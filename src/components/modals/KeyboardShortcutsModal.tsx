'use client';

import React from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { X, Keyboard, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function KeyboardShortcutsModal() {
  const { isShortcutsOpen, setIsShortcutsOpen } = usePlayer();

  if (!isShortcutsOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause audio' },
    { key: '← / →', desc: 'Seek backwards / forwards 5 seconds' },
    { key: 'Shift + ← / →', desc: 'Seek backwards / forwards 15 seconds' },
    { key: '↑ / ↓', desc: 'Volume up / down (5%)' },
    { key: 'M', desc: 'Mute / Unmute audio' },
    { key: 'N', desc: 'Next track in queue' },
    { key: 'P', desc: 'Previous track / restart track' },
    { key: 'S', desc: 'Toggle Shuffle mode' },
    { key: 'R', desc: 'Cycle Repeat (Off → All → One)' },
    { key: 'H', desc: 'Toggle Favorite for current song' },
    { key: 'L', desc: 'Toggle Lyrics panel' },
    { key: 'Q', desc: 'Toggle Play Queue drawer' },
    { key: 'F', desc: 'Open / Close Turntable Studio' },
    { key: '?', desc: 'Open / Close this shortcuts menu' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsShortcutsOpen(false)}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-lg rounded-2xl bg-[#10051C]/95 border border-[#302744] shadow-[0_0_50px_rgba(112,38,185,0.35)] p-6 z-10 text-white backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#302744]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#A855F7]/20 border border-[#A855F7]/40 flex items-center justify-center text-[#C084FC]">
                <Keyboard className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">Keyboard Shortcuts</h2>
                <p className="text-[11px] text-[#A99DBE]">Fast desktop listening navigation</p>
              </div>
            </div>
            <button
              onClick={() => setIsShortcutsOpen(false)}
              className="p-1.5 rounded-lg text-[#A99DBE] hover:text-white hover:bg-[#211A32] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shortcuts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-4 max-h-[60vh] overflow-y-auto pr-1">
            {shortcuts.map((sc, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-xl bg-[#141122]/70 border border-[#302744]/70 hover:border-[#A855F7]/30 transition-all text-xs"
              >
                <span className="text-[#D8B4FE] text-[11px] font-medium truncate pr-2">{sc.desc}</span>
                <kbd className="px-2 py-1 rounded bg-[#211A32] border border-[#302744] font-mono font-bold text-[10px] text-white shadow-sm shrink-0">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="pt-3 border-t border-[#302744] text-center text-[11px] text-[#A99DBE]">
            Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-[#211A32] border border-[#302744] font-mono text-[10px] text-white">?</kbd> at any time to toggle this panel.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
