import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const DEV_USER_ID = "dev-local-user";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId =
    session?.user?.id ?? (process.env.SKIP_AUTH === "true" ? DEV_USER_ID : null);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as Record<string, unknown>;

  // Only virtueWalkthroughSeen is patchable through this route
  if (typeof body.virtueWalkthroughSeen !== "boolean") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await connectDB();

  await User.findByIdAndUpdate(
    userId,
    { $set: { virtueWalkthroughSeen: body.virtueWalkthroughSeen } },
    { upsert: true } // dev-local-user won't have a real doc
  );

  return NextResponse.json({ ok: true });
}
