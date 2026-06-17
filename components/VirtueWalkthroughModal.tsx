"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface Props {
  onClose: () => void;
}

const SECTIONS = [
  {
    heading: "Where This Comes From",
    body: `In 1726, Benjamin Franklin made a list of thirteen virtues he wanted to live by. He built a small notebook, one page per week, and every evening he sat down and honestly examined his day. He tracked all thirteen virtues daily, but focused on one each week. After thirteen weeks he started over — four full cycles a year.\n\nHe called it his "bold and arduous project of arriving at moral perfection." He never achieved perfection. He became considerably better than he would otherwise have been. That was enough.\n\nThe A Good Man virtue system is built on his foundation.`,
  },
  {
    heading: "How It Works",
    body: `Thirteen virtues. Thirteen weeks. Four cycles a year.\n\nEach week, one virtue is your focus — the lens through which you try to see your day. It appears on your home screen. You carry it with you.\n\nEvery evening, you check in on all thirteen. Not just the week's virtue. All of them. This takes about two minutes.\n\nAt the end of thirteen weeks, you start again. Each time you return to a virtue, you bring more life experience with you. What discipline means in January is not quite what it means in October.`,
  },
  {
    heading: "Yes or No — Nothing Else",
    body: `Franklin marked his failures and left successes blank. A clean page meant a good week.\n\nThis system requires an answer every day. Yes or no. You were patient today or you were not. You held the standard or you fell short.\n\nThere is no maybe. There is no scale of one to five. The binary is the point — you already know which answer is true.\n\nA missed day shows as a missed day. You cannot accidentally build a record of perfect-looking days because you were too busy to check in. The record is honest or it is useless.\n\nYou have until the following evening to answer for the day before. After that, the window closes.`,
  },
  {
    heading: "The Sunday Review",
    body: `On Sunday evening, before the new week begins, you review what the week actually looked like.\n\nThe app shows you each virtue with a simple score — how many days did you mark yes? It shows you the week's virtue in full. It shows you next week's virtue so you can carry it into sleep and into Monday.\n\nThat is all. The app shows you the data. The reflection happens in your head — or in a journal, on paper, the way reflection was always meant to happen.\n\nThen the new virtue begins. You start again. A little clearer than before.`,
  },
];

async function markSeen() {
  await fetch("/api/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ virtueWalkthroughSeen: true }),
  });
}

export default function VirtueWalkthroughModal({ onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleDismiss = async () => {
    await markSeen();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-40"
        onClick={handleDismiss}
      />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-w-mobile mx-auto flex flex-col"
        style={{ maxHeight: "90dvh" }}
      >
        <div className="bg-bg border-t border-border rounded-t-modal flex flex-col overflow-hidden"
          style={{ maxHeight: "90dvh" }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-border-light" />
          </div>

          {/* Header row */}
          <div className="flex items-start justify-between px-5 pt-2 pb-4 flex-shrink-0">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-gold mb-1">
                Virtue System
              </p>
              <h2 className="font-heading text-xl text-text leading-snug">
                How This Works
              </h2>
            </div>
            <button
              onClick={handleDismiss}
              className="text-dim flex items-center justify-center min-w-[44px] min-h-[44px] -mr-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable content */}
          <div ref={scrollRef} className="overflow-y-auto px-5 pb-2 flex-1">
            <div className="space-y-7 pb-4">
              {SECTIONS.map((section) => (
                <div key={section.heading}>
                  <h3 className="font-heading text-base text-gold mb-2">
                    {section.heading}
                  </h3>
                  <div className="space-y-3">
                    {section.body.split("\n\n").map((para, i) => (
                      <p
                        key={i}
                        className="font-body text-sm text-text leading-relaxed"
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pt-3 pb-6 flex-shrink-0 border-t border-border">
            <button
              onClick={handleDismiss}
              className="w-full py-3.5 rounded-card bg-olive text-text font-body font-medium min-h-[44px]"
            >
              Got It
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
