// Turns a routine group's items into proportional timeline segments for the
// Routine Review flow's Goal / Actual avg / Proposed bars (see
// components/RoutineReviewFlow.tsx) — the retrospective sibling of
// lib/routine-timeline.ts's live pacing bar. There's no done/active/pending
// state here: each review bar is a fixed picture (or, for Proposed, a live
// preview of staged edits), not a session in progress, so every segment is
// just "this item's share of one total." The caller picks the minutes:
// original projectedMinutes for Goal, avgActualMins (falling back to
// projectedMinutes) for Actual avg, and the edited goals in staged order for
// Proposed.

export interface ReviewTimelineItem {
  id: string;
  minutes: number;
}

export interface ReviewTimelineSegment {
  id: string;
  minutes: number;
  pct: number; // 0-100, share of totalMinutes
}

export interface ReviewTimeline {
  segments: ReviewTimelineSegment[];
  totalMinutes: number;
}

export function computeReviewTimeline(items: ReviewTimelineItem[]): ReviewTimeline {
  const totalMinutes = items.reduce((sum, i) => sum + i.minutes, 0);
  const segments = items
    .filter((i) => i.minutes > 0)
    .map((i) => ({
      id: i.id,
      minutes: i.minutes,
      pct: totalMinutes > 0 ? (i.minutes / totalMinutes) * 100 : 0,
    }));
  return { segments, totalMinutes };
}
