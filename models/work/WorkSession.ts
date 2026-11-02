import mongoose, { Schema, Document, model, models } from "mongoose";

export type WorkSessionSource = "timer" | "manual";
export type WorkPomodoroType = "focus" | "short" | "long";

export interface IWorkSession extends Document {
  userId: string;
  categoryId: mongoose.Types.ObjectId | null;
  label: string;           // denormalized for reporting; survives category changes
  isBreak: boolean;        // denormalized
  startTime: Date;
  endTime: Date | null;    // null while running
  durationSeconds: number | null; // server-computed; null while running
  notes: string | null;
  source: WorkSessionSource;
  pomodoroType: WorkPomodoroType | null; // reserved for Phase 3
  timeZone: string;        // IANA name from the client; hour-of-day reports need it
  createdAt: Date;
  updatedAt: Date;
}

const WorkSessionSchema = new Schema<IWorkSession>(
  {
    // A String like RoutineLog.userId, but deliberately without its
    // `index: true` — that would claim the default name userId_1 alongside the
    // partial index below, and auto-index failures don't fail requests.
    userId: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "WorkCategory", default: null },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    isBreak: { type: Boolean, default: false },
    startTime: { type: Date, required: true },
    endTime: { type: Date, default: null },
    durationSeconds: { type: Number, default: null },
    notes: { type: String, default: null },
    source: { type: String, enum: ["timer", "manual"], required: true },
    pomodoroType: { type: String, enum: ["focus", "short", "long", null], default: null },
    timeZone: { type: String, required: true },
  },
  { timestamps: true, collection: "worksessions" }
);

WorkSessionSchema.index({ userId: 1, startTime: -1 });
// One running session per user, enforced by the database so two tabs can't
// start two sessions.
WorkSessionSchema.index(
  { userId: 1 },
  { unique: true, name: "one_running_session_per_user", partialFilterExpression: { endTime: null } }
);

export default models.WorkSession || model<IWorkSession>("WorkSession", WorkSessionSchema);
