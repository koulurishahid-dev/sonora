'use client';

import React, { useState } from 'react';
import { Song, Playlist } from '@/types/music';
import { db, getArtworkObjectUrl } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { Sparkles, Wand2, X, Play, Plus, Check, Music2, RefreshCw, Disc } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SmartAiPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaylistCreated?: (playlistId: string) => void;
}

const SAMPLE_PROMPTS = [
  'Relaxing late-night Telugu melodies with soft acoustic vibe',
  'Energetic high-bass mass beats for workout and party',
  'Soulful romance songs by Sid Sriram, Anurag Kulkarni, and Shreya Ghoshal',
  '90s and 2000s nostalgic golden hits by SPB and Keeravani',
  'Peaceful road trip and travel melodies',
  'Devotional and divine spiritual songs',
];

export function SmartAiPlaylistModal({ isOpen, onClose, onPlaylistCreated }: SmartAiPlaylistModalProps) {
  const { playSong } = usePlayer();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlaylist, setGeneratedPlaylist] = useState<{
    title: string;
    description: string;
    songs: Song[];
  } | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (queryText?: string) => {
    const q = (queryText || prompt).trim();
    if (!q) return;

    setIsGenerating(true);
    setIsSaved(false);

    try {
      const allSongs = await db.songs.toArray();
      const lower = q.toLowerCase();
      const words = lower.split(/\s+/).filter(w => w.length > 2);

      // Score each song based on relevance to prompt keywords
      const scored = allSongs.map(song => {
        let score = 0;
        const text = `${song.title} ${song.artist} ${song.album} ${song.genre || ''} ${song.category || ''}`.toLowerCase();

        // Exact keywords match
        words.forEach(word => {
          if (text.includes(word)) score += 3;
        });

        // Mood heuristics
        if (lower.includes('relax') || lower.includes('late-night') || lower.includes('night') || lower.includes('soft') || lower.includes('peaceful')) {
          if (text.includes('melody') || text.includes('acoustic') || text.includes('love') || text.includes('chill') || text.includes('samajavaragamana') || text.includes('chuttamalle')) score += 4;
        }
        if (lower.includes('energetic') || lower.includes('workout') || lower.includes('mass') || lower.includes('party') || lower.includes('dance')) {
          if (text.includes('mass') || text.includes('beat') || text.includes('kurchi') || text.includes('thanda') || text.includes('fear') || text.includes('masala')) score += 4;
        }
        if (lower.includes('romance') || lower.includes('love')) {
          if (text.includes('love') || text.includes('prema') || text.includes('priya') || text.includes('hrudayam') || text.includes('sid sriram')) score += 4;
        }
        if (lower.includes('90s') || lower.includes('2000s') || lower.includes('nostalgia') || lower.includes('classic') || lower.includes('spb')) {
          if ((song.year && song.year < 2012) || text.includes('balu') || text.includes('keeravani') || text.includes('spb') || text.includes('nostalgia')) score += 5;
        }
        if (lower.includes('devotional') || lower.includes('spiritual') || lower.includes('divine')) {
          if (text.includes('devotional') || text.includes('shiva') || text.includes('rama') || text.includes('govinda')) score += 6;
        }

        // Slight bonus for favorites and high-bitrate tracks
        if (song.isFavorite) score += 1;
        if (song.bitrate && song.bitrate >= 320) score += 1;

        return { song, score };
      });

      // Filter to top matches (at least score > 0)
      const topMatches = scored
        .filter(s => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 15)
        .map(s => s.song);

      const finalSongs = topMatches.length >= 4 ? topMatches : allSongs.slice(0, 12);

      // Generate contextual title & description
      let generatedTitle = 'Smart Curated Mix';
      if (lower.includes('relax') || lower.includes('night')) generatedTitle = 'Midnight Stargaze Melodies';
      else if (lower.includes('mass') || lower.includes('workout')) generatedTitle = 'High-Voltage Telugu Mass';
      else if (lower.includes('romance') || lower.includes('love')) generatedTitle = 'Telugu Romance Sanctuary';
      else if (lower.includes('90s') || lower.includes('nostalgia')) generatedTitle = 'Golden Era Nostalgia';
      else if (lower.includes('devotional')) generatedTitle = 'Divine Telugu Devotionals';
      else if (lower.includes('travel') || lower.includes('road trip')) generatedTitle = 'Highway Wanderers Playlist';
      else {
        const firstWord = words[0] ? words[0].charAt(0).toUpperCase() + words[0].slice(1) : 'Personal';
        generatedTitle = `${firstWord} Universe Mix`;
      }

      setGeneratedPlaylist({
        title: generatedTitle,
        description: `AI-curated based on: "${q}" • ${finalSongs.length} tracks`,
        songs: finalSongs,
      });
    } catch (e) {
      console.error('Smart playlist error:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToPlaylists = async () => {
    if (!generatedPlaylist || isSaved) return;

    try {
      const playlistId = `pl_ai_${Date.now()}`;
      const newPlaylist: Playlist = {
        id: playlistId,
        title: generatedPlaylist.title,
        description: generatedPlaylist.description,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        songIds: generatedPlaylist.songs.map(s => s.id),
      };

      await db.playlists.add(newPlaylist);

      // Add playlist songs entries
      const plSongs = generatedPlaylist.songs.map((song, idx) => ({
        id: `${playlistId}_${song.id}`,
        playlistId,
        songId: song.id,
        order: idx,
        addedAt: Date.now(),
      }));

      await db.playlistSongs.bulkAdd(plSongs);
      setIsSaved(true);

      if (onPlaylistCreated) {
        onPlaylistCreated(playlistId);
      }
    } catch (e) {
      console.error('Save AI playlist error:', e);
    }
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
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 15 }}
          className="relative w-full max-w-xl max-h-[90vh] rounded-3xl bg-[#10051C]/95 border border-[#302744] shadow-[0_0_60px_rgba(168,85,247,0.35)] p-6 z-10 text-white backdrop-blur-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#302744] shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7026B9] to-[#C084FC] flex items-center justify-center text-black shadow-lg shadow-[#A855F7]/30">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Smart AI Playlist Curator
                </h2>
                <p className="text-xs text-[#A99DBE]">Describe your vibe or mood to instantly generate a playlist</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#A99DBE] hover:text-white hover:bg-[#211A32] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Prompt Input Form */}
          <div className="pt-4 space-y-3 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                placeholder="e.g. relaxing Telugu melodies for rainy night..."
                className="w-full px-4 py-3 rounded-xl bg-[#141122] border border-[#302744] focus:border-[#A855F7] text-sm text-white placeholder-[#71717A] outline-none pr-28 transition-all"
              />
              <button
                onClick={() => handleGenerate()}
                disabled={isGenerating || !prompt.trim()}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-4 rounded-lg bg-[#A855F7] hover:bg-[#C084FC] disabled:opacity-30 text-black text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                {isGenerating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Generate</span>
              </button>
            </div>

            {/* Quick Sample Prompts */}
            {!generatedPlaylist && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-[#A99DBE]">Try these prompts:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_PROMPTS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPrompt(p);
                        handleGenerate(p);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#1B142B] hover:bg-[#2A2044] border border-[#302744] text-[11px] text-[#D8B4FE] transition-colors text-left"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Generated Result Container */}
          {generatedPlaylist && (
            <div className="flex-1 overflow-y-auto mt-4 pt-3 border-t border-[#302744] space-y-3 pr-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{generatedPlaylist.title}</h3>
                  <p className="text-xs text-[#A99DBE]">{generatedPlaylist.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => playSong(generatedPlaylist.songs[0], generatedPlaylist.songs)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#A855F7] text-black text-xs font-bold hover:scale-105 active:scale-95 transition-all shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-black" /> Play All
                  </button>
                  <button
                    onClick={handleSaveToPlaylists}
                    disabled={isSaved}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isSaved
                        ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                        : 'bg-[#211A32] hover:bg-[#2C2344] border-[#302744] text-white'
                    }`}
                  >
                    {isSaved ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{isSaved ? 'Saved to Playlists' : 'Save Playlist'}</span>
                  </button>
                </div>
              </div>

              {/* Songs List */}
              <div className="space-y-1.5">
                {generatedPlaylist.songs.map((song, idx) => {
                  const art = getArtworkObjectUrl(song);
                  return (
                    <div
                      key={song.id}
                      onClick={() => playSong(song, generatedPlaylist.songs)}
                      className="group flex items-center justify-between p-2 rounded-xl bg-[#141122]/60 hover:bg-[#211A32] border border-transparent hover:border-[#302744] transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 text-center text-xs font-mono text-[#A99DBE]">{idx + 1}</span>
                        <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#211A32] shrink-0 border border-white/10 flex items-center justify-center">
                          {art ? (
                            <img src={art} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Music2 className="w-4 h-4 text-[#A99DBE]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate group-hover:text-[#D8B4FE]">
                            {song.title}
                          </p>
                          <p className="text-[10px] text-[#A99DBE] truncate">{song.artist}</p>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-[#A99DBE] group-hover:text-white">
                        {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
