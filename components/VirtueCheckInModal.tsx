"use client";

import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";

interface Virtue {
  _id: string;
  name: string;
  displayName: string;
  tagline: string;
  order: number;
}

interface Props {
  thisWeekVirtue: { name: string; displayName: string; tagline: string } | null;
  date: string; // YYYY-MM-DD being checked in
  onDone: (actualMinutes: number) => void;
  onClose: () => void;
}

// Franklin's actual method: a clean day needs no mark at all.
// Every virtue defaults to "clean" — tapping flags it as today's exception.
export default function VirtueCheckInModal({ thisWeekVirtue, date, onDone, onClose }: Props) {
  const [virtues, setVirtues] = useState<Virtue[]>([]);
  const [exceptions, setExceptions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/virtues")
      .then((r) => r.json())
      .then((data: Virtue[]) => {
        setVirtues(data.sort((a, b) => a.order - b.order));
        setLoading(false);
      });
  }, []);

  const canSubmit = !loading && !submitting && virtues.length > 0;
  const cleanCount = virtues.length - exceptions.size;

  const toggleException = (id: string) => {
    setExceptions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/virtue-checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          answers: virtues.map((v) => ({
            virtueId: v._id,
            virtueName: v.name,
            answer: exceptions.has(v._id) ? "no" : "yes",
          })),
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        setError(e.error ?? "Something went wrong.");
        setSubmitting(false);
        return;
      }
      onDone(5);
    } catch {
      setError("Network error — please try again.");
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-mobile">
        <div className="bg-card rounded-t-modal border-t border-border flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-border">
            <div className="flex justify-center mb-3">
              <div className="w-8 h-1 rounded-full bg-border-light" />
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-1">
                  Daily Check-in
                </p>
                <h2 className="font-heading text-lg italic text-text leading-tight">
                  {thisWeekVirtue?.displayName ?? "Virtue Check-in"}
                </h2>
                {thisWeekVirtue?.tagline && (
                  <p className="font-mono text-[10px] text-muted mt-1">
                    {thisWeekVirtue.tagline}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-dim"
              >
                <X size={18} />
              </button>
            </div>

            {virtues.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1 bg-bg rounded-full overflow-hidden">
                  <div
                    className="h-full bg-olive transition-all duration-300"
                    style={{ width: `${(cleanCount / virtues.length) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-[10px] text-dim tabular-nums">
                  {cleanCount}/{virtues.length} clean
                </span>
              </div>
            )}
          </div>

          {/* Virtue list */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {loading && (
              <p className="text-dim font-mono text-xs text-center py-8">Loading virtues…</p>
            )}
            <p className="font-mono text-[9px] text-dim px-2 pt-1 pb-2">
              Tap a virtue only if you slipped today. Everything else is assumed clean.
            </p>
            {virtues.map((virtue) => {
              const flagged = exceptions.has(virtue._id);
              return (
                <button
                  key={virtue._id}
                  onClick={() => toggleException(virtue._id)}
                  className={`w-full flex items-center gap-3 py-2.5 px-2 rounded-lg text-left transition-colors ${
                    flagged ? "bg-burgundy/10" : "hover:bg-bg/50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-text">{virtue.name}</p>
                    <p className="font-mono text-[9px] text-dim mt-0.5 truncate">{virtue.tagline}</p>
                  </div>
                  <span
                    className={`font-mono text-[10px] font-bold flex items-center gap-1 flex-shrink-0 ${
                      flagged ? "text-burgundy-light" : "text-olive"
                    }`}
                  >
                    {flagged ? "✗ Missed" : "✓ Clean"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-border">
            {error && (
              <p className="font-mono text-xs text-burgundy-light mb-3">{error}</p>
            )}
            {!error && (
              <p className="font-mono text-[10px] text-dim mb-3 text-center">
                {exceptions.size === 0
                  ? "Clean day — nothing to flag."
                  : `${exceptions.size} exception${exceptions.size !== 1 ? "s" : ""} marked today.`}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="w-full py-4 rounded-card bg-gold text-bg font-body font-semibold text-sm disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
            >
              {submitting ? (
                "Saving…"
              ) : (
                <><Check size={16} /> Submit Check-in</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
