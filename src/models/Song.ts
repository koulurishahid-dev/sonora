import mongoose, { Schema, Document, Model } from 'mongoose';
import { Song as SongType } from '@/types/music';

export interface SongDocument extends Omit<SongType, 'audioBlob' | 'artworkBlob'>, Document {
  id: string;
}

const SongSchema = new Schema<SongDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    artist: { type: String, required: true, index: true },
    album: { type: String, required: true, index: true },
    year: { type: Number },
    genre: { type: String, index: true },
    duration: { type: Number, required: true, default: 0 },
    trackNumber: { type: Number },
    bitrate: { type: Number },
    codec: { type: String },
    fileSize: { type: Number },
    hash: { type: String, required: true, index: true },
    isLocal: { type: Boolean, default: false },
    sourceUrl: { type: String },
    providerType: { type: String, default: 'stream' },
    youtubeId: { type: String },
    spotifyId: { type: String },
    spotifyUrl: { type: String },
    category: { type: String, index: true },
    artworkUrl: { type: String },
    dateAdded: { type: Number, default: () => Date.now(), index: true },
    playCount: { type: Number, default: 0 },
    lastPlayedAt: { type: Number },
    isFavorite: { type: Boolean, default: false },
    isOfflineAvailable: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export const SongModel: Model<SongDocument> =
  mongoose.models.Song || mongoose.model<SongDocument>('Song', SongSchema);
