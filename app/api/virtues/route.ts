import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import VirtueModel from "@/models/Virtue";
import { ensureVirtues } from "@/lib/seed-virtues";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();
  await ensureVirtues();

  const virtues = await VirtueModel.find({ isActive: true })
    .sort({ order: 1 })
    .lean();

  return NextResponse.json(
    virtues.map((v) => ({
      _id: v._id.toString(),
      name: v.name,
      slug: v.slug,
      tagline: v.tagline,
      displayName: v.displayName,
      order: v.order,
      essay: v.essay,
      etymology: v.etymology,
    }))
  );
}
