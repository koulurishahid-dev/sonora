'use client';

import React, { useEffect, useState } from 'react';
import { ViewType, Playlist } from '@/types/music';
import { db } from '@/lib/db';
import {
  Compass,
  Music2,
  Heart,
  ListMusic,
  User,
  Clock,
  WifiOff,
  Settings,
  Plus,
  Radio,
  ChevronLeft,
  ChevronRight,
  FolderPlus,
  Search,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType, param?: string) => void;
  onOpenUpload: () => void;
  onOpenCreatePlaylist: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

export function Sidebar({
  currentView,
  onNavigate,
  onOpenUpload,
  onOpenCreatePlaylist,
  isCollapsed,
  onToggleCollapse,
  className = '',
}: SidebarProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  useEffect(() => {
    const loadPlaylists = async () => {
      const pl = await db.playlists.toArray();
      setPlaylists(pl);
    };
    loadPlaylists();

    const interval = setInterval(loadPlaylists, 2500);
    return () => clearInterval(interval);
  }, []);

  const navItems: { view: ViewType; label: string; icon: any }[] = [
    { view: 'home', label: 'My World', icon: Compass },
    { view: 'all-songs', label: 'My Music', icon: Music2 },
    { view: 'playlists', label: 'Playlists', icon: ListMusic },
    { view: 'liked', label: 'Favourite Songs', icon: Heart },
    { view: 'artists', label: 'Artists I Love', icon: User },
    { view: 'recently-played', label: 'Memory Lane', icon: Clock },
    { view: 'offline', label: 'Offline Music', icon: WifiOff },
    { view: 'search', label: 'Search', icon: Search },
  ];

  return (
    <aside
      className={`h-full bg-[#121216] border-r border-[#303038] flex flex-col transition-all duration-300 relative select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${className}`}
    >
      {/* Personal Brand Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-[#303038]/50">
        {!isCollapsed && (
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center text-black shadow-lg shadow-[var(--accent)]/20 group-hover:scale-105 transition-transform">
              <Radio className="w-4 h-4 fill-black" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-wider text-white">SONORA</span>
              <span className="text-[10px] block text-[#A1A1AA] italic font-serif -mt-0.5">
                my music journal
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div
            onClick={() => onNavigate('home')}
            className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center text-black mx-auto cursor-pointer shadow-lg shadow-[var(--accent)]/20"
            title="SONORA – My Music Journal"
          >
            <Radio className="w-5 h-5 fill-black" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-lg text-[#A1A1AA] hover:text-white hover:bg-[#25252D] hidden md:block transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Add to Journal Button */}
      <div className="px-3 pt-4">
        <button
          onClick={onOpenUpload}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
            isCollapsed
              ? 'bg-[var(--accent)] text-black p-2.5 hover:scale-105'
              : 'bg-[#19191F] hover:bg-[#25252D] text-white border border-[#303038] hover:border-white/20'
          }`}
          title="Add Music"
        >
          <Plus className="w-4 h-4 text-[var(--accent)] stroke-[3]" />
          {!isCollapsed && <span>Add to Collection</span>}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onNavigate(item.view)}
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#25252D] text-[var(--accent)] shadow-sm'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#19191F]'
              }`}
              title={item.label}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive ? 'scale-110 text-[var(--accent)]' : ''
                }`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}

        {/* Personal Mixtapes Quick List */}
        {!isCollapsed && (
          <div className="pt-5 border-t border-[#303038]/60 mt-4">
            <div className="flex items-center justify-between px-3 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#71717A]">
                My Mixtapes
              </span>
              <button
                onClick={onOpenCreatePlaylist}
                className="p-1 rounded text-[#71717A] hover:text-white hover:bg-[#25252D] transition-colors"
                title="Create Mixtape"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
              {playlists.length === 0 ? (
                <p className="text-[11px] text-[#71717A] px-3 py-1 italic font-serif">
                  No mixtapes yet
                </p>
              ) : (
                playlists.map(pl => (
                  <button
                    key={pl.id}
                    onClick={() => onNavigate('playlist-detail', pl.id)}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-[#A1A1AA] hover:text-white hover:bg-[#19191F] truncate transition-colors flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                    <span className="truncate">{pl.title}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Settings Footer */}
      <div className="p-3 border-t border-[#303038]/60">
        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            currentView === 'settings'
              ? 'bg-[#25252D] text-[var(--accent)]'
              : 'text-[#A1A1AA] hover:text-white hover:bg-[#19191F]'
          }`}
          title="My Space / Settings"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>My Space</span>}
        </button>
      </div>
    </aside>
  );
}
