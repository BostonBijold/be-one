import { Schema, Document, model, models } from "mongoose";

export type HabitCategory =
  | "hygiene"
  | "fitness"
  | "nutrition"
  | "mindfulness"
  | "reading"
  | "family"
  | "productivity"
  | "custom";

export interface IHabitTemplate extends Document {
  name: string;
  icon: string;
  defaultProjectedMinutes: number;
  category: HabitCategory;
  timeOfDay: "morning" | "evening" | "any";
  description?: string;
  isSystem: boolean;       // true = admin-seeded, visible to all
  createdBy: string | null; // userId for user-created, null for system
  isActive: boolean;
}

const HabitTemplateSchema = new Schema<IHabitTemplate>(
  {
    name: { type: String, required: true },
    icon: { type: String, required: true },
    defaultProjectedMinutes: { type: Number, default: 15 },
    category: {
      type: String,
      enum: ["hygiene", "fitness", "nutrition", "mindfulness", "reading", "family", "productivity", "custom"],
      required: true,
    },
    timeOfDay: { type: String, enum: ["morning", "evening", "any"], default: "any" },
    description: { type: String, default: null },
    isSystem: { type: Boolean, default: false },
    createdBy: { type: String, default: null, index: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

HabitTemplateSchema.index({ isSystem: 1, timeOfDay: 1 });

export default models.HabitTemplate || model<IHabitTemplate>("HabitTemplate", HabitTemplateSchema);
