import mongoose, { Schema, Document, model, models } from "mongoose";

export type ItemType = "standard" | "stopwatch" | "checkbox" | "virtue_checkin" | "weekly_review" | "routine_review";

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
  // 0=Sun..6=Sat — which days this item is expected. Defaults to every day
  // so existing items are unaffected until a user opts in.
  scheduledDays: number[];
  // How many of this week's *scheduled* days need to be done/rest to read
  // as 100% — never allowed to exceed scheduledDays.length (see the API
  // routes, which clamp on write; this field alone doesn't enforce it).
  successThreshold: number;
  // "Do you need to do this today?" — for habits that are needed
  // irregularly (shaving, a haircut-length check, etc.) rather than on a
  // fixed weekly cadence. Unlike scheduledDays (which fixes specific days
  // in advance), this asks fresh each time the item is reached and isn't
  // decided yet for today — see RoutineItemRow/RoutineSession's isConditional
  // gating and lib/projected-finish.ts's remainingMinutes, which excludes an
  // undecided conditional item from the live time estimate until answered.
  isConditional: boolean;
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
    itemType: { type: String, enum: ["standard", "stopwatch", "checkbox", "virtue_checkin", "weekly_review", "routine_review"], default: "standard" },
    scheduledDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    successThreshold: { type: Number, default: 7 },
    isConditional: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default models.RoutineItem || model<IRoutineItem>("RoutineItem", RoutineItemSchema);
