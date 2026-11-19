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
    explore: 'Explore',
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
    analytics: 'History & Stats',
    offline: 'Offline',
    'now-playing': 'Now Playing',
    settings: 'Settings',
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-[#10051C]/75 backdrop-blur-2xl border-b border-[#302744]/70 shadow-[0_4px_30px_rgba(5,3,9,0.5)] flex items-center justify-between gap-4 sticky top-0 z-20 select-none">
      {/* Left: Window Controls & History Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-[#A99DBE] hover:text-[#F8F5FF] hover:bg-[#141122] transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Emblem */}
        <div
          className="md:hidden flex items-center gap-1.5 cursor-pointer py-1"
          onClick={() => onNavigate('home')}
          title="NAA PAATALU"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-icon.png"
            alt="NAA PAATALU"
            className="w-6 h-6 object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]"
          />
          <span className="font-extrabold text-xs tracking-wider text-[#F8F5FF]">
            NAA PAATALU
          </span>
        </div>

        {/* History Navigation Arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={onGoBack}
            disabled={!canGoBack}
            className="p-1.5 rounded-full bg-[#141122] text-[#A99DBE] hover:text-[#F8F5FF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-[#302744]"
            title="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onGoForward}
            disabled={!canGoForward}
            className="p-1.5 rounded-full bg-[#141122] text-[#A99DBE] hover:text-[#F8F5FF] disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-[#302744]"
            title="Go forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Breadcrumb Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#141122] border border-[#302744] text-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-icon.png" alt="" className="w-3.5 h-3.5 object-contain" />
          <span className="text-[#A99DBE] font-medium">Naa Paatalu</span>
          <span className="text-[#302744]">&gt;</span>
          <span className="font-semibold text-[#F8F5FF] tracking-wide">{viewTitles[currentView] || 'Explore'}</span>
        </div>
      </div>

      {/* Center: Global Search Pill */}
      <div
        onClick={onOpenSearch}
        className="flex-1 max-w-md mx-2 flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#141122] hover:bg-[#171326] border border-[#302744] hover:border-[#A78BFA]/50 text-xs text-[#A99DBE] cursor-pointer transition-all shadow-sm group"
      >
        <Search className="w-3.5 h-3.5 text-[#A99DBE] group-hover:text-[#A78BFA] transition-colors" />
        <span className="flex-1 truncate">What do you want to listen to?</span>
        <kbd className="hidden sm:inline-block text-[10px] bg-[#211A32] px-1.5 py-0.5 rounded border border-[#302744] font-mono text-[#C2B5D9]">
          Ctrl K
        </kbd>
      </div>

      {/* Right: Actions and User Profile Pill */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Add Link */}
        <button
          onClick={onOpenAddLink}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#141122] hover:bg-[#2A2140] border border-[#302744] text-[#C2B5D9] hover:text-[#F8F5FF] transition-all shadow-sm"
          title="Add audio URL"
        >
          <Link2 className="w-3.5 h-3.5 text-[#A78BFA]" />
          <span>Add Link</span>
        </button>

        {/* Spotify Telugu Importer */}
        {onOpenSpotifyImport && (
          <button
            onClick={onOpenSpotifyImport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#A78BFA]/15 hover:bg-[#A78BFA]/25 border border-[#A78BFA]/40 text-[#A78BFA] hover:scale-105 active:scale-95 transition-all shadow-sm"
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
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#A78BFA] hover:bg-[#D8B4FE] text-[#090812] hover:scale-105 active:scale-95 transition-all shadow-lg shadow-[#A78BFA]/25"
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
              ? 'bg-[#211A32] border-[#A78BFA]/40 text-[#D8B4FE] shadow-[0_0_12px_rgba(167,139,250,0.25)]'
              : 'bg-[#141122] border-[#302744] text-[#C2B5D9] hover:text-[#F8F5FF] hover:bg-[#2A2140]'
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
          className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-[#171326] hover:bg-[#2A2140] border border-[#302744] hover:border-[#A78BFA]/40 cursor-pointer transition-all"
          title="Open My Space (Profile & Settings)"
        >
          <div className="w-6 h-6 rounded-full bg-[#A78BFA]/20 text-[#A78BFA] flex items-center justify-center text-xs">
            {settings.listenerAvatar || '🎧'}
          </div>
          <span className="text-xs font-semibold text-[#F8F5FF] max-w-[80px] truncate">
            {settings.listenerName || 'Shahid'}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] shadow-[0_0_6px_#A78BFA] animate-pulse" />
        </div>
      </div>
    </header>
  );
}
