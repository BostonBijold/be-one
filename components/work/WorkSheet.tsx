"use client";

import { X } from "lucide-react";

export const workInputClass =
  "w-full px-3 py-2.5 rounded-lg bg-bg border border-border-light font-body text-base text-text placeholder:text-dim focus:outline-none focus:border-olive";
export const workFieldLabelClass = "block font-mono text-caption uppercase tracking-wider text-muted mb-1.5";

// Same bottom-sheet shell as AddHabitSheet, copied rather than shared (R4).
export default function WorkSheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-mobile mx-auto">
        <div className="bg-card rounded-t-modal max-h-[80vh] flex flex-col" role="dialog" aria-label={title}>
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
            <h2 className="font-heading text-lg text-text">{title}</h2>
            <button
              onClick={onClose}
              className="w-11 h-11 -mr-2 flex items-center justify-center text-muted"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
