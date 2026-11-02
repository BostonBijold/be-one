import { NextResponse } from "next/server";
import WorkSession from "@/models/work/WorkSession";
import { workRoute } from "@/lib/work/route";
import { serializeSession } from "@/lib/work/sessions";

export const dynamic = "force-dynamic";

// GET /api/work/sessions/active — the running session or null.
export const GET = workRoute(async ({ userId }) => {
  const session = await WorkSession.findOne({ userId, endTime: null }).lean<
    Parameters<typeof serializeSession>[0]
  >();
  return NextResponse.json(session ? serializeSession(session) : null);
});
