import { NextResponse } from "next/server";
import WorkSession, { type IWorkSession } from "@/models/work/WorkSession";
import { readJsonBody, workRoute } from "@/lib/work/route";
import {
  WorkRequestError,
  isValidObjectId,
  parseDate,
  parseNotes,
  serializeSession,
  stopSessionIfRunning,
} from "@/lib/work/sessions";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// POST /api/work/sessions/:id/stop — { notes?, endTime? }. Without endTime the
// server's clock is used; endTime is only for a time the user deliberately
// picked (the forgotten-timer sheet). Stopping a stopped session is a no-op.
export const POST = workRoute<Ctx>(async ({ req, userId, ctx }) => {
  const { id } = ctx.params;
  if (!isValidObjectId(id)) throw new WorkRequestError(404, "Session not found.");
  const body = await readJsonBody(req);

  const session = await WorkSession.findOne({ _id: id, userId }).lean<IWorkSession>();
  if (!session) throw new WorkRequestError(404, "Session not found.");
  type Serializable = Parameters<typeof serializeSession>[0];
  if (session.endTime) return NextResponse.json(serializeSession(session as unknown as Serializable));

  const now = new Date();
  const endTime = body.endTime !== undefined ? parseDate(body.endTime, "end time") : now;
  if (endTime <= session.startTime) throw new WorkRequestError(400, "End time must be after start time.");
  if (endTime > now) throw new WorkRequestError(400, "End time can't be in the future.");

  const fields = body.notes !== undefined ? { notes: parseNotes(body.notes) } : {};
  const stopped = await stopSessionIfRunning(userId, session, endTime, fields);
  // Lost a race with another tab's stop: return what that stop recorded.
  const result = stopped ?? (await WorkSession.findOne({ _id: id, userId }).lean());
  if (!result) throw new WorkRequestError(404, "Session not found.");
  return NextResponse.json(serializeSession(result as unknown as Serializable));
});
