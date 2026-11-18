'use client';

import React from 'react';
import { ViewType } from '@/types/music';
import { usePlayer } from '@/context/PlayerContext';
import { getArtworkObjectUrl } from '@/lib/db';
import {
  Home,
  Search,
  Library,
  ListMusic,
  Heart,
  Settings,
  Play,
  Pause,
  SkipForward,
  Disc,
} from 'lucide-react';

interface MobileNavBarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

export function MobileNavBar({ currentView, onNavigate }: MobileNavBarProps) {
  const {
    currentSong,
    isPlaying,
    togglePlay,
    nextTrack,
    toggleFavorite,
    currentTime,
    duration,
    setIsNowPlayingOpen,
  } = usePlayer();

  const artUrl = currentSong ? getArtworkObjectUrl(currentSong) : null;
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const items: { view: ViewType; label: string; icon: any }[] = [
    { view: 'home', label: 'Home', icon: Home },
    { view: 'search', label: 'Search', icon: Search },
    { view: 'library', label: 'Library', icon: Library },
    { view: 'playlists', label: 'Playlists', icon: ListMusic },
    { view: 'liked', label: 'Liked', icon: Heart },
    { view: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-full flex flex-col select-none md:hidden">
      {/* 1. FLOATING SPOTIFY-STYLE MOBILE MINI PLAYER (WHEN SONG IS ACTIVE) */}
      {currentSong && (
        <div
          onClick={() => setIsNowPlayingOpen(true)}
          className="relative mx-2 mb-1.5 rounded-xl bg-[#131620]/95 backdrop-blur-2xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.9)] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
        >
          {/* Top Progress Line */}
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-white/[0.08]">
            <div
              className="h-full bg-[#1ED760] transition-all duration-300 shadow-[0_0_8px_#1ED760]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between px-3 py-2 gap-3 pt-2.5">
            {/* Left: Thumbnail & Song Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-zinc-900 border border-white/15 shrink-0 shadow-md">
                {artUrl ? (
                  <img
                    src={artUrl}
                    alt={currentSong.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/covers/hot_hits_telugu.jpg';
                    }}
                  />
                ) : (
                  <Disc className="w-5 h-5 text-zinc-500 m-auto mt-2.5" />
                )}
                {isPlaying && (
                  <div className="absolute inset-0 border border-[#1ED760]/60 rounded-lg pointer-events-none" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-white truncate leading-tight">
                  {currentSong.title}
                </h4>
                <p className="text-[10px] text-white/50 truncate font-medium mt-0.5">
                  {currentSong.artist}
                </p>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => toggleFavorite(currentSong.id)}
                className="p-2 text-zinc-400 hover:text-white active:scale-80 transition-transform"
                title={currentSong.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
              >
                <Heart
                  className={`w-4 h-4 ${
                    currentSong.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-zinc-400'
                  }`}
                />
              </button>

              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-[#1ED760] text-black flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-black" />
                ) : (
                  <Play className="w-4 h-4 fill-black ml-0.5" />
                )}
              </button>

              <button
                onClick={nextTrack}
                className="p-2 text-zinc-400 hover:text-white active:scale-80 transition-transform"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MOBILE NAVIGATION DOCK */}
      <nav className="min-h-14 pb-[env(safe-area-inset-bottom,0px)] bg-[#0B0D12] border-t border-white/10 flex items-center justify-around px-2 z-20">
        {items.map(item => {
          const Icon = item.icon;
          const isActive =
            currentView === item.view ||
            (item.view === 'library' && currentView === 'all-songs');

          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                isActive
                  ? 'text-[var(--accent)] font-semibold scale-105'
                  : 'text-[#A1A1AA] hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
