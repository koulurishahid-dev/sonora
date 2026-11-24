'use client';

import React from 'react';
import { usePlayer } from '@/context/PlayerContext';
import { getArtworkObjectUrl } from '@/lib/db';
import { formatDuration } from '@/lib/utils';
import { X, Trash2, Music2, Play, Shuffle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function QueueDrawer() {
  const {
    currentSong,
    userQueue,
    contextQueue,
    contextName,
    shuffle,
    queue,
    isQueueOpen,
    setIsQueueOpen,
    playSong,
    playQueueIndex,
    clearQueue,
    clearUserQueue,
    removeUserQueueItem,
    removeFromQueue,
  } = usePlayer();

  if (!isQueueOpen) return null;

  // Upcoming tracks from context (skipping current song)
  const upcomingContext = queue.slice(1 + userQueue.length);
  const totalQueued = userQueue.length + upcomingContext.length;

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
          className="relative w-full max-w-md h-full bg-[#110F1D]/98 border-l border-[#302744] shadow-2xl flex flex-col z-10 text-[#F8F5FF] backdrop-blur-3xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#302744]">
            <div>
              <h2 className="text-lg font-bold text-[#F8F5FF] flex items-center gap-2">
                <span>Play Queue</span>
                {shuffle && (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#A78BFA]/15 text-[#D8B4FE] border border-[#A78BFA]/30">
                    <Shuffle className="w-2.5 h-2.5" /> Shuffled
                  </span>
                )}
              </h2>
              <p className="text-xs text-[#C2B5D9]">
                {totalQueued} {totalQueued === 1 ? 'track' : 'tracks'} upcoming
              </p>
            </div>
            <div className="flex items-center gap-2">
              {totalQueued > 0 && (
                <button
                  onClick={clearQueue}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#A99DBE] hover:text-rose-400 hover:bg-[#211A32] border border-transparent hover:border-rose-900/40 transition-all"
                  title="Clear Queue"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              )}
              <button
                onClick={() => setIsQueueOpen(false)}
                className="p-2 rounded-lg text-[#A99DBE] hover:text-[#F8F5FF] hover:bg-[#211A32] transition-colors"
                aria-label="Close queue"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Queue Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* 1. NOW PLAYING */}
            {currentSong && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#A99DBE] px-2 mb-2 font-mono">
                  Now Playing
                </h3>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#211A32] border border-[#A78BFA]/40 shadow-md">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#141122] shrink-0 relative flex items-center justify-center border border-[#302744]">
                    {getArtworkObjectUrl(currentSong) ? (
                      <img
                        src={getArtworkObjectUrl(currentSong)}
                        alt={currentSong.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Music2 className="w-6 h-6 text-[#A99DBE]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#D8B4FE] truncate">
                      {currentSong.title}
                    </p>
                    <p className="text-xs text-[#C2B5D9] truncate">{currentSong.artist}</p>
                  </div>
                  <span className="text-xs text-[#A99DBE] shrink-0 font-mono">
                    {formatDuration(currentSong.duration)}
                  </span>
                </div>
              </div>
            )}

            {/* 2. USER QUEUE (NEXT IN QUEUE - SPOTIFY MODEL) */}
            {userQueue.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-2 mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#D8B4FE] font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#A78BFA]" />
                    <span>Next in Queue ({userQueue.length})</span>
                  </h3>
                  <button
                    onClick={clearUserQueue}
                    className="text-[11px] font-semibold text-[#A99DBE] hover:text-rose-400 transition-colors"
                  >
                    Clear User Queue
                  </button>
                </div>

                <div className="space-y-1.5">
                  {userQueue.map((song, idx) => {
                    const artUrl = getArtworkObjectUrl(song);
                    return (
                      <div
                        key={`user_q_${song.id}_${idx}`}
                        className="group flex items-center gap-2.5 p-2 rounded-xl bg-[#2A1D45]/70 hover:bg-[#342457] border border-[#A78BFA]/25 hover:border-[#A78BFA]/50 transition-all"
                      >
                        <span className="w-4 text-center text-[10px] font-mono text-[#D8B4FE] shrink-0 font-bold">
                          {idx + 1}
                        </span>

                        <div
                          onClick={() => playQueueIndex(idx + 1)}
                          className="w-10 h-10 rounded-lg overflow-hidden bg-[#141122] shrink-0 relative flex items-center justify-center cursor-pointer border border-[#302744]"
                        >
                          {artUrl ? (
                            <img src={artUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Music2 className="w-4 h-4 text-[#A99DBE]" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 fill-[#F8F5FF] text-[#F8F5FF]" />
                          </div>
                        </div>

                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => playQueueIndex(idx + 1)}
                        >
                          <p className="text-sm font-medium text-[#F8F5FF] truncate group-hover:text-[#D8B4FE] transition-colors">
                            {song.title}
                          </p>
                          <p className="text-xs text-[#C2B5D9] truncate">{song.artist}</p>
                        </div>

                        <span className="text-xs text-[#A99DBE] font-mono shrink-0">
                          {formatDuration(song.duration)}
                        </span>

                        <button
                          onClick={() => removeUserQueueItem(idx)}
                          className="p-1.5 rounded-lg text-[#A99DBE] hover:text-rose-400 hover:bg-[#141122] opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from queue"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. NEXT FROM CONTEXT (ALBUM / PLAYLIST TRACKLIST) */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A99DBE] px-2 mb-2 font-mono flex items-center justify-between">
                <span>Next from: {contextName}</span>
                <span className="font-normal text-[11px] text-[#A99DBE]">
                  ({upcomingContext.length} remaining)
                </span>
              </h3>

              {upcomingContext.length === 0 ? (
                <div className="text-center py-8 text-[#A99DBE] border border-dashed border-[#302744] rounded-xl text-xs">
                  <p>End of context tracklist</p>
                  <p className="text-[11px] text-[#A99DBE]/60 mt-0.5">
                    Smart Autoplay will recommend similar songs when finished
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {upcomingContext.map((song, idx) => {
                    const actualIdx = 1 + userQueue.length + idx;
                    const artUrl = getArtworkObjectUrl(song);

                    return (
                      <div
                        key={`ctx_${song.id}_${actualIdx}`}
                        className="group flex items-center gap-2.5 p-2 rounded-xl bg-[#171326]/70 hover:bg-[#2A2140] border border-transparent hover:border-[#302744] transition-all"
                      >
                        <span className="w-4 text-center text-[10px] font-mono text-[#A99DBE] shrink-0">
                          {idx + 1}
                        </span>

                        <div
                          onClick={() => playQueueIndex(actualIdx)}
                          className="w-10 h-10 rounded-lg overflow-hidden bg-[#141122] shrink-0 relative flex items-center justify-center cursor-pointer border border-[#302744]"
                        >
                          {artUrl ? (
                            <img src={artUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Music2 className="w-4 h-4 text-[#A99DBE]" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-4 h-4 fill-[#F8F5FF] text-[#F8F5FF]" />
                          </div>
                        </div>

                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => playQueueIndex(actualIdx)}
                        >
                          <p className="text-sm font-medium text-[#F8F5FF] truncate group-hover:text-[#D8B4FE] transition-colors">
                            {song.title}
                          </p>
                          <p className="text-xs text-[#C2B5D9] truncate">{song.artist}</p>
                        </div>

                        <span className="text-xs text-[#A1A1AA] font-mono shrink-0">
                          {formatDuration(song.duration)}
                        </span>

                        <button
                          onClick={() => removeFromQueue(actualIdx)}
                          className="p-1.5 rounded-lg text-[#71717A] hover:text-rose-400 hover:bg-[#303038] opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove from queue"
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
