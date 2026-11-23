import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { SongModel } from '@/models/Song';

export async function GET(request: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const artist = searchParams.get('artist');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
    const skip = parseInt(searchParams.get('skip') || '0', 10);

    const query: any = {};
    if (category && category !== 'All') {
      query.category = category;
    }
    if (artist) {
      query.artist = { $regex: artist, $options: 'i' };
    }
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { artist: { $regex: search, $options: 'i' } },
        { album: { $regex: search, $options: 'i' } },
      ];
    }

    const [songs, total] = await Promise.all([
      SongModel.find(query).sort({ dateAdded: -1 }).skip(skip).limit(limit).lean(),
      SongModel.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      songs,
      total,
      limit,
      skip,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch songs from MongoDB' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    const body = await request.json();

    if (Array.isArray(body)) {
      // Bulk upsert songs
      const operations = body.map(s => ({
        updateOne: {
          filter: { id: s.id },
          update: { $set: s },
          upsert: true,
        },
      }));

      const res = await SongModel.bulkWrite(operations);
      return NextResponse.json({
        success: true,
        upserted: res.upsertedCount,
        modified: res.modifiedCount,
        total: body.length,
      });
    } else {
      // Single upsert
      const song = await SongModel.findOneAndUpdate({ id: body.id }, { $set: body }, { upsert: true, new: true });
      return NextResponse.json({ success: true, song });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to save songs to MongoDB' },
      { status: 500 }
    );
  }
}
