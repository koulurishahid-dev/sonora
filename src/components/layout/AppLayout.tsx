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
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';

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
import { ExploreView } from '../views/ExploreView';
import { ListeningAnalyticsView } from '../views/ListeningAnalyticsView';
import { KeyboardShortcutsModal } from '../modals/KeyboardShortcutsModal';
import { SmartAiPlaylistModal } from '../modals/SmartAiPlaylistModal';
import { seedCuratedPersonalMusic, CURATED_TELUGU_SONGS } from '@/lib/audioSynthesis';
import { importAllSpotifyTeluguCategories, syncNewRomanticSpotifyPlaylist } from '@/lib/spotifyService';
import { db, deduplicateSongsInLibrary } from '@/lib/db';
import { triggerBackgroundCloudSync } from '@/lib/cloudSync';

let isAutoSeedingInProgress = false;

export function AppLayout() {
  const {
    isLyricsOpen,
    setIsLyricsOpen,
    currentSong,
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
  const [isAiGeneratorOpen, setIsAiGeneratorOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ song: Song; x: number; y: number } | null>(
    null
  );

  const currentRoute = history[historyIndex] || { view: 'home' };

  // Auto-seed, verify, and clean library on startup
  React.useEffect(() => {
    async function initCollection() {
      if (isAutoSeedingInProgress) return;
      try {
        // One-time deletion of Hot Hits, Golden Classics, and 90s Classics
        const migrationKey = 'sonora_telugu_v10_removed_3_playlists';
        if (typeof window !== 'undefined' && !localStorage.getItem(migrationKey)) {
          await db.songs.where('category').anyOf(['Hot Hits', 'Golden Classics', '90s Classics']).delete();
          await db.songs.where('genre').anyOf(['Hot Hits', 'Golden Classics', '90s Classics']).delete();
          await db.playlists.where('id').anyOf(['pl_spotify_hot_hits', 'pl_spotify_golden_classics', 'pl_spotify_90s_classics']).delete();
          await db.playlistSongs.where('playlistId').anyOf(['pl_spotify_hot_hits', 'pl_spotify_golden_classics', 'pl_spotify_90s_classics']).delete();
          localStorage.setItem(migrationKey, 'true');
          window.dispatchEvent(new Event('sonora_library_updated'));
        }

        // One-time sync/replacement of Telugu Romantic playlist with user's Spotify 100-song playlist
        const romanceMigrationKey = 'sonora_telugu_romance_spotify_7jCOTOc9NBy41S7Uf4xfU1_v1';
        if (typeof window !== 'undefined' && !localStorage.getItem(romanceMigrationKey)) {
          await syncNewRomanticSpotifyPlaylist();
          localStorage.setItem(romanceMigrationKey, 'true');
          window.dispatchEvent(new Event('sonora_library_updated'));
        }

        const songCount = await db.songs.count();
        const plSongCount = await db.playlistSongs.count();

        // If library already has songs and playlist mappings, do NOT re-seed
        if (songCount >= 100 && plSongCount >= 50) {
          triggerBackgroundCloudSync(3000);
          return;
        }

        isAutoSeedingInProgress = true;
        await importAllSpotifyTeluguCategories();
      } catch (e) {
        console.warn('Initial seeding error:', e);
      } finally {
        isAutoSeedingInProgress = false;
        triggerBackgroundCloudSync(4000);
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
            <div className="flex items-center justify-center gap-2 mb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-icon.png" alt="" className="w-8 h-8 object-contain drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
              <h1 className="text-xl font-extrabold text-white">NAA PAATALU Vault</h1>
            </div>
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
    <MotionConfig reducedMotion="always">
    <div className="flex h-screen w-screen overflow-hidden bg-[#07070A] text-white relative">
      {/* Static Obsidian Studio Backdrop */}
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
        onOpenAiGenerator={() => setIsAiGeneratorOpen(true)}
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
            onNavigate={(view, param) => {
              setIsMobileMenuOpen(false);
              handleNavigate(view, param);
            }}
            onOpenUpload={() => {
              setIsMobileMenuOpen(false);
              setIsUploadOpen(true);
            }}
            onOpenCreatePlaylist={() => {
              setIsMobileMenuOpen(false);
              setPlaylistToEdit(null);
              setIsCreatePlaylistOpen(true);
            }}
            onOpenAiGenerator={() => {
              setIsMobileMenuOpen(false);
              setIsAiGeneratorOpen(true);
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

              {currentRoute.view === 'explore' && (
                <ExploreView
                  onNavigate={handleNavigate}
                  onSongContextMenu={handleSongContextMenu}
                  onOpenAiGenerator={() => setIsAiGeneratorOpen(true)}
                />
              )}

              {currentRoute.view === 'analytics' && (
                <ListeningAnalyticsView
                  onNavigate={handleNavigate}
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
              <LyricsPanel />
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
            className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 flex-col items-center gap-2 py-4 px-2.5 rounded-l-2xl bg-[#111117]/95 border-l border-y border-white/10 hover:border-white/25 text-white/70 hover:text-white shadow-xl transition-colors group"
            title="Open Player Sidebar"
          >
            <Disc className="w-5 h-5 text-[#A78BFA]" />
            <span className="text-[10px] font-mono uppercase tracking-widest [writing-mode:vertical-rl] rotate-180 text-white/60 group-hover:text-white">
              Player
            </span>
          </button>
        )}

        {/* Mobile Navigation Bar only (Desktop uses Player Sidebar with no bottom player bar) */}
        <div className="md:hidden absolute bottom-0 left-0 right-0 z-40 bg-[#0B0B0F]/95 backdrop-blur-xl border-t border-white/[0.08] flex flex-col pointer-events-auto shadow-[0_-16px_40px_rgba(0,0,0,0.85)]">
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

      <KeyboardShortcutsModal />

      <SmartAiPlaylistModal
        isOpen={isAiGeneratorOpen}
        onClose={() => setIsAiGeneratorOpen(false)}
        onPlaylistCreated={playlistId => {
          setIsAiGeneratorOpen(false);
          handleNavigate('playlist-detail', playlistId);
        }}
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
    </MotionConfig>
  );
}
