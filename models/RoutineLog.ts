import mongoose, { Schema, Document, model, models } from "mongoose";

// "not_applicable" is the answer to a conditional item's ("Do you need to
// shave today?") gate when the answer is No — distinct from "rest": rest
// protects a streak for something that WAS expected but intentionally
// skipped, while not_applicable means the item was never expected today at
// all. Terminal for control-flow purposes everywhere "done"/"missed"/"rest"
// are (group completion, session advance/resume, Live Activity building) —
// see every "done" || "missed" || "rest" check across the app, all of which
// were extended to include it — but excluded like a not-scheduled day for
// weekly-progress/analytics math (lib/routine-progress.ts) and never counts
// toward actualMinutes/timer tracking.
export type LogState = "in_progress" | "paused" | "done" | "missed" | "rest" | "not_applicable";

// Where a routine_review session was triggered from — see docs/features/routine-review.md.
// "notification" isn't wired up to anything yet (a future "it's been a month" nudge),
// but the value exists now so that work doesn't need another schema change.
export type ReviewEntryPoint = "sunday_prompt" | "analytics_button" | "notification";

export interface IReviewGroupChanges {
  itemGoalChanges?: Array<{ routineItemId: mongoose.Types.ObjectId; oldMinutes: number; newMinutes: number }>;
  startTimeChange?: { old: string | null; new: string | null };
  reorder?: { old: mongoose.Types.ObjectId[]; new: mongoose.Types.ObjectId[] };
}

// Top-level groupId + change fields describe the first group reviewed in the
// session (the only one, in the common case). A sunday_prompt session can
// return to the group picker and review more groups before finishing — those
// land in additionalGroups, since there's still exactly one routine_review
// log per day. changesMade is session-wide (any group).
export interface IReviewMetadata extends IReviewGroupChanges {
  entryPoint: ReviewEntryPoint;
  groupId: mongoose.Types.ObjectId; // first routine group this session reviewed
  changesMade: boolean;
  additionalGroups?: Array<IReviewGroupChanges & { groupId: mongoose.Types.ObjectId }>;
}

export interface IRoutineLog extends Document {
  userId: string;
  routineItemId: mongoose.Types.ObjectId;
  date: string;              // YYYY-MM-DD
  actualMinutes?: number;    // null if missed/rest; derived from timestamps on timer completions
  startedAt?: Date;          // set when state → in_progress; null while paused
  completedAt?: Date;        // set when state → done via timer
  // Elapsed seconds banked from prior running segments of this same log —
  // e.g. jumping away from an item inside a Routine Session pauses it and
  // banks whatever it had accumulated so far, rather than completing it.
  // Total elapsed while running = pausedSeconds + (now - startedAt).
  pausedSeconds: number;
  state: LogState;
  note?: string;
  isBackEntry: boolean;
  // Set only while state === "in_progress" and this timer was started with a
  // routineGroupId (currently only possible via the external API — see
  // app/api/external/start-timer). Tells the client to reopen this item inside
  // a RoutineSession for that group on resume, instead of the standalone
  // timer. Cleared whenever the log leaves in_progress.
  sessionGroupId?: mongoose.Types.ObjectId | null;
  // Only set on the terminal log for a routine_review item (see
  // components/RoutineReviewFlow.tsx) — every other log leaves this undefined.
  reviewMetadata?: IReviewMetadata | null;
  createdAt: Date;
}

// Shared by the top-level (first group) and each additionalGroups entry.
const groupChangeFields = {
  itemGoalChanges: {
    type: [
      {
        routineItemId: { type: Schema.Types.ObjectId, ref: "RoutineItem", required: true },
        oldMinutes: { type: Number, required: true },
        newMinutes: { type: Number, required: true },
      },
    ],
    default: undefined,
  },
  startTimeChange: {
    type: new Schema({ old: { type: String, default: null }, new: { type: String, default: null } }, { _id: false }),
    default: undefined,
  },
  reorder: {
    type: new Schema(
      {
        old: { type: [Schema.Types.ObjectId], default: undefined },
        new: { type: [Schema.Types.ObjectId], default: undefined },
      },
      { _id: false }
    ),
    default: undefined,
  },
};

const ReviewMetadataSchema = new Schema<IReviewMetadata>(
  {
    entryPoint: { type: String, enum: ["sunday_prompt", "analytics_button", "notification"], required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "RoutineGroup", required: true },
    changesMade: { type: Boolean, required: true },
    ...groupChangeFields,
    additionalGroups: {
      type: [
        new Schema(
          { groupId: { type: Schema.Types.ObjectId, ref: "RoutineGroup", required: true }, ...groupChangeFields },
          { _id: false }
        ),
      ],
      default: undefined,
    },
  },
  { _id: false }
);

const RoutineLogSchema = new Schema<IRoutineLog>(
  {
    userId: { type: String, required: true, index: true },
    routineItemId: { type: Schema.Types.ObjectId, ref: "RoutineItem", required: true },
    date: { type: String, required: true },
    actualMinutes: { type: Number, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    pausedSeconds: { type: Number, default: 0 },
    state: { type: String, enum: ["in_progress", "paused", "done", "missed", "rest", "not_applicable"], required: true },
    note: { type: String, default: null },
    isBackEntry: { type: Boolean, default: false },
    sessionGroupId: { type: Schema.Types.ObjectId, ref: "RoutineGroup", default: null },
    reviewMetadata: { type: ReviewMetadataSchema, default: null },
  },
  { timestamps: true }
);

RoutineLogSchema.index({ userId: 1, date: 1 });
RoutineLogSchema.index({ userId: 1, routineItemId: 1, date: 1 }, { unique: true });

export default models.RoutineLog || model<IRoutineLog>("RoutineLog", RoutineLogSchema);
