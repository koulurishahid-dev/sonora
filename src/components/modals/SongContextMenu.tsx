'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Song, Playlist } from '@/types/music';
import { db, syncAlbumsAndArtists } from '@/lib/db';
import { usePlayer } from '@/context/PlayerContext';
import { useToast } from '@/context/ToastContext';
import {
  Play,
  ListPlus,
  Heart,
  Edit2,
  Disc,
  User,
  Trash2,
  FolderPlus,
  Plus,
  Share2,
  Download,
} from 'lucide-react';

interface SongContextMenuProps {
  song: Song;
  x: number;
  y: number;
  onClose: () => void;
  onEdit: (song: Song) => void;
  onViewAlbum?: (albumTitle: string) => void;
  onViewArtist?: (artistName: string) => void;
  onDeleteSuccess?: () => void;
}

export function SongContextMenu({
  song,
  x,
  y,
  onClose,
  onEdit,
  onViewAlbum,
  onViewArtist,
  onDeleteSuccess,
}: SongContextMenuProps) {
  const { playSong, playNext, addToQueue, toggleFavorite } = usePlayer();
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    db.playlists.toArray().then(setPlaylists);
  }, []);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust coordinates if menu would overflow screen edges
  const menuWidth = 220;
  const menuHeight = 320;
  const adjustedX = Math.min(x, (typeof window !== 'undefined' ? window.innerWidth : 1000) - menuWidth - 20);
  const adjustedY = Math.min(y, (typeof window !== 'undefined' ? window.innerHeight : 800) - menuHeight - 20);

  const handleAddToPlaylist = async (playlistId: string, playlistTitle: string) => {
    const existing = await db.playlistSongs
      .where('playlistId')
      .equals(playlistId)
      .and(item => item.songId === song.id)
      .first();

    if (existing) {
      showToast('Already added', `Track is already in "${playlistTitle}"`, 'info');
      onClose();
      return;
    }

    const count = await db.playlistSongs.where('playlistId').equals(playlistId).count();
    await db.playlistSongs.add({
      id: `${playlistId}_${song.id}`,
      playlistId,
      songId: song.id,
      order: count,
      addedAt: Date.now(),
    });

    showToast('Added to Playlist', `Added "${song.title}" to ${playlistTitle}`, 'success');
    onClose();
  };

  const handleDeleteSong = async () => {
    if (confirm(`Remove "${song.title}" from your library?`)) {
      await db.songs.delete(song.id);
      await db.playlistSongs.where('songId').equals(song.id).delete();
      await db.favorites.where('songId').equals(song.id).delete();
      await db.lyrics.where('songId').equals(song.id).delete();
      await syncAlbumsAndArtists();
      showToast('Deleted', `Removed "${song.title}" from library`, 'info');
      if (onDeleteSuccess) onDeleteSuccess();
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      style={{ top: `${adjustedY}px`, left: `${adjustedX}px` }}
      className="fixed z-50 w-56 rounded-xl bg-[#171326]/98 backdrop-blur-xl border border-[#302744] shadow-2xl p-1.5 text-xs text-[#F8F5FF] select-none animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Play Now */}
      <button
        onClick={() => {
          playSong(song);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#A78BFA] hover:text-[#090812] transition-colors text-left font-medium"
      >
        <Play className="w-4 h-4 fill-current" /> Play
      </button>

      {/* Play Next */}
      <button
        onClick={() => {
          playNext(song);
          showToast('Queue', `"${song.title}" will play next`, 'success');
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#2A2140] transition-colors text-left text-[#C2B5D9] hover:text-[#F8F5FF]"
      >
        <ListPlus className="w-4 h-4 text-[#A78BFA]" /> Play Next
      </button>

      {/* Add to Queue */}
      <button
        onClick={() => {
          addToQueue(song);
          showToast('Queue', `Added "${song.title}" to queue`, 'success');
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#2A2140] transition-colors text-left text-[#C2B5D9] hover:text-[#F8F5FF]"
      >
        <ListPlus className="w-4 h-4" /> Add to Queue
      </button>

      {/* Favorite Toggle */}
      <button
        onClick={() => {
          toggleFavorite(song.id);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#2A2140] transition-colors text-left text-[#C2B5D9] hover:text-[#F8F5FF]"
      >
        <Heart
          className={`w-4 h-4 ${song.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-[#A99DBE]'}`}
        />
        {song.isFavorite ? 'Remove from Liked' : 'Save to Liked Songs'}
      </button>

      {/* Add to Playlist Submenu Trigger */}
      <div
        className="relative"
        onMouseEnter={() => setShowPlaylistSubmenu(true)}
        onMouseLeave={() => setShowPlaylistSubmenu(false)}
      >
        <button
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#2A2140] transition-colors text-left text-[#C2B5D9] hover:text-[#F8F5FF]"
        >
          <div className="flex items-center gap-2.5">
            <FolderPlus className="w-4 h-4 text-[#A78BFA]" /> Add to Playlist
          </div>
          <span className="text-[10px] text-[#A99DBE]">›</span>
        </button>

        {showPlaylistSubmenu && (
          <div className="absolute left-full top-0 ml-1 w-48 rounded-xl bg-[#171326]/98 backdrop-blur-xl border border-[#302744] shadow-2xl p-1.5 space-y-0.5 max-h-56 overflow-y-auto">
            {playlists.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-[#A99DBE]">No playlists yet</div>
            ) : (
              playlists.map(pl => (
                <button
                  key={pl.id}
                  onClick={() => handleAddToPlaylist(pl.id, pl.title)}
                  className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-[#A78BFA] hover:text-[#090812] truncate transition-colors text-[#F8F5FF]"
                >
                  {pl.title}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="my-1 border-t border-[#302744]" />

      {/* View Album */}
      {song.album && (
        <button
          onClick={() => {
            if (onViewAlbum) onViewAlbum(song.album);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#2A2140] transition-colors text-left text-[#C2B5D9] hover:text-[#F8F5FF]"
        >
          <Disc className="w-4 h-4 text-[#D8B4FE]" /> Go to Album
        </button>
      )}

      {/* View Artist */}
      {song.artist && (
        <button
          onClick={() => {
            if (onViewArtist) onViewArtist(song.artist);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#2A2140] transition-colors text-left text-[#C2B5D9] hover:text-[#F8F5FF]"
        >
          <User className="w-4 h-4 text-[#A78BFA]" /> Go to Artist
        </button>
      )}

      {/* Edit Details */}
      <button
        onClick={() => {
          onEdit(song);
          onClose();
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#2A2140] transition-colors text-left text-[#C2B5D9] hover:text-[#F8F5FF]"
      >
        <Edit2 className="w-4 h-4 text-amber-400" /> Edit Metadata
      </button>

      <div className="my-1 border-t border-[#302744]" />

      {/* Delete Song */}
      <button
        onClick={handleDeleteSong}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-rose-950/60 text-rose-400 hover:text-rose-200 transition-colors text-left"
      >
        <Trash2 className="w-4 h-4" /> Delete from Library
      </button>
    </div>
  );
}
