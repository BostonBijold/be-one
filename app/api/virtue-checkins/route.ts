import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import VirtueCheckIn from "@/models/VirtueCheckIn";
import VirtueModel from "@/models/Virtue";
import { weekStartDate } from "@/lib/seed-virtues";

export const dynamic = "force-dynamic";

const DEV_USER_ID = "dev-local-user";

function resolveUserId(id?: string) {
  return id ?? (process.env.SKIP_AUTH === "true" ? DEV_USER_ID : null);
}

function getDates(days: number): string[] {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().split("T")[0];
  });
}

// GET /api/virtue-checkins
// ?date=YYYY-MM-DD        → single check-in for that date
// ?weekStart=YYYY-MM-DD   → all check-ins for that week
// ?days=7|30              → rolling window, per-virtue daily dots + effectiveness %
export async function GET(req: NextRequest) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const { searchParams } = new URL(req.url);

  const date = searchParams.get("date");
  const weekStart = searchParams.get("weekStart");
  const daysParam = searchParams.get("days");

  if (date) {
    const doc = await VirtueCheckIn.findOne({ userId, date }).lean();
    return NextResponse.json(doc ?? null);
  }

  if (weekStart) {
    const docs = await VirtueCheckIn.find({ userId, weekStartDate: weekStart })
      .sort({ date: 1 })
      .lean();
    return NextResponse.json(docs);
  }

  if (daysParam) {
    const days = Math.min(30, Math.max(7, parseInt(daysParam) || 7));
    const dates = getDates(days);

    const docs = await VirtueCheckIn.find({ userId, date: { $in: dates } }).lean();
    const byDate: Record<string, (typeof docs)[0]> = {};
    for (const d of docs) byDate[d.date] = d;

    const virtues = await VirtueModel.find({ isActive: true }).sort({ order: 1 }).lean();

    const virtueRows = virtues.map((v) => {
      const vId = v._id.toString();
      let yes = 0;
      let total = 0;
      const dots = dates.map((date) => {
        const ci = byDate[date];
        if (!ci) return null;
        const ans = ci.answers.find((a: { virtueId: { toString(): string } }) => a.virtueId.toString() === vId);
        if (!ans) return null;
        total++;
        if (ans.answer === "yes") yes++;
        return ans.answer;
      });
      const pct = total > 0 ? Math.round((yes / total) * 100) : 0;
      return { virtueId: vId, virtueName: v.name, slug: v.slug, order: v.order, dots, yes, total, pct };
    });

    const sorted = [...virtueRows].filter((v) => v.total > 0).sort((a, b) => b.pct - a.pct);
    const overallPct = sorted.length > 0
      ? Math.round(sorted.reduce((s, v) => s + v.pct, 0) / sorted.length)
      : 0;

    return NextResponse.json({
      days,
      dates,
      checkInDays: docs.length,
      overallPct,
      strongest: sorted[0] ? { virtueId: sorted[0].virtueId, virtueName: sorted[0].virtueName, pct: sorted[0].pct } : null,
      needsWork: sorted.length > 1 ? { virtueId: sorted[sorted.length - 1].virtueId, virtueName: sorted[sorted.length - 1].virtueName, pct: sorted[sorted.length - 1].pct } : null,
      virtues: virtueRows,
    });
  }

  return NextResponse.json({ error: "Missing query param" }, { status: 400 });
}

// POST /api/virtue-checkins
// Body: { date, answers: [{ virtueId, virtueName, answer }] }
export async function POST(req: NextRequest) {
  const session = await auth();
  const userId = resolveUserId(session?.user?.id);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    date: string;
    answers: Array<{ virtueId: string; virtueName: string; answer: "yes" | "no" }>;
  };

  // Validate date — only today or yesterday
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (body.date !== today && body.date !== yesterday) {
    return NextResponse.json(
      { error: "You can only check in for today or yesterday." },
      { status: 400 }
    );
  }

  await connectDB();

  const ws = weekStartDate(new Date(body.date + "T12:00:00"));

  const doc = await VirtueCheckIn.findOneAndUpdate(
    { userId, date: body.date },
    {
      $set: {
        weekStartDate: ws,
        answers: body.answers,
      },
    },
    { upsert: true, new: true }
  ).lean();

  return NextResponse.json(doc);
}
