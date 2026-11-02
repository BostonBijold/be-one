import { Schema, Document, model, models } from "mongoose";

// Tailwind token names rather than hex values, so stored categories can't go
// stale when the palette changes. null = neutral.
export const WORK_CATEGORY_COLORS = ["olive", "olive-light", "gold", "muted", "dim"] as const;
export type WorkCategoryColor = (typeof WORK_CATEGORY_COLORS)[number];

export interface IWorkCategory extends Document {
  userId: string;
  label: string;
  color: WorkCategoryColor | null;
  order: number;
  isBreak: boolean;
  defaultDurationMin: number | null;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WorkCategorySchema = new Schema<IWorkCategory>(
  {
    userId: { type: String, required: true },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    color: { type: String, enum: [...WORK_CATEGORY_COLORS, null], default: null },
    order: { type: Number, required: true },
    isBreak: { type: Boolean, default: false },
    defaultDurationMin: { type: Number, default: null },
    archived: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "workcategories" }
);

WorkCategorySchema.index({ userId: 1, order: 1 });
// Lets the lazy seed upsert by label, so concurrent first loads can't duplicate.
WorkCategorySchema.index({ userId: 1, label: 1 }, { unique: true, name: "unique_category_label_per_user" });

export default models.WorkCategory || model<IWorkCategory>("WorkCategory", WorkCategorySchema);
