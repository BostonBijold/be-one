import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import RoutineItem from "@/models/RoutineItem";

const DEV_USER_ID = "dev-local-user";

function resolveUserId(sessionId?: string) {
  if (sessionId) return sessionId;
  if (process.env.SKIP_AUTH === "true") return DEV_USER_ID;
  return null;
}

// DELETE /api/routine-items/[id] — remove from user's routine (soft delete)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();

  const item = await RoutineItem.findOne({ _id: params.id, userId });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Soft delete — keeps log history intact
  item.isActive = false;
  await item.save();

  return NextResponse.json({ ok: true });
}

// PATCH /api/routine-items/[id] — update name/icon/projectedMinutes
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const updates = await req.json();
  const allowed = ["name", "icon", "projectedMinutes"] as const;
  const sanitized: Partial<Record<(typeof allowed)[number], unknown>> = {};
  for (const key of allowed) {
    if (key in updates) sanitized[key] = updates[key];
  }

  await connectDB();

  const item = await RoutineItem.findOneAndUpdate(
    { _id: params.id, userId },
    { $set: sanitized },
    { new: true }
  );
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    _id: item._id.toString(),
    name: item.name,
    icon: item.icon,
    projectedMinutes: item.projectedMinutes,
  });
}
