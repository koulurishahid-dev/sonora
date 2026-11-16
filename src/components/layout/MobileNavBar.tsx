'use client';

import React from 'react';
import { ViewType } from '@/types/music';
import { Home, Search, Library, ListMusic, Heart, Settings } from 'lucide-react';

interface MobileNavBarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

export function MobileNavBar({ currentView, onNavigate }: MobileNavBarProps) {
  const items: { view: ViewType; label: string; icon: any }[] = [
    { view: 'home', label: 'Home', icon: Home },
    { view: 'search', label: 'Search', icon: Search },
    { view: 'library', label: 'Library', icon: Library },
    { view: 'playlists', label: 'Playlists', icon: ListMusic },
    { view: 'liked', label: 'Liked', icon: Heart },
    { view: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="h-14 bg-[#121216]/95 backdrop-blur-md border-t border-[#303038]/60 flex items-center justify-around px-2 z-20 md:hidden">
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
              isActive ? 'text-[var(--accent)] font-semibold scale-105' : 'text-[#A1A1AA] hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4 mb-0.5" />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
