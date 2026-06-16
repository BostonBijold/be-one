"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  selectedDate: string; // YYYY-MM-DD
  today: string;
  maxDaysBack?: number;
  onChange: (date: string) => void;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatLabel(dateStr: string, today: string): string {
  if (dateStr === today) return "Today";
  const diff = Math.round(
    (new Date(today + "T12:00:00").getTime() - new Date(dateStr + "T12:00:00").getTime()) /
      86400000
  );
  if (diff === 1) return "Yesterday";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function DateNav({ selectedDate, today, maxDaysBack = 7, onChange }: Props) {
  const minDate = addDays(today, -maxDaysBack);
  const canGoBack = selectedDate > minDate;
  const canGoForward = selectedDate < today;
  const isToday = selectedDate === today;

  return (
    <div className="flex items-center justify-between mb-5">
      <button
        onClick={() => canGoBack && onChange(addDays(selectedDate, -1))}
        disabled={!canGoBack}
        className="w-10 h-10 flex items-center justify-center rounded-full text-muted disabled:text-dim hover:text-text transition-colors disabled:cursor-default"
        aria-label="Previous day"
      >
        <ChevronLeft size={20} strokeWidth={1.5} />
      </button>

      <div className="text-center">
        <p className={`font-mono text-sm font-medium tracking-wide ${isToday ? "text-text" : "text-olive"}`}>
          {formatLabel(selectedDate, today)}
        </p>
        {!isToday && (
          <p className="font-mono text-dim text-[10px] mt-0.5 tracking-widest">{selectedDate}</p>
        )}
      </div>

      <button
        onClick={() => canGoForward && onChange(addDays(selectedDate, 1))}
        disabled={!canGoForward}
        className="w-10 h-10 flex items-center justify-center rounded-full text-muted disabled:text-dim hover:text-text transition-colors disabled:cursor-default"
        aria-label="Next day"
      >
        <ChevronRight size={20} strokeWidth={1.5} />
      </button>
    </div>
  );
}
