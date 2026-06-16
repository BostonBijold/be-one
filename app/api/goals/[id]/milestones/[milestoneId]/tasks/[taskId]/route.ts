import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import GoalModel, { serializeGoal } from "@/models/Goal";

export const dynamic = "force-dynamic";

const DEV_USER_ID = "dev-local-user";
function resolveUserId(id?: string) {
  return id ?? (process.env.SKIP_AUTH === "true" ? DEV_USER_ID : null);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deriveComplete(milestone: any) {
  if (milestone.tasks.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allDone = milestone.tasks.every((t: any) => t.done);
    milestone.complete = allDone;
    milestone.completedAt = allDone ? new Date() : null;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; milestoneId: string; taskId: string } }
) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    done?: boolean;
    name?: string;
    scheduledDate?: string | null;
    scheduledTime?: string | null;
    estimatedMinutes?: number | null;
    note?: string | null;
  };

  await connectDB();
  const goal = await GoalModel.findOne({ _id: params.id, userId });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const milestone = goal.milestones.id(params.milestoneId);
  if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

  const task = milestone.tasks.id(params.taskId);
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (body.done !== undefined) {
    task.done = body.done;
    task.completedAt = body.done ? new Date() : null;
  }
  if (body.name !== undefined) task.name = body.name.trim();
  if (body.scheduledDate !== undefined) task.scheduledDate = body.scheduledDate;
  if (body.scheduledTime !== undefined) task.scheduledTime = body.scheduledTime;
  if (body.estimatedMinutes !== undefined) task.estimatedMinutes = body.estimatedMinutes;
  if (body.note !== undefined) task.note = body.note;

  deriveComplete(milestone);
  await goal.save();

  const lean = await GoalModel.findById(goal._id).lean();
  return NextResponse.json(serializeGoal(lean!));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; milestoneId: string; taskId: string } }
) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const goal = await GoalModel.findOne({ _id: params.id, userId });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const milestone = goal.milestones.id(params.milestoneId);
  if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

  milestone.tasks.pull({ _id: params.taskId });
  deriveComplete(milestone);
  await goal.save();

  const lean = await GoalModel.findById(goal._id).lean();
  return NextResponse.json(serializeGoal(lean!));
}
