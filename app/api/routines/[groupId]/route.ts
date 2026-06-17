import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import RoutineGroup from "@/models/RoutineGroup";

export const dynamic = "force-dynamic";

const DEV_USER_ID = "dev-local-user";

function resolveUserId(id?: string) {
  return id ?? (process.env.SKIP_AUTH === "true" ? DEV_USER_ID : null);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    name?: string;
    startTime?: string | null;
  };

  await connectDB();

  const update: Record<string, unknown> = {};
  if (body.name !== undefined) update.name = body.name.trim();
  if (body.startTime !== undefined) update.startTime = body.startTime || null;

  const group = await RoutineGroup.findOneAndUpdate(
    { _id: params.groupId, userId },
    { $set: update },
    { new: true }
  ).lean();

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    _id: group._id.toString(),
    name: group.name,
    startTime: group.startTime ?? null,
  });
}
