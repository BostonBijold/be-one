import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import User from "@/models/User";

export const dynamic = "force-dynamic";

// PATCH /api/user/password — body: { currentPassword, newPassword }
// Only applies to accounts that already have a passwordHash (i.e. signed up
// via email/password — see lib/auth-actions.ts). Google-only accounts have
// no password to change, so this rejects them rather than letting an
// unverified request bolt a password onto an OAuth-only account.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as Record<string, unknown>;
  const currentPassword = body.currentPassword;
  const newPassword = body.newPassword;

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
  }

  await connectDB();

  const user = await User.findById(userId);
  if (!user?.passwordHash) {
    return NextResponse.json(
      { error: "This account doesn't have a password set." },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  return NextResponse.json({ ok: true });
}
