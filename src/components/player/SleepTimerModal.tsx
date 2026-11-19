'use client';

import React from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { Moon, Clock, X, Check, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SleepTimerModal({ isOpen, onClose }: SleepTimerModalProps) {
  const { sleepTimerOption, sleepTimerRemaining, setSleepTimer } = usePlayer();

  if (!isOpen) return null;

  const options: { label: string; value: number | 'end-of-track'; desc: string }[] = [
    { label: '5 Minutes', value: 5, desc: 'Quick power nap' },
    { label: '15 Minutes', value: 15, desc: 'Short unwind' },
    { label: '30 Minutes', value: 30, desc: 'Standard bedtime timer' },
    { label: '45 Minutes', value: 45, desc: 'Deep listening session' },
    { label: '60 Minutes', value: 60, desc: '1 hour countdown' },
    { label: 'End of Current Song', value: 'end-of-track', desc: 'Finish the active track and pause' },
  ];

  const formatRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Body */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-sm rounded-2xl bg-[#10051C]/95 border border-[#302744] shadow-[0_0_50px_rgba(112,38,185,0.4)] p-6 z-10 text-white backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#302744]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#A855F7]/20 border border-[#A855F7]/40 flex items-center justify-center text-[#C084FC]">
                <Moon className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-wide">Sleep Timer</h2>
                <p className="text-[11px] text-[#A99DBE]">Gentle bedtime playback stop</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A99DBE] hover:text-white hover:bg-[#211A32] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Active Timer Banner if Running */}
          {sleepTimerOption !== null && (
            <div className="mt-4 p-3 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="w-4 h-4 text-[#A855F7] animate-pulse" />
                <div>
                  <span className="font-semibold text-white">Timer Active</span>
                  <p className="text-[11px] text-purple-300">
                    {sleepTimerRemaining !== null
                      ? `${formatRemaining(sleepTimerRemaining)} remaining (with 15s fadeout)`
                      : 'Stopping when current song finishes'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSleepTimer(null)}
                className="px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Options List */}
          <div className="space-y-1.5 py-4">
            {options.map((opt, i) => {
              const isSelected = sleepTimerOption === opt.value;
              return (
                <button
                  key={i}
                  onClick={() => {
                    setSleepTimer(opt.value);
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-[#A855F7]/25 border-[#A855F7] text-white shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                      : 'bg-[#141122]/70 border-[#302744]/70 hover:bg-[#1C152E] hover:border-[#A855F7]/40 text-[#D8B4FE]'
                  }`}
                >
                  <div>
                    <p className="text-xs font-bold text-white">{opt.label}</p>
                    <p className="text-[10px] text-[#A99DBE]">{opt.desc}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#C084FC]" />}
                </button>
              );
            })}
          </div>

          {sleepTimerOption !== null && (
            <button
              onClick={() => {
                setSleepTimer(null);
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-[#211A32] hover:bg-[#2C2344] border border-[#302744] text-xs font-semibold text-white transition-all text-center"
            >
              Turn Off Sleep Timer
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
