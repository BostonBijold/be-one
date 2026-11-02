import { NextResponse } from "next/server";
import WorkSession, { type IWorkSession } from "@/models/work/WorkSession";
import { readJsonBody, workRoute } from "@/lib/work/route";
import {
  WorkRequestError,
  parseTimeZone,
  resolveSessionTarget,
  serializeSession,
  stopSessionIfRunning,
} from "@/lib/work/sessions";

export const dynamic = "force-dynamic";

// POST /api/work/sessions/start — { categoryId | label, timeZone }. Stops
// whatever is running and starts the new session in one call.
export const POST = workRoute(async ({ req, userId }) => {
  const body = await readJsonBody(req);
  const target = await resolveSessionTarget(userId, body);
  const timeZone = parseTimeZone(body.timeZone);

  // Surfaces a failed index build as an error instead of silently running
  // without the one-running-session guarantee.
  await WorkSession.init();

  async function stopThenStart() {
    const now = new Date();
    const running = await WorkSession.findOne({ userId, endTime: null }).lean<IWorkSession>();
    const stopped = running ? await stopSessionIfRunning(userId, running, now) : null;
    const session = await WorkSession.create({
      userId,
      ...target,
      startTime: now,
      source: "timer",
      timeZone,
    });
    return { session, stopped };
  }

  let result;
  try {
    result = await stopThenStart();
  } catch (err) {
    if ((err as { code?: number }).code !== 11000) throw err;
    // Another request started a session between our stop and create. Last one
    // wins: stop theirs and start ours, once.
    try {
      result = await stopThenStart();
    } catch (retryErr) {
      if ((retryErr as { code?: number }).code !== 11000) throw retryErr;
      throw new WorkRequestError(409, "Another session just started. Try again.");
    }
  }

  return NextResponse.json(
    {
      session: serializeSession(result.session),
      stopped: result.stopped ? serializeSession(result.stopped as unknown as Parameters<typeof serializeSession>[0]) : null,
    },
    { status: 201 }
  );
});
