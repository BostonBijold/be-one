"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import DateNav from "@/components/DateNav";
import RoutineGroupCard, { type GroupCardGroup } from "@/components/RoutineGroupCard";
import TimerScreen, { type TimerItem } from "@/components/TimerScreen";
import RoutineSession from "@/components/RoutineSession";
import VirtueSheet, { type VirtueData } from "@/components/VirtueSheet";
import VirtueCheckInModal from "@/components/VirtueCheckInModal";
import AddHabitSheet from "@/components/AddHabitSheet";
import type { LogState } from "@/models/RoutineLog";
import type { RowItem } from "@/components/RoutineItemRow";
import { isItemVisibleOn } from "@/lib/routine-visibility";

export type RoutineItem = RowItem;
export type RoutineGroup = GroupCardGroup;

export interface RoutineLogEntry {
  _id: string;
  routineItemId: string;
  date: string;
  actualMinutes?: number;
  state: LogState;
}

export type WeekLog = { routineItemId: string; date: string; state: LogState };

interface Props {
  groups: RoutineGroup[];
  initialLogs: RoutineLogEntry[];
  weekLogs: WeekLog[];
  weekDates: string[];
  today: string;
  userName: string;
  userImage: string | null;
  skipAuth?: boolean;
  currentVirtue?: VirtueData | null;
  isAdmin?: boolean;
  autoStartNext?: boolean;
  autoAddHabit?: boolean;
}

interface ActiveSession {
  group: GroupCardGroup;
}

export default function RoutinesView({
  groups, initialLogs, weekLogs, weekDates,
  today, userName, userImage, skipAuth,
  currentVirtue: initialVirtue = null,
  isAdmin = false,
  autoStartNext = false,
  autoAddHabit = false,
}: Props) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(today);
  const [virtue, setVirtue] = useState(initialVirtue);
  const [virtueOpen, setVirtueOpen] = useState(false);
  const [logs, setLogs] = useState<Record<string, RoutineLogEntry>>(
    Object.fromEntries(initialLogs.map((l) => [l.routineItemId, l]))
  );
  const [timerItem, setTimerItem] = useState<TimerItem | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [addHabitGroup, setAddHabitGroup] = useState<{ id: string; name: string } | null>(null);
  const [checkInItem, setCheckInItem] = useState<RowItem | null>(null);

  const isPastDate = selectedDate !== today;

  // Split into timed routine groups and standalone habit groups
  const routineGroups = useMemo(() => groups.filter((g) => g.timeOfDay !== "habit"), [groups]);
  const habitGroups = useMemo(() => groups.filter((g) => g.timeOfDay === "habit"), [groups]);

  // Handle URL params passed from QuickAddSheet / FAB navigation
  useEffect(() => {
    if (autoStartNext) {
      const logsMap = Object.fromEntries(initialLogs.map((l) => [l.routineItemId, l]));
      const nextGroup = routineGroups.find((g) => {
        const visible = g.items.filter((i) => isItemVisibleOn(i, today));
        return visible.length > 0 && !visible.every((i) => !!logsMap[i._id]);
      });
      if (nextGroup) setActiveSession({ group: nextGroup });
      router.replace("/routines");
    }
    if (autoAddHabit) {
      const target = habitGroups[0];
      if (target) setAddHabitGroup({ id: target._id, name: target.name });
      router.replace("/routines");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch logs whenever the selected date changes
  useEffect(() => {
    if (selectedDate === today) {
      setLogs(Object.fromEntries(initialLogs.map((l) => [l.routineItemId, l])));
      return;
    }
    let cancelled = false;
    fetch(`/api/routine-logs?date=${selectedDate}`)
      .then((r) => r.json())
      .then((data: RoutineLogEntry[]) => {
        if (!cancelled) {
          setLogs(Object.fromEntries(data.map((l) => [l.routineItemId, l])));
        }
      });
    return () => { cancelled = true; };
  }, [selectedDate, today, initialLogs]);

  // weekLogs keyed by itemId → array of {date, state}
  const weekLogsByItem: Record<string, Array<{ date: string; state: LogState }>> = {};
  for (const wl of weekLogs) {
    if (!weekLogsByItem[wl.routineItemId]) weekLogsByItem[wl.routineItemId] = [];
    weekLogsByItem[wl.routineItemId].push({ date: wl.date, state: wl.state });
  }

  const handleStateChange = useCallback(
    async (
      routineItemId: string,
      newState: LogState | null,
      opts?: { actualMinutes?: number; isBackEntry?: boolean }
    ) => {
      const prev = logs[routineItemId];

      if (newState === null) {
        setLogs((l) => {
          const next = { ...l };
          delete next[routineItemId];
          return next;
        });
        await fetch("/api/routine-logs", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routineItemId, date: selectedDate }),
        });
      } else {
        const optimistic: RoutineLogEntry = {
          _id: prev?._id ?? "",
          routineItemId,
          date: selectedDate,
          state: newState,
          actualMinutes: opts?.actualMinutes ?? prev?.actualMinutes,
        };
        setLogs((l) => ({ ...l, [routineItemId]: optimistic }));

        const res = await fetch("/api/routine-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            routineItemId,
            date: selectedDate,
            state: newState,
            actualMinutes: opts?.actualMinutes,
            isBackEntry: opts?.isBackEntry ?? isPastDate,
          }),
        });
        if (res.ok) {
          const saved = await res.json();
          setLogs((l) => ({ ...l, [routineItemId]: saved }));
        }
      }
    },
    [logs, selectedDate, isPastDate]
  );

  const handleTimerComplete = useCallback(
    async (actualMinutes: number) => {
      if (!timerItem) return;
      await handleStateChange(timerItem._id, "done", { actualMinutes });
      setTimerItem(null);
    },
    [timerItem, handleStateChange]
  );

  const handleTimerMissed = useCallback(async () => {
    if (!timerItem) return;
    await handleStateChange(timerItem._id, "missed");
    setTimerItem(null);
  }, [timerItem, handleStateChange]);

  const handleSessionFinish = useCallback(() => {
    setActiveSession(null);
    router.refresh();
  }, [router]);

  const handleAddHabit = useCallback(
    async (
      templateId: string | null,
      name: string,
      icon: string,
      projectedMinutes: number
    ) => {
      if (!addHabitGroup) return;
      await fetch("/api/routine-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: addHabitGroup.id,
          templateId,
          name,
          icon,
          projectedMinutes,
        }),
      });
      setAddHabitGroup(null);
      router.refresh();
    },
    [addHabitGroup, router]
  );

  const totalDone = Object.values(logs).filter((l) => l.state === "done").length;
  const totalItems = groups.reduce(
    (acc, g) => acc + g.items.filter((i) => isItemVisibleOn(i, selectedDate)).length,
    0
  );

  const sessionGroup = activeSession
    ? groups.find((g) => g._id === activeSession.group._id) ?? activeSession.group
    : null;
  const sessionItems = sessionGroup
    ? sessionGroup.items.filter((i) => isItemVisibleOn(i, selectedDate))
    : [];

  return (
    <div className="min-h-screen bg-bg">
      {timerItem && (
        <TimerScreen
          item={timerItem}
          onComplete={handleTimerComplete}
          onMissed={handleTimerMissed}
          onClose={() => setTimerItem(null)}
        />
      )}

      {sessionGroup && (
        <RoutineSession
          groupName={sessionGroup.name}
          items={sessionItems}
          today={selectedDate}
          onClose={() => setActiveSession(null)}
          onFinish={handleSessionFinish}
        />
      )}

      {virtue && virtueOpen && (
        <VirtueSheet
          virtue={virtue}
          isAdmin={isAdmin}
          thisWeekOrder={virtue.order}
          onClose={() => setVirtueOpen(false)}
          onEssayChange={(essay) => setVirtue((v) => v ? { ...v, essay } : v)}
        />
      )}

      {addHabitGroup && (
        <AddHabitSheet
          groupId={addHabitGroup.id}
          groupName={addHabitGroup.name}
          onAdd={handleAddHabit}
          onClose={() => setAddHabitGroup(null)}
        />
      )}

      {checkInItem && (
        <VirtueCheckInModal
          thisWeekVirtue={virtue}
          date={selectedDate}
          onDone={(mins) => {
            handleStateChange(checkInItem._id, "done", { actualMinutes: mins });
            setCheckInItem(null);
          }}
          onClose={() => setCheckInItem(null)}
        />
      )}

      <div className="mx-auto max-w-mobile px-4 pb-28">
        <Header userName={userName} userImage={userImage} today={today} skipAuth={skipAuth} />

        {/* Virtue strip */}
        {virtue && (
          <button
            onClick={() => setVirtueOpen(true)}
            className="w-full text-left bg-card border border-gold/25 rounded-card px-4 py-3 mt-6 mb-4 hover:bg-card-hover active:opacity-90 transition-colors flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-widest text-gold mb-0.5">
                This Week&apos;s Virtue
              </p>
              <p className="font-heading text-base italic text-text leading-tight truncate">
                {virtue.displayName}
              </p>
            </div>
            <span className="text-gold/60 text-sm flex-shrink-0">›</span>
          </button>
        )}

        <>
          {/* Date navigation */}
            <DateNav
              selectedDate={selectedDate}
              today={today}
              maxDaysBack={7}
              onChange={setSelectedDate}
            />

            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex items-center gap-3">
                <span className="font-mono text-olive text-sm tabular-nums">
                  {totalDone}/{totalItems}
                </span>
                <div className="flex-1 h-px bg-card relative overflow-hidden rounded-full">
                  <div
                    className="absolute inset-y-0 left-0 bg-olive transition-all duration-500"
                    style={{ width: totalItems > 0 ? `${(totalDone / totalItems) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* Routine groups (morning / afternoon / evening) */}
            <div className="space-y-8">
              {routineGroups.map((group) => (
                <RoutineGroupCard
                  key={`${group._id}-${selectedDate}`}
                  group={group}
                  logs={logs}
                  weekLogs={weekLogsByItem}
                  weekDates={weekDates}
                  isPastDate={isPastDate}
                  selectedDate={selectedDate}
                  onStateChange={handleStateChange}
                  onStartTimer={(item) => setTimerItem(item)}
                  onStartRoutine={(g) => setActiveSession({ group: g })}
                  onOpenCheckIn={(item) => setCheckInItem(item)}
                  onOpenReview={() => router.push(`/review?mode=weekly&date=${selectedDate}&return=routines`)}
                />
              ))}
            </div>

            {/* Standalone habits section */}
            {(habitGroups.length > 0) && (
              <div className="mt-10">
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-dim">
                    Habits
                  </span>
                  <div className="flex-1 h-px bg-border" />
                  <button
                    onClick={() => {
                      const target = habitGroups[0];
                      if (target) setAddHabitGroup({ id: target._id, name: target.name });
                    }}
                    className="font-mono text-[10px] text-olive hover:text-olive-light transition-colors"
                  >
                    + Add
                  </button>
                </div>

                <div className="space-y-8">
                  {habitGroups.map((group) => (
                    <RoutineGroupCard
                      key={`${group._id}-${selectedDate}`}
                      group={group}
                      logs={logs}
                      weekLogs={weekLogsByItem}
                      weekDates={weekDates}
                      isPastDate={isPastDate}
                      selectedDate={selectedDate}
                      onStateChange={handleStateChange}
                      onStartTimer={(item) => setTimerItem(item)}
                      onStartRoutine={() => {}}
                      onOpenCheckIn={(item) => setCheckInItem(item)}
                      onOpenReview={() => router.push(`/review?mode=weekly&date=${selectedDate}&return=routines`)}
                    />
                  ))}
                </div>

                {habitGroups.every((g) => g.items.length === 0) && (
                  <button
                    onClick={() => {
                      const target = habitGroups[0];
                      if (target) setAddHabitGroup({ id: target._id, name: target.name });
                    }}
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-border-light text-dim font-body text-sm py-5 rounded-card hover:border-olive/40 hover:text-olive transition-colors min-h-[44px]"
                  >
                    + Add your first habit
                  </button>
                )}
              </div>
            )}

            {groups.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted text-sm">No routines yet.</p>
              </div>
            )}
          </>
      </div>
    </div>
  );
}
