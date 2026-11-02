"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { workApi } from "@/lib/work/api";
import {
  FORGOTTEN_AFTER_MS,
  clientTimeZone,
  elapsedSeconds,
  formatClock,
  formatClockMinutes,
  localDayKey,
  localDayRange,
} from "@/lib/work/time";
import type { StartTarget, WorkCategoryDTO, WorkSessionDTO } from "@/lib/work/types";

const NOTES_SAVE_DEBOUNCE_MS = 800;
const IDLE_TITLE = "Work";

function isForgotten(session: WorkSessionDTO, nowMs: number) {
  return nowMs - new Date(session.startTime).getTime() >= FORGOTTEN_AFTER_MS;
}

export function useWorkTracker() {
  const [categories, setCategories] = useState<WorkCategoryDTO[]>([]);
  const [sessions, setSessions] = useState<WorkSessionDTO[]>([]);
  const [active, setActive] = useState<WorkSessionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [notes, setNotesState] = useState("");
  const [forgottenOpen, setForgottenOpen] = useState(false);

  // The notes draft and which session it belongs to, readable from timers and
  // page-lifecycle listeners without re-registering them.
  const notesRef = useRef("");
  const notesSessionIdRef = useRef<string | null>(null);
  const notesDirtyRef = useRef(false);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesInFlightRef = useRef<Promise<unknown> | null>(null);

  const refreshIdRef = useRef(0);
  const dayKeyRef = useRef(localDayKey(new Date()));
  const dismissedForgottenIdRef = useRef<string | null>(null);
  const pendingStartRef = useRef<StartTarget | null>(null);
  const busyRef = useRef(false);

  function applyServerNotes(session: WorkSessionDTO | null) {
    const value = session?.notes ?? "";
    notesRef.current = value;
    notesSessionIdRef.current = session?._id ?? null;
    setNotesState(value);
  }

  const flushNotes = useCallback(async () => {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = null;
    await notesInFlightRef.current;
    const id = notesSessionIdRef.current;
    if (!notesDirtyRef.current || !id) return;
    notesDirtyRef.current = false;
    const save = workApi(`/sessions/${id}`, "PATCH", { notes: notesRef.current }).catch((err: Error) =>
      setError(err.message)
    );
    notesInFlightRef.current = save;
    await save;
    notesInFlightRef.current = null;
  }, []);

  const refresh = useCallback(async () => {
    const refreshId = ++refreshIdRef.current;
    await flushNotes();
    const { from, to } = localDayRange(new Date());
    dayKeyRef.current = localDayKey(new Date());
    try {
      const [nextActive, nextSessions] = await Promise.all([
        workApi<WorkSessionDTO | null>("/sessions/active"),
        workApi<WorkSessionDTO[]>(`/sessions?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`),
      ]);
      if (refreshId !== refreshIdRef.current) return; // a newer refresh supersedes this one
      setActive(nextActive);
      setSessions(nextSessions);
      if (nextActive?._id !== notesSessionIdRef.current || !notesDirtyRef.current) {
        applyServerNotes(nextActive);
      }
      if (!nextActive || !isForgotten(nextActive, Date.now())) {
        // Another tab may have resolved it, or a new session may have replaced it.
        pendingStartRef.current = null;
        setForgottenOpen(false);
      } else if (dismissedForgottenIdRef.current !== nextActive._id) {
        setForgottenOpen(true);
      }
    } catch (err) {
      if (refreshId === refreshIdRef.current) setError((err as Error).message);
    }
  }, [flushNotes]);

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await workApi<WorkCategoryDTO[]>("/categories");
        if (!cancelled) setCategories(cats);
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
      await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // The tick is purely cosmetic: elapsed always comes from startTime, so a
  // throttled or suspended interval can't lose time.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Coming back to the page: snap the clock at once and pick up anything
  // another tab changed. Leaving it: don't strand unsaved notes.
  useEffect(() => {
    function sendNotesNow() {
      const id = notesSessionIdRef.current;
      if (!notesDirtyRef.current || !id) return;
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
      notesDirtyRef.current = false;
      // keepalive lets the request outlive the page.
      fetch(`/api/work/sessions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notesRef.current }),
        keepalive: true,
      }).catch(() => {});
    }
    function onReturn() {
      if (document.visibilityState !== "visible") {
        sendNotesNow();
        setNow(Date.now());
        return;
      }
      setNow(Date.now());
      refresh();
    }
    document.addEventListener("visibilitychange", onReturn);
    window.addEventListener("focus", onReturn);
    window.addEventListener("pageshow", onReturn);
    window.addEventListener("pagehide", sendNotesNow);
    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("pageshow", onReturn);
      window.removeEventListener("pagehide", sendNotesNow);
    };
  }, [refresh]);

  // A tab left open past midnight rolls over to the new day.
  useEffect(() => {
    if (localDayKey(new Date(now)) !== dayKeyRef.current) refresh();
  }, [now, refresh]);

  // Hidden tabs get throttled, sometimes to one tick a minute, so seconds would
  // be wrong there. Show only what stays accurate.
  useEffect(() => {
    if (!active) {
      document.title = IDLE_TITLE;
      return;
    }
    const elapsed = elapsedSeconds(active.startTime, now);
    const clock = document.visibilityState === "visible" ? formatClock(elapsed) : formatClockMinutes(elapsed);
    document.title = `${clock} · ${active.label}`;
  }, [active, now]);

  function setNotes(value: string) {
    notesRef.current = value;
    setNotesState(value);
    notesDirtyRef.current = true;
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(flushNotes, NOTES_SAVE_DEBOUNCE_MS);
  }

  // One action at a time, so a double tap can't start two sessions in a row.
  const runAction = useCallback(
    async (action: () => Promise<void>) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setError(null);
      try {
        await action();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        busyRef.current = false;
        await refresh();
      }
    },
    [refresh]
  );

  async function postStart(target: StartTarget) {
    await flushNotes();
    const { session } = await workApi<{ session: WorkSessionDTO }>("/sessions/start", "POST", {
      ...target,
      timeZone: clientTimeZone(),
    });
    setActive(session);
    applyServerNotes(session);
  }

  function start(target: StartTarget) {
    // A long-forgotten session must be resolved first, or switching would
    // silently record the whole gap as tracked time.
    if (active && isForgotten(active, Date.now())) {
      pendingStartRef.current = target;
      setForgottenOpen(true);
      return;
    }
    if (active && "categoryId" in target && active.categoryId === target.categoryId) return;
    runAction(() => postStart(target));
  }

  async function postStop(session: WorkSessionDTO, endTime?: string) {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    await notesInFlightRef.current;
    const body: { notes?: string; endTime?: string } = {};
    if (notesDirtyRef.current && notesSessionIdRef.current === session._id) body.notes = notesRef.current;
    if (endTime) body.endTime = endTime;
    await workApi(`/sessions/${session._id}/stop`, "POST", body);
    notesDirtyRef.current = false;
    setActive(null);
    applyServerNotes(null);
  }

  function stop() {
    if (!active) return;
    const session = active;
    runAction(() => postStop(session));
  }

  // Resolves the forgotten-timer sheet, then runs the start it interrupted.
  function resolveForgotten(endTime?: string) {
    if (!active) return;
    const session = active;
    const pending = pendingStartRef.current;
    pendingStartRef.current = null;
    setForgottenOpen(false);
    runAction(async () => {
      await postStop(session, endTime);
      if (pending) await postStart(pending);
    });
  }

  function dismissForgotten() {
    if (active) dismissedForgottenIdRef.current = active._id;
    pendingStartRef.current = null;
    setForgottenOpen(false);
  }

  return {
    categories,
    sessions,
    active,
    loading,
    error,
    now,
    notes,
    setNotes,
    forgottenOpen,
    start,
    stop,
    resolveForgotten,
    dismissForgotten,
    refresh,
  };
}
