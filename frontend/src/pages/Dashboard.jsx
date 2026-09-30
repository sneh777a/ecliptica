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

/** Local calendar date YYYY-MM-DD (avoids UTC off-by-one) */
function toLocalISO(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export default function Dashboard() {
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewDate, setViewDate] = useState(() => new Date());

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
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
        const [g, t] = await Promise.all([
          api.get("/goals/"),
          api.get("/goals/tasks"),
        ]);
        if (!cancelled) {
          setGoals(asArray(g.data));
          setTasks(asArray(t.data));
        }
      } catch (err) {
        if (!cancelled) {
          setError(formatApiError(err, "Could not load dashboard"));
          setGoals([]);
          setTasks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, token]);

  const today = useMemo(() => startOfDay(new Date()), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const todayStr = toLocalISO(today);
  const tomorrowStr = toLocalISO(tomorrow);

  const safeGoals = asArray(goals);
  const safeTasks = asArray(tasks);

  const todayTasks = safeTasks.filter((t) => {
    if (!t) return false;
    const dateStr = t.date ? String(t.date).slice(0, 10) : "";
    return dateStr === todayStr || (t.type === "daily" && !t.date);
  });

  const tomorrowTasks = safeTasks.filter((t) => {
    if (!t || !t.date) return false;
    return String(t.date).slice(0, 10) === tomorrowStr;
  });

  const nearDeadlines = useMemo(() => {
    const limit = addDays(today, 10);
    const items = [];

    safeGoals.forEach((g) => {
      if (!g || !g.deadline) return;
      const d = startOfDay(new Date(g.deadline));
      if (Number.isNaN(d.getTime())) return;
      if (d >= today && d <= limit) {
        items.push({
          id: `goal-${g.id}`,
          title: g.title || "Goal",
          daysLeft: Math.round((d - today) / 86400000),
        });
      }
    });

    safeTasks.forEach((t) => {
      if (!t || !t.date || t.done) return;
      const d = startOfDay(new Date(t.date));
      if (Number.isNaN(d.getTime())) return;
      if (d >= today && d <= limit) {
        items.push({
          id: `task-${t.id}`,
          title: t.text || "Task",
          daysLeft: Math.round((d - today) / 86400000),
        });
      }
    });

    items.sort((a, b) => a.daysLeft - b.daysLeft);
    return items.slice(0, 6);
  }, [safeGoals, safeTasks, today]);

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
    safeTasks.forEach((t) => {
      if (t && t.date) set.add(String(t.date).slice(0, 10));
    });
    return set;
  }, [safeTasks]);

  const toggleTask = async (id) => {
    try {
      await api.patch(`/goals/tasks/${id}/toggle`);
      const t = await api.get("/goals/tasks");
      setTasks(asArray(t.data));
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
    <div className="relative min-h-full overflow-hidden pb-10">
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-violet-600/15 blur-[110px]" />
      <div className="pointer-events-none absolute right-10 top-0 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-20 left-1/2 h-56 w-56 rounded-full bg-cyan-500/5 blur-[110px]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute left-[12%] top-[12%] h-1 w-1 rounded-full bg-violet-200/80 shadow-[0_0_12px_rgba(196,181,253,0.9)]" />
        <span className="absolute left-[42%] top-[6%] h-1.5 w-1.5 rounded-full bg-white/70 shadow-[0_0_14px_rgba(255,255,255,0.9)]" />
        <span className="absolute right-[18%] top-[10%] h-1 w-1 rounded-full bg-fuchsia-200/80 shadow-[0_0_14px_rgba(232,121,249,0.9)]" />
        <span className="absolute right-[8%] top-[42%] h-1.5 w-1.5 rounded-full bg-violet-200/70 shadow-[0_0_15px_rgba(196,181,253,0.8)]" />
        <span className="absolute left-[6%] bottom-[18%] h-1 w-1 rounded-full bg-cyan-200/60 shadow-[0_0_12px_rgba(103,232,249,0.7)]" />
      </div>

      <header className="relative mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium tracking-[0.22em] text-violet-300/65 uppercase">
            ✦ Your personal orbit
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {greet}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/40">
            A calm little space to see what matters today.
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-right backdrop-blur-xl">
          <p className="text-[10px] tracking-[0.18em] text-white/25 uppercase">Today</p>
          <p className="mt-1 text-sm font-medium text-white/75">
            {today.toLocaleDateString("en", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </header>

      {error ? (
        <div className="relative mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">
          {String(error)}
        </div>
      ) : null}

      <div className="relative grid grid-cols-1 gap-5 xl:grid-cols-[0.82fr_1.45fr_0.93fr]">
        <aside className="flex flex-col gap-5">
          <div className="relative overflow-hidden rounded-[28px] border border-violet-300/[0.12] bg-white/[0.045] p-5 shadow-[0_0_35px_rgba(139,92,246,0.08),0_18px_60px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium tracking-[0.18em] text-rose-300/60 uppercase">
                  Wellbeing
                </p>
                <h2 className="mt-1 text-base font-semibold text-white">Health</h2>
              </div>
              <Link
                to="/health"
                className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-2.5 py-1.5 text-xs text-white/40 hover:text-white/75"
              >
                Open
              </Link>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#0d1022]/55 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/45">Water</span>
                <span className="text-xs text-violet-200/60">0 / 8</span>
              </div>
              <div className="mt-3 flex gap-1.5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-8 flex-1 rounded-lg border border-violet-200/[0.10] bg-gradient-to-b from-violet-300/[0.10] to-white/[0.025] shadow-[inset_0_-5px_12px_rgba(139,92,246,0.06)]"
                  />
                ))}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5">
                <p className="text-[10px] text-white/30">Steps</p>
                <p className="mt-1.5 text-sm font-medium text-white/70">—</p>
                <p className="mt-1 text-[10px] text-white/25">of 10,000</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5">
                <p className="text-[10px] text-white/30">Sleep</p>
                <p className="mt-1.5 text-sm font-medium text-white/70">—</p>
                <p className="mt-1 text-[10px] text-white/25">of 8 hours</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-violet-200/[0.12] bg-gradient-to-br from-white/[0.065] via-white/[0.045] to-violet-500/[0.025] p-5 shadow-[0_0_32px_rgba(139,92,246,0.11),inset_0_1px_0_rgba(255,255,255,0.04),0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium tracking-[0.18em] text-amber-300/60 uppercase">
                  Money
                </p>
                <h2 className="mt-1 text-base font-semibold text-white">Finance</h2>
              </div>
              <Link
                to="/finance"
                className="rounded-xl border border-white/[0.07] bg-white/[0.035] px-2.5 py-1.5 text-xs text-white/40 hover:text-white/75"
              >
                Open
              </Link>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-[#0d1022]/55 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-white/40">Monthly budget</span>
                <span className="text-white/50">— / —</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full w-1/4 rounded-full bg-gradient-to-r from-violet-500/70 to-fuchsia-400/60" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5">
                <p className="text-[10px] text-white/30">Spent</p>
                <p className="mt-1.5 text-sm font-medium text-white/70">—</p>
              </div>
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5">
                <p className="text-[10px] text-white/30">Remaining</p>
                <p className="mt-1.5 text-sm font-medium text-emerald-300/70">—</p>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <ScheduleCard
            icon="☀"
            title="Today"
            dateLabel={today.toLocaleDateString("en", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
            tasks={todayTasks}
            onToggle={toggleTask}
            emptyText="Your day is open"
          />
          <ScheduleCard
            icon="☾"
            title="Tomorrow"
            dateLabel={tomorrow.toLocaleDateString("en", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
            tasks={tomorrowTasks}
            onToggle={toggleTask}
            emptyText="Nothing planned yet"
          />
        </div>

        <aside className="flex min-w-0 flex-col gap-5">
          <div className="rounded-[28px] border border-violet-200/[0.12] bg-gradient-to-br from-white/[0.065] via-white/[0.045] to-violet-500/[0.025] p-5 shadow-[0_0_32px_rgba(139,92,246,0.11),inset_0_1px_0_rgba(255,255,255,0.04),0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
                }
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-white/35 hover:bg-white/[0.08] hover:text-white"
              >
                ‹
              </button>
              <div className="text-center">
                <p className="text-[10px] tracking-[0.16em] text-violet-300/50 uppercase">Orbit</p>
                <h2 className="mt-0.5 text-sm font-semibold text-white drop-shadow-[0_0_10px_rgba(196,181,253,0.25)]">{calendar.label}</h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
                }
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-white/35 hover:bg-white/[0.08] hover:text-white"
              >
                ›
              </button>
            </div>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <div key={i} className="py-1 text-[10px] font-medium text-white/25">
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
                    className={`relative flex aspect-square items-center justify-center rounded-full text-xs ${
                      isToday
                        ? "bg-violet-500/85 font-semibold text-white shadow-[0_0_28px_rgba(139,92,246,0.65),0_0_8px_rgba(217,180,254,0.35)]"
                        : "text-white/45 hover:bg-white/[0.05]"
                    }`}
                  >
                    {d}
                    {hasDot && !isToday ? (
                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-violet-300/80" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-violet-200/[0.12] bg-gradient-to-br from-white/[0.065] via-white/[0.045] to-violet-500/[0.025] p-5 shadow-[0_0_32px_rgba(139,92,246,0.11),inset_0_1px_0_rgba(255,255,255,0.04),0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-[0.18em] text-violet-300/50 uppercase">Coming up</p>
                <h2 className="mt-1 text-base font-semibold text-white">Deadlines</h2>
              </div>
              <span className="rounded-full border border-violet-300/15 bg-violet-400/10 px-2.5 py-1 text-[10px] text-violet-200/65">
                under 10 days
              </span>
            </div>
            {nearDeadlines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.07] px-4 py-7 text-center">
                <div className="mb-2 text-xl text-white/15">✦</div>
                <p className="text-xs text-white/30">No deadlines nearby</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {nearDeadlines.map((e, idx) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.025] px-3 py-3"
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        e.daysLeft <= 2
                          ? "bg-rose-400"
                          : e.daysLeft <= 5
                            ? "bg-amber-400"
                            : idx % 2 === 0
                              ? "bg-violet-400"
                              : "bg-cyan-400"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-xs text-white/65">{e.title}</span>
                    <span className="shrink-0 text-[10px] text-white/30">{e.daysLeft}d</span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              to="/goals"
              className="mt-4 inline-flex text-xs text-violet-300/65 hover:text-violet-200"
            >
              View goals →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ScheduleCard({ icon, title, dateLabel, tasks, onToggle, emptyText }) {
  const list = asArray(tasks);

  return (
    <section className="relative flex min-h-[285px] flex-1 flex-col overflow-hidden rounded-[30px] border border-violet-200/[0.14] bg-gradient-to-br from-white/[0.075] via-white/[0.05] to-violet-500/[0.03] p-5 shadow-[0_0_42px_rgba(139,92,246,0.13),inset_0_1px_0_rgba(255,255,255,0.05),0_20px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-violet-300/10 bg-violet-500/10 text-lg text-violet-200">
            {icon}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-0.5 text-[11px] text-white/30">{dateLabel}</p>
          </div>
        </div>
        <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] text-white/30">
          {list.length} {list.length === 1 ? "task" : "tasks"}
        </span>
      </div>

      {list.length === 0 ? (
        <div className="relative flex flex-1 flex-col items-center justify-center rounded-[24px] border border-dashed border-violet-200/[0.10] bg-gradient-to-br from-violet-500/[0.035] to-white/[0.012] shadow-[inset_0_0_30px_rgba(139,92,246,0.035)] px-4 py-10 text-center">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/10 text-violet-300/50">
            ✦
          </div>
          <p className="text-sm text-white/35">{emptyText}</p>
          <Link to="/goals" className="mt-2 text-xs text-violet-300/60 hover:text-violet-200">
            Add something →
          </Link>
        </div>
      ) : (
        <ul className="relative space-y-2.5">
          {list.map((t, i) => (
            <li key={t.id ?? i}>
              <button
                type="button"
                onClick={() => onToggle(t.id)}
                className="group flex w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-[#101327]/70 text-left transition hover:border-violet-300/20 hover:bg-[#151934]"
              >
                <div className={`w-1 shrink-0 bg-gradient-to-b ${ACCENTS[i % ACCENTS.length]}`} />
                <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs ${
                      t.done
                        ? "border-violet-300/30 bg-violet-400/10 text-violet-200"
                        : "border-white/10 bg-white/[0.03] text-transparent"
                    }`}
                  >
                    {t.done ? "✓" : "•"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-white/30">{t.time || "Anytime"}</p>
                    <p
                      className={`mt-0.5 truncate text-sm font-medium ${
                        t.done ? "text-white/30 line-through" : "text-white/85"
                      }`}
                    >
                      {t.text || "Untitled"}
                    </p>
                  </div>
                  <span className="text-white/15 group-hover:text-violet-300/60">→</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
