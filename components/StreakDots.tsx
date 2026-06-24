import type { LogState } from "@/models/RoutineLog";

interface Props {
  logs: Array<{ date: string; state: LogState }>;
  dates: string[]; // 7 days oldest→newest
}

const DOT: Partial<Record<LogState, string>> = {
  done: "bg-olive",
  missed: "bg-burgundy",
  rest: "bg-blue-muted",
};

export default function StreakDots({ logs, dates }: Props) {
  const map = Object.fromEntries(logs.map((l) => [l.date, l.state]));
  return (
    <div className="flex items-center gap-[3px]">
      {dates.map((date) => {
        const state = map[date];
        return (
          <div
            key={date}
            className={`w-[5px] h-[5px] rounded-full flex-shrink-0 ${state ? DOT[state] : "bg-border"}`}
          />
        );
      })}
    </div>
  );
}
