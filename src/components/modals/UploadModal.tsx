'use client';

import React, { useState, useRef } from 'react';
import { extractAudioMetadata, ExtractedMetadata } from '@/lib/metadata';
import { db, syncAlbumsAndArtists } from '@/lib/db';
import { Song } from '@/types/music';
import { generateId, formatDuration, formatFileSize } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import {
  X,
  UploadCloud,
  FileAudio,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Edit2,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadItem {
  id: string;
  file: File;
  metadata?: ExtractedMetadata;
  status: 'parsing' | 'ready' | 'duplicate' | 'saving' | 'done' | 'error';
  errorMessage?: string;
  editedTitle?: string;
  editedArtist?: string;
  editedAlbum?: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const { showToast } = useToast();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingItem, setEditingItem] = useState<UploadItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newItems: UploadItem[] = fileArray.map(file => ({
      id: generateId(),
      file,
      status: 'parsing',
    }));

    setItems(prev => [...prev, ...newItems]);

    // Parse each file
    for (const item of newItems) {
      try {
        const meta = await extractAudioMetadata(item.file);
        // Check for duplicate in DB
        const existing = await db.songs.where('hash').equals(meta.hash).first();

        setItems(prev =>
          prev.map(i =>
            i.id === item.id
              ? {
                  ...i,
                  metadata: meta,
                  status: existing ? 'duplicate' : 'ready',
                  editedTitle: meta.title,
                  editedArtist: meta.artist,
                  editedAlbum: meta.album,
                }
              : i
          )
        );
      } catch (err: any) {
        setItems(prev =>
          prev.map(i =>
            i.id === item.id
              ? {
                  ...i,
                  status: 'error',
                  errorMessage: err?.message || 'Failed to read audio tags',
                }
              : i
          )
        );
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const saveAllToLibrary = async () => {
    const readyItems = items.filter(i => i.status === 'ready' || i.status === 'duplicate');
    if (readyItems.length === 0) return;

    setIsProcessing(true);
    let savedCount = 0;

    for (const item of readyItems) {
      if (!item.metadata) continue;

      setItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, status: 'saving' } : i))
      );

      const song: Song = {
        id: `song_${generateId()}`,
        title: item.editedTitle || item.metadata.title,
        artist: item.editedArtist || item.metadata.artist,
        album: item.editedAlbum || item.metadata.album,
        year: item.metadata.year,
        genre: item.metadata.genre,
        duration: item.metadata.duration,
        trackNumber: item.metadata.trackNumber,
        bitrate: item.metadata.bitrate,
        codec: item.metadata.codec,
        fileSize: item.file.size,
        hash: item.metadata.hash,
        isLocal: true,
        providerType: 'local',
        audioBlob: item.file,
        artworkBlob: item.metadata.artworkBlob,
        artworkUrl:
          item.metadata.artworkUrl && !item.metadata.artworkUrl.startsWith('blob:')
            ? item.metadata.artworkUrl
            : undefined,
        dateAdded: Date.now(),
        playCount: 0,
        isFavorite: false,
        isOfflineAvailable: true,
      };

      await db.songs.add(song);
      savedCount++;

      setItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, status: 'done' } : i))
      );
    }

    await syncAlbumsAndArtists();
    setIsProcessing(false);
    showToast('Import Complete', `Added ${savedCount} tracks to your library`, 'success');

    if (onSuccess) onSuccess();
    setTimeout(() => {
      onClose();
      setItems([]);
    }, 800);
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
          className="relative w-full max-w-2xl glass-modal border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <UploadCloud className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-bold text-white">Import Music Files</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#25252D] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 flex-1 overflow-y-auto space-y-6">
            {/* Drag and Drop Zone */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 scale-[1.01]'
                  : 'border-[#303038] hover:border-[#42424E] bg-[#19191F]/50 hover:bg-[#19191F]'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                className="hidden"
                onChange={e => {
                  if (e.target.files) handleFiles(e.target.files);
                }}
              />
              <div className="w-14 h-14 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <p className="text-base font-semibold text-white">
                Drag and drop your audio files here
              </p>
              <p className="text-xs text-[#A1A1AA] mt-1 text-center max-w-sm">
                Supports MP3, WAV, M4A, AAC, OGG, and FLAC. ID3 tags and embedded album art will be
                automatically extracted.
              </p>
            </div>

            {/* Upload Queue / Extracted List */}
            {items.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1AA]">
                    Files to Import ({items.length})
                  </h3>
                  <button
                    onClick={() => setItems([])}
                    className="text-xs text-[#A1A1AA] hover:text-rose-400 transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {items.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#19191F] border border-[#303038] gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#25252D] shrink-0 flex items-center justify-center">
                          {item.metadata?.artworkUrl ? (
                            <img
                              src={item.metadata.artworkUrl}
                              alt="Artwork"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileAudio className="w-5 h-5 text-[#A1A1AA]" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">
                            {item.editedTitle || item.metadata?.title || item.file.name}
                          </p>
                          <p className="text-xs text-[#A1A1AA] truncate">
                            {item.editedArtist || item.metadata?.artist || 'Unknown Artist'} •{' '}
                            {item.metadata?.duration ? formatDuration(item.metadata.duration) : ''}{' '}
                            ({formatFileSize(item.file.size)})
                          </p>
                        </div>
                      </div>

                      {/* Status / Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.status === 'parsing' && (
                          <div className="flex items-center gap-1.5 text-xs text-[#A1A1AA]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Reading tags...</span>
                          </div>
                        )}

                        {item.status === 'duplicate' && (
                          <span
                            className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-800"
                            title="A song with the same hash already exists in your library"
                          >
                            <AlertTriangle className="w-3 h-3" /> Duplicate
                          </span>
                        )}

                        {item.status === 'ready' && (
                          <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800">
                            Ready
                          </span>
                        )}

                        {item.status === 'saving' && (
                          <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
                        )}

                        {item.status === 'done' && (
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        )}

                        {/* Edit metadata trigger */}
                        {item.metadata && (
                          <button
                            onClick={() => setEditingItem(item)}
                            className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#25252D]"
                            title="Edit Tags"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded-lg text-[#71717A] hover:text-rose-400 hover:bg-[#25252D]"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inline Editor Drawer if an item is selected */}
            {editingItem && (
              <div className="p-4 rounded-xl bg-[#19191F] border border-[var(--accent)]/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                    Edit Track Metadata
                  </h4>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="text-xs text-[#A1A1AA] hover:text-white"
                  >
                    Done
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-[#A1A1AA] block mb-1">Title</label>
                    <input
                      type="text"
                      value={editingItem.editedTitle || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setEditingItem({ ...editingItem, editedTitle: val });
                        setItems(prev =>
                          prev.map(i => (i.id === editingItem.id ? { ...i, editedTitle: val } : i))
                        );
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#121216] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A1A1AA] block mb-1">Artist</label>
                    <input
                      type="text"
                      value={editingItem.editedArtist || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setEditingItem({ ...editingItem, editedArtist: val });
                        setItems(prev =>
                          prev.map(i => (i.id === editingItem.id ? { ...i, editedArtist: val } : i))
                        );
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#121216] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-[#A1A1AA] block mb-1">Album</label>
                    <input
                      type="text"
                      value={editingItem.editedAlbum || ''}
                      onChange={e => {
                        const val = e.target.value;
                        setEditingItem({ ...editingItem, editedAlbum: val });
                        setItems(prev =>
                          prev.map(i => (i.id === editingItem.id ? { ...i, editedAlbum: val } : i))
                        );
                      }}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#121216] border border-[#303038] text-white text-xs focus:border-[var(--accent)] outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#303038] bg-[#121216]">
            <span className="text-xs text-[#A1A1AA]">
              {items.filter(i => i.status === 'ready' || i.status === 'duplicate').length} files ready
            </span>
            <div className="flex gap-2.5">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#A1A1AA] hover:text-white hover:bg-[#25252D] border border-[#303038] transition-all"
              >
                Cancel
              </button>
              <button
                disabled={
                  isProcessing ||
                  items.filter(i => i.status === 'ready' || i.status === 'duplicate').length === 0
                }
                onClick={saveAllToLibrary}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--accent)] text-black hover:opacity-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md font-semibold"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  'Import to Library'
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
