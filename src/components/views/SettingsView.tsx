'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme, ACCENT_COLORS } from '@/context/ThemeContext';
import { usePlayer } from '@/context/PlayerContext';
import {
  db,
  getStorageEstimate,
  requestPersistentStorage,
  exportDatabaseToJson,
  importDatabaseFromJson,
  exportFullLibraryZip,
  importFullLibraryZip,
  resetGeneratedSampleSongs,
  resetAllSongs,
} from '@/lib/db';
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
  Lock,
  Archive,
  FileCode,
  Loader2,
  Info,
  CheckCircle2,
  User,
  Sparkles,
  Heart,
  Smile,
  Music,
} from 'lucide-react';

export function SettingsView() {
  const { settings, updateSettings } = useTheme();
  const { showToast } = useToast();
  const { crossfadeDuration, setCrossfadeDuration, setIsShortcutsOpen } = usePlayer();

  const [listenerName, setListenerName] = useState(settings.listenerName || '');
  const [listenerBio, setListenerBio] = useState(settings.listenerBio || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [storage, setStorage] = useState<{ usage: number; quota: number; percent: number }>({
    usage: 0,
    quota: 0,
    percent: 0,
  });
  const [isPersisted, setIsPersisted] = useState(false);

  // Backup & Restore states
  const [isExportingMetadata, setIsExportingMetadata] = useState(false);
  const [isExportingFullZip, setIsExportingFullZip] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<{ percent: number; status: string }>({
    percent: 0,
    status: '',
  });

  // Privacy lock
  const [pinInput, setPinInput] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getStorageEstimate().then(setStorage);
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(setIsPersisted);
    }
  }, []);

  useEffect(() => {
    if (settings.listenerName !== undefined) setListenerName(settings.listenerName);
    if (settings.listenerBio !== undefined) setListenerBio(settings.listenerBio);
  }, [settings.listenerName, settings.listenerBio]);

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      await updateSettings({
        listenerName: listenerName.trim(),
        listenerBio: listenerBio.trim(),
      });
      showToast('Profile Saved', 'Your personal listener space has been updated ✨', 'success');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSelectAvatar = async (avatar: string) => {
    await updateSettings({ listenerAvatar: avatar });
    showToast('Avatar Updated', 'New listener avatar set', 'info');
  };

  // Export Metadata JSON only
  const handleExportMetadata = async () => {
    setIsExportingMetadata(true);
    try {
      const json = await exportDatabaseToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `naa-paatalu-metadata-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Export Complete', 'Metadata & playlists JSON saved to disk', 'success');
    } catch (err: any) {
      showToast('Export Failed', err?.message || 'Failed to export metadata', 'error');
    } finally {
      setIsExportingMetadata(false);
    }
  };

  // Export Full ZIP Archive (Audio Files + Artwork + Metadata)
  const handleExportFullArchive = async () => {
    setIsExportingFullZip(true);
    setRestoreProgress({ percent: 5, status: 'Initializing archive...' });

    try {
      const zipBlob = await exportFullLibraryZip((percent, status) => {
        setRestoreProgress({ percent, status });
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `naa-paatalu-full-library-archive-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      showToast('Archive Complete', 'Full audio archive successfully downloaded!', 'success');
    } catch (err: any) {
      showToast('Archive Error', err?.message || 'Failed to create archive', 'error');
    } finally {
      setIsExportingFullZip(false);
      setRestoreProgress({ percent: 0, status: '' });
    }
  };

  // Import Backup (JSON or ZIP)
  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    setRestoreProgress({ percent: 5, status: 'Reading backup file...' });

    try {
      const isZip = file.name.endsWith('.zip');
      if (isZip) {
        const result = await importFullLibraryZip(file, (percent, status) => {
          setRestoreProgress({ percent, status });
        });
        if (result.success) {
          showToast('Restore Successful', result.message, 'success');
          getStorageEstimate().then(setStorage);
        } else {
          showToast('Restore Failed', result.message, 'error');
        }
      } else {
        const text = await file.text();
        const result = await importDatabaseFromJson(text);
        if (result.success) {
          showToast('Restore Successful', result.message, 'success');
          getStorageEstimate().then(setStorage);
        } else {
          showToast('Restore Failed', result.message, 'error');
        }
      }
    } catch (err: any) {
      showToast('Restore Failed', err?.message || 'Error processing backup', 'error');
    } finally {
      setIsRestoring(false);
      setRestoreProgress({ percent: 0, status: '' });
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSavePin = async () => {
    if (!pinInput.trim() || pinInput.length < 4) {
      showToast('PIN Too Short', 'PIN must be at least 4 digits', 'error');
      return;
    }
    await updateSettings({
      privacyLockEnabled: true,
      privacyPasscode: pinInput.trim(),
    });
    setPinInput('');
    setIsSettingPin(false);
    showToast('Privacy Lock Enabled', 'Your library is now protected with a passcode.', 'success');
  };

  const handleDisablePin = async () => {
    await updateSettings({
      privacyLockEnabled: false,
      privacyPasscode: undefined,
    });
    showToast('Privacy Lock Disabled', 'Passcode protection removed.', 'info');
  };

  const handleClearHistory = async () => {
    if (confirm('Clear entire listening history?')) {
      await db.listeningHistory.clear();
      showToast('History Cleared', 'Listening history has been wiped', 'info');
    }
  };

  const handleResetSampleSongs = async () => {
    if (confirm('Remove all generated sample songs from your library?')) {
      const count = await resetGeneratedSampleSongs();
      showToast('Sample Songs Reset', `Removed ${count} sample tracks.`, 'info');
      getStorageEstimate().then(setStorage);
    }
  };

  const handleClearAllSongs = async () => {
    if (confirm('Delete all songs from your library? (Playlists and settings will be preserved)')) {
      const count = await resetAllSongs();
      showToast('Library Cleared', `Removed all ${count} songs from library.`, 'info');
      getStorageEstimate().then(setStorage);
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
      'DANGER: Are you sure you want to completely reset NAA PAATALU? This will erase all songs, playlists, favorites, and settings from this browser.'
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
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)] tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span className="uppercase tracking-widest text-[10px]">Private Journal Space</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white">My Space & Settings</h1>
        <p className="text-xs text-[#A1A1AA] mt-1">
          Personalize your music diary, customize audio transitions, and manage your private offline library
        </p>
      </div>

      {/* Personal Profile & Diary Customization */}
      <section className="p-6 rounded-2xl bg-[#19191F] border border-[#303038] space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-white">
            <User className="w-5 h-5 text-[var(--accent)]" />
            <div>
              <h2 className="text-base font-bold">Listener Profile</h2>
              <p className="text-[11px] text-[#A1A1AA]">The name and aesthetic that welcomes you to your music diary</p>
            </div>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 font-medium">
            Personal Corner
          </span>
        </div>

        {/* Avatar Selection */}
        <div>
          <label className="text-xs font-semibold text-[#A1A1AA] block mb-2">Listener Avatar</label>
          <div className="flex items-center gap-2.5 flex-wrap">
            {['🎧', '🌙', '✨', '☕', '🌸', '🎸', '🌊', '🌿', '📻', '🕯️'].map(emoji => {
              const isSelected = (settings.listenerAvatar || '🎧') === emoji;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSelectAvatar(emoji)}
                  className={`w-11 h-11 rounded-2xl text-xl flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[var(--accent)]/20 border-2 border-[var(--accent)] scale-110 shadow-lg'
                      : 'bg-[#121216] border border-[#303038] hover:border-white/30 hover:scale-105'
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>

        {/* Name and Bio Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-[#A1A1AA] block mb-1.5">Your Name / Alias</label>
            <input
              type="text"
              placeholder="e.g. Shahid"
              value={listenerName}
              onChange={e => setListenerName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#121216] border border-[#303038] text-white text-xs focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#A1A1AA] block mb-1.5">Journal Note / Bio</label>
            <input
              type="text"
              placeholder="e.g. Lost in Telugu melodies & late night rhythms"
              value={listenerBio}
              onChange={e => setListenerBio(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#121216] border border-[#303038] text-white text-xs focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none transition-colors"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--accent)] text-black text-xs font-bold hover:opacity-95 transition-all shadow-md disabled:opacity-50"
          >
            {isSavingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>Save Profile</span>
          </button>
        </div>
      </section>

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

        {settings.crossfadeEnabled && (
          <div className="p-3 rounded-xl bg-[#121216] border border-[#303038]/60 space-y-1.5">
            <div className="flex justify-between text-xs font-medium text-[#A1A1AA]">
              <span>Crossfade Transition Duration</span>
              <span className="font-mono text-[#D8B4FE] font-bold">{crossfadeDuration} seconds</span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={crossfadeDuration}
              onChange={e => setCrossfadeDuration(parseInt(e.target.value, 10))}
              className="w-full accent-[var(--accent)] cursor-pointer"
            />
          </div>
        )}

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

      {/* Privacy & Device-Local Protection */}
      <section className="p-6 rounded-2xl bg-[#19191F] border border-[#303038] space-y-4">
        <div className="flex items-center gap-2.5 text-white">
          <Lock className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-base font-bold">Privacy & Security</h2>
        </div>

        <div className="p-4 rounded-xl bg-[#121216] border border-[#303038]/60 flex items-start gap-3">
          <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          <p className="text-xs text-[#A1A1AA] leading-relaxed">
            <strong className="text-white">Strict Single-User Local Storage:</strong> NAA PAATALU stores
            your songs and metadata exclusively inside this browser instance (IndexedDB). Your files
            never sync to external servers or public clouds. To transfer music to another device,
            use the complete ZIP backup feature below.
          </p>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#303038]/60">
          <div>
            <p className="text-xs font-semibold text-white">Passcode Lock Protection</p>
            <p className="text-[11px] text-[#A1A1AA]">
              Require a private PIN code to access the personal music library
            </p>
          </div>
          {settings.privacyLockEnabled ? (
            <button
              onClick={handleDisablePin}
              className="px-3 py-1.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-semibold hover:bg-rose-900/80 transition-colors"
            >
              Disable Lock
            </button>
          ) : (
            <button
              onClick={() => setIsSettingPin(true)}
              className="px-3 py-1.5 rounded-lg bg-[#25252D] hover:bg-[#303038] border border-[#303038] text-white text-xs font-semibold transition-colors"
            >
              Set Passcode
            </button>
          )}
        </div>

        {isSettingPin && (
          <div className="p-3.5 rounded-xl bg-[#121216] border border-[var(--accent)]/40 flex items-center gap-3">
            <input
              type="password"
              placeholder="Enter 4-digit PIN..."
              maxLength={6}
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#19191F] border border-[#303038] text-white text-xs font-mono focus:border-[var(--accent)] outline-none w-36"
            />
            <button
              onClick={handleSavePin}
              className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black text-xs font-bold hover:opacity-95"
            >
              Save PIN
            </button>
            <button
              onClick={() => {
                setIsSettingPin(false);
                setPinInput('');
              }}
              className="text-xs text-[#A1A1AA] hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}
      </section>

      {/* Complete Backup & Restore (Distinguishing Metadata vs Full Archive) */}
      <section className="p-6 rounded-2xl bg-[#19191F] border border-[#303038] space-y-6">
        <div className="flex items-center gap-2.5 text-white">
          <Download className="w-5 h-5 text-[var(--accent)]" />
          <h2 className="text-base font-bold">Library Backup & Restore</h2>
        </div>

        {/* Progress indicator if exporting or restoring */}
        {(isExportingFullZip || isRestoring) && (
          <div className="p-4 rounded-xl bg-[#121216] border border-[var(--accent)]/40 space-y-2 animate-pulse">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white font-semibold flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
                {restoreProgress.status || 'Processing archive...'}
              </span>
              <span className="font-mono text-[var(--accent)]">{restoreProgress.percent}%</span>
            </div>
            <div className="w-full bg-[#19191F] h-2 rounded-full overflow-hidden">
              <div
                className="bg-[var(--accent)] h-full transition-all duration-300"
                style={{ width: `${restoreProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Full ZIP Archive Backup */}
          <div className="p-4 rounded-xl bg-[#121216] border border-[#303038] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Archive className="w-4 h-4 text-purple-400" />
                <span>Full Music Archive (ZIP)</span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                Contains complete audio files, artwork images, playlists, lyrics, and metadata
                bundled into a compressed ZIP file.
              </p>
            </div>
            <button
              onClick={handleExportFullArchive}
              disabled={isExportingFullZip || isRestoring}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-all disabled:opacity-50"
            >
              {isExportingFullZip ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Archive className="w-3.5 h-3.5" />
              )}
              <span>Download Full ZIP Archive</span>
            </button>
          </div>

          {/* Card 2: Lightweight Metadata JSON */}
          <div className="p-4 rounded-xl bg-[#121216] border border-[#303038] flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileCode className="w-4 h-4 text-[var(--accent)]" />
                <span>Metadata Only (JSON)</span>
              </div>
              <p className="text-xs text-[#A1A1AA] mt-1 leading-relaxed">
                Fast, tiny backup containing song tags, playlists, and settings. Does{' '}
                <em>not</em> include the heavy audio binary files.
              </p>
            </div>
            <button
              onClick={handleExportMetadata}
              disabled={isExportingMetadata}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#25252D] hover:bg-[#303038] border border-[#303038] text-white text-xs font-semibold transition-all"
            >
              <Download className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Export Metadata JSON</span>
            </button>
          </div>
        </div>

        {/* Restore Section */}
        <div className="pt-2 border-t border-[#303038]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-white">Restore from Backup</p>
            <p className="text-[11px] text-[#A1A1AA]">
              Accepts both full <code className="text-purple-400">.zip</code> archives and{' '}
              <code className="text-emerald-400">.json</code> metadata files with automatic
              validation and duplicate prevention.
            </p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRestoring || isExportingFullZip}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-black text-xs font-bold hover:opacity-95 transition-all shadow-md shrink-0 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            <span>Select Backup to Restore</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.zip"
            onChange={handleRestoreFile}
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
            <span className="font-mono text-[var(--accent)] font-semibold">
              {formatFileSize(storage.usage)}
            </span>
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

        <div className="pt-2 flex justify-end">
          <button
            onClick={() => setIsShortcutsOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#211A32] hover:bg-[#2C2344] border border-[#302744] text-xs font-semibold text-white transition-all"
          >
            <Keyboard className="w-4 h-4 text-[#A855F7]" />
            <span>Open Interactive Cheatsheet (?)</span>
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="p-6 rounded-2xl bg-rose-950/20 border border-rose-900/50 space-y-4">
        <div className="flex items-center gap-2.5 text-rose-300">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="text-base font-bold">Danger Zone</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleResetSampleSongs}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#19191F] hover:bg-[#25252D] text-amber-300 text-xs font-semibold border border-amber-800/60 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Remove Generated Sample Songs
          </button>

          <button
            onClick={handleClearAllSongs}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#19191F] hover:bg-[#25252D] text-rose-300 text-xs font-semibold border border-rose-900/60 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All Songs
          </button>

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
            <AlertTriangle className="w-3.5 h-3.5" /> Reset All Naa Paatalu Data
          </button>
        </div>
      </section>
    </div>
  );
}
