import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_URL = "https://ecliptica-api.onrender.com";

function ProgressRing({ value, size = 120 }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(value, 100) / 100) * c;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="url(#dashRing)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id="dashRing" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-semibold text-white">{value}%</span>
        <span className="text-[10px] uppercase tracking-wide text-white/40">Today</span>
      </div>
    </div>
  );
}

function getWeekDays() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // Mon=0
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    return {
      label,
      date: d.getDate(),
      iso,
      isToday: iso === now.toISOString().split("T")[0],
    };
  });
}

export default function Dashboard() {
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const token = localStorage.getItem("token");
  const api = useMemo(
    () =>
      axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${token}` },
      }),
    [token]
  );

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
          setGoals(g.data || []);
          setTasks(t.data || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.detail || "Could not load dashboard");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, token]);

  const todayStr = new Date().toISOString().split("T")[0];
  const week = useMemo(() => getWeekDays(), []);

  const tasksByDay = useMemo(() => {
    const map = {};
    week.forEach((d) => {
      map[d.iso] = tasks.filter(
        (t) =>
          (t.date && String(t.date).startsWith(d.iso)) ||
          (d.isToday && t.type === "daily" && !t.date)
      );
    });
    return map;
  }, [tasks, week]);

  const todayTasks = tasksByDay[todayStr] || [];
  const doneToday = todayTasks.filter((t) => t.done).length;
  const dayPct = todayTasks.length
    ? Math.round((doneToday / todayTasks.length) * 100)
    : 0;

  const avgGoalProgress =
    goals.length > 0
      ? Math.round(
          goals.reduce((s, g) => s + (Number(g.progress) || 0), 0) / goals.length
        )
      : 0;

  const filteredSchedule = todayTasks.filter((t) =>
    search.trim()
      ? String(t.text).toLowerCase().includes(search.toLowerCase())
      : true
  );

  const toggleTask = async (id) => {
    try {
      await api.patch(`/goals/tasks/${id}/toggle`);
      const t = await api.get("/goals/tasks");
      setTasks(t.data || []);
    } catch {
      setError("Could not update task");
    }
  };

  const monthLabel = new Date().toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-white/40">
        Loading your orbit…
      </div>
    );
  }

  return (
    <div className="relative pb-10">
      <div className="pointer-events-none absolute -right-16 -top-20 h-80 w-80 rounded-full bg-violet-600/15 blur-[110px]" />

      <div className="relative grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* ============ MAIN ============ */}
        <div className="space-y-6 min-w-0">
          {/* Header */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Your Productivity <span className="text-violet-300">✦</span>
              </h1>
              <p className="mt-1 text-sm text-white/40">
                Let's check your progress · {monthLabel}
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search anything…"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-white/25 focus:border-violet-400/40 focus:outline-none"
              />
            </div>
          </header>

          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">
              {String(error)}
            </div>
          )}

          {/* Top: week day cards + ring stats */}
          <section className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
            {/* Day strip */}
            <div className="space-y-3">
              {week.slice(0, 3).map((d) => {
                const dayTasks = tasksByDay[d.iso] || [];
                const done = dayTasks.filter((t) => t.done).length;
                const pct = dayTasks.length
                  ? Math.round((done / dayTasks.length) * 100)
                  : 0;
                const tones = d.isToday
                  ? "border-violet-400/30 bg-violet-500/15"
                  : "border-white/[0.08] bg-white/[0.04]";
                return (
                  <div
                    key={d.iso}
                    className={`flex items-center gap-4 rounded-2xl border px-4 py-3.5 backdrop-blur-xl ${tones}`}
                  >
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-white/[0.06]">
                      <span className="text-[10px] uppercase text-white/40">{d.label}</span>
                      <span className="text-lg font-semibold text-white">{d.date}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-white/70">
                          {d.isToday ? "Today" : "Progress"}
                        </span>
                        <span className="text-sm font-medium text-violet-200">{pct}%</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-2 flex gap-4 text-[11px] text-white/35">
                        <span>Tasks {done}/{dayTasks.length || 0}</span>
                        <span>Goals {goals.length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Circular stats */}
            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-6 backdrop-blur-xl">
              <p className="text-sm font-medium text-white/70">Statistics · {monthLabel.split(" ")[0]}</p>
              <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                <ProgressRing value={dayPct || avgGoalProgress} />
                <div className="w-full space-y-3">
                  <StatRow label="Tasks" value={`${dayPct}%`} bar={dayPct} color="bg-violet-500" />
                  <StatRow label="Goals" value={`${avgGoalProgress}%`} bar={avgGoalProgress} color="bg-fuchsia-500" />
                  <StatRow
                    label="Active"
                    value={`${goals.length}`}
                    bar={Math.min(goals.length * 20, 100)}
                    color="bg-indigo-400"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Bottom: activity timeline + schedule */}
          <section className="grid gap-5 lg:grid-cols-2">
            {/* Weekly activity */}
            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-6 backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-medium">Upcoming activity</h2>
                <Link to="/goals" className="text-xs text-violet-300/80 hover:text-violet-200">
                  Full calendar →
                </Link>
              </div>

              <div className="space-y-3">
                {week.map((d) => {
                  const dayTasks = tasksByDay[d.iso] || [];
                  const first = dayTasks[0];
                  return (
                    <div key={d.iso} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-xs text-white/35">{d.label}</span>
                      <div className="relative h-9 flex-1 overflow-hidden rounded-xl bg-white/[0.03] border border-white/[0.05]">
                        {first ? (
                          <div
                            className={`absolute top-1 bottom-1 left-2 right-8 flex items-center rounded-lg px-3 text-xs font-medium ${
                              d.isToday
                                ? "bg-violet-600/90 text-white"
                                : "bg-violet-500/40 text-violet-100"
                            }`}
                          >
                            <span className="truncate">{first.text}</span>
                          </div>
                        ) : (
                          <span className="absolute inset-0 flex items-center px-3 text-[11px] text-white/20">
                            —
                          </span>
                        )}
                      </div>
                      <span className="w-7 text-right text-xs text-white/30">{d.date}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Upcoming schedule */}
            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-6 backdrop-blur-xl">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-lg font-medium">Upcoming schedule</h2>
                <span className="text-[11px] text-white/30">Today</span>
              </div>

              {filteredSchedule.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
                  <p className="text-sm text-white/40">No tasks scheduled</p>
                  <Link to="/goals" className="mt-2 inline-block text-sm text-violet-300 hover:text-violet-200">
                    Add on Goals →
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {filteredSchedule.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => toggleTask(t.id)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3 text-left transition hover:bg-white/[0.06]"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-sm text-violet-200">
                          {t.done ? "✓" : "◎"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm ${
                              t.done ? "line-through text-white/35" : "text-white/85"
                            }`}
                          >
                            {t.text}
                          </p>
                          <p className="mt-0.5 text-[11px] text-white/30">
                            {t.done ? "Done" : "Working on"}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-white/35">
                          {t.time || "—"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                to="/goals"
                className="mt-5 flex w-full items-center justify-center rounded-2xl border border-violet-400/25 bg-violet-500/15 py-3 text-sm font-medium text-violet-200 transition hover:bg-violet-500/25"
              >
                See all activity
              </Link>
            </div>
          </section>
        </div>

        {/* ============ RIGHT PANEL ============ */}
        <aside className="space-y-5">
          {/* Profile card */}
          <div className="overflow-hidden rounded-[28px] border border-white/[0.1] bg-gradient-to-b from-violet-600/40 via-indigo-900/50 to-[#0b0b14] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/10 text-2xl text-violet-100 shadow-[0_0_30px_rgba(167,139,250,0.35)]">
                ✦
              </div>
              <p className="mt-4 text-lg font-semibold text-white">You</p>
              <p className="mt-1 text-xs text-white/45">Ecliptica · Personal OS</p>
              <Link
                to="/goals"
                className="mt-5 w-full rounded-2xl border border-white/15 bg-white/10 py-2.5 text-sm text-white/90 transition hover:bg-white/15"
              >
                Edit focus
              </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                Focus window
              </p>
              <div className="mt-3 flex items-center justify-between text-sm">
                <div>
                  <p className="text-white/35 text-[11px]">Start</p>
                  <p className="font-medium text-white">09:00</p>
                </div>
                <span className="text-white/20">→</span>
                <div className="text-right">
                  <p className="text-white/35 text-[11px]">End</p>
                  <p className="font-medium text-white">18:00</p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">Today</p>
              <p className="text-3xl font-semibold text-white">{dayPct}%</p>
              <p className="text-xs text-white/40">
                {doneToday} of {todayTasks.length} tasks complete
              </p>
            </div>
          </div>

          {/* Goals mini */}
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-5 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium text-white/80">Active goals</h3>
              <Link to="/goals" className="text-[11px] text-violet-300 hover:text-violet-200">
                View all
              </Link>
            </div>
            {goals.length === 0 ? (
              <p className="text-sm text-white/35">
                No goals yet.{" "}
                <Link to="/goals" className="text-violet-300">
                  Create one →
                </Link>
              </p>
            ) : (
              <ul className="space-y-3">
                {goals.slice(0, 4).map((g) => (
                  <li key={g.id}>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate text-white/75">{g.title}</span>
                      <span className="shrink-0 text-white/35">
                        {Math.round(Number(g.progress) || 0)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-violet-500"
                        style={{
                          width: `${Math.min(Number(g.progress) || 0, 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-1 gap-2">
            <Link
              to="/health"
              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-white/60 hover:bg-white/[0.06]"
            >
              ♡ Health habits
            </Link>
            <Link
              to="/finance"
              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm text-white/60 hover:bg-white/[0.06]"
            >
              ◈ Finance
            </Link>
            <Link
              to="/assistant"
              className="rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-200 hover:bg-violet-500/20"
            >
              ✧ Assistant
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatRow({ label, value, bar, color }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-white/40">{label}</span>
        <span className="text-white/70">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(bar, 100)}%` }} />
      </div>
    </div>
  );
}
