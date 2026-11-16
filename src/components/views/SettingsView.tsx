'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme, ACCENT_COLORS } from '@/context/ThemeContext';
import { db, getStorageEstimate, requestPersistentStorage, exportDatabaseToJson, importDatabaseFromJson, syncAlbumsAndArtists } from '@/lib/db';
import { formatFileSize } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import {
  Palette,
  Volume2,
  Sliders,
  Keyboard,
  HardDrive,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export function SettingsView() {
  const { settings, updateSettings, resetSettings } = useTheme();
  const { showToast } = useToast();

  const [storage, setStorage] = useState<{ usage: number; quota: number; percent: number }>({
    usage: 0,
    quota: 0,
    percent: 0,
  });
  const [isPersisted, setIsPersisted] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getStorageEstimate().then(setStorage);
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(setIsPersisted);
    }
  }, []);

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const json = await exportDatabaseToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sonora-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export Successful', 'Metadata and playlist backup saved to disk', 'success');
    } catch (err: any) {
      showToast('Export Failed', err?.message || 'Failed to export backup', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const result = await importDatabaseFromJson(text);
      if (result.success) {
        showToast('Restore Complete', result.message, 'success');
        getStorageEstimate().then(setStorage);
      } else {
        showToast('Restore Failed', result.message, 'error');
      }
    } catch (err: any) {
      showToast('Import Error', err?.message || 'Could not read backup file', 'error');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Clear entire listening history?')) {
      await db.listeningHistory.clear();
      showToast('History Cleared', 'Listening history has been wiped', 'info');
    }
  };

  const handleClearCache = async () => {
    if (confirm('Clear cache and reload?')) {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      showToast('Cache Cleared', 'Application cache has been cleared', 'info');
      setTimeout(() => window.location.reload(), 800);
    }
  };

  const handleResetApplication = async () => {
    const proceed = confirm(
      'DANGER: Are you sure you want to completely reset SONORA? This will erase all songs, playlists, favorites, and settings from this browser.'
    );
    if (proceed) {
      await db.delete();
      localStorage.clear();
      sessionStorage.clear();
      showToast('App Reset', 'All database tables deleted. Reloading...', 'info');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleRequestPersistence = async () => {
    const granted = await requestPersistentStorage();
    setIsPersisted(granted);
    if (granted) {
      showToast('Persistent Storage', 'Browser granted persistent storage.', 'success');
    } else {
      showToast('Persistent Storage', 'Storage is managed by browser.', 'info');
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-4xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">Settings</h1>
        <p className="text-xs text-[#A1A1AA] mt-1">
          Customize audio behavior, visual theme, backup and storage preferences
        </p>
      </div>

      {/* Appearance Section */}
      <section className="p-6 rounded-2xl bg-[#19191F] border border-[#303038] space-y-6">
        <div className="flex items-center gap-2.5 text-white">
          <Palette className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-base font-bold">Theme & Appearance</h2>
        </div>

        {/* Theme mode */}
        <div>
          <label className="text-xs font-semibold text-[#A1A1AA] block mb-2">Display Theme</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'dark' as const, name: 'Deep Dark' },
              { id: 'amoled' as const, name: 'Pure AMOLED' },
              { id: 'light' as const, name: 'Light Studio' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => updateSettings({ theme: t.id })}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold border transition-all ${
                  settings.theme === t.id
                    ? 'bg-[var(--accent)] text-black border-transparent shadow-md'
                    : 'bg-[#121216] border-[#303038] text-[#A1A1AA] hover:text-white hover:bg-[#25252D]'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <label className="text-xs font-semibold text-[#A1A1AA] block mb-2">Accent Color</label>
          <div className="flex flex-wrap items-center gap-3">
            {ACCENT_COLORS.map(c => {
              const isSelected = settings.accentColor === c.hex;
              return (
                <button
                  key={c.hex}
                  onClick={() => updateSettings({ accentColor: c.hex })}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121216] border border-[#303038] hover:border-white/30 transition-all"
                >
                  <span
                    className="w-4 h-4 rounded-full shadow-inner flex items-center justify-center"
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                  <span
                    className={`text-xs ${
                      isSelected ? 'font-bold text-white' : 'text-[#A1A1AA]'
                    }`}
                  >
                    {c.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Audio Engine Settings */}
      <section className="p-6 rounded-2xl bg-[#19191F] border border-[#303038] space-y-6">
        <div className="flex items-center gap-2.5 text-white">
          <Volume2 className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-base font-bold">Audio & Playback</h2>
        </div>

        {/* Default Volume */}
        <div>
          <div className="flex justify-between text-xs font-medium text-[#A1A1AA] mb-2">
            <span>Default Playback Volume</span>
            <span className="font-mono text-white">{Math.round(settings.defaultVolume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.defaultVolume}
            onChange={e => updateSettings({ defaultVolume: parseFloat(e.target.value) })}
            className="w-full accent-[var(--accent)]"
          />
        </div>

        {/* Crossfade */}
        <div className="flex items-center justify-between pt-2 border-t border-[#303038]/60">
          <div>
            <p className="text-xs font-semibold text-white">Crossfade Transitions</p>
            <p className="text-[11px] text-[#A1A1AA]">
              Smoothly ramp volume between sequential tracks
            </p>
          </div>
          <button
            onClick={() => updateSettings({ crossfadeEnabled: !settings.crossfadeEnabled })}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              settings.crossfadeEnabled ? 'bg-[var(--accent)]' : 'bg-[#303038]'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.crossfadeEnabled ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>

        {/* Autoplay */}
        <div className="flex items-center justify-between pt-2 border-t border-[#303038]/60">
          <div>
            <p className="text-xs font-semibold text-white">Autoplay Next Track</p>
            <p className="text-[11px] text-[#A1A1AA]">
              Automatically play the subsequent queued track when finished
            </p>
          </div>
          <button
            onClick={() => updateSettings({ autoplay: !settings.autoplay })}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              settings.autoplay ? 'bg-[var(--accent)]' : 'bg-[#303038]'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.autoplay ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
      </section>

      {/* Keyboard Shortcuts Reference */}
      <section className="p-6 rounded-2xl bg-[#19191F] border border-[#303038] space-y-4">
        <div className="flex items-center gap-2.5 text-white">
          <Keyboard className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-base font-bold">Keyboard Shortcuts</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {[
            { key: 'Space', desc: 'Play / Pause playback' },
            { key: 'Arrow Left / Right', desc: 'Seek backwards / forwards 5s' },
            { key: 'Arrow Up / Down', desc: 'Adjust volume ±5%' },
            { key: 'Shift + N', desc: 'Skip to next track' },
            { key: 'Shift + P', desc: 'Previous track' },
            { key: 'M', desc: 'Mute / Unmute audio' },
            { key: 'L', desc: 'Toggle lyrics panel' },
            { key: 'Q', desc: 'Toggle play queue' },
            { key: 'F', desc: 'Toggle full-screen player' },
            { key: 'Ctrl + K / Cmd + K', desc: 'Open instant search' },
          ].map(sc => (
            <div
              key={sc.key}
              className="flex items-center justify-between p-2.5 rounded-xl bg-[#121216] border border-[#303038]"
            >
              <span className="text-[#A1A1AA]">{sc.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-[#25252D] text-white font-mono text-[11px] border border-[#303038]">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>
      </section>

      {/* Backup and Restore */}
      <section className="p-6 rounded-2xl bg-[#19191F] border border-[#303038] space-y-4">
        <div className="flex items-center gap-2.5 text-white">
          <Download className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-base font-bold">Backup & Restore</h2>
        </div>
        <p className="text-xs text-[#A1A1AA] leading-relaxed">
          Export your library metadata, playlists, favorites, and settings as a clean JSON backup file.
          You can restore this backup anytime on any device.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleExportBackup}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25252D] hover:bg-[#303038] text-white text-xs font-semibold border border-[#303038] transition-all"
          >
            <Download className="w-4 h-4 text-[var(--accent)]" />
            <span>Export Metadata Backup</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#25252D] hover:bg-[#303038] text-white text-xs font-semibold border border-[#303038] transition-all"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span>{isImporting ? 'Restoring...' : 'Restore from Backup'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportBackup}
            className="hidden"
          />
        </div>
      </section>

      {/* Storage Management */}
      <section className="p-6 rounded-2xl bg-[#19191F] border border-[#303038] space-y-4">
        <div className="flex items-center gap-2.5 text-white">
          <HardDrive className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-base font-bold">Storage Management</h2>
        </div>

        <div className="p-4 rounded-xl bg-[#121216] border border-[#303038] space-y-3">
          <div className="flex justify-between text-xs text-white">
            <span>IndexedDB Audio & Metadata</span>
            <span className="font-mono text-[var(--accent)] font-semibold">{formatFileSize(storage.usage)}</span>
          </div>
          <div className="w-full bg-[#19191F] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[var(--accent)] h-full transition-all duration-300"
              style={{ width: `${Math.max(1, storage.percent)}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-[#71717A]">
            <span>{storage.percent}% of browser quota</span>
            <span>Total space: {formatFileSize(storage.quota)}</span>
          </div>
        </div>

        <button
          onClick={handleRequestPersistence}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25252D] hover:bg-[#303038] text-white text-xs font-semibold border border-[#303038] transition-all"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{isPersisted ? 'Storage is Persistent' : 'Request Persistent Storage'}</span>
        </button>
      </section>

      {/* Danger Zone */}
      <section className="p-6 rounded-2xl bg-rose-950/20 border border-rose-900/50 space-y-4">
        <div className="flex items-center gap-2.5 text-rose-300">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="text-base font-bold">Danger Zone</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#19191F] hover:bg-[#25252D] text-rose-300 text-xs font-semibold border border-rose-900/60 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Clear Listening History
          </button>

          <button
            onClick={handleClearCache}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#19191F] hover:bg-[#25252D] text-rose-300 text-xs font-semibold border border-rose-900/60 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear App Cache
          </button>

          <button
            onClick={handleResetApplication}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Reset All Sonora Data
          </button>
        </div>
      </section>
    </div>
  );
}
