'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/db';
import { Playlist } from '@/types/music';
import { generateId, blobToDataUrl } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { X, ImagePlus, ListMusic, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistToEdit?: Playlist | null;
  onSuccess?: (playlist: Playlist) => void;
}

export function CreatePlaylistModal({
  isOpen,
  onClose,
  playlistToEdit,
  onSuccess,
}: CreatePlaylistModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [artworkPreview, setArtworkPreview] = useState<string | null>(null);
  const [artworkBlob, setArtworkBlob] = useState<Blob | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (playlistToEdit) {
      setTitle(playlistToEdit.title);
      setDescription(playlistToEdit.description || '');
      setArtworkPreview(playlistToEdit.customArtwork || null);
      setArtworkBlob(playlistToEdit.artworkBlob);
    } else {
      setTitle('');
      setDescription('');
      setArtworkPreview(null);
      setArtworkBlob(undefined);
    }
  }, [playlistToEdit, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await blobToDataUrl(file);
      setArtworkPreview(dataUrl);
      setArtworkBlob(file);
    } catch {
      showToast('Image Error', 'Could not read image file', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Title Required', 'Please provide a playlist name.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      if (playlistToEdit) {
        const updated: Playlist = {
          ...playlistToEdit,
          title: title.trim(),
          description: description.trim() || undefined,
          customArtwork: artworkPreview || undefined,
          artworkBlob: artworkBlob,
          updatedAt: Date.now(),
        };
        await db.playlists.put(updated);
        showToast('Playlist Updated', `"${title}" has been saved.`, 'success');
        if (onSuccess) onSuccess(updated);
      } else {
        const newPlaylist: Playlist = {
          id: `playlist_${generateId()}`,
          title: title.trim(),
          description: description.trim() || undefined,
          customArtwork: artworkPreview || undefined,
          artworkBlob: artworkBlob,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await db.playlists.add(newPlaylist);
        showToast('Playlist Created', `Created "${title}"`, 'success');
        if (onSuccess) onSuccess(newPlaylist);
      }
      onClose();
    } catch (err: any) {
      showToast('Error', err?.message || 'Failed to save playlist', 'error');
    } finally {
      setIsSubmitting(false);
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
          className="relative w-full max-w-md glass-modal border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <ListMusic className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-bold text-white">
                {playlistToEdit ? 'Edit Playlist' : 'Create Playlist'}
              </h2>
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
            {/* Artwork Uploader */}
            <div className="flex justify-center">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-36 h-36 rounded-2xl bg-[#19191F] border-2 border-dashed border-[#303038] hover:border-[var(--accent)] cursor-pointer flex flex-col items-center justify-center overflow-hidden relative group transition-all"
              >
                {artworkPreview ? (
                  <>
                    <img
                      src={artworkPreview}
                      alt="Playlist Cover"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold">
                      Change Cover
                    </div>
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-8 h-8 text-[#A1A1AA] mb-1.5 group-hover:text-[var(--accent)] transition-colors" />
                    <span className="text-[11px] text-[#A1A1AA] font-medium">Add Cover</span>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-white block mb-1">
                Playlist Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Late Night Vibes"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#19191F] border border-[#303038] text-white text-sm focus:border-[var(--accent)] outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-white block mb-1">
                Description (Optional)
              </label>
              <textarea
                placeholder="Give your playlist a description..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2 rounded-xl bg-[#19191F] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none resize-none"
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
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-black hover:opacity-95 transition-all disabled:opacity-50 shadow-md"
              >
                {isSubmitting ? 'Saving...' : playlistToEdit ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
