import { NextResponse } from 'next/server';
import { connectToDatabase, getDatabaseStatus } from '@/lib/mongodb';
import { SongModel } from '@/models/Song';
import { PlaylistModel } from '@/models/Playlist';

export async function GET() {
  try {
    const status = await getDatabaseStatus();
    if (!status.isConnected) {
      return NextResponse.json(
        {
          success: false,
          status: 'disconnected',
          error: status.error,
          hint: 'Ensure your IP is whitelisted in MongoDB Atlas Network Access (0.0.0.0/0 for unrestricted access).',
        },
        { status: 503 }
      );
    }

    await connectToDatabase();
    const songCount = await SongModel.countDocuments();
    const playlistCount = await PlaylistModel.countDocuments();

    return NextResponse.json({
      success: true,
      status: 'connected',
      database: status.dbName,
      collections: status.collections,
      counts: {
        songs: songCount,
        playlists: playlistCount,
      },
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        status: 'error',
        error: err?.message || 'Database error',
      },
      { status: 500 }
    );
  }
}
