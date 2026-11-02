import { NextResponse } from "next/server";
import WorkCategory from "@/models/work/WorkCategory";
import WorkSession from "@/models/work/WorkSession";
import { readJsonBody, workRoute } from "@/lib/work/route";
import {
  WorkRequestError,
  assertNoOverlap,
  durationSeconds,
  isValidObjectId,
  parseDate,
  parseLabel,
  parseNotes,
  serializeSession,
} from "@/lib/work/sessions";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// PATCH /api/work/sessions/:id — any of { label, notes, startTime, endTime }.
// Running sessions can't take an endTime here; that's what /stop is for.
export const PATCH = workRoute<Ctx>(async ({ req, userId, ctx }) => {
  const { id } = ctx.params;
  if (!isValidObjectId(id)) throw new WorkRequestError(404, "Session not found.");
  const body = await readJsonBody(req);

  const session = await WorkSession.findOne({ _id: id, userId });
  if (!session) throw new WorkRequestError(404, "Session not found.");

  const isRunning = !session.endTime;
  if (isRunning && body.endTime !== undefined) {
    throw new WorkRequestError(400, "Stop a running session to set its end time.");
  }

  if (body.notes !== undefined) session.notes = parseNotes(body.notes);

  if (body.label !== undefined) {
    const label = parseLabel(body.label);
    if (label !== session.label) {
      // The label decides what the session counts as, so a relabel follows
      // the matching category if there is one and is free-text otherwise.
      const category = await WorkCategory.findOne({ userId, label, archived: false }).lean<{
        _id: typeof session.categoryId;
        isBreak: boolean;
      }>();
      session.label = label;
      session.categoryId = category?._id ?? null;
      session.isBreak = category?.isBreak ?? false;
    }
  }

  if (body.startTime !== undefined || body.endTime !== undefined) {
    const now = new Date();
    const startTime = body.startTime !== undefined ? parseDate(body.startTime, "start time") : session.startTime;
    const endTime = body.endTime !== undefined ? parseDate(body.endTime, "end time") : session.endTime;
    const effectiveEnd = endTime ?? now;

    if (isRunning && startTime > now) throw new WorkRequestError(400, "Start time can't be in the future.");
    if (!isRunning && effectiveEnd <= startTime) throw new WorkRequestError(400, "End time must be after start time.");
    if (!isRunning && effectiveEnd > now) throw new WorkRequestError(400, "End time can't be in the future.");
    await assertNoOverlap(userId, startTime, effectiveEnd, now, session._id);

    session.startTime = startTime;
    if (endTime) {
      session.endTime = endTime;
      session.durationSeconds = durationSeconds(startTime, endTime);
    }
  }

  await session.save();
  return NextResponse.json(serializeSession(session));
});

// DELETE /api/work/sessions/:id
export const DELETE = workRoute<Ctx>(async ({ userId, ctx }) => {
  const { id } = ctx.params;
  if (!isValidObjectId(id)) throw new WorkRequestError(404, "Session not found.");
  const deleted = await WorkSession.findOneAndDelete({ _id: id, userId }).lean();
  if (!deleted) throw new WorkRequestError(404, "Session not found.");
  return NextResponse.json({ ok: true });
});
