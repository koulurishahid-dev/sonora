'use client';

import React, { useEffect, useState } from 'react';
import { ViewType } from '@/types/music';
import { getStorageEstimate } from '@/lib/db';
import { formatFileSize } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  HardDrive,
  Link2,
  Upload,
  Settings,
  Menu,
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

  return (
    <header className="h-16 px-6 bg-[#0B0B0D]/80 backdrop-blur-md border-b border-[#303038]/60 flex items-center justify-between gap-4 sticky top-0 z-20">
      {/* Left: Mobile hamburger & History Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#19191F] transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

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

        {/* Global Search Pill */}
        <div
          onClick={onOpenSearch}
          className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#19191F] hover:bg-[#25252D] border border-[#303038] text-xs text-[#A1A1AA] cursor-pointer transition-all w-64 md:w-80 shadow-sm"
        >
          <Search className="w-3.5 h-3.5 text-[#71717A]" />
          <span className="flex-1 truncate">Search songs, artists, albums...</span>
          <kbd className="text-[10px] bg-[#121216] px-1.5 py-0.5 rounded border border-[#303038] font-mono text-[#71717A]">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Right: Actions & Storage Badge */}
      <div className="flex items-center gap-3">
        {/* Storage Badge */}
        {storageInfo.usage > 0 && (
          <div
            className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-[#19191F] border border-[#303038] text-xs text-[#A1A1AA]"
            title={`Offline IndexedDB Storage: ${formatFileSize(storageInfo.usage)} used`}
          >
            <HardDrive className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="font-mono text-[11px]">{formatFileSize(storageInfo.usage)}</span>
          </div>
        )}

        {/* Add Link Button */}
        <button
          onClick={onOpenAddLink}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#19191F] hover:bg-[#25252D] border border-[#303038] text-[#D4D4D8] hover:text-white transition-all shadow-sm"
          title="Add audio URL or radio stream"
        >
          <Link2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Add Link</span>
        </button>

        {/* Upload Button */}
        <button
          onClick={onOpenUpload}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[var(--accent)] text-black hover:opacity-95 transition-all shadow-md"
          title="Upload audio files"
        >
          <Upload className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        {/* Settings gear */}
        <button
          onClick={() => onNavigate('settings')}
          className="p-2 rounded-xl text-[#A1A1AA] hover:text-white hover:bg-[#19191F] transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
