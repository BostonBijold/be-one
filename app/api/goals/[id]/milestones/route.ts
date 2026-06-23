import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import GoalModel, { serializeGoal } from "@/models/Goal";

export const dynamic = "force-dynamic";

const DEV_USER_ID = "dev-local-user";
function resolveUserId(id?: string) {
  return id ?? (process.env.SKIP_AUTH === "true" ? DEV_USER_ID : null);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, targetDate } = await req.json() as { name: string; targetDate?: string };
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  await connectDB();

  const goal = await GoalModel.findOne({ _id: params.id, userId });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const order = goal.milestones.length;
  goal.milestones.push({
    name: name.trim(),
    targetDate: targetDate ?? null,
    order,
    complete: false,
    completedAt: null,
    tasks: [],
  } as never);

  await goal.save();
  const lean = await GoalModel.findById(goal._id).lean();
  return NextResponse.json(serializeGoal(lean!), { status: 201 });
}
