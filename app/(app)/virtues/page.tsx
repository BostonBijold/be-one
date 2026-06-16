import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/mongoose";
import VirtueModel from "@/models/Virtue";
import VirtueCheckIn from "@/models/VirtueCheckIn";
import { currentVirtueOrder } from "@/lib/seed-virtues";
import Header from "@/components/Header";

export const dynamic = "force-dynamic";

const ADMIN_EMAIL = "bostonrbijold@gmail.com";
const DEV_USER_ID = "dev-local-user";

export default async function VirtuesPage() {
  const skipAuth = process.env.SKIP_AUTH === "true";
  const session = await auth();
  if (!skipAuth && !session?.user?.id) redirect("/login");

  const userId = session?.user?.id ?? (skipAuth ? DEV_USER_ID : null);

  await connectDB();

  const virtues = await VirtueModel.find({ isActive: true })
    .sort({ order: 1 })
    .lean();

  const checkIns = userId
    ? await VirtueCheckIn.find({ userId }).select("answers").lean()
    : [];

  const tally: Record<string, { yes: number; total: number }> = {};
  for (const ci of checkIns) {
    for (const ans of ci.answers) {
      const key = ans.virtueId.toString();
      tally[key] = tally[key] ?? { yes: 0, total: 0 };
      tally[key].total++;
      if (ans.answer === "yes") tally[key].yes++;
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const thisWeekOrder = currentVirtueOrder(new Date());
  const currentVirtue = virtues.find((v) => v.order === thisWeekOrder) ?? virtues[0];

  const isAdmin =
    skipAuth || session?.user?.email === ADMIN_EMAIL;

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-mobile px-4 pb-24">
        <Header
          userName={session?.user?.name ?? "Developer"}
          today={today}
          skipAuth={skipAuth}
        />

        {/* ── This Week ── */}
        {currentVirtue && (
          <Link href={`/virtues/${currentVirtue.slug}`} className="block mb-8">
            <p className="font-mono text-[10px] uppercase tracking-widest text-gold mb-3">
              This Week&apos;s Virtue
            </p>
            <div className="bg-card border border-gold/30 rounded-card px-5 py-5 hover:bg-card-hover transition-colors">
              <p className="font-mono text-[10px] text-gold uppercase tracking-widest mb-1">
                Week {thisWeekOrder} of 12
              </p>
              <h2 className="font-heading text-2xl italic text-text mb-1">
                {currentVirtue.displayName}
              </h2>
              <p className="font-body text-sm text-muted leading-snug mb-4">
                {currentVirtue.tagline}
              </p>
              {currentVirtue.essay ? (
                <p className="font-body text-sm text-dim leading-relaxed line-clamp-3">
                  {currentVirtue.essay}
                </p>
              ) : (
                <p className="font-body text-sm text-dim italic">
                  {isAdmin ? "Tap to write your reflection →" : "No reflection written yet."}
                </p>
              )}
            </div>
          </Link>
        )}

        {/* ── All 12 Virtues ── */}
        <p className="font-mono text-[10px] uppercase tracking-widest text-dim mb-3">
          All Virtues
        </p>
        <div className="space-y-1.5">
          {virtues.map((virtue) => {
            const isCurrent = virtue.order === thisWeekOrder;
            const stats = tally[virtue._id.toString()];
            const pct = stats && stats.total > 0 ? Math.round((stats.yes / stats.total) * 100) : null;
            const pctColor =
              pct === null ? "text-dim" : pct >= 70 ? "text-olive" : pct >= 40 ? "text-amber" : "text-burgundy-light";
            return (
              <Link
                key={virtue._id.toString()}
                href={`/virtues/${virtue.slug}`}
                className={`flex items-center gap-4 bg-card rounded-card px-4 py-3.5 hover:bg-card-hover transition-colors border-l-[3px] ${
                  isCurrent ? "border-gold" : "border-transparent"
                }`}
              >
                <span className="font-mono text-[10px] text-dim w-5 flex-shrink-0 tabular-nums">
                  {String(virtue.order).padStart(2, "0")}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-heading text-base ${isCurrent ? "text-gold" : "text-text"}`}>
                      {virtue.name}
                    </span>
                    {isCurrent && (
                      <span className="font-mono text-[9px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-pill">
                        this week
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs text-dim leading-snug truncate">
                    {virtue.tagline}
                  </p>
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <span className={`font-mono text-xs font-bold tabular-nums ${pctColor}`}>
                    {pct === null ? "—" : `${pct}%`}
                  </span>
                  <span className="font-mono text-[8px] text-dim">
                    {stats ? `${stats.total} days` : "no data"}
                  </span>
                </div>
                <span className="text-dim text-xs flex-shrink-0">›</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
