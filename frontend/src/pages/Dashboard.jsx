import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_URL = "https://ecliptica-api.onrender.com";

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
  const todayTasks = tasks.filter(
    (t) => t.type === "daily" || (t.date && String(t.date).startsWith(todayStr))
  );
  const doneToday = todayTasks.filter((t) => t.done).length;
  const dayPct = todayTasks.length
    ? Math.round((doneToday / todayTasks.length) * 100)
    : 0;

  const activeGoals = goals.slice(0, 4);
  const avgGoalProgress =
    goals.length > 0
      ? Math.round(
          goals.reduce((s, g) => s + (Number(g.progress) || 0), 0) / goals.length
        )
      : 0;

  const nextTask = todayTasks.find((t) => !t.done);
  const hour = new Date().getHours();
  const greet = greetingForHour(hour);
  const dateLabel = new Date().toLocaleDateString("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

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
    <div className="relative space-y-8 pb-10">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-[100px]" />

      {/* Header */}
      <header className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium tracking-[0.22em] text-violet-300/55 uppercase">
            Your orbit
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {greet} <span className="text-violet-300">✦</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/35">
            {dateLabel} · a quiet overview of what is moving today.
          </p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-5 py-3.5 text-right backdrop-blur-xl">
          <p className="text-[10px] tracking-[0.18em] text-white/25 uppercase">Today</p>
          <p className="mt-1 text-sm text-white/70">
            {dayPct}% of tasks done
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">
          {String(error)}
        </div>
      )}

      {/* Summary cards */}
      <section className="grid gap-5 md:grid-cols-3">
        <div className="group relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-gradient-to-br from-emerald-400/15 to-cyan-400/5 bg-white/[0.035] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-violet-300/15">
          <div className="relative flex items-center justify-between">
            <span className="text-sm text-white/40">Today</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-violet-200/80">
              ✓
            </span>
          </div>
          <p className="relative mt-6 text-3xl font-semibold tracking-tight">
            {doneToday}/{todayTasks.length || 0}
          </p>
          <p className="relative mt-1 text-xs text-white/30">Tasks completed</p>
          <p className="relative mt-5 text-xs text-violet-200/65">✦ {dayPct}% done</p>
        </div>

        <div className="group relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-gradient-to-br from-violet-400/20 to-fuchsia-400/5 bg-white/[0.035] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-violet-300/15">
          <div className="relative flex items-center justify-between">
            <span className="text-sm text-white/40">Goals</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-violet-200/80">
              ◎
            </span>
          </div>
          <p className="relative mt-6 text-3xl font-semibold tracking-tight">{avgGoalProgress}%</p>
          <p className="relative mt-1 text-xs text-white/30">Average progress</p>
          <p className="relative mt-5 text-xs text-violet-200/65">
            ✦ {goals.length} active goal{goals.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="group relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-gradient-to-br from-amber-300/15 to-orange-400/5 bg-white/[0.035] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-violet-300/15">
          <div className="relative flex items-center justify-between">
            <span className="text-sm text-white/40">Next up</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-violet-200/80">
              →
            </span>
          </div>
          <p className="relative mt-6 text-xl font-semibold tracking-tight line-clamp-2">
            {nextTask?.text || "All clear"}
          </p>
          <p className="relative mt-1 text-xs text-white/30">
            {nextTask?.time || "No pending task"}
          </p>
          <p className="relative mt-5 text-xs text-violet-200/65">
            ✦ Focus on one thing
          </p>
        </div>
      </section>

      {/* Main grid: schedule + goals */}
      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.95fr]">
        {/* Today's tasks */}
        <div className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-6 backdrop-blur-xl sm:p-7">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium tracking-[0.2em] text-white/25 uppercase">
                Your day
              </p>
              <h2 className="mt-1 text-xl font-medium">Today's tasks</h2>
            </div>
            <Link
              to="/goals"
              className="rounded-full border border-violet-300/10 bg-violet-400/5 px-3 py-1.5 text-[11px] text-violet-200/60 hover:text-violet-200"
            >
              Open Goals →
            </Link>
          </div>

          {todayTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
              <p className="text-sm text-white/40">No tasks for today yet.</p>
              <Link
                to="/goals"
                className="mt-3 inline-block text-sm text-violet-300 hover:text-violet-200"
              >
                Add tasks on Goals →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {todayTasks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleTask(item.id)}
                  className={
                    "group flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition " +
                    (item.done
                      ? "border-white/[0.05] bg-white/[0.02] opacity-60"
                      : "border-violet-300/15 bg-violet-500/[0.07] hover:bg-violet-500/[0.1]")
                  }
                >
                  <span className="w-12 shrink-0 text-xs text-white/25">
                    {item.time || "—"}
                  </span>
                  <span
                    className={
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] " +
                      (item.done
                        ? "border-purple-500 bg-purple-600 text-white"
                        : "border-white/20")
                    }
                  >
                    {item.done ? "✓" : ""}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={
                        "text-sm " +
                        (item.done ? "line-through text-white/40" : "text-white/85")
                      }
                    >
                      {item.text}
                    </p>
                    <p className="mt-1 text-xs text-white/25">
                      {item.type || "daily"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active goals + AI strip */}
        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.09] to-fuchsia-500/[0.03] p-6 backdrop-blur-xl sm:p-7">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-400/10 blur-3xl" />
            <div className="relative mb-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium tracking-[0.2em] text-violet-200/45 uppercase">
                  Missions
                </p>
                <h2 className="mt-1 text-xl font-medium">Active goals</h2>
              </div>
              <Link to="/goals" className="text-xs text-violet-300/70 hover:text-violet-200">
                View all
              </Link>
            </div>

            {activeGoals.length === 0 ? (
              <p className="relative text-sm text-white/35">
                No goals yet.{" "}
                <Link to="/goals" className="text-violet-300 hover:text-violet-200">
                  Create one →
                </Link>
              </p>
            ) : (
              <div className="relative space-y-3">
                {activeGoals.map((g) => (
                  <div
                    key={g.id}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-3.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-white/85">{g.title}</p>
                      <span className="shrink-0 text-xs text-white/35">
                        {Math.round(Number(g.progress) || 0)}%
                      </span>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-violet-400"
                        style={{
                          width: `${Math.min(Number(g.progress) || 0, 100)}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-white/25 capitalize">
                      {g.type} · {g.completed_count}/{g.target_count}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI suggestion placeholder */}
          <div className="rounded-[28px] border border-violet-400/20 bg-violet-500/[0.06] p-6 backdrop-blur-xl">
            <p className="text-[10px] font-medium tracking-[0.2em] text-violet-200/50 uppercase">
              Assistant
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              {nextTask
                ? `Focus next on “${nextTask.text}”. Mark it done when finished — your day progress updates automatically.`
                : goals.length > 0
                  ? "All clear for today. Open Goals to plan tomorrow or break a mission into tasks."
                  : "Start by adding a goal. Ecliptica will help you turn it into daily steps."}
            </p>
            <Link
              to="/assistant"
              className="mt-4 inline-flex text-sm font-medium text-violet-300 hover:text-violet-200"
            >
              Open Assistant →
            </Link>
          </div>
        </div>
      </section>

      {/* Quick links */}
      <section className="grid gap-3 sm:grid-cols-3">
        <Link
          to="/goals"
          className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-5 py-4 text-sm text-white/65 transition hover:border-violet-300/20 hover:bg-white/[0.05]"
        >
          <span className="mr-2 text-violet-300">◎</span> Goals & schedule
        </Link>
        <Link
          to="/health"
          className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-5 py-4 text-sm text-white/65 transition hover:border-violet-300/20 hover:bg-white/[0.05]"
        >
          <span className="mr-2 text-violet-300">♡</span> Health habits
        </Link>
        <Link
          to="/finance"
          className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-5 py-4 text-sm text-white/65 transition hover:border-violet-300/20 hover:bg-white/[0.05]"
        >
          <span className="mr-2 text-violet-300">◈</span> Finance
        </Link>
      </section>

      <div className="pointer-events-none flex justify-center pt-1">
        <span className="text-[10px] tracking-[0.25em] text-white/15 uppercase">
          ✦ stay in your orbit ✦
        </span>
      </div>
    </div>
  );
}
