import mongoose, { Schema, Document, Model } from 'mongoose';
import { SongLyrics as SongLyricsType } from '@/types/music';

export interface LyricsDocument extends SongLyricsType, Document {
  id: string;
}

const LyricLineSchema = new Schema(
  {
    time: { type: Number, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const LyricsSchema = new Schema<LyricsDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    songId: { type: String, required: true, unique: true, index: true },
    plainLyrics: { type: String },
    syncedLyrics: [LyricLineSchema],
    updatedAt: { type: Number, default: () => Date.now() },
  },
  {
    timestamps: true,
  }
);

export const LyricsModel: Model<LyricsDocument> =
  mongoose.models.Lyrics || mongoose.model<LyricsDocument>('Lyrics', LyricsSchema);
