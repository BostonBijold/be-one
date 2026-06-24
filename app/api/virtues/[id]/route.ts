import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import VirtueModel from "@/models/Virtue";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "bostonrbijold@gmail.com";

function isAdmin(email?: string | null): boolean {
  return email === ADMIN_EMAIL || process.env.SKIP_AUTH === "true";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!isAdmin(session?.user?.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as { essay?: string; etymology?: string };

  await connectDB();

  const update: Record<string, string> = {};
  if (body.essay   !== undefined) update.essay     = body.essay;
  if (body.etymology !== undefined) update.etymology = body.etymology;

  const virtue = await VirtueModel.findByIdAndUpdate(
    params.id,
    { $set: update },
    { returnDocument: "after" }
  ).lean();

  if (!virtue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    _id: virtue._id.toString(),
    essay: virtue.essay,
    etymology: virtue.etymology,
  });
}
