"use client";

import { useEffect, useState } from "react";
import { X, ChevronLeft } from "lucide-react";

interface Goal {
  _id: string;
  name: string;
  status: string;
}

interface Props {
  date: string;
  onClose: () => void;
}

type View = "goals" | "form";

export default function FABTaskSheet({ date, onClose }: Props) {
  const [view, setView] = useState<View>("goals");
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [taskName, setTaskName] = useState("");
  const [scheduledDate, setScheduledDate] = useState(date);
  const [estimatedMins, setEstimatedMins] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((data: Goal[]) => {
        setGoals(data.filter((g) => g.status === "active"));
        setLoading(false);
      });
  }, []);

  const selectGoal = (goal: Goal) => {
    setSelectedGoal(goal);
    setTaskName("");
    setScheduledDate(date);
    setEstimatedMins("");
    setError("");
    setView("form");
  };

  const addTask = async () => {
    if (!taskName.trim() || !selectedGoal) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/goals/${selectedGoal._id}/quick-task`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: taskName.trim(),
          scheduledDate: scheduledDate || undefined,
          estimatedMinutes: estimatedMins ? parseInt(estimatedMins) : undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to save task");
      onClose();
    } catch {
      setError("Couldn't save task. Try again.");
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
        <div className="w-full max-w-mobile bg-card rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: "80dvh" }}>

          {/* ── Goal list ─────────────────────────────────────────────────── */}
          {view === "goals" && (
            <>
              <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
                <h2 className="font-heading text-lg text-text">Add Task</h2>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-dim" aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <p className="font-mono text-[10px] text-dim uppercase tracking-widest px-5 pt-4 pb-2 flex-shrink-0">
                Choose a goal
              </p>
              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <p className="font-mono text-xs text-dim text-center py-8">Loading…</p>
                ) : goals.length === 0 ? (
                  <p className="font-mono text-xs text-dim text-center py-8">No active goals found.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {goals.map((goal) => (
                      <li key={goal._id}>
                        <button
                          onClick={() => selectGoal(goal)}
                          className="w-full flex items-center gap-3 px-5 py-4 hover:bg-card-hover active:bg-card-hover transition-colors text-left"
                        >
                          <span className="flex-1 font-body text-sm text-text">{goal.name}</span>
                          <ChevronLeft size={14} className="text-dim rotate-180 flex-shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {/* ── Task form ─────────────────────────────────────────────────── */}
          {view === "form" && selectedGoal && (
            <>
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
                <button
                  onClick={() => setView("goals")}
                  className="w-8 h-8 flex items-center justify-center text-dim hover:text-muted transition-colors flex-shrink-0"
                  aria-label="Back"
                >
                  <ChevronLeft size={18} />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="font-heading text-base text-text truncate">{selectedGoal.name}</h2>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-dim flex-shrink-0" aria-label="Close">
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 px-5 py-5 space-y-5">
                {/* Task name */}
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-dim uppercase tracking-widest">
                    Task name
                  </label>
                  <input
                    type="text"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    placeholder="What needs to get done?"
                    autoFocus
                    className="w-full bg-bg border border-border rounded-card px-3 py-3 font-body text-sm text-text placeholder:text-dim outline-none focus:border-border-light"
                  />
                </div>

                {/* Scheduled date */}
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-dim uppercase tracking-widest">
                    Scheduled date
                  </label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-bg border border-border rounded-card px-3 py-3 font-mono text-sm text-text outline-none focus:border-border-light"
                    style={{ colorScheme: "dark" }}
                  />
                </div>

                {/* Estimated minutes */}
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] text-dim uppercase tracking-widest">
                    Estimated minutes <span className="text-dim normal-case font-body">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={estimatedMins}
                    onChange={(e) => setEstimatedMins(e.target.value)}
                    placeholder="30"
                    className="w-full bg-bg border border-border rounded-card px-3 py-3 font-mono text-sm text-text placeholder:text-dim outline-none focus:border-border-light"
                  />
                </div>

                {error && (
                  <p className="font-mono text-xs text-burgundy-light">{error}</p>
                )}
              </div>

              <div className="px-5 pb-5 flex-shrink-0">
                <button
                  onClick={addTask}
                  disabled={!taskName.trim() || saving}
                  className="w-full bg-blue-muted text-text font-body font-medium py-3.5 rounded-card min-h-[48px] disabled:opacity-40 transition-opacity"
                >
                  {saving ? "Saving…" : "Add Task"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
