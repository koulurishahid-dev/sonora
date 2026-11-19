'use client';

import React from 'react';
import { ViewType } from '@/types/music';
import { usePlayer } from '@/context/PlayerContext';
import { getArtworkObjectUrl } from '@/lib/db';
import {
  Home,
  Compass,
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
    { view: 'explore', label: 'Explore', icon: Compass },
    { view: 'all-songs', label: 'Library', icon: Library },
    { view: 'playlists', label: 'Playlists', icon: ListMusic },
    { view: 'search', label: 'Search', icon: Search },
    { view: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="w-full flex flex-col select-none md:hidden">
      {/* 1. FLOATING SPOTIFY-STYLE MOBILE MINI PLAYER (WHEN SONG IS ACTIVE) */}
      {currentSong && (
        <div
          onClick={() => setIsNowPlayingOpen(true)}
          className="relative mx-2 mb-1.5 rounded-xl bg-[#10051C]/85 backdrop-blur-2xl border border-[#302744]/70 shadow-[0_8px_30px_rgba(5,3,9,0.95)] overflow-hidden cursor-pointer active:scale-[0.99] transition-transform"
        >
          {/* Top Progress Line */}
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-[#211A32]">
            <div
              className="h-full bg-[#A78BFA] transition-all duration-300 shadow-[0_0_8px_#A78BFA]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between px-3 py-2 gap-3 pt-2.5">
            {/* Left: Thumbnail & Song Info */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-[#141122] border border-[#302744] shrink-0 shadow-md">
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
                  <Disc className="w-5 h-5 text-[#A99DBE] m-auto mt-2.5" />
                )}
                {isPlaying && (
                  <div className="absolute inset-0 border border-[#A78BFA]/60 rounded-lg pointer-events-none" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-[#F8F5FF] truncate leading-tight">
                  {currentSong.title}
                </h4>
                <p className="text-[10px] text-[#C2B5D9] truncate font-medium mt-0.5">
                  {currentSong.artist}
                </p>
              </div>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => toggleFavorite(currentSong.id)}
                className="p-2 text-[#A99DBE] hover:text-[#F8F5FF] active:scale-80 transition-transform"
                title={currentSong.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
              >
                <Heart
                  className={`w-4 h-4 ${
                    currentSong.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-[#A99DBE]'
                  }`}
                />
              </button>

              <button
                onClick={togglePlay}
                className="w-8 h-8 rounded-full bg-[#A78BFA] hover:bg-[#D8B4FE] text-[#090812] flex items-center justify-center shadow-lg active:scale-90 transition-transform"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-[#090812]" />
                ) : (
                  <Play className="w-4 h-4 fill-[#090812] ml-0.5" />
                )}
              </button>

              <button
                onClick={nextTrack}
                className="p-2 text-[#A99DBE] hover:text-[#F8F5FF] active:scale-80 transition-transform"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MOBILE NAVIGATION DOCK */}
      <nav className="min-h-14 pb-[env(safe-area-inset-bottom,0px)] bg-[#10051C]/90 backdrop-blur-2xl border-t border-[#302744]/70 flex items-center justify-around px-2 z-20">
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
                  ? 'text-[#D8B4FE] font-bold scale-105'
                  : 'text-[#A99DBE] hover:text-[#F8F5FF]'
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
