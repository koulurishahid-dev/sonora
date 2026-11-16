'use client';

import React, { useState, useEffect } from 'react';
import { Song, SongLyrics } from '@/types/music';
import { db, syncAlbumsAndArtists } from '@/lib/db';
import { useToast } from '@/context/ToastContext';
import { X, Edit2, FileText, Music2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface EditSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song | null;
  onSuccess?: () => void;
}

export function EditSongModal({ isOpen, onClose, song, onSuccess }: EditSongModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState<string>('');
  const [lyricsText, setLyricsText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (song) {
      setTitle(song.title);
      setArtist(song.artist);
      setAlbum(song.album);
      setGenre(song.genre || '');
      setYear(song.year ? song.year.toString() : '');

      db.lyrics.where('songId').equals(song.id).first().then(l => {
        if (l) setLyricsText(l.plainLyrics || '');
        else setLyricsText('');
      });
    }
  }, [song, isOpen]);

  if (!isOpen || !song) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Title Required', 'Song must have a title.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await db.songs.update(song.id, {
        title: title.trim(),
        artist: (artist.trim()) || 'Unknown Artist',
        album: (album.trim()) || 'Unknown Album',
        genre: genre.trim() || undefined,
        year: year ? parseInt(year, 10) : undefined,
      });

      if (lyricsText.trim()) {
        const existingLyrics = await db.lyrics.where('songId').equals(song.id).first();
        await db.lyrics.put({
          id: existingLyrics?.id || `lyrics_${song.id}`,
          songId: song.id,
          plainLyrics: lyricsText.trim(),
          updatedAt: Date.now(),
        });
      }

      await syncAlbumsAndArtists();
      showToast('Track Updated', `Updated "${title}"`, 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      showToast('Error', err?.message || 'Failed to update song details', 'error');
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
          className="relative w-full max-w-lg bg-[#121216] border border-[#303038] rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#303038]">
            <div className="flex items-center gap-2.5">
              <Edit2 className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-bold text-white">Edit Track Details</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#25252D] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className="text-xs font-semibold text-white block mb-1">
                Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-white block mb-1">Artist</label>
                <input
                  type="text"
                  value={artist}
                  onChange={e => setArtist(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white block mb-1">Album</label>
                <input
                  type="text"
                  value={album}
                  onChange={e => setAlbum(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-white block mb-1">Genre</label>
                <input
                  type="text"
                  value={genre}
                  onChange={e => setGenre(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white block mb-1">Release Year</label>
                <input
                  type="number"
                  placeholder="e.g. 2026"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white block mb-1">Lyrics</label>
              <textarea
                rows={4}
                placeholder="Plain lyrics or synchronized LRC timestamps..."
                value={lyricsText}
                onChange={e => setLyricsText(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none resize-none font-mono"
              />
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
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
