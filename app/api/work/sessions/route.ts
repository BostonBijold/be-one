import { NextResponse } from "next/server";
import WorkSession from "@/models/work/WorkSession";
import { readJsonBody, workRoute } from "@/lib/work/route";
import {
  WorkRequestError,
  assertNoOverlap,
  durationSeconds,
  parseDate,
  parseNotes,
  parseTimeZone,
  resolveSessionTarget,
  serializeSession,
} from "@/lib/work/sessions";

export const dynamic = "force-dynamic";

// GET /api/work/sessions?from=<ISO>&to=<ISO> — sessions that STARTED in the
// range. The client computes the range from its own local midnights: sessions
// only store UTC timestamps, so a bare date couldn't say where the day begins.
export const GET = workRoute(async ({ req, userId }) => {
  const params = req.nextUrl.searchParams;
  const from = parseDate(params.get("from"), "from");
  const to = parseDate(params.get("to"), "to");
  if (from >= to) throw new WorkRequestError(400, "from must be before to.");

  const sessions = await WorkSession.find({ userId, startTime: { $gte: from, $lt: to } })
    .sort({ startTime: 1 })
    .lean<Array<Parameters<typeof serializeSession>[0]>>();
  return NextResponse.json(sessions.map(serializeSession));
});

// POST /api/work/sessions — manual past block.
export const POST = workRoute(async ({ req, userId }) => {
  const body = await readJsonBody(req);
  const target = await resolveSessionTarget(userId, body);
  const startTime = parseDate(body.startTime, "start time");
  const endTime = parseDate(body.endTime, "end time");
  const timeZone = parseTimeZone(body.timeZone);
  const notes = parseNotes(body.notes);
  const now = new Date();

  if (endTime <= startTime) throw new WorkRequestError(400, "End time must be after start time.");
  if (endTime > now) throw new WorkRequestError(400, "End time can't be in the future.");
  await assertNoOverlap(userId, startTime, endTime, now);

  const session = await WorkSession.create({
    userId,
    ...target,
    startTime,
    endTime,
    durationSeconds: durationSeconds(startTime, endTime),
    notes,
    source: "manual",
    timeZone,
  });
  return NextResponse.json(serializeSession(session), { status: 201 });
});
