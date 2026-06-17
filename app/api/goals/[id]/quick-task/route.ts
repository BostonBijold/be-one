import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import GoalModel from "@/models/Goal";

export const dynamic = "force-dynamic";
const DEV_USER_ID = "dev-local-user";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = session?.user?.id ?? (process.env.SKIP_AUTH === "true" ? DEV_USER_ID : null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name: string;
    scheduledDate?: string;
    estimatedMinutes?: number;
  };

  if (!body.name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

  await connectDB();
  const goal = await GoalModel.findOne({ _id: params.id, userId });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Find or create a "General" milestone
  let milestone = goal.milestones.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => m.name === "General"
  );
  if (!milestone) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const idx = (goal.milestones as any[]).push({
      name: "General",
      order: goal.milestones.length,
      complete: false,
      tasks: [],
    }) - 1;
    milestone = goal.milestones[idx];
  }

  milestone.tasks.push({
    name: body.name.trim(),
    done: false,
    completedAt: null,
    scheduledDate: body.scheduledDate ?? null,
    scheduledTime: null,
    estimatedMinutes: body.estimatedMinutes ?? null,
    note: null,
  } as never);

  await goal.save();
  return NextResponse.json({ ok: true }, { status: 201 });
}
