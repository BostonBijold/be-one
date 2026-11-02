import { Types } from "mongoose";
import WorkCategory from "@/models/work/WorkCategory";
import WorkSession, { type IWorkSession } from "@/models/work/WorkSession";

export const MAX_LABEL_LENGTH = 80;
export const MAX_NOTES_LENGTH = 5000;

// Thrown by the helpers below; routes turn it into { error } with this status.
export class WorkRequestError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function isValidObjectId(id: unknown): id is string {
  return typeof id === "string" && Types.ObjectId.isValid(id);
}

export function parseLabel(value: unknown): string {
  const label = typeof value === "string" ? value.trim() : "";
  if (!label) throw new WorkRequestError(400, "Enter a label.");
  if (label.length > MAX_LABEL_LENGTH) {
    throw new WorkRequestError(400, `Labels can be at most ${MAX_LABEL_LENGTH} characters.`);
  }
  return label;
}

export function parseNotes(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") throw new WorkRequestError(400, "Notes must be text.");
  if (value.length > MAX_NOTES_LENGTH) {
    throw new WorkRequestError(400, `Notes can be at most ${MAX_NOTES_LENGTH} characters.`);
  }
  return value.trim() ? value : null;
}

export function parseDate(value: unknown, name: string): Date {
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) throw new WorkRequestError(400, `Invalid ${name}.`);
  return date;
}

export function parseTimeZone(value: unknown): string {
  if (typeof value === "string" && value) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value });
      return value;
    } catch {
      // falls through to the error below
    }
  }
  throw new WorkRequestError(400, "Invalid timeZone.");
}

// Resolves a { categoryId } or { label } request into the session's denormalized fields.
export async function resolveSessionTarget(userId: string, body: Record<string, unknown>) {
  if (body.categoryId !== undefined && body.categoryId !== null) {
    if (!isValidObjectId(body.categoryId)) throw new WorkRequestError(404, "Category not found.");
    const category = await WorkCategory.findOne({ _id: body.categoryId, userId, archived: false }).lean<{
      _id: Types.ObjectId;
      label: string;
      isBreak: boolean;
    }>();
    if (!category) throw new WorkRequestError(404, "Category not found.");
    return { categoryId: category._id, label: category.label, isBreak: category.isBreak };
  }
  return { categoryId: null, label: parseLabel(body.label), isBreak: false };
}

export function durationSeconds(startTime: Date, endTime: Date) {
  return Math.round((endTime.getTime() - startTime.getTime()) / 1000);
}

// A running session counts as ending now. Checks all the user's sessions, not
// just the displayed day. Sessions that merely touch don't overlap.
export async function assertNoOverlap(
  userId: string,
  start: Date,
  end: Date,
  now: Date,
  excludeId?: Types.ObjectId
) {
  const clash = await WorkSession.findOne({
    userId,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    startTime: { $lt: end },
    $or: [
      { endTime: { $gt: start } },
      ...(now > start ? [{ endTime: null }] : []),
    ],
  }).lean<{ label: string }>();
  if (clash) throw new WorkRequestError(409, `This time overlaps your "${clash.label}" session.`);
}

// Conditional on endTime: null so a stop racing another tab's stop can't
// overwrite the time that was already recorded. Returns null if it lost.
export async function stopSessionIfRunning(
  userId: string,
  session: Pick<IWorkSession, "_id" | "startTime">,
  endTime: Date,
  fields: { notes?: string | null } = {}
) {
  return WorkSession.findOneAndUpdate(
    { _id: session._id, userId, endTime: null },
    { $set: { endTime, durationSeconds: durationSeconds(session.startTime, endTime), ...fields } },
    { new: true }
  ).lean();
}

export function serializeSession(s: {
  _id: unknown;
  categoryId?: unknown;
  label: string;
  isBreak: boolean;
  startTime: Date;
  endTime?: Date | null;
  durationSeconds?: number | null;
  notes?: string | null;
  source: string;
  timeZone: string;
}) {
  return {
    _id: String(s._id),
    categoryId: s.categoryId ? String(s.categoryId) : null,
    label: s.label,
    isBreak: s.isBreak,
    startTime: s.startTime.toISOString(),
    endTime: s.endTime ? s.endTime.toISOString() : null,
    durationSeconds: s.durationSeconds ?? null,
    notes: s.notes ?? null,
    source: s.source,
    timeZone: s.timeZone,
  };
}
