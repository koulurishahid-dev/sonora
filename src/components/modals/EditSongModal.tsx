'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Song, SongLyrics } from '@/types/music';
import { db, syncAlbumsAndArtists, getArtworkObjectUrl } from '@/lib/db';
import { searchVerifiedArtwork, VerifiedArtworkResult } from '@/lib/metadata';
import { blobToDataUrl } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { X, Edit2, Music2, ImagePlus, Search, Sparkles, Loader2, Check } from 'lucide-react';
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
  const [artworkUrl, setArtworkUrl] = useState('');
  const [artworkBlob, setArtworkBlob] = useState<Blob | undefined>();
  const [isSearchingArt, setIsSearchingArt] = useState(false);
  const [artResults, setArtResults] = useState<VerifiedArtworkResult[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (song) {
      setTitle(song.title);
      setArtist(song.artist);
      setAlbum(song.album);
      setGenre(song.genre || '');
      setYear(song.year ? song.year.toString() : '');
      const existingArt = getArtworkObjectUrl(song) || song.artworkUrl || '';
      setArtworkUrl(existingArt);
      setArtworkBlob(song.artworkBlob);
      setArtResults([]);

      db.lyrics
        .where('songId')
        .equals(song.id)
        .first()
        .then(l => {
          if (l) setLyricsText(l.plainLyrics || '');
          else setLyricsText('');
        });
    }
  }, [song, isOpen]);

  if (!isOpen || !song) return null;

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await blobToDataUrl(file);
      setArtworkUrl(dataUrl);
      setArtworkBlob(file);
      showToast('Artwork Selected', 'Custom image loaded for this song.', 'success');
    } catch {
      showToast('Image Error', 'Failed to read image file.', 'error');
    }
  };

  const handleSearchArtwork = async () => {
    const query = `${title} ${album || artist}`.trim();
    if (!query) return;

    setIsSearchingArt(true);
    try {
      const results = await searchVerifiedArtwork(query);
      setArtResults(results);
      if (results.length === 0) {
        showToast('Notice', 'No verified artwork found for this query. Try editing title/movie name.', 'info');
      }
    } catch {
      showToast('Search Failed', 'Could not query official artwork database.', 'error');
    } finally {
      setIsSearchingArt(false);
    }
  };

  const handleSelectVerifiedArt = (art: VerifiedArtworkResult) => {
    setArtworkUrl(art.artworkUrl);
    setArtworkBlob(undefined);
    if (!album && art.album) setAlbum(art.album);
    if (!artist && art.artist) setArtist(art.artist);
    setArtResults([]);
    showToast('Cover Applied', 'Verified official artwork selected.', 'success');
  };

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
        artworkUrl: artworkUrl.trim() || undefined,
        artworkBlob: artworkBlob,
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
      showToast('Track Updated', `Updated details for "${title}"`, 'success');
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
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative w-full max-w-xl bg-[#121216] border border-[#303038] rounded-3xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#303038]/60 bg-[#16161D]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center">
                <Edit2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Edit Song & Cover Art</h2>
                <p className="text-[11px] text-[#A1A1AA]">
                  Customize movie poster, title, artist, and lyrics
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#25252D] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
            {/* Cover Image Customizer */}
            <div className="p-4 rounded-2xl bg-[#19191F] border border-[#303038] space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-white block">
                Album / Movie Cover Artwork
              </label>

              <div className="flex items-start gap-4">
                {/* Artwork Preview & File Upload */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-2xl bg-[#121216] border-2 border-dashed border-[#303038] hover:border-[var(--accent)] cursor-pointer flex flex-col items-center justify-center overflow-hidden relative group shrink-0 transition-all shadow-md"
                >
                  {artworkUrl ? (
                    <>
                      <img
                        src={artworkUrl}
                        alt="Cover Preview"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-semibold text-center p-1">
                        Change File
                      </div>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="w-6 h-6 text-[#71717A] mb-1" />
                      <span className="text-[10px] text-[#A1A1AA]">Upload</span>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFile}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <div>
                    <label className="text-[11px] text-[#A1A1AA] block mb-1">
                      Direct Cover Image URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://... cover image link"
                      value={artworkUrl}
                      onChange={e => setArtworkUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl bg-[#121216] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSearchArtwork}
                    disabled={isSearchingArt}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-all shadow-sm"
                  >
                    {isSearchingArt ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    )}
                    <span>Find Verified Movie Artwork</span>
                  </button>
                </div>
              </div>

              {/* Verified Art Results Grid */}
              {artResults.length > 0 && (
                <div className="pt-2 border-t border-[#303038]/60 space-y-2">
                  <span className="text-[11px] font-bold text-purple-300">
                    Official Covers Found (Click to Apply):
                  </span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {artResults.map((r, i) => (
                      <div
                        key={i}
                        onClick={() => handleSelectVerifiedArt(r)}
                        className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer border border-[#303038] hover:border-[var(--accent)] transition-all shadow-md"
                        title={`${r.title} • ${r.album}`}
                      >
                        <img src={r.artworkUrl} alt={r.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Check className="w-4 h-4 text-emerald-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Song Meta Fields */}
            <div>
              <label className="text-xs font-semibold text-white block mb-1">
                Song Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-white block mb-1">Artist / Singer</label>
                <input
                  type="text"
                  value={artist}
                  onChange={e => setArtist(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white block mb-1">Movie / Album Name</label>
                <input
                  type="text"
                  value={album}
                  onChange={e => setAlbum(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-white block mb-1">Mood / Genre</label>
                <input
                  type="text"
                  placeholder="e.g. Romantic Telugu Melodies"
                  value={genre}
                  onChange={e => setGenre(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-white block mb-1">Year</label>
                <input
                  type="number"
                  placeholder="e.g. 2023"
                  value={year}
                  onChange={e => setYear(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white block mb-1">Lyrics</label>
              <textarea
                rows={3}
                placeholder="Plain lyrics or synchronized LRC timestamps like [00:12.30] Line..."
                value={lyricsText}
                onChange={e => setLyricsText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none resize-none font-mono"
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#303038]">
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
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-black hover:opacity-95 transition-all disabled:opacity-50 shadow-md font-bold"
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
