import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import GoalModel, { serializeGoal } from "@/models/Goal";

export const dynamic = "force-dynamic";

const DEV_USER_ID = "dev-local-user";

function resolveUserId(sessionId?: string): string | null {
  if (sessionId) return sessionId;
  if (process.env.SKIP_AUTH === "true") return DEV_USER_ID;
  return null;
}

const STATUS_ORDER = { active: 0, paused: 1, complete: 2, abandoned: 3 };

export async function GET() {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const goals = await GoalModel.find({ userId }).sort({ createdAt: -1 }).lean();

  const serialized = goals
    .map(serializeGoal)
    .sort((a, b) => (STATUS_ORDER[a.status as keyof typeof STATUS_ORDER] ?? 4) - (STATUS_ORDER[b.status as keyof typeof STATUS_ORDER] ?? 4));

  return NextResponse.json(serialized);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name: string;
    description?: string;
    targetDate?: string;
    outcomeMetric?: { label: string; targetValue: number; unit: string };
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  await connectDB();
  const goal = await GoalModel.create({
    userId,
    name: body.name.trim(),
    description: body.description?.trim() || null,
    targetDate: body.targetDate ?? null,
    outcomeMetric: body.outcomeMetric ?? null,
    status: "active",
    progressPct: 0,
  });

  const lean = await GoalModel.findById(goal._id).lean();
  return NextResponse.json(serializeGoal(lean!), { status: 201 });
}
