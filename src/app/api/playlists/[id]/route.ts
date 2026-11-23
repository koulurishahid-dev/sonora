import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PlaylistModel } from '@/models/Playlist';
import { PlaylistSongModel } from '@/models/PlaylistSong';
import { SongModel } from '@/models/Song';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const playlist = await PlaylistModel.findOne({ id }).lean();
    if (!playlist) {
      return NextResponse.json({ success: false, error: 'Playlist not found' }, { status: 404 });
    }

    const playlistSongs = await PlaylistSongModel.find({ playlistId: id })
      .sort({ order: 1 })
      .lean();

    const songIds = playlistSongs.map(ps => ps.songId);
    const songs = await SongModel.find({ id: { $in: songIds } }).lean();

    const songMap = new Map(songs.map(s => [s.id, s]));
    const orderedSongs = playlistSongs
      .map(ps => songMap.get(ps.songId))
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      playlist,
      songs: orderedSongs,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch playlist' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();
    const { id } = await params;

    await Promise.all([
      PlaylistModel.deleteOne({ id }),
      PlaylistSongModel.deleteMany({ playlistId: id }),
    ]);

    return NextResponse.json({ success: true, message: 'Playlist deleted' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to delete playlist' },
      { status: 500 }
    );
  }
}
