import { useState, useEffect, useMemo } from "react";
import axios from "axios";

const API_URL = "https://ecliptica-api.onrender.com";

const ACCENTS = {
  weekly: { bar: "bg-purple-500", ring: "stroke-purple-500", chip: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  monthly: { bar: "bg-cyan-500", ring: "stroke-cyan-500", chip: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30" },
  year: { bar: "bg-amber-500", ring: "stroke-amber-500", chip: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
};

function ProgressRing({ value }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(value, 100) / 100) * c;
  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1f1f2a" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#goalGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="goalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-white">{value}%</span>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide">Daily</span>
      </div>
    </div>
  );
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalType, setNewGoalType] = useState("weekly");
  const [newTaskText, setNewTaskText] = useState("");
  const [error, setError] = useState("");
  const [viewDate, setViewDate] = useState(() => new Date());

  const token = localStorage.getItem("token");
  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      const [g, t] = await Promise.all([api.get("/goals/"), api.get("/goals/tasks")]);
      setGoals(g.data);
      setTasks(t.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
      return;
    }
    loadData();
  }, []);

  const createGoal = async (e) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    try {
      await api.post("/goals/", {
        title: newGoalTitle,
        type: newGoalType,
        target_count: newGoalType === "weekly" ? 7 : newGoalType === "monthly" ? 30 : 12,
      });
      setNewGoalTitle("");
      loadData();
    } catch {
      setError("Failed to create goal");
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    try {
      await api.post("/goals/tasks", {
        text: newTaskText,
        type: "daily",
        date: new Date().toISOString().split("T")[0],
      });
      setNewTaskText("");
      loadData();
    } catch {
      setError("Failed to create task");
    }
  };

  const toggleTask = async (id) => {
    try {
      await api.patch(`/goals/tasks/${id}/toggle`);
      loadData();
    } catch {
      setError("Failed to update task");
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter(
    (t) => t.type === "daily" || (t.date && String(t.date).startsWith(todayStr))
  );
  const doneToday = todayTasks.filter((t) => t.done).length;
  const dayPct = todayTasks.length ? Math.round((doneToday / todayTasks.length) * 100) : 0;

  const calendar = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const first = new Date(y, m, 1);
    const startPad = (first.getDay() + 6) % 7; // Mon-first
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return { y, m, cells, label: first.toLocaleString("en", { month: "long", year: "numeric" }) };
  }, [viewDate]);

  const taskDates = useMemo(() => {
    const set = new Set();
    tasks.forEach((t) => {
      if (t.date) set.add(String(t.date).slice(0, 10));
    });
    return set;
  }, [tasks]);


  const yearlyGoals = goals.filter((g) => g.type === "year");
  const monthlyGoals = goals.filter((g) => g.type === "monthly");

  const nearDeadlines = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limit = new Date(today);
    limit.setDate(limit.getDate() + 10);
    const items = [];

    goals.forEach((g) => {
      if (!g || !g.deadline) return;
      const d = new Date(g.deadline);
      d.setHours(0, 0, 0, 0);
      if (d >= today && d <= limit) {
        items.push({
          id: `goal-${g.id}`,
          title: g.title || "Goal",
          daysLeft: Math.round((d - today) / 86400000),
        });
      }
    });

    tasks.forEach((t) => {
      if (!t || !t.date || t.done) return;
      const d = new Date(t.date);
      d.setHours(0, 0, 0, 0);
      if (d >= today && d <= limit) {
        items.push({
          id: `task-${t.id}`,
          title: t.text || "Task",
          daysLeft: Math.round((d - today) / 86400000),
        });
      }
    });

    return items.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 6);
  }, [goals, tasks]);

  const timelineStart = 8;
  const timelineEnd = 20;
  const timelineHours = Array.from(
    { length: timelineEnd - timelineStart + 1 },
    (_, i) => timelineStart + i
  );

  const parseTaskHour = (time) => {
    if (!time) return null;
    const value = String(time).trim().toUpperCase();
    const match = value.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/);
    if (!match) return null;
    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const meridiem = match[3];
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    if (!meridiem && hour < timelineStart) hour += 12;
    return hour + minute / 60;
  };

  const timedTodayTasks = todayTasks.filter((t) => {
    const h = parseTaskHour(t.time);
    return h !== null && h >= timelineStart && h <= timelineEnd;
  });

  const anytimeTodayTasks = todayTasks.filter(
    (t) => !timedTodayTasks.some((item) => item.id === t.id)
  );

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentTimePosition =
    currentHour >= timelineStart && currentHour <= timelineEnd
      ? ((currentHour - timelineStart) / (timelineEnd - timelineStart)) * 100
      : null;

  const goalCard = (title, subtitle, items, accent) => (
    <section className="relative overflow-hidden rounded-[28px] border border-violet-200/[0.12] bg-gradient-to-br from-white/[0.065] via-white/[0.045] to-violet-500/[0.025] p-5 shadow-[0_0_32px_rgba(139,92,246,0.10),inset_0_1px_0_rgba(255,255,255,0.04),0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
      <div className={`pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full blur-3xl ${accent}`} />
      <div className="relative mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium tracking-[0.18em] text-violet-300/55 uppercase">{subtitle}</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
        </div>
        <span className="rounded-full border border-violet-300/15 bg-violet-400/10 px-2.5 py-1 text-[10px] text-violet-200/65">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-violet-200/[0.09] bg-white/[0.018] px-3 py-6 text-center">
          <p className="text-xs text-white/30">No {title.toLowerCase()} yet</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((g) => (
            <div key={g.id} className="rounded-2xl border border-white/[0.06] bg-[#101327]/65 p-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm font-medium text-white/85">{g.title}</p>
                <span className="shrink-0 text-[10px] text-white/35">
                  {g.completed_count ?? 0}/{g.target_count ?? 0}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                  style={{ width: `${Math.min(g.progress || 0, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  if (loading) {
    return (
    <div className="relative min-h-full overflow-hidden pb-12">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-600/15 blur-[110px]" />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-20 left-1/2 h-72 w-72 rounded-full bg-cyan-500/5 blur-[120px]" />
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute left-[12%] top-[10%] h-1 w-1 rounded-full bg-violet-200/80 shadow-[0_0_12px_rgba(196,181,253,0.9)]" />
        <span className="absolute left-[48%] top-[4%] h-1.5 w-1.5 rounded-full bg-white/70 shadow-[0_0_14px_rgba(255,255,255,0.9)]" />
        <span className="absolute right-[12%] top-[14%] h-1 w-1 rounded-full bg-fuchsia-200/80 shadow-[0_0_14px_rgba(232,121,249,0.9)]" />
      </div>

      <header className="relative mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium tracking-[0.22em] text-violet-300/65 uppercase">✦ Goal orbit</p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Your goals</h1>
          <p className="mt-2 text-sm text-white/40">Big picture above. Today in motion below.</p>
        </div>
        <form onSubmit={createGoal} className="flex flex-wrap gap-2">
          <input
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            placeholder="New goal…"
            className="w-40 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-300/30"
          />
          <select
            value={newGoalType}
            onChange={(e) => setNewGoalType(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#111225] px-3 py-2.5 text-xs text-white/65 outline-none"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="year">Yearly</option>
          </select>
          <button type="submit" className="rounded-xl border border-violet-300/20 bg-violet-500/15 px-4 py-2.5 text-xs font-medium text-violet-100 shadow-[0_0_20px_rgba(139,92,246,0.10)] transition hover:bg-violet-500/25">
            Add goal
          </button>
        </form>
      </header>

      {error && (
        <div className="relative mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">
          {String(error)}
        </div>
      )}

      <div className="relative grid grid-cols-1 gap-5 xl:grid-cols-[0.85fr_1.35fr_0.95fr]">
        <aside className="flex flex-col gap-5">
          {goalCard("Yearly Goals", "Long horizon", yearlyGoals, "bg-violet-500/15")}
          {goalCard("Monthly Goals", "This month", monthlyGoals, "bg-fuchsia-500/12")}
        </aside>

        <div className="hidden min-h-[420px] xl:block" aria-hidden="true" />

        <aside className="flex flex-col gap-5">
          <div className="relative overflow-hidden rounded-[28px] border border-violet-200/[0.12] bg-gradient-to-br from-white/[0.065] via-white/[0.045] to-violet-500/[0.025] p-5 shadow-[0_0_32px_rgba(139,92,246,0.11),inset_0_1px_0_rgba(255,255,255,0.04),0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-24 w-24 rounded-full bg-fuchsia-500/10 blur-3xl" />
            <div className="relative mb-5 flex items-center justify-between">
              <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-white/35 transition hover:bg-white/[0.08] hover:text-white">‹</button>
              <div className="text-center">
                <p className="text-[10px] tracking-[0.16em] text-violet-300/50 uppercase">Orbit</p>
                <h2 className="mt-0.5 text-sm font-semibold text-white drop-shadow-[0_0_10px_rgba(196,181,253,0.25)]">{calendar.label}</h2>
              </div>
              <button type="button" onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-white/35 transition hover:bg-white/[0.08] hover:text-white">›</button>
            </div>
            <div className="mb-2 grid grid-cols-7 gap-1 text-center">
              {["S","M","T","W","T","F","S"].map((d, i) => <div key={i} className="py-1 text-[10px] font-medium text-white/25">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendar.cells.map((d, i) => {
                if (!d) return <div key={`e-${i}`} className="aspect-square" />;
                const iso = `${calendar.y}-${String(calendar.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const isToday = iso === todayStr;
                const hasDot = taskDates.has(iso);
                return (
                  <div key={iso} className={`relative flex aspect-square items-center justify-center rounded-full text-xs ${isToday ? "bg-violet-500/85 font-semibold text-white shadow-[0_0_28px_rgba(139,92,246,0.65),0_0_8px_rgba(217,180,254,0.35)]" : "text-white/45 hover:bg-white/[0.05]"}`}>
                    {d}
                    {hasDot && !isToday && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-violet-300/80" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[28px] border border-violet-200/[0.12] bg-gradient-to-br from-white/[0.065] via-white/[0.045] to-violet-500/[0.025] p-5 shadow-[0_0_32px_rgba(139,92,246,0.11),inset_0_1px_0_rgba(255,255,255,0.04),0_18px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-[0.18em] text-violet-300/50 uppercase">Coming up</p>
                <h2 className="mt-1 text-base font-semibold text-white">Deadlines</h2>
              </div>
              <span className="rounded-full border border-violet-300/15 bg-violet-400/10 px-2.5 py-1 text-[10px] text-violet-200/65">&lt; 10 days</span>
            </div>
            {nearDeadlines.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/[0.07] px-4 py-7 text-center">
                <div className="mb-2 text-xl text-white/15">✦</div>
                <p className="text-xs text-white/30">No deadlines nearby</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {nearDeadlines.map((e, idx) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.025] px-3 py-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${e.daysLeft <= 2 ? "bg-rose-400" : e.daysLeft <= 5 ? "bg-amber-400" : idx % 2 === 0 ? "bg-violet-400" : "bg-cyan-400"}`} />
                    <span className="min-w-0 flex-1 truncate text-xs text-white/65">{e.title}</span>
                    <span className="shrink-0 text-[10px] text-white/30">{e.daysLeft}d</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      <section className="relative mt-5 overflow-hidden rounded-[30px] border border-violet-200/[0.14] bg-gradient-to-br from-white/[0.07] via-white/[0.045] to-violet-500/[0.03] p-5 shadow-[0_0_42px_rgba(139,92,246,0.13),inset_0_1px_0_rgba(255,255,255,0.05),0_20px_70px_rgba(0,0,0,0.24)] backdrop-blur-2xl sm:p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-44 w-44 rounded-full bg-fuchsia-500/10 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 bottom-0 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] text-violet-300/60 uppercase">Daily timeline</p>
            <h2 className="mt-1 text-xl font-semibold text-white">Today</h2>
            <p className="mt-1 text-xs text-white/30">
              {new Date().toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" })}
            </p>
          </div>
          <form onSubmit={createTask} className="flex gap-2">
            <input
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a task for today…"
              className="w-52 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none placeholder:text-white/25 focus:border-violet-300/30"
            />
            <button type="submit" className="rounded-xl border border-violet-300/20 bg-violet-500/15 px-3.5 py-2.5 text-xs text-violet-100 transition hover:bg-violet-500/25">
              Add
            </button>
          </form>
        </div>

        <div className="relative overflow-x-auto pb-2">
          <div className="min-w-[820px]">
            <div className="relative ml-20 h-8">
              <div className="absolute inset-x-0 bottom-0 grid grid-cols-13">
                {timelineHours.map((h) => (
                  <div key={h} className="text-center text-[10px] text-white/30">
                    {h > 12 ? h - 12 : h}:00
                  </div>
                ))}
              </div>
            </div>

            <div className="relative min-h-[260px] rounded-2xl border border-white/[0.06] bg-[#0b0d1d]/70">
              <div className="absolute inset-0 ml-20 grid grid-cols-13">
                {timelineHours.map((h) => (
                  <div key={h} className="border-r border-white/[0.055] last:border-r-0" />
                ))}
              </div>

              <div className="absolute left-0 top-0 bottom-0 w-20 border-r border-white/[0.05] bg-white/[0.015]" />

              {timedTodayTasks.length === 0 ? (
                <div className="absolute inset-0 ml-20 flex items-center justify-center text-xs text-white/25">
                  No timed tasks yet — add a task with a time to place it on the orbit.
                </div>
              ) : (
                timedTodayTasks.map((task, index) => {
                  const hour = parseTaskHour(task.time);
                  const left = ((hour - timelineStart) / (timelineEnd - timelineStart)) * 100;
                  const colors = [
                    "from-fuchsia-500/90 to-pink-500/75",
                    "from-violet-500/90 to-indigo-500/75",
                    "from-cyan-500/90 to-blue-500/75",
                    "from-amber-400/90 to-orange-500/75",
                  ];
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className={`absolute z-20 w-36 -translate-y-1/2 rounded-xl border border-white/15 bg-gradient-to-r ${colors[index % colors.length]} px-3 py-2.5 text-left shadow-[0_0_24px_rgba(139,92,246,0.18)] transition hover:-translate-y-[55%] ${task.done ? "opacity-45" : ""}`}
                      style={{ left: `calc(80px + ${Math.min(Math.max(left, 0), 94)}% * (100% - 80px) / 100)`, top: `${52 + (index % 3) * 58}px` }}
                    >
                      <p className="text-[10px] text-white/70">{task.time}</p>
                      <p className={`mt-0.5 truncate text-xs font-medium text-white ${task.done ? "line-through" : ""}`}>{task.text}</p>
                    </button>
                  );
                })
              )}

              {currentTimePosition !== null && (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-30 w-px bg-fuchsia-300/70 shadow-[0_0_12px_rgba(232,121,249,0.8)]"
                  style={{ left: `calc(80px + ${currentTimePosition}% * (100% - 80px) / 100)` }}
                >
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-fuchsia-400/90 px-2 py-1 text-[9px] font-medium text-white shadow-[0_0_16px_rgba(232,121,249,0.45)]">
                    now
                  </span>
                </div>
              )}
            </div>

            {anytimeTodayTasks.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-[10px] tracking-[0.16em] text-white/25 uppercase">Anytime</span>
                {anytimeTodayTasks.map((task) => (
                  <button
                    key={`any-${task.id}`}
                    type="button"
                    onClick={() => toggleTask(task.id)}
                    className={`rounded-full border border-violet-300/15 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-100/75 shadow-[0_0_14px_rgba(139,92,246,0.08)] ${task.done ? "opacity-45 line-through" : ""}`}
                  >
                    {task.text}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );

}
