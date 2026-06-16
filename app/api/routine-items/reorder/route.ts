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

// PATCH /api/routine-items/reorder
// Body: { items: Array<{ _id: string; order: number }> }
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { items } = (await req.json()) as { items: Array<{ _id: string; order: number }> };

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items array required" }, { status: 400 });
  }

  await connectDB();

  await Promise.all(
    items.map(({ _id, order }) =>
      RoutineItem.updateOne({ _id, userId }, { $set: { order } })
    )
  );

  return NextResponse.json({ ok: true });
}
