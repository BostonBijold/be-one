import { Schema, Document, model, models } from "mongoose";

export interface IVirtue extends Document {
  name: string;        // 'Present'
  slug: string;        // 'present'
  tagline: string;     // 'A good man is fully where he is'
  displayName: string; // 'A Good Man Is Present'
  order: number;       // 1–12
  essay: string;       // admin writes this over time
  etymology: string;   // word origin, optional
  isActive: boolean;
}

const VirtueSchema = new Schema<IVirtue>(
  {
    name:        { type: String, required: true },
    slug:        { type: String, required: true, unique: true },
    tagline:     { type: String, required: true },
    displayName: { type: String, required: true },
    order:       { type: Number, required: true },
    essay:       { type: String, default: "" },
    etymology:   { type: String, default: "" },
    isActive:    { type: Boolean, default: true },
  },
  { timestamps: true }
);

VirtueSchema.index({ order: 1 });

export default models.Virtue || model<IVirtue>("Virtue", VirtueSchema);
