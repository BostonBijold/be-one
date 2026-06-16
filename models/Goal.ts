import { Schema, Document, model, models, Types } from "mongoose";

// ── Sub-document interfaces ───────────────────────────────────────────────────

export interface ITask {
  _id: Types.ObjectId;
  name: string;
  done: boolean;
  completedAt: Date | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  estimatedMinutes: number | null;
  note: string | null;
}

export interface IMilestone {
  _id: Types.ObjectId;
  name: string;
  targetDate: Date | null;
  order: number;
  complete: boolean; // DERIVED — all tasks done (or manually toggled when no tasks)
  completedAt: Date | null;
  tasks: Types.DocumentArray<ITask>;
}

export interface IOutcomeEntry {
  _id: Types.ObjectId;
  value: number;
  date: string; // YYYY-MM-DD
  note: string | null;
}

export interface IGoal extends Document {
  userId: string;
  name: string;
  description: string | null;
  status: "active" | "complete" | "paused" | "abandoned";
  targetDate: Date | null;
  progressPct: number; // 0-100, manual when no milestones/tasks
  outcomeMetric: {
    label: string;
    targetValue: number;
    unit: string;
  } | null;
  outcomeLog: Types.DocumentArray<IOutcomeEntry>;
  milestones: Types.DocumentArray<IMilestone>;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schemas ───────────────────────────────────────────────────────────────────

const TaskSchema = new Schema<ITask>(
  {
    name: { type: String, required: true },
    done: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    scheduledDate: { type: String, default: null },
    scheduledTime: { type: String, default: null },
    estimatedMinutes: { type: Number, default: null },
    note: { type: String, default: null },
  },
  { _id: true }
);

const MilestoneSchema = new Schema<IMilestone>(
  {
    name: { type: String, required: true },
    targetDate: { type: Date, default: null },
    order: { type: Number, default: 0 },
    complete: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
    tasks: { type: [TaskSchema], default: [] },
  },
  { _id: true }
);

const OutcomeEntrySchema = new Schema<IOutcomeEntry>(
  {
    value: { type: Number, required: true },
    date: { type: String, required: true },
    note: { type: String, default: null },
  },
  { _id: true }
);

const GoalSchema = new Schema<IGoal>(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    status: {
      type: String,
      enum: ["active", "complete", "paused", "abandoned"],
      default: "active",
    },
    targetDate: { type: Date, default: null },
    progressPct: { type: Number, default: 0, min: 0, max: 100 },
    outcomeMetric: {
      type: new Schema(
        {
          label: { type: String, required: true },
          targetValue: { type: Number, required: true },
          unit: { type: String, required: true },
        },
        { _id: false }
      ),
      default: null,
    },
    outcomeLog: { type: [OutcomeEntrySchema], default: [] },
    milestones: { type: [MilestoneSchema], default: [] },
  },
  { timestamps: true }
);

export default models.Goal || model<IGoal>("Goal", GoalSchema);

// ── Helpers ───────────────────────────────────────────────────────────────────

type LeanGoal = {
  milestones?: Array<{ tasks?: Array<{ done: boolean }>; complete: boolean }>;
  progressPct?: number;
};

export function computeProgress(goal: LeanGoal): number {
  const milestones = goal.milestones ?? [];
  if (milestones.length === 0) return goal.progressPct ?? 0;

  const allTasks = milestones.flatMap((m) => m.tasks ?? []);
  if (allTasks.length > 0) {
    const done = allTasks.filter((t) => t.done).length;
    return Math.round((done / allTasks.length) * 100);
  }

  const complete = milestones.filter((m) => m.complete).length;
  return Math.round((complete / milestones.length) * 100);
}

// Serialize a lean Mongoose document to a plain JSON-safe object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeGoal(g: any) {
  const milestones = (g.milestones ?? []).map((m: any) => ({
    _id: m._id.toString(),
    name: m.name,
    targetDate: m.targetDate
      ? new Date(m.targetDate).toISOString().split("T")[0]
      : null,
    order: m.order ?? 0,
    complete: m.complete ?? false,
    completedAt: m.completedAt ?? null,
    tasks: (m.tasks ?? []).map((t: any) => ({
      _id: t._id.toString(),
      name: t.name,
      done: t.done ?? false,
      completedAt: t.completedAt ?? null,
      scheduledDate: t.scheduledDate ?? null,
      scheduledTime: t.scheduledTime ?? null,
      estimatedMinutes: t.estimatedMinutes ?? null,
      note: t.note ?? null,
    })),
  }));

  return {
    _id: g._id.toString(),
    name: g.name,
    description: g.description ?? null,
    status: g.status,
    targetDate: g.targetDate
      ? new Date(g.targetDate).toISOString().split("T")[0]
      : null,
    progressPct: g.progressPct ?? 0,
    outcomeMetric: g.outcomeMetric ?? null,
    outcomeLog: (g.outcomeLog ?? []).map((e: any) => ({
      _id: e._id.toString(),
      value: e.value,
      date: e.date,
      note: e.note ?? null,
    })),
    milestones,
    computedProgress: computeProgress({ milestones, progressPct: g.progressPct }),
    createdAt: g.createdAt,
  };
}
