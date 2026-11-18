'use client';

import React, { useState } from 'react';
import { db, syncAlbumsAndArtists } from '@/lib/db';
import { Song } from '@/types/music';
import { useToast } from '@/context/ToastContext';
import {
  SPOTIFY_TELUGU_CATEGORIES,
  importAllSpotifyTeluguCategories,
  parseSpotifyUrl,
  fetchSpotifyMetadata,
} from '@/lib/spotifyService';
import {
  X,
  Sparkles,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Music,
  FolderHeart,
  Flame,
  Radio,
  Disc3,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SpotifyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SpotifyImportModal({ isOpen, onClose, onSuccess }: SpotifyImportModalProps) {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'all' | 'custom'>('all');

  // Bulk import state
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ percent: number; status: string }>({
    percent: 0,
    status: '',
  });

  // Custom link import state
  const [spotifyUrl, setSpotifyUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Love Songs');
  const [customLoading, setCustomLoading] = useState(false);
  const [customPreview, setCustomPreview] = useState<{
    title: string;
    artist: string;
    thumbnailUrl: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleBulkImport = async () => {
    setIsImporting(true);
    setImportProgress({ percent: 5, status: 'Initializing Spotify Telugu catalog...' });

    try {
      const result = await importAllSpotifyTeluguCategories((percent, status) => {
        setImportProgress({ percent, status });
      });

      showToast(
        'Spotify Import Complete',
        `Successfully imported ${result.totalImported} songs into ${result.categoriesCount} categories!`,
        'success'
      );
      if (onSuccess) onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      showToast('Import Failed', err?.message || 'Failed to import Spotify catalog.', 'error');
    } finally {
      setIsImporting(false);
      setImportProgress({ percent: 0, status: '' });
    }
  };

  const handlePreviewCustomUrl = async () => {
    if (!spotifyUrl.trim()) return;
    const parsed = parseSpotifyUrl(spotifyUrl);
    if (!parsed) {
      showToast('Invalid URL', 'Please enter a valid open.spotify.com link.', 'error');
      return;
    }

    setCustomLoading(true);
    try {
      const meta = await fetchSpotifyMetadata(spotifyUrl);
      if (meta) {
        setCustomPreview(meta);
        showToast('Found on Spotify', `Found "${meta.title}"`, 'success');
      } else {
        showToast('Spotify Metadata', 'Could not fetch metadata from Spotify oEmbed.', 'error');
      }
    } catch (e) {
      showToast('Error', 'Failed to reach Spotify service.', 'error');
    } finally {
      setCustomLoading(false);
    }
  };

  const handleSaveCustomSpotifySong = async () => {
    if (!customPreview) return;

    try {
      const songId = `spotify_custom_${Date.now()}`;
      const song: Song = {
        id: songId,
        title: customPreview.title,
        artist: customPreview.artist,
        album: 'Spotify Telugu Import',
        year: new Date().getFullYear(),
        genre: selectedCategory,
        category: selectedCategory,
        duration: 240, // default 4 mins
        hash: `spotify_${songId}`,
        isLocal: false,
        providerType: 'spotify',
        spotifyUrl: spotifyUrl,
        artworkUrl: customPreview.thumbnailUrl,
        dateAdded: Date.now(),
        playCount: 1,
        isFavorite: true,
        isOfflineAvailable: true,
      };

      await db.songs.put(song);

      // Find or create category playlist
      const targetPlId = `pl_spotify_${selectedCategory.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const existingPl = await db.playlists.get(targetPlId);
      if (!existingPl) {
        await db.playlists.put({
          id: targetPlId,
          title: `Spotify: ${selectedCategory}`,
          description: `Custom Telugu songs imported from Spotify under ${selectedCategory}.`,
          customArtwork: customPreview.thumbnailUrl,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      const songCount = await db.playlistSongs.where('playlistId').equals(targetPlId).count();
      await db.playlistSongs.put({
        id: `${targetPlId}_${songId}`,
        playlistId: targetPlId,
        songId: songId,
        order: songCount,
        addedAt: Date.now(),
      });

      await syncAlbumsAndArtists();
      showToast('Imported', `Added "${song.title}" to ${selectedCategory}!`, 'success');
      setSpotifyUrl('');
      setCustomPreview(null);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast('Error', 'Could not save imported song to library.', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative w-full max-w-2xl bg-[#0D0F14]/95 border border-[#1ED760]/30 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col z-10 max-h-[90vh]"
      >
        {/* Subtle Ambient Spotify Green Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#1ED760]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.08] relative z-10 bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1ED760] text-black flex items-center justify-center shadow-lg shadow-[#1ED760]/20 font-bold">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.495 17.306c-.216.353-.674.464-1.026.25-2.812-1.718-6.353-2.106-10.523-1.154-.403.092-.803-.16-.895-.563-.092-.403.16-.803.563-.895 4.567-1.042 8.49-.602 11.63 1.336.353.216.464.674.251 1.026zm1.467-3.262c-.272.441-.852.58-1.293.308-3.22-1.979-8.127-2.551-11.935-1.395-.497.151-1.029-.136-1.18-.633-.151-.497.136-1.029.633-1.18 4.356-1.322 9.776-.682 13.467 1.587.441.272.58.852.308 1.293zm.126-3.41c-3.86-2.292-10.228-2.503-13.896-1.389-.592.18-1.226-.154-1.406-.746-.18-.592.154-1.226.746-1.406 4.218-1.281 11.253-1.034 15.696 1.603.533.316.708 1.011.392 1.544-.316.533-1.011.708-1.532.394z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                Spotify Telugu Importer
              </h2>
              <p className="text-xs text-white/60">
                Import complete Telugu songs & automatically divide into categories
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/[0.08] bg-black/30 px-6 pt-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? 'border-[#1ED760] text-[#1ED760]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Curated Spotify Categories</span>
          </button>

          <button
            onClick={() => setActiveTab('custom')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'custom'
                ? 'border-[#1ED760] text-[#1ED760]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>Paste Spotify Link</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'all' ? (
            <div className="space-y-6">
              {/* Introduction Banner */}
              <div className="p-4 rounded-2xl bg-[#1ED760]/10 border border-[#1ED760]/25 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-[#1ED760]">
                    Complete Spotify Telugu Music Collection
                  </h4>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Imports all full Telugu tracks, synced karaoke lyrics, studio masters, and divides them automatically into 6 official Spotify category mixtapes.
                  </p>
                </div>
                <button
                  onClick={handleBulkImport}
                  disabled={isImporting}
                  className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1ED760] hover:bg-[#1fdb63] active:scale-95 text-black text-xs font-extrabold shadow-lg shadow-[#1ED760]/25 transition-all disabled:opacity-50"
                >
                  {isImporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isImporting ? 'Importing...' : 'Import All Categories'}</span>
                </button>
              </div>

              {/* Progress Indicator */}
              {isImporting && (
                <div className="p-4 rounded-2xl bg-black/40 border border-[#1ED760]/40 space-y-2">
                  <div className="flex items-center justify-between text-xs text-white">
                    <span className="flex items-center gap-2 font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1ED760]" />
                      {importProgress.status}
                    </span>
                    <span className="font-mono text-[#1ED760] font-bold">{importProgress.percent}%</span>
                  </div>
                  <div className="w-full bg-white/[0.08] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[#1ED760] h-full transition-all duration-300"
                      style={{ width: `${importProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Categories Preview Grid */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white/50">
                  Target Spotify Categories
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SPOTIFY_TELUGU_CATEGORIES.map(cat => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-[#1ED760]/30 transition-all group"
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/40 shrink-0 border border-white/10 relative">
                        <img src={cat.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white group-hover:text-[#1ED760] truncate transition-colors">
                            {cat.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 line-clamp-1 mt-0.5">
                          {cat.description}
                        </p>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-[#1ED760]/15 text-[#1ED760] border border-[#1ED760]/30 shrink-0">
                        {cat.categoryTag}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: PASTE SPOTIFY LINK */
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Spotify Track, Album or Playlist URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://open.spotify.com/track/..."
                    value={spotifyUrl}
                    onChange={e => setSpotifyUrl(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.1] focus:border-[#1ED760] text-sm text-white placeholder-white/30 focus:outline-none transition-colors"
                  />
                  <button
                    onClick={handlePreviewCustomUrl}
                    disabled={customLoading || !spotifyUrl.trim()}
                    className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white text-xs font-bold border border-white/10 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {customLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>Inspect</span>
                  </button>
                </div>
                <p className="text-[11px] text-white/40">
                  Paste any public Spotify song link to extract track info, high-res artwork, and add it to your collection.
                </p>
              </div>

              {/* Target Category Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Select Target Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#141720] border border-white/[0.1] focus:border-[#1ED760] text-sm text-white focus:outline-none cursor-pointer"
                >
                  <option value="Love Songs">💖 Telugu Romance & Love Songs</option>
                  <option value="Melodies">🎵 Soulful Melodies & Acoustic</option>
                  <option value="Mass & Beats">🔥 Telugu Mass & Dance Beats</option>
                  <option value="Golden Classics">🌟 2000s Nostalgia & Golden Classics</option>
                  <option value="Sid Sriram">🎤 Sid Sriram Essentials</option>
                  <option value="Blockbusters">⚡ DSP, Thaman & Anirudh Hits</option>
                </select>
              </div>

              {/* Preview Card */}
              {customPreview && (
                <div className="p-4 rounded-2xl bg-white/[0.04] border border-[#1ED760]/40 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={customPreview.thumbnailUrl}
                      alt=""
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-white/10"
                    />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-white truncate">{customPreview.title}</h4>
                      <p className="text-xs text-white/60 truncate mt-0.5">{customPreview.artist}</p>
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono bg-[#1ED760]/15 text-[#1ED760] border border-[#1ED760]/30 font-bold">
                        Category: {selectedCategory}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleSaveCustomSpotifySong}
                    className="shrink-0 px-4 py-2 rounded-xl bg-[#1ED760] hover:bg-[#1fdb63] active:scale-95 text-black text-xs font-bold shadow-md transition-all"
                  >
                    Add to Library
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 border-t border-white/[0.08] bg-black/30 flex items-center justify-between text-xs text-white/50">
          <span className="flex items-center gap-1.5 font-mono">
            <span className="w-2 h-2 rounded-full bg-[#1ED760] animate-pulse" />
            Spotify Web Audio Ready
          </span>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl hover:bg-white/[0.08] text-white transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
