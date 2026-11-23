import mongoose, { Schema, Document, Model } from 'mongoose';
import { ListeningHistory as HistoryType } from '@/types/music';

export interface HistoryDocument extends HistoryType, Document {
  id: string;
}

const HistorySchema = new Schema<HistoryDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    songId: { type: String, required: true, index: true },
    playedAt: { type: Number, default: () => Date.now(), index: true },
    completed: { type: Boolean, default: false },
    durationPlayed: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

export const HistoryModel: Model<HistoryDocument> =
  mongoose.models.ListeningHistory ||
  mongoose.model<HistoryDocument>('ListeningHistory', HistorySchema);
