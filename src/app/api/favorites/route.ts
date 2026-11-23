import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { FavoriteModel } from '@/models/Favorite';

export async function GET() {
  try {
    await connectToDatabase();
    const favorites = await FavoriteModel.find().sort({ addedAt: -1 }).lean();
    return NextResponse.json({ success: true, favorites });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    if (Array.isArray(body)) {
      const ops = body.map(f => ({
        updateOne: {
          filter: { songId: f.songId },
          update: { $set: f },
          upsert: true,
        },
      }));
      await FavoriteModel.bulkWrite(ops);
      return NextResponse.json({ success: true, count: body.length });
    } else {
      const fav = await FavoriteModel.findOneAndUpdate(
        { songId: body.songId },
        { $set: { id: body.id || `fav_${body.songId}`, songId: body.songId, addedAt: body.addedAt || Date.now() } },
        { upsert: true, new: true }
      );
      return NextResponse.json({ success: true, favorite: fav });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update favorite' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get('songId');
    if (!songId) {
      return NextResponse.json({ success: false, error: 'songId required' }, { status: 400 });
    }
    await FavoriteModel.deleteOne({ songId });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to remove favorite' },
      { status: 500 }
    );
  }
}
