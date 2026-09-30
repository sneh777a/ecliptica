import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_URL = "https://ecliptica-api.onrender.com";

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

export default function Dashboard() {
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewDate, setViewDate] = useState(() => new Date());

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

  // Deadlines within next 10 days (goals with target or tasks with date)
  const nearDeadlines = useMemo(() => {
    const limit = addDays(today, 10);
    const items = [];

    goals.forEach((g) => {
      if (g.deadline) {
        const d = startOfDay(new Date(g.deadline));
        if (d >= today && d <= limit) {
          const daysLeft = Math.round((d - today) / (1000 * 60 * 60 * 24));
          items.push({
            id: `goal-${g.id}`,
            title: g.title,
            date: toISO(d),
            daysLeft,
            kind: "goal",
            progress: Math.round(Number(g.progress) || 0),
          });
        }
      }
    });

    tasks.forEach((t) => {
      if (!t.date || t.done) return;
      const d = startOfDay(new Date(t.date));
      if (d >= today && d <= limit) {
        const daysLeft = Math.round((d - today) / (1000 * 60 * 60 * 24));
        // skip pure today/tomorrow if we only want "deadlines" — still include for awareness
        items.push({
          id: `task-${t.id}`,
          title: t.text,
          date: toISO(d),
          daysLeft,
          kind: "task",
          time: t.time,
        });
      }
    });

    items.sort((a, b) => a.daysLeft - b.daysLeft);
    // unique-ish by title+date
    return items.slice(0, 12);
  }, [goals, tasks, today]);

  const calendar = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const first = new Date(y, m, 1);
    const startPad = (first.getDay() + 6) % 7;
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
    nearDeadlines.forEach((e) => set.add(e.date));
    return set;
  }, [tasks, nearDeadlines]);

  const toggleTask = async (id) => {
    try {
      await api.patch(`/goals/tasks/${id}/toggle`);
      const t = await api.get("/goals/tasks");
      setTasks(t.data || []);
    } catch {
      setError("Could not update task");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-white/40">
        Loading your orbit…
      </div>
    );
  }

  return (
    <div className="relative pb-10">
      <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-violet-600/12 blur-[100px]" />

      <header className="relative mb-8">
        <p className="mb-1 text-xs font-medium tracking-[0.2em] text-violet-300/50 uppercase">
          Your orbit
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Dashboard <span className="text-violet-300">✦</span>
        </h1>
        <p className="mt-1 text-sm text-white/35">
          Today, tomorrow, and deadlines within 10 days
        </p>
      </header>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">
          {String(error)}
        </div>
      )}

      {/*
        Layout:
        LEFT  → Calendar + near deadlines (<10 days)
        RIGHT → Today schedule + Tomorrow schedule
      */}
      <div className="relative grid gap-6 xl:grid-cols-12">
        {/* ===== LEFT ===== */}
        <div className="xl:col-span-5 space-y-5">
          {/* Calendar */}
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-5 sm:p-6 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
                }
                className="rounded-xl px-2 py-1 text-white/40 hover:bg-white/5 hover:text-white"
              >
                ‹
              </button>
              <h2 className="text-sm font-semibold text-white">{calendar.label}</h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewDate(new Date())}
                  className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/40 hover:border-violet-400/40 hover:text-violet-200"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
                  }
                  className="rounded-xl px-2 py-1 text-white/40 hover:bg-white/5 hover:text-white"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1 text-center">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="py-1 text-[10px] uppercase text-white/30">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendar.cells.map((d, i) => {
                if (!d) return <div key={`e-${i}`} />;
                const iso = `${calendar.y}-${String(calendar.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const isToday = iso === todayStr;
                const hasEvent = taskDates.has(iso);
                return (
                  <div
                    key={iso}
                    className={`relative flex aspect-square items-center justify-center rounded-xl text-sm ${
                      isToday
                        ? "bg-violet-600 font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.35)]"
                        : "text-white/60 hover:bg-white/5"
                    }`}
                  >
                    {d}
                    {hasEvent && !isToday && (
                      <span className="absolute bottom-1 h-1 w-1 rounded-full bg-violet-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Near deadlines < 10 days */}
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-5 sm:p-6 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/30">
                  Coming up
                </p>
                <h2 className="mt-1 text-lg font-medium text-white">
                  Deadlines · next 10 days
                </h2>
              </div>
              <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200/70">
                {nearDeadlines.length}
              </span>
            </div>

            {nearDeadlines.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/35">
                No deadlines in the next 10 days
              </p>
            ) : (
              <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {nearDeadlines.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3.5 py-3"
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-center ${
                        e.daysLeft <= 2
                          ? "bg-rose-500/15 text-rose-200"
                          : e.daysLeft <= 5
                            ? "bg-amber-500/15 text-amber-200"
                            : "bg-violet-500/15 text-violet-200"
                      }`}
                    >
                      <span className="text-sm font-semibold leading-none">{e.daysLeft}</span>
                      <span className="text-[9px] opacity-70">d</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white/85">{e.title}</p>
                      <p className="mt-0.5 text-[11px] text-white/30">
                        {e.kind === "goal" ? "Goal" : "Task"}
                        {e.time ? ` · ${e.time}` : ""} · {e.date}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ===== RIGHT ===== */}
        <div className="xl:col-span-7 space-y-5">
          {/* Today */}
          <SchedulePanel
            title="Today"
            subtitle={today.toLocaleDateString("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            tasks={todayTasks}
            emptyHint="Nothing planned for today"
            onToggle={toggleTask}
            accent="today"
          />

          {/* Tomorrow */}
          <SchedulePanel
            title="Tomorrow"
            subtitle={tomorrow.toLocaleDateString("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            tasks={tomorrowTasks}
            emptyHint="Nothing planned for tomorrow yet"
            onToggle={toggleTask}
            accent="tomorrow"
          />

          <div className="flex flex-wrap gap-3">
            <Link
              to="/goals"
              className="rounded-2xl border border-violet-400/25 bg-violet-500/15 px-5 py-3 text-sm font-medium text-violet-200 hover:bg-violet-500/25"
            >
              Manage goals & tasks →
            </Link>
            <Link
              to="/assistant"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/60 hover:bg-white/[0.07]"
            >
              Ask Assistant
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function SchedulePanel({ title, subtitle, tasks, emptyHint, onToggle, accent }) {
  const done = tasks.filter((t) => t.done).length;
  const isToday = accent === "today";

  return (
    <div
      className={`rounded-[28px] border p-5 sm:p-6 backdrop-blur-xl ${
        isToday
          ? "border-violet-400/20 bg-violet-500/[0.07]"
          : "border-white/[0.08] bg-white/[0.035]"
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-medium text-white">{title}</h2>
          <p className="mt-1 text-sm text-white/35">{subtitle}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/40">
          {done}/{tasks.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center">
          <p className="text-sm text-white/35">{emptyHint}</p>
          <Link
            to="/goals"
            className="mt-2 inline-block text-sm text-violet-300 hover:text-violet-200"
          >
            Add on Goals →
          </Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {tasks.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onToggle(t.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-black/20 px-3.5 py-3 text-left transition hover:bg-white/[0.05]"
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] ${
                    t.done
                      ? "border-violet-500 bg-violet-600 text-white"
                      : "border-white/25"
                  }`}
                >
                  {t.done ? "✓" : ""}
                </span>
                <span className="w-14 shrink-0 text-xs text-violet-200/70">
                  {t.time || "—"}
                </span>
                <span
                  className={`min-w-0 flex-1 text-sm ${
                    t.done ? "line-through text-white/35" : "text-white/85"
                  }`}
                >
                  {t.text}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
