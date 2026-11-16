'use client';

import React, { useEffect, useState } from 'react';
import { ViewType } from '@/types/music';
import { getStorageEstimate } from '@/lib/db';
import { formatFileSize } from '@/lib/utils';
import { useTheme } from '@/context/ThemeContext';
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
  onOpenMobileMenu,
  onOpenSearch,
}: HeaderBarProps) {
  const { settings } = useTheme();
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
    home: 'My World',
    search: 'Search',
    library: 'Library Hub',
    'all-songs': 'My Music',
    playlists: 'Playlists',
    'playlist-detail': 'Mixtape',
    liked: 'Favourite Songs',
    albums: 'Albums',
    'album-detail': 'Soundtrack',
    artists: 'Artists I Love',
    'artist-detail': 'Artist',
    'recently-played': 'Memory Lane',
    offline: 'Offline Sanctuary',
    'now-playing': 'Now Playing',
    settings: 'My Space',
  };

  return (
    <header className="h-16 px-4 sm:px-6 bg-[#0B0B0D]/85 backdrop-blur-xl border-b border-[#303038]/60 flex items-center justify-between gap-4 sticky top-0 z-20 select-none">
      {/* Left: Window Controls & History Navigation */}
      <div className="flex items-center gap-3">
        {/* Mac-style Window Dots (Reference Image 3 & 4) */}
        <div className="hidden lg:flex items-center gap-1.5 mr-1">
          <span className="w-3 h-3 rounded-full bg-rose-500/80 hover:bg-rose-500 transition-colors shadow-sm" />
          <span className="w-3 h-3 rounded-full bg-amber-500/80 hover:bg-amber-500 transition-colors shadow-sm" />
          <span className="w-3 h-3 rounded-full bg-emerald-500/80 hover:bg-emerald-500 transition-colors shadow-sm" />
        </div>

        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#19191F] transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* History Navigation Arrows */}
        <div className="flex items-center gap-1">
          <button
            onClick={onGoBack}
            disabled={!canGoBack}
            className="p-1.5 rounded-full bg-[#19191F] text-[#A1A1AA] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Go back"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onGoForward}
            disabled={!canGoForward}
            className="p-1.5 rounded-full bg-[#19191F] text-[#A1A1AA] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Go forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Breadcrumb Pill (Image 1 & 3 style) */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#181820]/90 border border-[#303038] text-xs">
          <span className="text-[#71717A]">Sonora</span>
          <span className="text-[#525260]">&gt;</span>
          <span className="font-semibold text-white tracking-wide">{viewTitles[currentView] || 'Explore'}</span>
        </div>
      </div>

      {/* Center: Global Search Pill (Image 1 style) */}
      <div
        onClick={onOpenSearch}
        className="flex-1 max-w-md mx-2 flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#181820]/90 hover:bg-[#22222C] border border-[#303038] hover:border-[var(--accent)]/50 text-xs text-[#A1A1AA] cursor-pointer transition-all shadow-sm group"
      >
        <Search className="w-3.5 h-3.5 text-[#71717A] group-hover:text-[var(--accent)] transition-colors" />
        <span className="flex-1 truncate">What do you want to listen to?</span>
        <kbd className="hidden sm:inline-block text-[10px] bg-[#121216] px-1.5 py-0.5 rounded border border-[#303038] font-mono text-[#71717A]">
          Ctrl K
        </kbd>
      </div>

      {/* Right: Actions, Storage, and User Profile Pill */}
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Storage Badge */}
        {storageInfo.usage > 0 && (
          <div
            className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#181820] border border-[#303038] text-xs text-[#A1A1AA]"
            title={`Offline Storage: ${formatFileSize(storageInfo.usage)} used`}
          >
            <HardDrive className="w-3 h-3 text-[var(--accent)]" />
            <span className="font-mono text-[10px]">{formatFileSize(storageInfo.usage)}</span>
          </div>
        )}

        {/* Add Link */}
        <button
          onClick={onOpenAddLink}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#181820] hover:bg-[#25252D] border border-[#303038] text-[#D4D4D8] hover:text-white transition-all shadow-sm"
          title="Add audio URL"
        >
          <Link2 className="w-3.5 h-3.5 text-sky-400" />
          <span>Add Link</span>
        </button>

        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--accent)] text-black hover:scale-105 active:scale-95 transition-all shadow-md"
          title="Upload audio files"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload</span>
        </button>

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
