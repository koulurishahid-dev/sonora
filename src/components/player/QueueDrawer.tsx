'use client';

import React from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { getArtworkObjectUrl } from '@/lib/db';
import { formatDuration } from '@/lib/utils';
import { X, Trash2, Music2, Play, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function QueueDrawer() {
  const {
    queue,
    queueIndex,
    currentSong,
    isQueueOpen,
    setIsQueueOpen,
    playSong,
    removeFromQueue,
    clearQueue,
    reorderQueue,
  } = usePlayer();

  if (!isQueueOpen) return null;

  const currentTrack = currentSong || (queueIndex >= 0 ? queue[queueIndex] : null);
  const upNextTracks = queue.slice(queueIndex + 1);

  const moveItem = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= queue.length) return;
    const newQueue = [...queue];
    const [moved] = newQueue.splice(fromIdx, 1);
    newQueue.splice(toIdx, 0, moved);
    reorderQueue(newQueue);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsQueueOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Panel */}
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-md h-full glass-modal border-l border-white/15 shadow-2xl flex flex-col z-10 text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
            <div>
              <h2 className="text-lg font-bold text-white">Play Queue</h2>
              <p className="text-xs text-[#A1A1AA]">{queue.length} {queue.length === 1 ? 'track' : 'tracks'} queued</p>
            </div>
            <div className="flex items-center gap-2">
              {queue.length > 1 && (
                <button
                  onClick={clearQueue}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#A1A1AA] hover:text-rose-400 hover:bg-[#25252D] border border-transparent hover:border-rose-900/40 transition-all"
                  title="Clear Queue"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              )}
              <button
                onClick={() => setIsQueueOpen(false)}
                className="p-2 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#25252D] transition-colors"
                aria-label="Close queue"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Queue Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Now Playing */}
            {currentTrack && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] px-2 mb-2">
                  Now Playing
                </h3>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/30">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#25252D] shrink-0 relative flex items-center justify-center">
                    {getArtworkObjectUrl(currentTrack) ? (
                      <img
                        src={getArtworkObjectUrl(currentTrack)}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music2 className="w-6 h-6 text-[#A1A1AA]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate text-[var(--accent)]">
                      {currentTrack.title}
                    </p>
                    <p className="text-xs text-[#A1A1AA] truncate">{currentTrack.artist}</p>
                  </div>
                  <span className="text-xs text-[#A1A1AA] shrink-0 font-mono">
                    {formatDuration(currentTrack.duration)}
                  </span>
                </div>
              </div>
            )}

            {/* Next Up */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] px-2 mb-2">
                Next Up ({upNextTracks.length})
              </h3>

              {upNextTracks.length === 0 ? (
                <div className="text-center py-10 text-[#A1A1AA] border border-dashed border-[#303038] rounded-xl">
                  <p className="text-sm">Queue is empty</p>
                  <p className="text-xs text-[#71717A] mt-1">Right-click any song to add it to the queue</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {upNextTracks.map((song, idx) => {
                    const actualQueueIndex = queueIndex + 1 + idx;
                    const artUrl = getArtworkObjectUrl(song);

                    return (
                      <div
                        key={`${song.id}_${actualQueueIndex}`}
                        className="group flex items-center gap-2.5 p-2 rounded-xl bg-[#19191F]/70 hover:bg-[#25252D] border border-transparent hover:border-[#303038] transition-all"
                      >
                        {/* Drag / Move Up/Down Controls */}
                        <div className="flex flex-col items-center justify-center text-[#71717A] opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => moveItem(actualQueueIndex, actualQueueIndex - 1)}
                            disabled={actualQueueIndex <= queueIndex + 1}
                            className="p-0.5 hover:text-white disabled:opacity-20"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => moveItem(actualQueueIndex, actualQueueIndex + 1)}
                            disabled={actualQueueIndex >= queue.length - 1}
                            className="p-0.5 hover:text-white disabled:opacity-20"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Artwork */}
                        <div
                          onClick={() => playSong(song)}
                          className="w-10 h-10 rounded-lg overflow-hidden bg-[#25252D] shrink-0 relative flex items-center justify-center cursor-pointer"
                        >
                          {artUrl ? (
                            <img src={artUrl} alt={song.title} className="w-full h-full object-cover" />
                          ) : (
                            <Music2 className="w-4 h-4 text-[#A1A1AA]" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 fill-white text-white" />
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => playSong(song)}>
                          <p className="text-sm font-medium text-white truncate group-hover:text-[var(--accent)] transition-colors">
                            {song.title}
                          </p>
                          <p className="text-xs text-[#A1A1AA] truncate">{song.artist}</p>
                        </div>

                        {/* Duration */}
                        <span className="text-xs text-[#A1A1AA] font-mono shrink-0">
                          {formatDuration(song.duration)}
                        </span>

                        {/* Remove Action */}
                        <button
                          onClick={() => removeFromQueue(actualQueueIndex)}
                          className="p-1.5 rounded-lg text-[#71717A] hover:text-rose-400 hover:bg-[#303038] opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from Queue"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
