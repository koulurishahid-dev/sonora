'use client';

import React, { useState } from 'react';
import { ViewType, Song, Playlist } from '@/types/music';
import { Sidebar } from './Sidebar';
import { HeaderBar } from './HeaderBar';
import { RightSidebar } from './RightSidebar';
import { MobileNavBar } from './MobileNavBar';
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
import { useTheme } from '@/context/ThemeContext';
import { Lock, Radio } from 'lucide-react';

// Views
import { HomeView } from '../views/HomeView';
import { MyLibraryHubView } from '../views/MyLibraryHubView';
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
  const { isLyricsOpen, setIsLyricsOpen, currentSong, currentTime, seek, setIsNowPlayingOpen } =
    usePlayer();
  const { settings } = useTheme();

  // Navigation History
  const [history, setHistory] = useState<{ view: ViewType; param?: string }[]>([
    { view: 'home' },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Sidebar collapse & Mobile drawer
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Passcode Lock State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

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
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  const currentRoute = history[historyIndex] || { view: 'home' };

  const handleNavigate = (view: ViewType, param?: string) => {
    if (view === 'now-playing') {
      setIsNowPlayingOpen(true);
      return;
    }
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

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPin === settings.privacyPasscode) {
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setEnteredPin('');
    }
  };

  // If privacy lock is enabled and user hasn't entered passcode yet
  if (settings.privacyLockEnabled && !isUnlocked) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0B0B0D] text-white p-6 select-none">
        <div className="w-full max-w-sm p-8 rounded-3xl bg-[#121216] border border-[#303038] shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent)] text-black flex items-center justify-center mx-auto shadow-xl">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-xl font-extrabold text-white">SONORA Vault</h1>
            <p className="text-xs text-[#A1A1AA] mt-1.5 leading-relaxed">
              This personal library is protected with a passcode.
            </p>
          </div>

          <form onSubmit={handleUnlockPin} className="space-y-4">
            <input
              type="password"
              autoFocus
              maxLength={8}
              placeholder="Enter PIN"
              value={enteredPin}
              onChange={e => {
                setEnteredPin(e.target.value);
                setPinError(false);
              }}
              className="w-full text-center text-xl tracking-widest py-3 px-4 rounded-xl bg-[#19191F] border border-[#303038] text-white focus:border-[var(--accent)] outline-none font-mono"
            />

            {pinError && (
              <p className="text-xs text-rose-400 font-medium">Incorrect PIN. Try again.</p>
            )}

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[var(--accent)] text-black text-xs font-bold hover:opacity-95 transition-all shadow-md"
            >
              Unlock Library
            </button>
          </form>
        </div>
      </div>
    );
  }

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

      {/* Center + Right Layout Container */}
      <div className="flex-1 flex h-full min-w-0 overflow-hidden relative">
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
        <main className="flex-1 overflow-y-auto relative pb-36 md:pb-28">
          {currentRoute.view === 'home' && (
            <HomeView
              onNavigate={handleNavigate}
              onOpenUpload={() => setIsUploadOpen(true)}
              onSongContextMenu={handleSongContextMenu}
            />
          )}

          {currentRoute.view === 'library' && (
            <MyLibraryHubView
              onNavigate={handleNavigate}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenAddLink={() => setIsAddLinkOpen(true)}
              onSongContextMenu={handleSongContextMenu}
            />
          )}

          {currentRoute.view === 'all-songs' && (
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

        </div>

        {/* Curated Right Panel (Image 1 style) */}
        <RightSidebar
          isOpen={isRightSidebarOpen}
          onToggle={() => setIsRightSidebarOpen(!isRightSidebarOpen)}
        />

        {/* Persistent Bottom Controls Container */}
        <div className="absolute bottom-0 left-0 right-0 z-30 flex flex-col pointer-events-auto">
          <MobileNavBar currentView={currentRoute.view} onNavigate={handleNavigate} />
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
