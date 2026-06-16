import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import GoalModel, { serializeGoal } from "@/models/Goal";

export const dynamic = "force-dynamic";

const DEV_USER_ID = "dev-local-user";
function resolveUserId(id?: string) {
  return id ?? (process.env.SKIP_AUTH === "true" ? DEV_USER_ID : null);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; milestoneId: string } }
) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name?: string;
    targetDate?: string | null;
    complete?: boolean;
  };

  await connectDB();
  const goal = await GoalModel.findOne({ _id: params.id, userId });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const milestone = goal.milestones.id(params.milestoneId);
  if (!milestone) return NextResponse.json({ error: "Milestone not found" }, { status: 404 });

  if (body.name !== undefined) milestone.name = body.name.trim();
  if (body.targetDate !== undefined)
    milestone.targetDate = body.targetDate ? new Date(body.targetDate) : null;

  // Allow manual complete toggle only when milestone has no tasks
  if (body.complete !== undefined && milestone.tasks.length === 0) {
    milestone.complete = body.complete;
    milestone.completedAt = body.complete ? new Date() : null;
  }

  await goal.save();
  const lean = await GoalModel.findById(goal._id).lean();
  return NextResponse.json(serializeGoal(lean!));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; milestoneId: string } }
) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const goal = await GoalModel.findOne({ _id: params.id, userId });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  goal.milestones.pull({ _id: params.milestoneId });
  await goal.save();

  const lean = await GoalModel.findById(goal._id).lean();
  return NextResponse.json(serializeGoal(lean!));
}
