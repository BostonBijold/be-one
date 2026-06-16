import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import RoutineLog from "@/models/RoutineLog";
import type { LogState } from "@/models/RoutineLog";

const DEV_USER_ID = "dev-local-user";

function resolveUserId(sessionId?: string): string | null {
  if (sessionId) return sessionId;
  if (process.env.SKIP_AUTH === "true") return DEV_USER_ID;
  return null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const date = req.nextUrl.searchParams.get("date") ?? todayString();
  await connectDB();
  const logs = await RoutineLog.find({ userId, date }).lean();

  return NextResponse.json(
    logs.map((l) => ({
      _id: l._id.toString(),
      routineItemId: l.routineItemId.toString(),
      date: l.date,
      actualMinutes: l.actualMinutes,
      state: l.state,
    }))
  );
}

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

  const log = await RoutineLog.findOneAndUpdate(
    { userId, routineItemId, date },
    { userId, routineItemId, date, actualMinutes, state, isBackEntry: isBackEntry ?? false },
    { upsert: true, new: true }
  );

  return NextResponse.json({
    _id: log._id.toString(),
    routineItemId: log.routineItemId.toString(),
    date: log.date,
    actualMinutes: log.actualMinutes,
    state: log.state,
  });
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
