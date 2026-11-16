'use client';

import React, { useState } from 'react';
import { db, syncAlbumsAndArtists } from '@/lib/db';
import { Song } from '@/types/music';
import { generateId } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import {
  X,
  Link2,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  Globe,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function AddLinkModal({ isOpen, onClose, onSuccess }: AddLinkModalProps) {
  const { showToast } = useToast();
  const [sourceUrl, setSourceUrl] = useState('');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [artworkUrl, setArtworkUrl] = useState('');
  const [genre, setGenre] = useState('');
  const [providerType, setProviderType] = useState<'stream' | 'external'>('stream');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);
  const [testDuration, setTestDuration] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const testStreamPlayback = async () => {
    if (!sourceUrl.trim()) return;
    setTesting(true);
    setTestResult(null);

    const testAudio = new Audio();
    testAudio.src = sourceUrl.trim();

    const cleanup = () => {
      testAudio.pause();
      testAudio.src = '';
    };

    const timeout = setTimeout(() => {
      cleanup();
      setTesting(false);
      setTestResult('failed');
      showToast('Playback Test', 'Could not verify direct stream playback. Check CORS or URL.', 'error');
    }, 8000);

    testAudio.oncanplay = () => {
      clearTimeout(timeout);
      setTestDuration(Math.round(testAudio.duration || 0));
      setTestResult('success');
      setTesting(false);
      cleanup();
      showToast('Verified', 'Audio stream is directly playable in browser!', 'success');
    };

    testAudio.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      setTesting(false);
      setTestResult('failed');
    };

    try {
      testAudio.load();
    } catch {
      clearTimeout(timeout);
      setTesting(false);
      setTestResult('failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceUrl.trim() || !title.trim()) {
      showToast('Required fields', 'Please enter at least a title and a source URL.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const songId = `link_${generateId()}`;
      const song: Song = {
        id: songId,
        title: title.trim(),
        artist: (artist.trim()) || 'Unknown Artist',
        album: (album.trim()) || 'Web Stream',
        genre: genre.trim() || 'Online Audio',
        duration: testDuration > 0 ? testDuration : 180, // estimated if live stream
        hash: `link_${sourceUrl.trim()}`,
        isLocal: false,
        sourceUrl: sourceUrl.trim(),
        providerType,
        artworkUrl: artworkUrl.trim() || undefined,
        dateAdded: Date.now(),
        playCount: 0,
        isFavorite: false,
        isOfflineAvailable: false,
      };

      await db.songs.add(song);
      await syncAlbumsAndArtists();

      showToast('Added to Library', `"${title}" has been saved.`, 'success');
      if (onSuccess) onSuccess();
      onClose();
      // Reset form
      setSourceUrl('');
      setTitle('');
      setArtist('');
      setAlbum('');
      setArtworkUrl('');
      setGenre('');
      setTestResult(null);
    } catch (err: any) {
      showToast('Error', err?.message || 'Failed to save external link.', 'error');
    } finally {
      setIsSaving(false);
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
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-lg bg-[#121216] border border-[#303038] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#303038]">
            <div className="flex items-center gap-2.5">
              <Link2 className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-bold text-white">Add Music Link</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#25252D] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-white block mb-1.5">
                Direct Audio / Stream URL <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  required
                  placeholder="https://example.com/audio.mp3 or radio stream"
                  value={sourceUrl}
                  onChange={e => {
                    setSourceUrl(e.target.value);
                    setTestResult(null);
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                />
                <button
                  type="button"
                  onClick={testStreamPlayback}
                  disabled={!sourceUrl.trim() || testing}
                  className="px-3.5 py-2 rounded-xl bg-[#25252D] hover:bg-[#303038] border border-[#303038] text-xs font-semibold text-white flex items-center gap-1.5 disabled:opacity-40 transition-all"
                  title="Verify stream playback in browser"
                >
                  {testing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : testResult === 'success' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  ) : testResult === 'failed' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span>Test</span>
                </button>
              </div>
              <p className="text-[11px] text-[#A1A1AA] mt-1">
                Enter a direct MP3/AAC/OGG URL or internet broadcast. Must permit CORS playback.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-white block mb-1">
                  Track Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ambient Rain Stream"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white block mb-1">Artist</label>
                <input
                  type="text"
                  placeholder="e.g. Lofi Girl / Station"
                  value={artist}
                  onChange={e => setArtist(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-white block mb-1">Album</label>
                <input
                  type="text"
                  placeholder="e.g. Chill Radio"
                  value={album}
                  onChange={e => setAlbum(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white block mb-1">Genre</label>
                <input
                  type="text"
                  placeholder="e.g. Lo-Fi / Jazz / Podcast"
                  value={genre}
                  onChange={e => setGenre(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white block mb-1">Cover Artwork URL</label>
              <input
                type="url"
                placeholder="https://example.com/artwork.jpg (optional)"
                value={artworkUrl}
                onChange={e => setArtworkUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
              />
            </div>

            {/* Provider Type */}
            <div>
              <label className="text-xs font-semibold text-white block mb-1">Link Category</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProviderType('stream')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                    providerType === 'stream'
                      ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-[#19191F] border-[#303038] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <Radio className="w-4 h-4" /> Live Audio Stream
                </button>
                <button
                  type="button"
                  onClick={() => setProviderType('external')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                    providerType === 'external'
                      ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-[#19191F] border-[#303038] text-[#A1A1AA] hover:text-white'
                  }`}
                >
                  <Globe className="w-4 h-4" /> Web Reference / Podcast
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#303038]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-white hover:bg-[#25252D] border border-[#303038] transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-black hover:opacity-95 transition-all disabled:opacity-50 shadow-md"
              >
                {isSaving ? 'Saving...' : 'Save Track'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
