import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import RoutineGroup from "@/models/RoutineGroup";
import { seedDefaultRoutines } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();

  const existing = await RoutineGroup.findOne({ userId: session.user.id });
  if (existing) {
    return NextResponse.json({ message: "Already seeded" });
  }

  await seedDefaultRoutines(session.user.id);
  return NextResponse.json({ ok: true });
}
