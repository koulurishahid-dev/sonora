'use client';

import React, { useEffect, useState } from 'react';
import { ViewType } from '@/types/music';
import { getStorageEstimate } from '@/lib/db';
import { formatFileSize } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
import { usePlayer } from '@/context/PlayerContext';
import { AtmosphereSelector } from '@/components/common/AtmosphereSelector';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  HardDrive,
  Link2,
  Upload,
  Settings,
  Menu,
  Sparkles,
  User,
  PanelRight,
} from 'lucide-react';

interface HeaderBarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  canGoBack: boolean;
  canGoForward: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onOpenUpload: () => void;
  onOpenAddLink: () => void;
  onOpenSpotifyImport?: () => void;
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
}

export function HeaderBar({
  currentView,
  onNavigate,
  canGoBack,
  canGoForward,
  onGoBack,
  onGoForward,
  onOpenUpload,
  onOpenAddLink,
  onOpenSpotifyImport,
  onOpenMobileMenu,
  onOpenSearch,
}: HeaderBarProps) {
  const { settings } = useTheme();
  const { isSideViewOpen, toggleSideView } = usePlayer();
  const [storageInfo, setStorageInfo] = useState<{ usage: number; quota: number; percent: number }>({
    usage: 0,
    quota: 0,
    percent: 0,
  });

  useEffect(() => {
    getStorageEstimate().then(setStorageInfo);
    const interval = setInterval(() => {
      getStorageEstimate().then(setStorageInfo);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Ctrl+K or Cmd+K shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  const viewTitles: Record<ViewType, string> = {
    home: 'Home',
    search: 'Search',
    library: 'Library',
    'all-songs': 'All Songs',
    playlists: 'Playlists',
    'playlist-detail': 'Playlist',
    liked: 'Favorites',
    albums: 'Albums',
    'album-detail': 'Album',
    artists: 'Artists',
    'artist-detail': 'Artist',
    'recently-played': 'Recent',
    offline: 'Offline',
    'now-playing': 'Now Playing',
    settings: 'Settings',
  };

  return (
    <header className="h-16 px-4 sm:px-6 glass-header border-b border-white/10 flex items-center justify-between gap-4 sticky top-0 z-20 select-none">
      {/* Left: Window Controls & History Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* History Navigation Arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={onGoBack}
            disabled={!canGoBack}
            className="p-1.5 rounded-full glass-pure text-[#A1A1AA] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-white/10"
            title="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onGoForward}
            disabled={!canGoForward}
            className="p-1.5 rounded-full glass-pure text-[#A1A1AA] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-white/10"
            title="Go forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Breadcrumb Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full glass-pure border border-white/10 text-xs">
          <span className="text-[#A1A1AA]">Sonora</span>
          <span className="text-[#525260]">&gt;</span>
          <span className="font-semibold text-white tracking-wide">{viewTitles[currentView] || 'Explore'}</span>
        </div>
      </div>

      {/* Center: Global Search Pill */}
      <div
        onClick={onOpenSearch}
        className="flex-1 max-w-md mx-2 flex items-center gap-2.5 px-4 py-2 rounded-full glass-pure hover:bg-white/10 border border-white/10 hover:border-[var(--accent)]/50 text-xs text-[#A1A1AA] cursor-pointer transition-all shadow-sm group"
      >
        <Search className="w-3.5 h-3.5 text-[#71717A] group-hover:text-[var(--accent)] transition-colors" />
        <span className="flex-1 truncate">What do you want to listen to?</span>
        <kbd className="hidden sm:inline-block text-[10px] glass-pill px-1.5 py-0.5 rounded border border-white/15 font-mono text-[#A1A1AA]">
          Ctrl K
        </kbd>
      </div>

      {/* Right: Actions and User Profile Pill */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Add Link */}
        <button
          onClick={onOpenAddLink}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold glass-pure hover:bg-white/10 border border-white/10 text-[#D4D4D8] hover:text-white transition-all shadow-sm"
          title="Add audio URL"
        >
          <Link2 className="w-3.5 h-3.5 text-sky-400" />
          <span>Add Link</span>
        </button>

        {/* Spotify Telugu Importer */}
        {onOpenSpotifyImport && (
          <button
            onClick={onOpenSpotifyImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1ED760]/15 hover:bg-[#1ED760]/25 border border-[#1ED760]/40 text-[#1ED760] hover:scale-105 active:scale-95 transition-all shadow-sm"
            title="Import Telugu music using Spotify"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.495 17.306c-.216.353-.674.464-1.026.25-2.812-1.718-6.353-2.106-10.523-1.154-.403.092-.803-.16-.895-.563-.092-.403.16-.803.563-.895 4.567-1.042 8.49-.602 11.63 1.336.353.216.464.674.251 1.026zm1.467-3.262c-.272.441-.852.58-1.293.308-3.22-1.979-8.127-2.551-11.935-1.395-.497.151-1.029-.136-1.18-.633-.151-.497.136-1.029.633-1.18 4.356-1.322 9.776-.682 13.467 1.587.441.272.58.852.308 1.293zm.126-3.41c-3.86-2.292-10.228-2.503-13.896-1.389-.592.18-1.226-.154-1.406-.746-.18-.592.154-1.226.746-1.406 4.218-1.281 11.253-1.034 15.696 1.603.533.316.708 1.011.392 1.544-.316.533-1.011.708-1.532.394z" />
            </svg>
            <span className="hidden sm:inline">Spotify</span>
          </button>
        )}

        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[var(--accent)]/25"
          title="Upload audio files"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        {/* Player Sidebar Toggle */}
        <button
          onClick={toggleSideView}
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            isSideViewOpen
              ? 'bg-[var(--accent)]/20 border-[var(--accent)]/40 text-[var(--accent)] shadow-[0_0_12px_rgba(245,158,11,0.2)]'
              : 'glass-pure border-white/10 text-white/70 hover:text-white hover:bg-white/10'
          }`}
          title={isSideViewOpen ? 'Hide Player Sidebar' : 'Show Player Sidebar'}
        >
          <PanelRight className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Player Sidebar</span>
        </button>

        {/* Atmosphere Selector */}
        <AtmosphereSelector />

        {/* User Profile Pill (Reference Image 1) */}
        <div
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-[#181820] hover:bg-[#25252D] border border-[#303038] hover:border-white/20 cursor-pointer transition-all"
          title="Open My Space (Profile & Settings)"
        >
          <div className="w-6 h-6 rounded-full bg-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center text-xs">
            {settings.listenerAvatar || '🎧'}
          </div>
          <span className="text-xs font-semibold text-white max-w-[80px] truncate">
            {settings.listenerName || 'Shahid'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
    </header>
  );
}
