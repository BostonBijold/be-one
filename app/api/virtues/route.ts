import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongoose";
import VirtueModel from "@/models/Virtue";

export const dynamic = "force-dynamic";

export async function GET() {
  await connectDB();

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
