import mongoose, { Schema, Document, Model } from 'mongoose';
import { PlaylistSong as PlaylistSongType } from '@/types/music';

export interface PlaylistSongDocument extends PlaylistSongType, Document {
  id: string;
}

const PlaylistSongSchema = new Schema<PlaylistSongDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    playlistId: { type: String, required: true, index: true },
    songId: { type: String, required: true, index: true },
    order: { type: Number, required: true, default: 0 },
    addedAt: { type: Number, default: () => Date.now() },
  },
  {
    timestamps: true,
  }
);

PlaylistSongSchema.index({ playlistId: 1, order: 1 });

export const PlaylistSongModel: Model<PlaylistSongDocument> =
  mongoose.models.PlaylistSong ||
  mongoose.model<PlaylistSongDocument>('PlaylistSong', PlaylistSongSchema);
