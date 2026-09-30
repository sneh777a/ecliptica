import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { createApi, formatApiError } from "../api";

const ACCENTS = [
  "from-fuchsia-500 to-pink-500",
  "from-violet-500 to-indigo-500",
  "from-cyan-500 to-blue-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toISO(d) {
  return d.toISOString().split("T")[0];
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function greetingForHour(h) {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewDate, setViewDate] = useState(() => new Date());

  const token = localStorage.getItem("token");
  const api = useMemo(() => createApi(token), [token]);

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const [g, t] = await Promise.all([api.get("/goals/"), api.get("/goals/tasks")]);
        if (!cancelled) {
          setGoals(g.data || []);
          setTasks(t.data || []);
        }
      } catch (err) {
        if (!cancelled) setError(formatApiError(err, "Could not load dashboard"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, token]);

  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const todayStr = toISO(today);
  const tomorrowStr = toISO(tomorrow);

  const todayTasks = tasks.filter(
    (t) =>
      (t.date && String(t.date).startsWith(todayStr)) ||
      (t.type === "daily" && !t.date)
  );
  const tomorrowTasks = tasks.filter(
    (t) => t.date && String(t.date).startsWith(tomorrowStr)
  );

  const nearDeadlines = useMemo(() => {
    const limit = addDays(today, 10);
    const items = [];
    goals.forEach((g) => {
      if (!g.deadline) return;
      const d = startOfDay(new Date(g.deadline));
      if (Number.isNaN(d.getTime())) return;
      if (d >= today && d <= limit) {
        items.push({
          id: `goal-${g.id}`,
          title: g.title,
          daysLeft: Math.round((d - today) / 86400000),
        });
      }
    });
    tasks.forEach((t) => {
      if (!t.date || t.done) return;
      const d = startOfDay(new Date(t.date));
      if (Number.isNaN(d.getTime())) return;
      if (d >= today && d <= limit) {
        items.push({
          id: `task-${t.id}`,
          title: t.text,
          daysLeft: Math.round((d - today) / 86400000),
        });
      }
    });
    items.sort((a, b) => a.daysLeft - b.daysLeft);
    return items.slice(0, 6);
  }, [goals, tasks, today]);

  const calendar = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const first = new Date(y, m, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return {
      y,
      m,
      cells,
      label: first.toLocaleString("en", { month: "long", year: "numeric" }),
    };
  }, [viewDate]);

  const taskDates = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.date) set.add(String(t.date).slice(0, 10));
    });
    return set;
  }, [tasks]);

  const toggleTask = async (id) => {
    try {
      await api.patch(`/goals/tasks/${id}/toggle`);
      const t = await api.get("/goals/tasks");
      setTasks(t.data || []);
    } catch (err) {
      setError(formatApiError(err, "Could not update task"));
    }
  };

  const hour = new Date().getHours();
  const greet = greetingForHour(hour);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-white/40">
        Loading your orbit…
      </div>
    );
  }

  return (
    <div className="relative pb-8">
      <div className="pointer-events-none absolute -right-10 top-0 h-64 w-64 rounded-full bg-violet-600/20 blur-[100px]" />
      <div className="pointer-events-none absolute left-1/4 top-48 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-[80px]" />

      <header className="relative mb-8">
        <p className="mb-1 flex items-center gap-2 text-sm text-violet-300/80">
          <span>✦</span> {greet},
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Ready to make today count?
        </h1>
        <p className="mt-2 text-sm text-white/40">Your dreams don't work unless you do.</p>
      </header>

      {error && (
        <div className="relative mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">
          {error}
        </div>
      )}

      <div className="relative grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.3fr_0.95fr]">
        <div className="flex flex-col gap-5">
          <div className="rounded-3xl border border-white/10 bg-[#12122a]/80 p-5 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="text-rose-300">♡</span> Health & Wellness
              </h3>
              <Link to="/health" className="text-xs text-violet-300/70 hover:text-violet-200">
                Open →
              </Link>
            </div>
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-white/45">💧 Water Intake</span>
                <span className="text-white/60">0 / 8 glasses</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-0 rounded-full bg-gradient-to-r from-sky-400 to-blue-500" />
              </div>
              <div className="mt-3 flex gap-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-7 flex-1 rounded-md border border-white/10 bg-white/[0.04]"
                    title="Track on Health page"
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-[11px] text-white/40">👟 Steps</p>
                <p className="mt-1 text-sm font-medium text-white/80">— / 10,000</p>
                <div className="mt-2 h-1 rounded-full bg-white/10">
                  <div className="h-full w-0 rounded-full bg-cyan-400" />
                </div>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-[11px] text-white/40">☾ Sleep</p>
                <p className="mt-1 text-sm font-medium text-white/80">— / 8h</p>
                <div className="mt-2 h-1 rounded-full bg-white/10">
                  <div className="h-full w-0 rounded-full bg-indigo-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#12122a]/80 p-5 backdrop-blur-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="text-amber-300">◈</span> Finance
              </h3>
              <Link to="/finance" className="text-xs text-violet-300/70 hover:text-violet-200">
                Open →
              </Link>
            </div>
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-white/45">Monthly Budget</span>
                <span className="text-white/60">— / —</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-0 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-[11px] text-white/40">Total Spending</p>
                <p className="mt-1 text-lg font-semibold text-white/85">—</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3">
                <p className="text-[11px] text-white/40">Remaining</p>
                <p className="mt-1 text-lg font-semibold text-emerald-300/90">—</p>
              </div>
            </div>
            <p className="mt-4 text-center text-[11px] text-white/25">
              Connect numbers on the Finance page
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <ScheduleCard
            icon="☀"
            title="Today's Schedule"
            dateLabel={today.toLocaleDateString("en", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            tasks={todayTasks}
            onToggle={toggleTask}
            emptyText="No plans for today yet"
          />
          <ScheduleCard
            icon="☾"
            title="Tomorrow's Schedule"
            dateLabel={tomorrow.toLocaleDateString("en", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            tasks={tomorrowTasks}
            onToggle={toggleTask}
            emptyText="Nothing scheduled for tomorrow"
          />
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-3xl border border-white/10 bg-[#12122a]/80 p-5 shadow-[0_0_40px_rgba(88,28,135,0.15)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
                }
                className="rounded-lg px-2 py-1 text-white/40 hover:bg-white/5 hover:text-white"
              >
                ‹
              </button>
              <h3 className="text-sm font-semibold text-white">{calendar.label}</h3>
              <button
                type="button"
                onClick={() =>
                  setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
                }
                className="rounded-lg px-2 py-1 text-white/40 hover:bg-white/5 hover:text-white"
              >
                ›
              </button>
            </div>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-1 text-[10px] font-medium text-white/30">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendar.cells.map((d, i) => {
                if (!d) return <div key={`e-${i}`} className="aspect-square" />;
                const iso = `${calendar.y}-${String(calendar.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const isToday = iso === todayStr;
                const hasDot = taskDates.has(iso);
                return (
                  <div
                    key={iso}
                    className={`relative flex aspect-square items-center justify-center rounded-full text-sm transition ${
                      isToday
                        ? "bg-violet-500 font-semibold text-white shadow-[0_0_18px_rgba(139,92,246,0.55)]"
                        : "text-white/55 hover:bg-white/5"
                    }`}
                  >
                    {d}
                    {hasDot && !isToday && (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-violet-400" />
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-5 text-center text-xs leading-relaxed text-violet-200/50">
              ✦ A little progress each day adds up to big results
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#12122a]/80 p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="text-violet-300">◷</span> Upcoming Deadlines
              </h3>
              <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-medium text-violet-200">
                &lt; 10 days
              </span>
            </div>
            {nearDeadlines.length === 0 ? (
              <p className="py-4 text-center text-sm text-white/30">None in the next 10 days</p>
            ) : (
              <ul className="space-y-2">
                {nearDeadlines.map((e, idx) => {
                  const dot =
                    e.daysLeft <= 2
                      ? "bg-rose-400"
                      : e.daysLeft <= 5
                        ? "bg-amber-400"
                        : idx % 2 === 0
                          ? "bg-violet-400"
                          : "bg-cyan-400";
                  return (
                    <li
                      key={e.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                        <span className="truncate text-sm text-white/80">{e.title}</span>
                      </div>
                      <span className="shrink-0 text-xs text-white/35">{e.daysLeft}d</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link to="/goals" className="mt-3 inline-block text-xs text-violet-300 hover:text-violet-200">
              View all →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({ icon, title, dateLabel, tasks, onToggle, emptyText }) {
  return (
    <div className="flex flex-1 flex-col rounded-3xl border border-white/10 bg-[#12122a]/80 p-5 shadow-[0_0_40px_rgba(88,28,135,0.12)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <span className="text-violet-300">{icon}</span> {title}
        </h2>
        <span className="shrink-0 text-xs text-white/35">{dateLabel}</span>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
          <p className="text-sm text-white/30">{emptyText}</p>
          <Link to="/goals" className="mt-2 text-sm text-violet-300 hover:text-violet-200">
            Add on Goals →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {tasks.map((t, i) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onToggle(t.id)}
                className="group flex w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-[#1a1a32]/90 text-left transition hover:border-violet-400/25 hover:bg-[#1e1e3a]"
              >
                <div className={`w-1.5 shrink-0 bg-gradient-to-b ${ACCENTS[i % ACCENTS.length]}`} />
                <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white/40">{t.time || "Anytime"}</p>
                    <p
                      className={`mt-0.5 truncate text-sm font-medium ${
                        t.done ? "line-through text-white/35" : "text-white/90"
                      }`}
                    >
                      {t.text}
                    </p>
                  </div>
                  <span className="shrink-0 text-white/25 group-hover:text-violet-300">
                    {t.done ? "✓" : "›"}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
