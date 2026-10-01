// Presentational segment bar shared by the live Routine Session timeline
// (components/RoutineSession.tsx, green/amber pacing) and the Routine
// Review flow's Goal / Actual avg / Proposed bars (components/RoutineReviewFlow.tsx,
// per-item colors from lib/review-colors.ts) — same layout, different callers
// own their own color meaning entirely. See lib/routine-timeline.ts and
// lib/routine-review-timeline.ts for how each caller's segments are built.
//
// The optional title/totalLabel/segment labels and size="lg" are only used by
// the review flow; leaving them out renders exactly the thin live-session bar.

export interface TimelineBarSegment {
  id: string;
  pct: number; // 0-100, share of the bar's total width
  color: string;
  label?: string; // drawn inside the segment when it's wide enough (size="lg" only)
}

interface Props {
  segments: TimelineBarSegment[];
  startLabel: string;
  endLabel: string;
  title?: string; // left side of a header row above the bar
  totalLabel?: string; // right side of that header row, e.g. "47 min"
  size?: "sm" | "lg";
}

// Below this share of the bar a segment is too narrow for even a truncated
// label — the colored list under the bars is the legend for those.
const MIN_LABEL_PCT = 9;

export default function TimelineBar({ segments, startLabel, endLabel, title, totalLabel, size = "sm" }: Props) {
  const lg = size === "lg";
  return (
    <div>
      {(title || totalLabel) && (
        <div className="flex items-baseline justify-between mb-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-dim">{title}</span>
          <span className="font-mono text-[11px] text-text">{totalLabel}</span>
        </div>
      )}
      <div className={`flex overflow-hidden bg-border ${lg ? "h-[18px] rounded-md" : "h-2 rounded-full"}`}>
        {segments.map((seg, i) => (
          <div
            key={seg.id}
            className={lg ? "flex items-center overflow-hidden" : undefined}
            style={{
              flex: `0 0 ${seg.pct}%`,
              backgroundColor: seg.color,
              borderRight: i < segments.length - 1 ? "2px solid #18160f" : undefined,
              transition: "flex-basis 0.6s ease, background-color 0.4s ease",
            }}
          >
            {lg && seg.label && seg.pct >= MIN_LABEL_PCT && (
              <span className="px-1 font-mono text-[9px] leading-none text-bg truncate">{seg.label}</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="font-mono text-[9px] text-dim">{startLabel}</span>
        <span className="font-mono text-[9px] text-dim">{endLabel}</span>
      </div>
    </div>
  );
}
