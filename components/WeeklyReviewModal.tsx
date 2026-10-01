"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft } from "lucide-react";
import { weekStartDate, isoWeekNumber, currentVirtueOrder } from "@/lib/virtue-dates";
import VirtueSummary from "@/components/VirtueSummary";

interface Score {
  virtueId: string;
  virtueName: string;
  yes: number;
  total: number;
  pct: number;
}

interface FullVirtue {
  _id: string;
  order: number;
  displayName: string;
  tagline: string;
  essay: string;
}

interface Props {
  date: string; // selectedDate (must be Sunday)
  // Pre-load fallback only — the modal resolves the week's virtue itself
  // from `date` + the fetched philosophy (see currentFocus).
  currentVirtue: { name: string; displayName: string; order: number; tagline?: string } | null;
  virtueCount: number;
  onDone: (actualMinutes: number) => void;
  onClose: () => void;
}

// Three steps, each with one primary button: recap the week that's ending →
// results → reveal next week's virtue (confirming logs the weekly_review item).
type Step = "recap" | "results" | "next";
const STEPS: Step[] = ["recap", "results", "next"];

export default function WeeklyReviewModal({ date, currentVirtue, virtueCount, onDone, onClose }: Props) {
  const [scores, setScores] = useState<Score[]>([]);
  const [checkInDays, setCheckInDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [virtues, setVirtues] = useState<FullVirtue[] | null>(null);
  const [step, setStep] = useState<Step>("recap");

  const dateObj = new Date(date + "T12:00:00");
  const ws = weekStartDate(dateObj);

  // Some callers (RoutineSession) can pass virtueCount 0 when they lack it —
  // fall back to the fetched philosophy's size rather than mis-rotating.
  const count = virtueCount > 0 ? virtueCount : virtues?.length ?? 0;

  // The week being reviewed is the ISO week containing `date` — weeks are
  // Monday-anchored, so Sunday still belongs to the week that's ending.
  const currentOrder = currentVirtueOrder(dateObj, count);
  const nextWeekNum = isoWeekNumber(dateObj) + 1;
  const nextVirtueOrder = count > 0 ? ((nextWeekNum - 1) % count) + 1 : 1;

  useEffect(() => {
    fetch(`/api/virtue-checkins?weekStart=${ws}`)
      .then((r) => r.json())
      .then((checkIns: Array<{ answers: Array<{ virtueId: string; virtueName: string; answer: string }> }>) => {
        const tally: Record<string, { name: string; yes: number; total: number }> = {};
        for (const ci of checkIns) {
          for (const ans of ci.answers) {
            if (!tally[ans.virtueId]) tally[ans.virtueId] = { name: ans.virtueName, yes: 0, total: 0 };
            tally[ans.virtueId].total++;
            if (ans.answer === "yes") tally[ans.virtueId].yes++;
          }
        }
        const computed = Object.entries(tally).map(([id, v]) => ({
          virtueId: id,
          virtueName: v.name,
          yes: v.yes,
          total: v.total,
          pct: v.total > 0 ? Math.round((v.yes / v.total) * 100) : 0,
        })).sort((a, b) => b.pct - a.pct);
        setScores(computed);
        setCheckInDays(checkIns.length);
        setLoading(false);
      });
  }, [ws]);

  // Full virtue objects (tagline + essay) for both the recap and the reveal,
  // from the selected philosophy (GET /api/virtues is scoped server-side).
  useEffect(() => {
    fetch(`/api/virtues`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list: FullVirtue[]) => setVirtues(list))
      .catch(() => setVirtues([]));
  }, []);

  const currentFocus = virtues?.find((v) => v.order === currentOrder)
    ?? (currentVirtue ? { _id: "", order: currentVirtue.order, displayName: currentVirtue.displayName, tagline: currentVirtue.tagline ?? "", essay: "" } : null);
  const nextVirtue = virtues?.find((v) => v.order === nextVirtueOrder) ?? null;
  const sameVirtueNextWeek = !!currentFocus && !!nextVirtue && currentFocus.order === nextVirtue.order;

  const strongest = scores[0] ?? null;
  const needsWork = scores[scores.length - 1] ?? null;

  const stepIndex = STEPS.indexOf(step);
  function advance() {
    if (step === "next") onDone(10);
    else setStep(STEPS[stepIndex + 1]);
  }

  // Enter moves forward, same as the primary button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.repeat) return;
      if ((e.target as HTMLElement | null)?.closest("input, textarea, button")) return;
      e.preventDefault();
      advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const primaryLabel =
    step === "recap" ? "See how you did" : step === "results" ? "Next week's virtue" : "Got it. Start next week.";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-mobile">
        <div className="bg-card rounded-t-modal border-t border-border flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex-shrink-0 px-5 pt-4 pb-4 border-b border-border">
            <div className="flex justify-center mb-3">
              <div className="w-8 h-1 rounded-full bg-border-light" />
            </div>
            <div className="flex items-center justify-between gap-2">
              {stepIndex > 0 ? (
                <button
                  onClick={() => setStep(STEPS[stepIndex - 1])}
                  className="w-11 h-11 -ml-3 flex items-center justify-center text-dim flex-shrink-0"
                  aria-label="Back"
                >
                  <ChevronLeft size={18} />
                </button>
              ) : null}
              <div className="flex-1 min-w-0">
                <p className="font-mono text-micro uppercase tracking-widest text-gold mb-1">
                  Weekly Review
                </p>
                <p className="font-mono text-caption text-dim">
                  {loading ? "…" : `${checkInDays}/7 days checked in`}
                </p>
              </div>
              <div className="flex items-center gap-1.5" aria-label={`Step ${stepIndex + 1} of 3`}>
                {STEPS.map((s, i) => (
                  <span
                    key={s}
                    className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-4 bg-gold" : i < stepIndex ? "w-1.5 bg-gold/50" : "w-1.5 bg-border-light"}`}
                  />
                ))}
              </div>
              <button onClick={onClose} className="w-11 h-11 -mr-3 flex items-center justify-center text-dim flex-shrink-0" aria-label="Close review">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5 py-5">
            {/* Step 1 — recap of the week that's ending */}
            {step === "recap" && (
              currentFocus ? (
                <VirtueSummary size="lg" eyebrow="This past week's focus" virtue={currentFocus} />
              ) : virtues === null ? (
                <p className="text-dim font-mono text-xs text-center py-8">Loading…</p>
              ) : (
                <p className="font-body text-sm text-muted py-4">Time to look back on your week.</p>
              )
            )}

            {/* Step 2 — results */}
            {step === "results" && (
              <div className="space-y-4">
                {loading ? (
                  <p className="text-dim font-mono text-xs text-center py-8">Loading summary…</p>
                ) : scores.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="font-body text-sm text-muted">No check-ins recorded this week.</p>
                    <p className="font-mono text-caption text-dim mt-1.5">A fresh week starts Monday.</p>
                  </div>
                ) : (
                  <>
                    {/* Highlights */}
                    {strongest && needsWork && strongest.virtueId !== needsWork.virtueId && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-olive/10 border border-olive/30 rounded-card px-3 py-3">
                          <p className="font-mono text-micro uppercase tracking-widest text-olive mb-1">
                            Strongest
                          </p>
                          <p className="font-body text-sm text-text font-medium">{strongest.virtueName}</p>
                          <p className="font-mono text-lg text-olive font-bold mt-1">{strongest.pct}%</p>
                        </div>
                        <div className="bg-tobacco/10 border border-tobacco/30 rounded-card px-3 py-3">
                          <p className="font-mono text-micro uppercase tracking-widest text-tobacco mb-1">
                            Needs Work
                          </p>
                          <p className="font-body text-sm text-text font-medium">{needsWork.virtueName}</p>
                          <p className="font-mono text-lg text-tobacco font-bold mt-1">{needsWork.pct}%</p>
                        </div>
                      </div>
                    )}

                    {/* Virtue score table */}
                    <div>
                      <p className="font-mono text-micro uppercase tracking-widest text-dim mb-2">
                        All Virtues
                      </p>
                      <div className="bg-bg rounded-card divide-y divide-border overflow-hidden">
                        {scores.map((s) => (
                          <div key={s.virtueId} className="flex items-center gap-3 px-3 py-2.5">
                            <span className="flex-1 font-body text-sm text-text truncate">{s.virtueName}</span>
                            <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden flex-shrink-0">
                              <div
                                className={`h-full rounded-full ${s.pct >= 70 ? "bg-olive" : s.pct >= 40 ? "bg-amber" : "bg-burgundy"}`}
                                style={{ width: `${s.pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-caption text-muted w-10 text-right flex-shrink-0">
                              {s.yes}/{s.total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3 — next week's virtue reveal */}
            {step === "next" && (
              nextVirtue ? (
                <VirtueSummary
                  size="lg"
                  eyebrow={sameVirtueNextWeek ? "Next week — the same focus continues" : "Next week's focus"}
                  virtue={nextVirtue}
                />
              ) : virtues === null ? (
                <p className="text-dim font-mono text-xs text-center py-8">Loading…</p>
              ) : (
                <p className="font-body text-sm text-text">Virtue #{nextVirtueOrder} begins Monday</p>
              )
            )}
          </div>

          {/* Footer — one primary action per step */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-border">
            <button
              onClick={advance}
              className={`w-full py-4 rounded-card font-body font-semibold text-sm min-h-[44px] ${
                step === "next" ? "bg-olive text-bg" : "bg-gold text-bg"
              }`}
            >
              {primaryLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
