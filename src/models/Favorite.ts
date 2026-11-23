import mongoose, { Schema, Document, Model } from 'mongoose';
import { Favorite as FavoriteType } from '@/types/music';

export interface FavoriteDocument extends FavoriteType, Document {
  id: string;
}

const FavoriteSchema = new Schema<FavoriteDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    songId: { type: String, required: true, unique: true, index: true },
    addedAt: { type: Number, default: () => Date.now() },
  },
  {
    timestamps: true,
  }
);

export const FavoriteModel: Model<FavoriteDocument> =
  mongoose.models.Favorite || mongoose.model<FavoriteDocument>('Favorite', FavoriteSchema);
