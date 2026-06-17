"use client";

import { useState, useEffect } from "react";
import { Info } from "lucide-react";
import VirtueWalkthroughModal from "@/components/VirtueWalkthroughModal";

interface Props {
  autoOpen: boolean;
}

export default function VirtuesHowItWorks({ autoOpen }: Props) {
  const [open, setOpen] = useState(false);

  // Delay auto-open one frame so page paint completes first
  useEffect(() => {
    if (autoOpen) {
      const t = setTimeout(() => setOpen(true), 120);
      return () => clearTimeout(t);
    }
  }, [autoOpen]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-dim hover:text-muted transition-colors min-h-[44px] px-1"
        aria-label="How the virtue system works"
      >
        <Info size={14} />
        <span className="font-mono text-[10px] uppercase tracking-widest">
          How This Works
        </span>
      </button>

      {open && <VirtueWalkthroughModal onClose={() => setOpen(false)} />}
    </>
  );
}
