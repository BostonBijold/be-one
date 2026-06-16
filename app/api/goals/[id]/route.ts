import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import GoalModel, { serializeGoal } from "@/models/Goal";

const DEV_USER_ID = "dev-local-user";

function resolveUserId(sessionId?: string): string | null {
  if (sessionId) return sessionId;
  if (process.env.SKIP_AUTH === "true") return DEV_USER_ID;
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const goal = await GoalModel.findOne({ _id: params.id, userId }).lean();
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(serializeGoal(goal));
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name?: string;
    description?: string | null;
    status?: string;
    targetDate?: string | null;
    progressPct?: number;
    outcomeMetric?: { label: string; targetValue: number; unit: string } | null;
  };

  await connectDB();

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.description !== undefined) update.description = body.description?.trim() || null;
  if (body.status !== undefined) update.status = body.status;
  if (body.targetDate !== undefined) update.targetDate = body.targetDate ? new Date(body.targetDate) : null;
  if (body.progressPct !== undefined) update.progressPct = Math.max(0, Math.min(100, body.progressPct));
  if (body.outcomeMetric !== undefined) update.outcomeMetric = body.outcomeMetric;

  const goal = await GoalModel.findOneAndUpdate(
    { _id: params.id, userId },
    { $set: update },
    { new: true }
  ).lean();

  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeGoal(goal));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const result = await GoalModel.deleteOne({ _id: params.id, userId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
