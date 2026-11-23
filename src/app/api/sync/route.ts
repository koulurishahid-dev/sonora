import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SongModel } from '@/models/Song';
import { PlaylistModel } from '@/models/Playlist';
import { PlaylistSongModel } from '@/models/PlaylistSong';
import { FavoriteModel } from '@/models/Favorite';
import { HistoryModel } from '@/models/ListeningHistory';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const { songs, playlists, playlistSongs, favorites, history } = body;

    const results: any = {};

    if (Array.isArray(songs) && songs.length > 0) {
      const ops = songs.map(s => ({
        updateOne: { filter: { id: s.id }, update: { $set: s }, upsert: true },
      }));
      const r = await SongModel.bulkWrite(ops);
      results.songs = { upserted: r.upsertedCount, modified: r.modifiedCount };
    }

    if (Array.isArray(playlists) && playlists.length > 0) {
      const ops = playlists.map(pl => ({
        updateOne: { filter: { id: pl.id }, update: { $set: pl }, upsert: true },
      }));
      const r = await PlaylistModel.bulkWrite(ops);
      results.playlists = { upserted: r.upsertedCount, modified: r.modifiedCount };
    }

    if (Array.isArray(playlistSongs) && playlistSongs.length > 0) {
      const ops = playlistSongs.map(ps => ({
        updateOne: { filter: { id: ps.id }, update: { $set: ps }, upsert: true },
      }));
      const r = await PlaylistSongModel.bulkWrite(ops);
      results.playlistSongs = { upserted: r.upsertedCount, modified: r.modifiedCount };
    }

    if (Array.isArray(favorites) && favorites.length > 0) {
      const ops = favorites.map(f => ({
        updateOne: { filter: { songId: f.songId }, update: { $set: f }, upsert: true },
      }));
      const r = await FavoriteModel.bulkWrite(ops);
      results.favorites = { upserted: r.upsertedCount, modified: r.modifiedCount };
    }

    if (Array.isArray(history) && history.length > 0) {
      const ops = history.map(h => ({
        updateOne: { filter: { id: h.id }, update: { $set: h }, upsert: true },
      }));
      const r = await HistoryModel.bulkWrite(ops);
      results.history = { upserted: r.upsertedCount, modified: r.modifiedCount };
    }

    return NextResponse.json({
      success: true,
      results,
      syncedAt: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Sync failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    const [songs, playlists, playlistSongs, favorites] = await Promise.all([
      SongModel.find().lean(),
      PlaylistModel.find().lean(),
      PlaylistSongModel.find().lean(),
      FavoriteModel.find().lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        songs,
        playlists,
        playlistSongs,
        favorites,
      },
      counts: {
        songs: songs.length,
        playlists: playlists.length,
      },
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to retrieve sync data' },
      { status: 500 }
    );
  }
}
