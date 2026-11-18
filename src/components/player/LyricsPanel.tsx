'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Song, SongLyrics, LyricLine } from '@/types/music';
import { db } from '@/lib/db';
import { Edit3, Check, Music2, Sparkles } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface LyricsPanelProps {
  song: Song | null;
  currentTime: number;
  onSeek?: (time: number) => void;
  className?: string;
}

// Parse LRC format string: "[00:12.34] Lyrics line"
export function parseLrc(lrcText: string): LyricLine[] {
  const lines = lrcText.split('\n');
  const result: LyricLine[] = [];
  const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;

  for (const line of lines) {
    const matches = [...line.matchAll(timeRegex)];
    if (matches.length > 0) {
      const text = line.replace(timeRegex, '').trim();
      for (const match of matches) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0;
        const time = min * 60 + sec + ms / 1000;
        result.push({ time, text });
      }
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

export function LyricsPanel({ song, currentTime, onSeek, className = '' }: LyricsPanelProps) {
  const { showToast } = useToast();
  const [lyricsData, setLyricsData] = useState<SongLyrics | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const activeLineRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load lyrics from db
  useEffect(() => {
    if (!song) {
      setLyricsData(null);
      return;
    }

    async function loadLyrics() {
      if (!song) return;
      const stored = await db.lyrics.where('songId').equals(song.id).first();
      if (stored) {
        setLyricsData(stored);
        setEditText(stored.plainLyrics || '');
      } else {
        setLyricsData(null);
        setEditText('');
      }
    }

    loadLyrics();
  }, [song]);

  // Determine current active lyric index
  let activeIndex = -1;
  const synced = lyricsData?.syncedLyrics;
  if (synced && synced.length > 0) {
    for (let i = 0; i < synced.length; i++) {
      if (currentTime >= synced[i].time) {
        activeIndex = i;
      } else {
        break;
      }
    }
  }

  // Auto scroll to active lyric
  useEffect(() => {
    if (activeLineRef.current && containerRef.current && !isEditing) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [activeIndex, isEditing]);

  const handleSave = async () => {
    if (!song) return;
    const parsedSynced = parseLrc(editText);

    const updated: SongLyrics = {
      id: lyricsData?.id || `lyrics_${song.id}`,
      songId: song.id,
      plainLyrics: editText,
      syncedLyrics: parsedSynced.length > 0 ? parsedSynced : undefined,
      updatedAt: Date.now(),
    };

    await db.lyrics.put(updated);
    setLyricsData(updated);
    setIsEditing(false);
    showToast('Lyrics saved', 'Lyrics updated for this track', 'success');
  };

  if (!song) {
    return (
      <div className={`flex flex-col items-center justify-center p-8 text-center text-[#A1A1AA] ${className}`}>
        <Music2 className="w-12 h-12 mb-3 stroke-[1.5] text-[#303038]" />
        <p className="text-base font-medium text-white">No track playing</p>
        <p className="text-sm">Play a song to view or edit lyrics</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#302744] bg-[#171326]/80 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#A78BFA]" />
          <h3 className="font-semibold text-[#F8F5FF] text-base">Lyrics</h3>
          {synced && synced.length > 0 && (
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#A78BFA]/15 text-[#D8B4FE] border border-[#A78BFA]/30">
              Synced
            </span>
          )}
        </div>

        <div>
          {isEditing ? (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#A78BFA] hover:bg-[#D8B4FE] text-[#090812] transition-all shadow-md"
            >
              <Check className="w-3.5 h-3.5" /> Save Lyrics
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#C2B5D9] hover:text-[#F8F5FF] hover:bg-[#2A2140] bg-[#141122] border border-[#302744] transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit / Add
            </button>
          )}
        </div>
      </div>

      {/* Lyrics Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-8 relative">
        {isEditing ? (
          <div className="flex flex-col h-full gap-3">
            <p className="text-xs text-[#A99DBE]">
              Paste plain lyrics or synchronized LRC format like <code className="text-[#D8B4FE] bg-[#211A32] px-1 rounded">[00:15.20] Lyric line</code>:
            </p>
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              placeholder="Paste or write lyrics here..."
              className="w-full flex-1 min-h-[300px] p-4 rounded-xl bg-[#141122] border border-[#302744] text-[#F8F5FF] text-sm focus:outline-none focus:border-[#A78BFA] resize-none font-mono"
            />
          </div>
        ) : synced && synced.length > 0 ? (
          <div className="space-y-6 max-w-xl mx-auto py-6">
            {synced.map((line, idx) => {
              const isActive = idx === activeIndex;
              const isPast = idx < activeIndex;
              return (
                <div
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => onSeek && onSeek(line.time)}
                  className={`cursor-pointer transition-all duration-300 py-1.5 px-3 rounded-lg ${
                    isActive
                      ? 'text-[#F8F5FF] text-2xl font-bold scale-105 origin-left text-[#D8B4FE] drop-shadow-[0_0_16px_rgba(167,139,250,0.5)]'
                      : isPast
                      ? 'text-[#A99DBE] text-lg font-medium opacity-50 hover:opacity-90'
                      : 'text-[#C2B5D9] text-lg font-medium hover:text-[#F8F5FF] hover:opacity-100'
                  }`}
                >
                  {line.text || '...'}
                </div>
              );
            })}
          </div>
        ) : lyricsData?.plainLyrics ? (
          <div className="max-w-xl mx-auto py-6 whitespace-pre-wrap text-lg leading-relaxed text-[#F8F5FF] font-medium">
            {lyricsData.plainLyrics}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#A99DBE] py-16">
            <Music2 className="w-12 h-12 mb-3 stroke-[1.5] text-[#302744]" />
            <p className="text-base font-medium text-[#F8F5FF] mb-1">No lyrics available</p>
            <p className="text-sm max-w-xs mb-4">You can manually add synchronized or plain text lyrics for this song.</p>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#211A32] text-[#F8F5FF] hover:bg-[#2A2140] border border-[#302744] hover:border-[#A78BFA]/50 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#A78BFA]" /> Add Lyrics
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
