import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PlaylistModel } from '@/models/Playlist';
import { PlaylistSongModel } from '@/models/PlaylistSong';

export async function GET() {
  try {
    await connectToDatabase();
    const playlists = await PlaylistModel.find().sort({ updatedAt: -1 }).lean();
    return NextResponse.json({ success: true, playlists });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch playlists from MongoDB' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    if (Array.isArray(body)) {
      const ops = body.map(pl => ({
        updateOne: {
          filter: { id: pl.id },
          update: { $set: pl },
          upsert: true,
        },
      }));
      await PlaylistModel.bulkWrite(ops);
      return NextResponse.json({ success: true, count: body.length });
    } else {
      const playlist = await PlaylistModel.findOneAndUpdate(
        { id: body.id },
        { $set: { ...body, updatedAt: Date.now() } },
        { upsert: true, new: true }
      );
      return NextResponse.json({ success: true, playlist });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save playlist to MongoDB' },
      { status: 500 }
    );
  }
}
