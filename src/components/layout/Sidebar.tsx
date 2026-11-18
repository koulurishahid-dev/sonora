'use client';

import React from 'react';
import { ViewType } from '@/types/music';
import {
  Compass,
  Music2,
  Heart,
  ListMusic,
  User,
  Settings,
  Plus,
  Radio,
  ChevronLeft,
  ChevronRight,
  Search,
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
  const navItems: { view: ViewType; label: string; icon: any }[] = [
    { view: 'home', label: 'Home', icon: Compass },
    { view: 'all-songs', label: 'All Songs', icon: Music2 },
    { view: 'playlists', label: 'Playlists', icon: ListMusic },
    { view: 'liked', label: 'Favorites', icon: Heart },
    { view: 'artists', label: 'Artists', icon: User },
    { view: 'search', label: 'Search', icon: Search },
  ];

  return (
    <aside
      className={`h-full bg-[#110F1D] border-r border-[#302744] flex flex-col transition-all duration-300 relative select-none ${
        isCollapsed ? 'w-20' : 'w-64'
      } ${className}`}
    >
      {/* Personal Brand Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-[#302744]">
        {!isCollapsed && (
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-[#A78BFA] flex items-center justify-center text-[#090812] shadow-lg shadow-[#A78BFA]/25 group-hover:scale-105 transition-transform">
              <Radio className="w-4 h-4 fill-[#090812]" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-wider text-[#F8F5FF]">SONORA</span>
              <span className="text-[10px] block text-[#C2B5D9] italic font-serif -mt-0.5">
                my music journal
              </span>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div
            onClick={() => onNavigate('home')}
            className="w-10 h-10 rounded-xl bg-[#A78BFA] flex items-center justify-center text-[#090812] mx-auto cursor-pointer shadow-lg shadow-[#A78BFA]/25"
            title="SONORA – My Music Journal"
          >
            <Radio className="w-5 h-5 fill-[#090812]" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#A99DBE] hover:text-[#F8F5FF] hover:bg-[#141122] hidden md:block transition-colors"
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
              ? 'bg-[#A78BFA] text-[#090812] p-2.5 hover:scale-105 shadow-[#A78BFA]/25'
              : 'bg-[#141122] hover:bg-[#2A2140] text-[#F8F5FF] border border-[#302744] hover:border-[#A78BFA]/40'
          }`}
          title="Add Music"
        >
          <Plus className="w-4 h-4 text-[#A78BFA] stroke-[3]" />
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
              className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-[#211A32] text-[#D8B4FE] border border-[#302744] shadow-md shadow-[#A78BFA]/10'
                  : 'text-[#C2B5D9] hover:text-[#F8F5FF] hover:bg-[#141122] hover:translate-x-1'
              }`}
              title={item.label}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'scale-110 text-[#A78BFA]' : 'group-hover:text-[#F8F5FF]'
                }`}
              />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
              {!isCollapsed && isActive && (
                <span className="ml-auto flex items-end gap-0.5 h-2.5">
                  <span className="w-0.5 bg-[#A78BFA] rounded-full animate-eq-1 h-2.5" />
                  <span className="w-0.5 bg-[#A78BFA] rounded-full animate-eq-2 h-2.5" />
                  <span className="w-0.5 bg-[#A78BFA] rounded-full animate-eq-3 h-2.5" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Settings Footer */}
      <div className="p-3 border-t border-[#302744]">
        <button
          onClick={() => onNavigate('settings')}
          className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            currentView === 'settings'
              ? 'bg-[#211A32] text-[#D8B4FE] border border-[#302744]'
              : 'text-[#C2B5D9] hover:text-[#F8F5FF] hover:bg-[#141122]'
          }`}
          title="My Space / Settings"
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
}
