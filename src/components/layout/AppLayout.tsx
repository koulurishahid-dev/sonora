'use client';

import React, { useState } from 'react';
import { ViewType, Song, Playlist } from '@/types/music';
import { Sidebar } from './Sidebar';
import { HeaderBar } from './HeaderBar';
import { BottomPlayer } from '../player/BottomPlayer';
import { NowPlayingModal } from '../player/NowPlayingModal';
import { QueueDrawer } from '../player/QueueDrawer';
import { UploadModal } from '../modals/UploadModal';
import { AddLinkModal } from '../modals/AddLinkModal';
import { CreatePlaylistModal } from '../modals/CreatePlaylistModal';
import { EditSongModal } from '../modals/EditSongModal';
import { SongContextMenu } from '../modals/SongContextMenu';
import { LyricsPanel } from '../player/LyricsPanel';
import { usePlayer } from '@/context/PlayerContext';

// Views
import { HomeView } from '../views/HomeView';
import { LibraryView } from '../views/LibraryView';
import { PlaylistsView } from '../views/PlaylistsView';
import { PlaylistDetailView } from '../views/PlaylistDetailView';
import { LikedSongsView } from '../views/LikedSongsView';
import { AlbumsView } from '../views/AlbumsView';
import { AlbumDetailView } from '../views/AlbumDetailView';
import { ArtistsView } from '../views/ArtistsView';
import { ArtistDetailView } from '../views/ArtistDetailView';
import { RecentlyPlayedView } from '../views/RecentlyPlayedView';
import { OfflineView } from '../views/OfflineView';
import { SearchView } from '../views/SearchView';
import { SettingsView } from '../views/SettingsView';

export function AppLayout() {
  const { isLyricsOpen, setIsLyricsOpen, currentSong, currentTime, seek } = usePlayer();

  // Navigation History
  const [history, setHistory] = useState<{ view: ViewType; param?: string }[]>([
    { view: 'home' },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sidebar collapse
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);
  const [isEditSongOpen, setIsEditSongOpen] = useState(false);
  const [songToEdit, setSongToEdit] = useState<Song | null>(null);
  const [contextMenu, setContextMenu] = useState<{ song: Song; x: number; y: number } | null>(
    null
  );

  const currentRoute = history[historyIndex] || { view: 'home' };

  const handleNavigate = (view: ViewType, param?: string) => {
    // Truncate any forward history and append new route
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push({ view, param });
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setIsMobileMenuOpen(false);
  };

  const handleGoBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleGoForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleSongContextMenu = (e: React.MouseEvent, song: Song) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      song,
      x: e.clientX,
      y: e.clientY,
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0B0B0D] text-white">
      {/* Left Sidebar for Desktop */}
      <Sidebar
        currentView={currentRoute.view}
        onNavigate={handleNavigate}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenCreatePlaylist={() => {
          setPlaylistToEdit(null);
          setIsCreatePlaylistOpen(true);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        className="hidden md:flex shrink-0 z-30"
      />

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <Sidebar
            currentView={currentRoute.view}
            onNavigate={handleNavigate}
            onOpenUpload={() => {
              setIsMobileMenuOpen(false);
              setIsUploadOpen(true);
            }}
            onOpenCreatePlaylist={() => {
              setIsMobileMenuOpen(false);
              setPlaylistToEdit(null);
              setIsCreatePlaylistOpen(true);
            }}
            isCollapsed={false}
            onToggleCollapse={() => setIsMobileMenuOpen(false)}
            className="w-72 shadow-2xl z-10"
          />
        </div>
      )}

      {/* Main Content Column */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Header Bar */}
        <HeaderBar
          currentView={currentRoute.view}
          onNavigate={handleNavigate}
          canGoBack={historyIndex > 0}
          canGoForward={historyIndex < history.length - 1}
          onGoBack={handleGoBack}
          onGoForward={handleGoForward}
          onOpenUpload={() => setIsUploadOpen(true)}
          onOpenAddLink={() => setIsAddLinkOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenSearch={() => handleNavigate('search')}
        />

        {/* Dynamic View Body */}
        <main className="flex-1 overflow-y-auto relative pb-28">
          {currentRoute.view === 'home' && (
            <HomeView
              onNavigate={handleNavigate}
              onOpenUpload={() => setIsUploadOpen(true)}
              onSongContextMenu={handleSongContextMenu}
            />
          )}

          {currentRoute.view === 'library' && (
            <LibraryView
              onNavigate={handleNavigate}
              onSongContextMenu={handleSongContextMenu}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {currentRoute.view === 'playlists' && (
            <PlaylistsView
              onNavigate={handleNavigate}
              onOpenCreatePlaylist={() => {
                setPlaylistToEdit(null);
                setIsCreatePlaylistOpen(true);
              }}
              onEditPlaylist={pl => {
                setPlaylistToEdit(pl);
                setIsCreatePlaylistOpen(true);
              }}
            />
          )}

          {currentRoute.view === 'playlist-detail' && currentRoute.param && (
            <PlaylistDetailView
              playlistId={currentRoute.param}
              onNavigate={handleNavigate}
              onEditPlaylist={pl => {
                setPlaylistToEdit(pl);
                setIsCreatePlaylistOpen(true);
              }}
              onSongContextMenu={handleSongContextMenu}
            />
          )}

          {currentRoute.view === 'liked' && (
            <LikedSongsView
              onNavigate={handleNavigate}
              onSongContextMenu={handleSongContextMenu}
              onOpenUpload={() => setIsUploadOpen(true)}
            />
          )}

          {currentRoute.view === 'albums' && <AlbumsView onNavigate={handleNavigate} />}

          {currentRoute.view === 'album-detail' && currentRoute.param && (
            <AlbumDetailView
              albumTitle={currentRoute.param}
              onNavigate={handleNavigate}
              onSongContextMenu={handleSongContextMenu}
            />
          )}

          {currentRoute.view === 'artists' && <ArtistsView onNavigate={handleNavigate} />}

          {currentRoute.view === 'artist-detail' && currentRoute.param && (
            <ArtistDetailView
              artistName={currentRoute.param}
              onNavigate={handleNavigate}
              onSongContextMenu={handleSongContextMenu}
            />
          )}

          {currentRoute.view === 'recently-played' && (
            <RecentlyPlayedView
              onNavigate={handleNavigate}
              onSongContextMenu={handleSongContextMenu}
            />
          )}

          {currentRoute.view === 'offline' && (
            <OfflineView
              onNavigate={handleNavigate}
              onSongContextMenu={handleSongContextMenu}
            />
          )}

          {currentRoute.view === 'search' && (
            <SearchView
              initialQuery={currentRoute.param || ''}
              onNavigate={handleNavigate}
              onSongContextMenu={handleSongContextMenu}
            />
          )}

          {currentRoute.view === 'settings' && <SettingsView />}
        </main>

        {/* Lyrics Drawer if toggled from bottom bar */}
        {isLyricsOpen && (
          <div className="absolute right-0 top-16 bottom-24 w-full sm:w-96 bg-[#121216]/95 backdrop-blur-xl border-l border-[#303038] shadow-2xl z-20 flex flex-col">
            <div className="flex justify-end p-2 border-b border-[#303038]/60">
              <button
                onClick={() => setIsLyricsOpen(false)}
                className="text-xs text-[#A1A1AA] hover:text-white px-2 py-1"
              >
                Close Lyrics
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <LyricsPanel song={currentSong} currentTime={currentTime} onSeek={seek} />
            </div>
          </div>
        )}

        {/* Persistent Bottom Music Player */}
        <div className="absolute bottom-0 left-0 right-0 z-30">
          <BottomPlayer />
        </div>
      </div>

      {/* Floating Modals and Drawers */}
      <NowPlayingModal />
      <QueueDrawer />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {}}
      />

      <AddLinkModal
        isOpen={isAddLinkOpen}
        onClose={() => setIsAddLinkOpen(false)}
        onSuccess={() => {}}
      />

      <CreatePlaylistModal
        isOpen={isCreatePlaylistOpen}
        onClose={() => setIsCreatePlaylistOpen(false)}
        playlistToEdit={playlistToEdit}
      />

      <EditSongModal
        isOpen={isEditSongOpen}
        onClose={() => {
          setIsEditSongOpen(false);
          setSongToEdit(null);
        }}
        song={songToEdit}
      />

      {contextMenu && (
        <SongContextMenu
          song={contextMenu.song}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEdit={song => {
            setSongToEdit(song);
            setIsEditSongOpen(true);
          }}
          onViewAlbum={album => handleNavigate('album-detail', album)}
          onViewArtist={artist => handleNavigate('artist-detail', artist)}
        />
      )}
    </div>
  );
}
