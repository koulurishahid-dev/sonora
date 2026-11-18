'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppSettings } from '@/types/music';
import { db } from '@/lib/db';
import { hexToRgb } from '@/lib/utils';

export const ACCENT_COLORS = [
  { name: 'Emerald', hex: '#1ED760' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Cyan Neon', hex: '#06B6D4' },
  { name: 'Sunset Rose', hex: '#F43F5E' },
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Electric Blue', hex: '#3B82F6' },
];

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  accentColor: '#1ED760',
  defaultVolume: 0.8,
  crossfadeEnabled: false,
  crossfadeDuration: 3,
  autoplay: true,
  playbackMode: 'normal',
  eqPreset: 'flat',
  bassGain: 0,
  trebleGain: 0,
};

interface ThemeContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const stored = await db.settings.get('app_settings');
        if (stored && stored.value) {
          setSettings(prev => ({ ...prev, ...stored.value }));
        }
      } catch (err) {
        console.warn('Notice: Failed to load settings:', err);
      } finally {
        setIsLoaded(true);
      }
    }
    loadSettings();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const root = document.documentElement;
    // Apply accent color
    const accent = settings.accentColor || '#1ED760';
    root.style.setProperty('--accent', accent);
    const rgb = hexToRgb(accent);
    root.style.setProperty('--accent-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);

    // Apply theme
    if (settings.theme === 'amoled') {
      root.classList.add('theme-amoled');
      root.classList.remove('theme-light');
    } else if (settings.theme === 'light') {
      root.classList.add('theme-light');
      root.classList.remove('theme-amoled');
    } else {
      root.classList.remove('theme-amoled');
      root.classList.remove('theme-light');
    }
  }, [settings, isLoaded]);

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await db.settings.put({ key: 'app_settings', value: updated });
    } catch (err) {
      console.warn('Notice: Failed to save settings:', err);
    }
  };

  const resetSettings = async () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      await db.settings.put({ key: 'app_settings', value: DEFAULT_SETTINGS });
    } catch (err) {
      console.warn('Notice: Failed to reset settings:', err);
    }
  };

  return (
    <ThemeContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
