import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import clientPromise from "@/lib/mongodb-client";
import User from "@/models/User";
import RoutineGroup from "@/models/RoutineGroup";
import RoutineItem from "@/models/RoutineItem";
import RoutineLog from "@/models/RoutineLog";
import RoutineSession from "@/models/RoutineSession";
import Goal from "@/models/Goal";
import Todo from "@/models/Todo";
import VirtueCheckIn from "@/models/VirtueCheckIn";
import AppIntentLink from "@/models/AppIntentLink";
import HabitTemplate from "@/models/HabitTemplate";

export const dynamic = "force-dynamic";

// DELETE /api/user/delete-account — body: { password?: string }
// Permanently deletes the signed-in user's account and every collection
// scoped to them. Password accounts must re-confirm their current password;
// Google-only accounts (no passwordHash) skip that check since the session
// itself is the proof of identity — same distinction PATCH /api/user/password
// already makes. Dependent collections are purged first and the User document
// last, so a failure partway through leaves a still-usable account rather than
// a dangling one.
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const password = body.password;

  await connectDB();

  const user = await User.findById(userId);
  if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  if (user.passwordHash) {
    if (typeof password !== "string" || !password) {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Password is incorrect." }, { status: 400 });
    }
  }

  await Promise.all([
    RoutineGroup.deleteMany({ userId }),
    RoutineItem.deleteMany({ userId }),
    RoutineLog.deleteMany({ userId }),
    RoutineSession.deleteMany({ userId }),
    Goal.deleteMany({ userId }),
    Todo.deleteMany({ userId }),
    VirtueCheckIn.deleteMany({ userId }),
    AppIntentLink.deleteMany({ userId }),
    HabitTemplate.deleteMany({ createdBy: userId }),
  ]);

  const client = await clientPromise;
  const db = client.db();
  const oid = ObjectId.isValid(userId) ? new ObjectId(userId) : null;
  if (oid) {
    await Promise.all([
      db.collection("accounts").deleteMany({ userId: oid }),
      db.collection("sessions").deleteMany({ userId: oid }),
    ]);
  }

  await User.findByIdAndDelete(userId);

  return NextResponse.json({ ok: true });
}
