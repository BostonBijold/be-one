"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// Compact "what does this virtue mean" reminder used by the daily check-in
// (VirtueCheckInModal) and the weekly review's recap/reveal steps
// (WeeklyReviewModal): displayName, tagline, and the essay behind a
// collapsed-by-default "Read more". Read-only — editing stays in VirtueSheet /
// VirtueDetailView, whose paragraph formatting (split on blank lines) this
// mirrors. Empty tagline/essay render nothing rather than an empty block.

export interface VirtueSummaryData {
  displayName: string;
  tagline?: string;
  essay?: string;
}

interface Props {
  virtue: VirtueSummaryData;
  eyebrow?: string;
  size?: "sm" | "lg"; // sm: daily reminder card; lg: weekly recap/reveal step
}

export default function VirtueSummary({ virtue, eyebrow, size = "sm" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const tagline = virtue.tagline?.trim();
  const essay = virtue.essay?.trim();
  const lg = size === "lg";

  return (
    <div className={lg ? "" : "bg-bg/60 border border-gold/20 rounded-card px-4 py-3"}>
      {eyebrow && (
        <p className="font-mono text-micro uppercase tracking-widest text-gold mb-1">{eyebrow}</p>
      )}
      <h3 className={`font-heading italic text-text leading-tight ${lg ? "text-2xl" : "text-base"}`}>
        {virtue.displayName}
      </h3>
      {tagline && (
        <p className={`font-body text-muted mt-1.5 ${lg ? "text-sm leading-relaxed" : "text-xs"}`}>{tagline}</p>
      )}
      {essay && (
        <>
          {expanded && (
            <div className="mt-3">
              {essay.split("\n\n").map((para, i) => (
                <p key={i} className="font-body text-sm text-text leading-relaxed mb-3 last:mb-0">
                  {para}
                </p>
              ))}
            </div>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-1.5 -ml-1 px-1 min-h-[32px] flex items-center gap-1 font-mono text-caption text-gold"
            aria-expanded={expanded}
          >
            {expanded ? "Show less" : "Read more"}
            <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </>
      )}
    </div>
  );
}
