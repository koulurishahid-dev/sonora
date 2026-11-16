'use client';

import React, { useEffect, useState } from 'react';
import { Song, ViewType } from '@/types/music';
import { db, getArtworkObjectUrl, getStorageEstimate, requestPersistentStorage } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { useToast } from '@/context/ToastContext';
import { formatDuration, formatFileSize } from '@/lib/utils';
import {
  WifiOff,
  CheckCircle2,
  HardDrive,
  ShieldCheck,
  Play,
  Heart,
  MoreVertical,
  Music2,
  Pause,
  Trash2,
} from 'lucide-react';

interface OfflineViewProps {
  onNavigate: (view: ViewType, param?: string) => void;
  onSongContextMenu: (e: React.MouseEvent, song: Song) => void;
}

export function OfflineView({ onNavigate, onSongContextMenu }: OfflineViewProps) {
  const { playSong, currentSong, isPlaying, togglePlay, toggleFavorite } = usePlayer();
  const { showToast } = useToast();

  const [offlineSongs, setOfflineSongs] = useState<Song[]>([]);
  const [storage, setStorage] = useState<{ usage: number; quota: number; percent: number }>({
    usage: 0,
    quota: 0,
    percent: 0,
  });
  const [isPersisted, setIsPersisted] = useState(false);

  const loadData = async () => {
    const all = await db.songs.toArray();
    // Offline songs are those with local audio Blobs stored in IndexedDB
    const available = all.filter(s => s.isLocal && s.audioBlob);
    setOfflineSongs(available);

    const est = await getStorageEstimate();
    setStorage(est);

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      const persisted = await navigator.storage.persisted();
      setIsPersisted(persisted);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRequestPersistence = async () => {
    const granted = await requestPersistentStorage();
    setIsPersisted(granted);
    if (granted) {
      showToast('Storage Protected', 'Browser granted persistent offline storage!', 'success');
    } else {
      showToast('Notice', 'Persistent storage was not granted or already managed by browser', 'info');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Offline Sanctuary</h1>
        <p className="text-xs text-[#A1A1AA] mt-1">
          Songs stored securely on this device, always ready to play without internet or cellular data
        </p>
      </div>

      {/* Storage Health & Persistence Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Storage card */}
        <div className="p-5 rounded-2xl bg-[#19191F] border border-[#303038] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-5 h-5 text-[var(--accent)]" />
              <span className="text-sm font-bold text-white">Local IndexedDB Cache</span>
            </div>
            <span className="text-xs font-mono text-[var(--accent)] font-semibold">
              {formatFileSize(storage.usage)}
            </span>
          </div>

          <div className="w-full bg-[#121216] h-2 rounded-full overflow-hidden border border-[#303038]">
            <div
              className="bg-[var(--accent)] h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.max(1, Math.min(100, storage.percent))}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-[#71717A]">
            <span>{storage.percent}% of browser quota</span>
            <span>Max available: {formatFileSize(storage.quota)}</span>
          </div>
        </div>

        {/* Persistence Card */}
        <div className="p-5 rounded-2xl bg-[#19191F] border border-[#303038] flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShieldCheck
                className={`w-5 h-5 ${isPersisted ? 'text-emerald-400' : 'text-amber-400'}`}
              />
              <span className="text-sm font-bold text-white">Persistent Storage</span>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                isPersisted
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-800 text-amber-300'
              }`}
            >
              {isPersisted ? 'Guaranteed' : 'Best Effort'}
            </span>
          </div>

          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            Persistent storage protects your songs from being cleared automatically by the browser
            when disk space is low.
          </p>

          {!isPersisted && (
            <button
              onClick={handleRequestPersistence}
              className="self-start text-xs font-semibold px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black hover:opacity-95 transition-all shadow-sm"
            >
              Request Persistent Storage
            </button>
          )}
        </div>
      </div>

      {/* Offline Song Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white">
            Available Offline ({offlineSongs.length})
          </h2>
          {offlineSongs.length > 0 && (
            <button
              onClick={() => playSong(offlineSongs[0], offlineSongs)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-black text-xs font-bold hover:scale-105 transition-all shadow-md"
            >
              <Play className="w-3.5 h-3.5 fill-black" /> Play All Offline
            </button>
          )}
        </div>

        {offlineSongs.length === 0 ? (
          <div className="text-center py-16 text-[#A1A1AA] border border-dashed border-[#303038] rounded-2xl">
            <WifiOff className="w-12 h-12 text-[#303038] mx-auto mb-3" />
            <p className="text-base font-semibold text-white">No offline songs available</p>
            <p className="text-xs text-[#71717A] mt-1 mb-4">
              Local MP3, WAV or FLAC uploads are automatically saved for offline listening.
            </p>
            <button
              onClick={() => onNavigate('library')}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] text-black text-xs font-bold"
            >
              Go to Library
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs select-none">
              <thead>
                <tr className="border-b border-[#303038]/60 text-[#71717A] uppercase font-bold tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 w-12 text-center">#</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3 hidden md:table-cell">Album</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">Size</th>
                  <th className="py-2.5 px-3 w-20 text-right">Duration</th>
                  <th className="py-2.5 px-3 w-16 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#303038]/30">
                {offlineSongs.map((song, idx) => {
                  const isCur = currentSong?.id === song.id;
                  const artworkUrl = getArtworkObjectUrl(song);

                  return (
                    <tr
                      key={song.id}
                      onContextMenu={e => onSongContextMenu(e, song)}
                      onClick={() => (isCur ? togglePlay() : playSong(song, offlineSongs))}
                      className={`group hover:bg-[#19191F]/90 cursor-pointer transition-colors ${
                        isCur ? 'bg-[var(--accent)]/10 text-[var(--accent)]' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center text-[#71717A] font-mono">
                        <div className="flex items-center justify-center">
                          {isCur && isPlaying ? (
                            <Pause className="w-3.5 h-3.5 fill-[var(--accent)] text-[var(--accent)]" />
                          ) : (
                            <>
                              <span className="group-hover:hidden">{idx + 1}</span>
                              <Play className="w-3.5 h-3.5 hidden group-hover:block fill-white text-white" />
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-[#25252D] shrink-0 flex items-center justify-center">
                            {artworkUrl ? (
                              <img src={artworkUrl} alt={song.title} className="w-full h-full object-cover" />
                            ) : (
                              <Music2 className="w-4 h-4 text-[#71717A]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={`font-semibold truncate text-xs ${
                                  isCur ? 'text-[var(--accent)]' : 'text-white'
                                }`}
                              >
                                {song.title}
                              </p>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            </div>
                            <p className="text-[11px] text-[#A1A1AA] truncate">{song.artist}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 hidden md:table-cell text-[#A1A1AA] truncate max-w-xs">
                        {song.album}
                      </td>

                      <td className="py-2.5 px-3 hidden sm:table-cell text-[#71717A] font-mono text-[11px]">
                        {formatFileSize(song.fileSize)}
                      </td>

                      <td className="py-2.5 px-3 text-right text-[#A1A1AA] font-mono text-[11px]">
                        {formatDuration(song.duration)}
                      </td>

                      <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => toggleFavorite(song.id)}
                            className="p-1 rounded text-[#71717A] hover:text-white"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                song.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                              }`}
                            />
                          </button>
                          <button
                            onClick={e => onSongContextMenu(e, song)}
                            className="p-1 rounded text-[#71717A] hover:text-white"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
