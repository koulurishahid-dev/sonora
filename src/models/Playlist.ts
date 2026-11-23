import mongoose, { Schema, Document, Model } from 'mongoose';
import { Playlist as PlaylistType } from '@/types/music';

export interface PlaylistDocument extends Omit<PlaylistType, 'artworkBlob'>, Document {
  id: string;
}

const PlaylistSchema = new Schema<PlaylistDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    customArtwork: { type: String },
    createdAt: { type: Number, default: () => Date.now() },
    updatedAt: { type: Number, default: () => Date.now() },
    songIds: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

export const PlaylistModel: Model<PlaylistDocument> =
  mongoose.models.Playlist || mongoose.model<PlaylistDocument>('Playlist', PlaylistSchema);
