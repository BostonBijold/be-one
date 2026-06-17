"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ListChecks, Target, BarChart3, ScrollText,
  Play, CheckSquare, Sparkles, X,
} from "lucide-react";
import FABHabitSheet from "@/components/FABHabitSheet";
import FABTaskSheet from "@/components/FABTaskSheet";

const LEFT_TABS = [
  { href: "/routines", label: "Routines", Icon: ListChecks },
  { href: "/goals",    label: "Goals",    Icon: Target      },
];
const RIGHT_TABS = [
  { href: "/analytics", label: "Analytics", Icon: BarChart3 },
  { href: "/virtues",   label: "Virtues",   Icon: ScrollText },
];

// Radial layout: 3 bubbles at 130° / 90° / 50° from the horizontal axis.
// FAB center sits ~60px above the viewport bottom edge.
// Radius: 100px.  Bubble size: 56px (w-14 h-14).
const DIAL = [
  {
    key: "task",
    icon: CheckSquare,
    label: "Task",
    bg: "bg-blue-muted",
    fg: "text-text",
    left: "calc(50% - 92px)",
    bottom: 109,
    origin: "origin-bottom-right",
    delay: 0,
  },
  {
    key: "startNext",
    icon: Play,
    label: "Start Next",
    bg: "bg-olive",
    fg: "text-text",
    left: "calc(50% - 28px)",
    bottom: 132,
    origin: "origin-bottom",
    delay: 50,
  },
  {
    key: "habit",
    icon: Sparkles,
    label: "Habit",
    bg: "bg-gold",
    fg: "text-bg",
    left: "calc(50% + 36px)",
    bottom: 109,
    origin: "origin-bottom-left",
    delay: 100,
  },
];

function todayStr() {
  return new Date().toLocaleDateString("sv"); // YYYY-MM-DD in local time
}

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [habitOpen, setHabitOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const handleStartNext = async () => {
    const date = todayStr();
    const res = await fetch(`/api/routines/start-next?date=${date}`);
    const data = await res.json() as { hasNext: boolean };
    if (!data.hasNext) {
      showToast("All routines complete for today.");
      return;
    }
    const base = "/routines";
    const url = `/routines?startNext=1&date=${date}`;
    if (pathname === base) {
      router.replace(url);
    } else {
      router.push(url);
    }
  };

  const handleAction = (key: string) => {
    setOpen(false);
    if (key === "startNext") { handleStartNext(); return; }
    if (key === "task")      { setTaskOpen(true);  return; }
    if (key === "habit")     { setHabitOpen(true); return; }
  };

  return (
    <>
      {/* Toast */}
      {toast && (
        <div
          className="fixed z-50 left-1/2 -translate-x-1/2 font-mono text-xs text-text bg-card border border-border px-4 py-2.5 rounded-card shadow-lg pointer-events-none"
          style={{ bottom: "calc(80px + env(safe-area-inset-bottom))" }}
        >
          {toast}
        </div>
      )}

      {/* Habit sheet */}
      {habitOpen && (
        <FABHabitSheet date={todayStr()} onClose={() => setHabitOpen(false)} />
      )}

      {/* Task sheet */}
      {taskOpen && (
        <FABTaskSheet date={todayStr()} onClose={() => setTaskOpen(false)} />
      )}

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Arc bubbles */}
      {DIAL.map(({ key, icon: Icon, label, bg, fg, left, bottom, origin, delay }) => (
        <button
          key={key}
          onClick={() => handleAction(key)}
          aria-label={label}
          className={`fixed z-40 w-14 h-14 rounded-full ${bg} ${fg} flex flex-col items-center justify-center gap-0.5 shadow-lg transition-all duration-200 ${origin} ${
            open
              ? "opacity-100 scale-100 pointer-events-auto"
              : "opacity-0 scale-0 pointer-events-none"
          }`}
          style={{
            left,
            bottom: `calc(${bottom}px + env(safe-area-inset-bottom))`,
            transitionDelay: open ? `${delay}ms` : "0ms",
          }}
        >
          <Icon size={17} strokeWidth={2} />
          <span className="font-mono text-[8px] uppercase tracking-wider leading-none">
            {label}
          </span>
        </button>
      ))}

      {/* Nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-mobile relative">
          {/* FAB */}
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close" : "Quick add"}
            className={`absolute left-1/2 -translate-x-1/2 -top-6 z-10 w-14 h-14 rounded-full border-4 border-bg shadow-lg flex items-center justify-center transition-all duration-200 ${
              open ? "bg-card-hover" : "bg-olive"
            }`}
          >
            {open ? (
              <X size={20} className="text-muted" />
            ) : (
              <Image
                src="/jackalope_transparent.png"
                alt=""
                width={40}
                height={40}
                priority
              />
            )}
          </button>

          {/* Tabs */}
          <div className="bg-card border-t border-border" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex items-stretch h-16">
              {LEFT_TABS.map(({ href, label, Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] ${
                      active ? "text-olive" : "text-dim hover:text-muted"
                    }`}
                  >
                    <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                    <span className="font-mono text-[9px] uppercase tracking-widest leading-none">
                      {label}
                    </span>
                  </Link>
                );
              })}

              {/* FAB spacer */}
              <div className="w-20 flex-shrink-0" />

              {RIGHT_TABS.map(({ href, label, Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors min-h-[44px] ${
                      active ? "text-olive" : "text-dim hover:text-muted"
                    }`}
                  >
                    <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                    <span className="font-mono text-[9px] uppercase tracking-widest leading-none">
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
