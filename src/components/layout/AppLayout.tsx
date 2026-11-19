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
import { SpotifyImportModal } from '../modals/SpotifyImportModal';
import { LyricsPanel } from '../player/LyricsPanel';
import { CinematicSmokeAtmosphere } from '../common/CinematicSmokeAtmosphere';
import { usePlayer } from '@/context/PlayerContext';
import { useTheme } from '@/context/ThemeContext';
import { Lock, Radio, Disc } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
import { seedCuratedPersonalMusic, CURATED_TELUGU_SONGS } from '@/lib/audioSynthesis';
import { importAllSpotifyTeluguCategories } from '@/lib/spotifyService';
import { db, deduplicateSongsInLibrary } from '@/lib/db';

let isAutoSeedingInProgress = false;

export function AppLayout() {
  const {
    isLyricsOpen,
    setIsLyricsOpen,
    currentSong,
    currentTime,
    seek,
    setIsNowPlayingOpen,
    isSideViewOpen,
    toggleSideView,
    isPlaying,
  } = usePlayer();
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
  const [isSpotifyImportOpen, setIsSpotifyImportOpen] = useState(false);
  const [isCreatePlaylistOpen, setIsCreatePlaylistOpen] = useState(false);
  const [playlistToEdit, setPlaylistToEdit] = useState<Playlist | null>(null);
  const [isEditSongOpen, setIsEditSongOpen] = useState(false);
  const [songToEdit, setSongToEdit] = useState<Song | null>(null);
  const [contextMenu, setContextMenu] = useState<{ song: Song; x: number; y: number } | null>(
    null
  );

  const currentRoute = history[historyIndex] || { view: 'home' };

  // Auto-seed and deduplicate all Telugu Melodies & Love Songs
  React.useEffect(() => {
    async function initCollection() {
      if (isAutoSeedingInProgress) return;
      try {
        const seededSpotify = localStorage.getItem('sonora_telugu_v9_audit_437_unique');
        const count = await db.songs.count();

        // Always purge removed legacy categories (Devotional, Folk) immediately
        try {
          await db.songs.where('category').anyOf(['Devotional', 'Folk & Beats', 'Folk & Teenmaar']).delete();
          await db.songs.where('genre').anyOf(['Devotional', 'Folk & Beats', 'Folk & Teenmaar']).delete();
          await db.playlists.delete('pl_spotify_folk_beats');
          await db.playlists.delete('pl_spotify_devotional');
          await db.playlistSongs.where('playlistId').anyOf(['pl_spotify_folk_beats', 'pl_spotify_devotional']).delete();
        } catch {
          // continue
        }

        // Run automatic deduplication on pre-existing database rows
        await deduplicateSongsInLibrary();

        // If not on v9 audit or count is distorted (> 450 indicates legacy 620 duplicates), re-seed fresh clean catalog
        if (!seededSpotify || count > 450 || count < 350) {
          isAutoSeedingInProgress = true;
          // Clear any legacy duplicate-filled store to ensure each song appears only once
          try {
            await db.songs.clear();
            await db.playlistSongs.clear();
          } catch {
            // continue
          }
          await importAllSpotifyTeluguCategories();
          localStorage.setItem('sonora_telugu_v9_audit_437_unique', 'true');
        }
      } catch (e) {
        console.warn('Initial seeding error:', e);
      } finally {
        isAutoSeedingInProgress = false;
      }
    }
    initCollection();
  }, []);

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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#08090B] text-white p-6 select-none relative">
        <div className="w-full max-w-sm p-8 rounded-3xl glass-modal border border-white/15 shadow-2xl text-center space-y-6 relative z-10">
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
              className="w-full text-center text-xl tracking-widest py-3 px-4 rounded-xl glass-pure border border-white/15 text-white focus:border-[var(--accent)] outline-none font-mono"
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#050309] text-white relative">
      {/* Cinematic Purple Smoke Atmosphere Effect */}
      <CinematicSmokeAtmosphere />

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
            onOpenSpotifyImport={() => setIsSpotifyImportOpen(true)}
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onOpenSearch={() => handleNavigate('search')}
          />

        {/* Dynamic View Body with Smooth Cinematic Page Transitions */}
        <main className="flex-1 overflow-y-auto relative pb-36 md:pb-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentRoute.view + (currentRoute.param || '')}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full"
            >
              {currentRoute.view === 'home' && (
                <HomeView
                  onNavigate={handleNavigate}
                  onOpenUpload={() => setIsUploadOpen(true)}
                  onOpenSpotifyImport={() => setIsSpotifyImportOpen(true)}
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
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Lyrics Drawer if toggled from bottom bar */}
        {isLyricsOpen && (
          <div className="absolute right-0 top-16 bottom-24 w-full sm:w-96 glass-pure backdrop-blur-2xl border-l border-white/10 shadow-2xl z-20 flex flex-col">
            <div className="flex justify-end p-2 border-b border-white/10">
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

        {/* Now Playing Player Sidebar (Docked on Right Side) */}
        <RightSidebar
          isOpen={isSideViewOpen}
          onToggle={toggleSideView}
        />

        {/* Floating Quick Tab when Player Sidebar is collapsed on desktop */}
        {!isSideViewOpen && (
          <button
            onClick={toggleSideView}
            className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-2 py-4 px-2.5 rounded-l-2xl bg-[#141720]/95 border-l border-y border-white/10 hover:border-amber-500/40 text-white/70 hover:text-white shadow-2xl transition-all hover:translate-x-[-2px] group"
            title="Open Player Sidebar"
          >
            <Disc className={`w-5 h-5 text-amber-400 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            <span className="text-[10px] font-mono uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 text-white/60 group-hover:text-amber-300">
              Player
            </span>
          </button>
        )}

        {/* Mobile Navigation Bar only (Desktop uses Player Sidebar with no bottom player bar) */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-40 bg-[#10051C]/90 backdrop-blur-2xl border-t border-[#302744]/70 flex flex-col pointer-events-auto shadow-[0_-20px_50px_rgba(5,3,9,0.95)]">
          <MobileNavBar currentView={currentRoute.view} onNavigate={handleNavigate} />
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

      <SpotifyImportModal
        isOpen={isSpotifyImportOpen}
        onClose={() => setIsSpotifyImportOpen(false)}
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
