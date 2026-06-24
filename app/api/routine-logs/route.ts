import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import RoutineLog from "@/models/RoutineLog";
import type { LogState } from "@/models/RoutineLog";

export const dynamic = "force-dynamic";

const DEV_USER_ID = "dev-local-user";

function resolveUserId(sessionId?: string): string | null {
  if (sessionId) return sessionId;
  if (process.env.SKIP_AUTH === "true") return DEV_USER_ID;
  return null;
}

function serializeLog(l: {
  _id: { toString(): string };
  routineItemId: { toString(): string };
  date: string;
  actualMinutes?: number | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  state: LogState;
}) {
  return {
    _id: l._id.toString(),
    routineItemId: l.routineItemId.toString(),
    date: l.date,
    actualMinutes: l.actualMinutes ?? null,
    startedAt: l.startedAt ? new Date(l.startedAt).toISOString() : null,
    completedAt: l.completedAt ? new Date(l.completedAt).toISOString() : null,
    state: l.state,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date") ?? todayString();
  await connectDB();
  const logs = await RoutineLog.find({ userId, date }).lean();
  return NextResponse.json(logs.map(serializeLog));
}

// POST — creates or replaces a log entry.
// For state 'in_progress': records startedAt = now, clears prior time fields.
// For terminal states (done/missed/rest): sets state + actualMinutes + isBackEntry.
// Uses $set only — DO NOT put filter fields in $setOnInsert, MongoDB rejects it as
// conflicting mods and the write silently fails on the client.
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { routineItemId, date, actualMinutes, state, isBackEntry } = (await req.json()) as {
    routineItemId: string;
    date: string;
    actualMinutes?: number;
    state: LogState;
    isBackEntry?: boolean;
  };

  if (!routineItemId || !date || !state) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await connectDB();

  let setData: Record<string, unknown>;
  if (state === "in_progress") {
    setData = {
      state,
      startedAt: new Date(),
      completedAt: null,
      actualMinutes: null,
      isBackEntry: false,
    };
  } else {
    setData = {
      state,
      actualMinutes: actualMinutes ?? null,
      isBackEntry: isBackEntry ?? false,
    };
  }

  const log = await RoutineLog.findOneAndUpdate(
    { userId, routineItemId, date },
    { $set: setData },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  ).lean();

  return NextResponse.json(serializeLog(log));
}

// PATCH — completes or misses an existing in_progress timer log.
// For state 'done': sets completedAt = now, derives actualMinutes from startedAt.
// For state 'missed': just updates state.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    routineItemId, date, state,
    actualMinutes: fallbackMins,
    startedAt: startOverride,
    completedAt: endOverride,
  } = (await req.json()) as {
    routineItemId: string;
    date: string;
    state: "done" | "missed";
    actualMinutes?: number;
    startedAt?: string;   // ISO — manual time edit from client
    completedAt?: string; // ISO — manual time edit from client
  };

  await connectDB();

  const now = new Date();
  const setData: Record<string, unknown> = { state };

  if (startOverride && endOverride) {
    // Manual time edit: client supplied explicit start + end in local time converted to ISO
    const start = new Date(startOverride);
    const end = new Date(endOverride);
    setData.startedAt = start;
    setData.completedAt = end;
    setData.actualMinutes = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000));
  } else if (state === "done") {
    // Timer completion: derive duration from server-recorded startedAt
    setData.completedAt = now;
    const existing = await RoutineLog.findOne({ userId, routineItemId, date }).lean();
    const startedAt = existing?.startedAt ? new Date(existing.startedAt) : null;
    setData.actualMinutes = startedAt
      ? Math.max(1, Math.round((now.getTime() - startedAt.getTime()) / 60000))
      : (fallbackMins ?? 1);
  }

  const log = await RoutineLog.findOneAndUpdate(
    { userId, routineItemId, date },
    { $set: setData },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  ).lean();

  return NextResponse.json(serializeLog(log));
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { routineItemId, date } = (await req.json()) as {
    routineItemId: string;
    date: string;
  };

  await connectDB();
  await RoutineLog.deleteOne({ userId, routineItemId, date });
  return NextResponse.json({ ok: true });
}

function todayString() {
  return new Date().toISOString().split("T")[0];
}
