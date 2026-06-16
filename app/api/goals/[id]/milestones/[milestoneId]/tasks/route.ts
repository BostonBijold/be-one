import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import GoalModel, { serializeGoal } from "@/models/Goal";

const DEV_USER_ID = "dev-local-user";
function resolveUserId(id?: string) {
  return id ?? (process.env.SKIP_AUTH === "true" ? DEV_USER_ID : null);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; milestoneId: string } }
) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name: string;
    scheduledDate?: string;
    scheduledTime?: string;
    estimatedMinutes?: number;
    note?: string;
  };

  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  await connectDB();
  const goal = await GoalModel.findOne({ _id: params.id, userId });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const milestone = goal.milestones.id(params.milestoneId);
  if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

  milestone.tasks.push({
    name: body.name.trim(),
    done: false,
    completedAt: null,
    scheduledDate: body.scheduledDate ?? null,
    scheduledTime: body.scheduledTime ?? null,
    estimatedMinutes: body.estimatedMinutes ?? null,
    note: body.note ?? null,
  } as never);

  // Milestone complete is derived — update it after task changes
  deriveComplete(milestone);
  await goal.save();

  const lean = await GoalModel.findById(goal._id).lean();
  return NextResponse.json(serializeGoal(lean!), { status: 201 });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deriveComplete(milestone: any) {
  if (milestone.tasks.length > 0) {
    const allDone = milestone.tasks.every((t: any) => t.done);
    milestone.complete = allDone;
    milestone.completedAt = allDone ? new Date() : null;
  }
}
