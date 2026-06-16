import { Schema, Document, model, models } from "mongoose";

export interface IRoutineGroup extends Document {
  userId: string | null;
  name: string;
  timeOfDay: "morning" | "evening" | "custom" | "habit";
  startTime: string | null;    // 'HH:MM' — when routine window opens
  collapseAfter: string | null; // 'HH:MM' — when routine window closes
  order: number;
  isDefault: boolean;
}

const RoutineGroupSchema = new Schema<IRoutineGroup>(
  {
    userId: { type: String, default: null, index: true },
    name: { type: String, required: true },
    timeOfDay: { type: String, enum: ["morning", "evening", "custom", "habit"], required: true },
    startTime: { type: String, default: null },
    collapseAfter: { type: String, default: null },
    order: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default models.RoutineGroup || model<IRoutineGroup>("RoutineGroup", RoutineGroupSchema);
