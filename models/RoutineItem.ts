import mongoose, { Schema, Document, model, models } from "mongoose";

export type ItemType = "standard" | "virtue_checkin" | "weekly_review";

export interface IRoutineItem extends Document {
  groupId: mongoose.Types.ObjectId;
  userId: string;
  templateId: mongoose.Types.ObjectId | null;
  name: string;
  icon: string;
  projectedMinutes: number;
  order: number;
  isActive: boolean;
  linkedGoalId: mongoose.Types.ObjectId | null;
  itemType: ItemType;
}

const RoutineItemSchema = new Schema<IRoutineItem>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "RoutineGroup", required: true },
    userId: { type: String, required: true, index: true },
    templateId: { type: Schema.Types.ObjectId, ref: "HabitTemplate", default: null },
    name: { type: String, required: true },
    icon: { type: String, default: "✓" },
    projectedMinutes: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    linkedGoalId: { type: Schema.Types.ObjectId, ref: "Goal", default: null },
    itemType: { type: String, enum: ["standard", "virtue_checkin", "weekly_review"], default: "standard" },
  },
  { timestamps: true }
);

export default models.RoutineItem || model<IRoutineItem>("RoutineItem", RoutineItemSchema);
