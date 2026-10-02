import { useState, useEffect, useMemo } from "react";
import axios from "axios";

const API_URL = "https://ecliptica-api.onrender.com";

const TYPE_LABEL = {
  year: "Yearly",
  monthly: "Monthly",
  weekly: "Weekly",
};

const TYPE_CHIP = {
  year: "bg-amber-500/15 text-amber-200/80 border-amber-400/25",
  monthly: "bg-cyan-500/15 text-cyan-200/80 border-cyan-400/25",
  weekly: "bg-violet-500/15 text-violet-200/80 border-violet-400/25",
};

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalType, setNewGoalType] = useState("monthly");
  const [newTaskText, setNewTaskText] = useState("");
  const [error, setError] = useState("");
  const [viewDate, setViewDate] = useState(() => new Date());
  const [expandedId, setExpandedId] = useState(null);
  const [stepDraft, setStepDraft] = useState({}); // goalId -> text
  const [stepBusy, setStepBusy] = useState(null);

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
      setGoals(Array.isArray(g.data) ? g.data : []);
      setTasks(Array.isArray(t.data) ? t.data : []);
    } catch (err) {
      const d = err.response?.data?.detail;
      setError(typeof d === "string" ? d : "Failed to load");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createGoal = async (e) => {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    try {
      const res = await api.post("/goals/", {
        title: newGoalTitle.trim(),
        type: newGoalType,
        target_count: 0,
      });
      setNewGoalTitle("");
      await loadData();
      if (res.data?.id) setExpandedId(res.data.id);
    } catch {
      setError("Failed to create goal");
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    try {
      const y = new Date().getFullYear();
      const m = String(new Date().getMonth() + 1).padStart(2, "0");
      const d = String(new Date().getDate()).padStart(2, "0");
      await api.post("/goals/tasks", {
        text: newTaskText.trim(),
        type: "daily",
        date: `${y}-${m}-${d}`,
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
      setError("Failed to update");
    }
  };

  const addStep = async (goalId) => {
    const text = (stepDraft[goalId] || "").trim();
    if (!text) return;
    try {
      setStepBusy(goalId);
      await api.post(`/goals/${goalId}/steps`, { text });
      setStepDraft((prev) => ({ ...prev, [goalId]: "" }));
      await loadData();
    } catch {
      setError("Failed to add step");
    } finally {
      setStepBusy(null);
    }
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const todayTasks = tasks.filter(
    (t) =>
      t.type === "daily" ||
      (t.date && String(t.date).startsWith(todayStr))
  );

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

  const yearlyGoals = goals.filter((g) => g.type === "year");
  const monthlyGoals = goals.filter((g) => g.type === "monthly");
  const weeklyGoals = goals.filter((g) => g.type === "weekly");
  // Center: long-horizon missions first, then weekly
  const activeMissions = [...yearlyGoals, ...monthlyGoals, ...weeklyGoals];

  const nearDeadlines = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const limit = new Date(start);
    limit.setDate(limit.getDate() + 10);
    const items = [];
    goals.forEach((g) => {
      if (!g?.deadline) return;
      const d = new Date(g.deadline);
      d.setHours(0, 0, 0, 0);
      if (d >= start && d <= limit) {
        items.push({
          id: `goal-${g.id}`,
          title: g.title || "Goal",
          daysLeft: Math.round((d - start) / 86400000),
        });
      }
    });
    return items.sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 6);
  }, [goals]);

  const stepsOf = (goal) => {
    const list = Array.isArray(goal.tasks) ? goal.tasks : [];
    return list.filter((t) => t.type === "step" || t.goal_id === goal.id);
  };

  const renderMission = (g) => {
    const steps = stepsOf(g);
    const done = steps.filter((s) => s.done).length;
    const total = steps.length;
    const pct =
      total > 0 ? Math.round((done / total) * 100) : Math.round(g.progress || 0);
    const open = expandedId === g.id;

    return (
      <div
        key={g.id}
        className="rounded-2xl border border-white/[0.07] bg-[#101327]/70 p-4 transition hover:border-violet-300/20"
      >
        <button
          type="button"
          onClick={() => setExpandedId(open ? null : g.id)}
          className="flex w-full items-start gap-3 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] ${TYPE_CHIP[g.type] || TYPE_CHIP.weekly}`}
              >
                {TYPE_LABEL[g.type] || g.type}
              </span>
              <span className="text-[10px] text-white/30">
                {total ? `${done}/${total} steps` : "No steps yet"}
              </span>
            </div>
            <p className="mt-1.5 text-sm font-medium text-white/90">{g.title}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all duration-500"
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-white/35">{pct}% of path complete</p>
          </div>
          <span className="shrink-0 text-xs text-white/30">{open ? "▾" : "▸"}</span>
        </button>

        {open && (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="mb-3 text-[10px] font-medium tracking-[0.16em] text-violet-300/50 uppercase">
              Path to this goal
            </p>

            {steps.length === 0 ? (
              <p className="mb-3 text-xs text-white/30">
                Add the steps that get you there — for a yearly goal, think months;
                for monthly, think weeks or concrete milestones.
              </p>
            ) : (
              <ol className="mb-3 space-y-2">
                {steps.map((s, idx) => (
                  <li key={s.id} className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggleTask(s.id)}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] transition ${
                        s.done
                          ? "border-violet-400/50 bg-violet-500/30 text-white"
                          : "border-white/15 bg-white/[0.03] text-white/40 hover:border-violet-300/40"
                      }`}
                      title={s.done ? "Mark incomplete" : "Mark done"}
                    >
                      {s.done ? "✓" : idx + 1}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm ${
                          s.done ? "text-white/40 line-through" : "text-white/80"
                        }`}
                      >
                        {s.text}
                      </p>
                      {idx < steps.length - 1 ? (
                        <div className="ml-2.5 mt-1 h-3 w-px bg-white/10" />
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            )}

            <div className="flex gap-2">
              <input
                value={stepDraft[g.id] || ""}
                onChange={(e) =>
                  setStepDraft((prev) => ({ ...prev, [g.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addStep(g.id);
                  }
                }}
                placeholder={
                  g.type === "year"
                    ? "e.g. Finish Unit I by March…"
                    : g.type === "monthly"
                      ? "e.g. Complete 2 past papers this week…"
                      : "Next step…"
                }
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-violet-300/30"
              />
              <button
                type="button"
                disabled={stepBusy === g.id}
                onClick={() => addStep(g.id)}
                className="rounded-xl border border-violet-300/20 bg-violet-500/15 px-3 py-2 text-xs text-violet-100 hover:bg-violet-500/25 disabled:opacity-50"
              >
                {stepBusy === g.id ? "…" : "Add step"}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-white/40">
        Loading goals…
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden pb-12">
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-violet-600/15 blur-[110px]" />
      <div className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-fuchsia-500/10 blur-[120px]" />

      <header className="relative mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium tracking-[0.22em] text-violet-300/65 uppercase">
            ✦ Goal orbit
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Your goals
          </h1>
          <p className="mt-2 text-sm text-white/40">
            Open a goal to see — and build — the steps on the path.
          </p>
        </div>
        <form
          onSubmit={createGoal}
          className="flex w-full flex-wrap gap-2 xl:w-auto xl:justify-end"
        >
          <input
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            placeholder="New goal…"
            className="w-44 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-300/30"
          />
          <select
            value={newGoalType}
            onChange={(e) => setNewGoalType(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#111225] px-3 py-2.5 text-xs text-white/65 outline-none"
          >
            <option value="year">Yearly</option>
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
          <button
            type="submit"
            className="rounded-xl border border-violet-300/20 bg-violet-500/15 px-4 py-2.5 text-xs font-medium text-violet-100 transition hover:bg-violet-500/25"
          >
            Add goal
          </button>
        </form>
      </header>

      {error ? (
        <div className="relative mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">
          {String(error)}
        </div>
      ) : null}

      <div className="relative grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.15fr_0.9fr]">
        {/* Left: summary lists */}
        <aside className="flex flex-col gap-5">
          <section className="rounded-[28px] border border-violet-200/[0.12] bg-white/[0.045] p-5 backdrop-blur-2xl">
            <p className="text-[10px] tracking-[0.18em] text-violet-300/50 uppercase">
              Long horizon
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Yearly</h2>
            <p className="mt-1 text-[11px] text-white/30">
              Big outcomes — break into steps when you open them.
            </p>
            <div className="mt-4 space-y-2">
              {yearlyGoals.length === 0 ? (
                <p className="text-xs text-white/25">No yearly goals yet</p>
              ) : (
                yearlyGoals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setExpandedId(g.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5 text-left hover:border-violet-300/20"
                  >
                    <span className="truncate text-sm text-white/80">{g.title}</span>
                    <span className="shrink-0 text-[10px] text-white/35">
                      {Math.round(g.progress || 0)}%
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-violet-200/[0.12] bg-white/[0.045] p-5 backdrop-blur-2xl">
            <p className="text-[10px] tracking-[0.18em] text-cyan-300/50 uppercase">
              This orbit
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Monthly</h2>
            <p className="mt-1 text-[11px] text-white/30">
              Month targets — steps can be weekly milestones.
            </p>
            <div className="mt-4 space-y-2">
              {monthlyGoals.length === 0 ? (
                <p className="text-xs text-white/25">No monthly goals yet</p>
              ) : (
                monthlyGoals.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setExpandedId(g.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5 text-left hover:border-cyan-300/20"
                  >
                    <span className="truncate text-sm text-white/80">{g.title}</span>
                    <span className="shrink-0 text-[10px] text-white/35">
                      {Math.round(g.progress || 0)}%
                    </span>
                  </button>
                ))
              )}
            </div>
          </section>
        </aside>

        {/* Center: active missions with step paths */}
        <section className="rounded-[28px] border border-violet-200/[0.14] bg-gradient-to-br from-white/[0.07] via-white/[0.04] to-violet-500/[0.03] p-5 backdrop-blur-2xl sm:p-6">
          <div className="mb-5">
            <p className="text-[10px] tracking-[0.18em] text-violet-300/55 uppercase">
              Active missions
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">Path & progress</h2>
            <p className="mt-1 text-xs text-white/35">
              Click a goal → see the steps → check them off as you go.
            </p>
          </div>

          {activeMissions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.08] px-4 py-12 text-center">
              <p className="text-sm text-white/35">No goals yet</p>
              <p className="mt-1 text-xs text-white/25">
                Add a yearly or monthly goal above, then open it and add steps.
              </p>
            </div>
          ) : (
            <div className="space-y-3">{activeMissions.map(renderMission)}</div>
          )}
        </section>

        {/* Right: calendar + deadlines */}
        <aside className="flex flex-col gap-5">
          <div className="rounded-[28px] border border-violet-200/[0.12] bg-white/[0.045] p-5 backdrop-blur-2xl">
            <div className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setViewDate(
                    new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-white/35 hover:text-white"
              >
                ‹
              </button>
              <div className="text-center">
                <p className="text-[10px] tracking-[0.16em] text-violet-300/50 uppercase">
                  Orbit
                </p>
                <h2 className="mt-0.5 text-sm font-semibold text-white">
                  {calendar.label}
                </h2>
              </div>
              <button
                type="button"
                onClick={() =>
                  setViewDate(
                    new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                  )
                }
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] text-white/35 hover:text-white"
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
                        ? "bg-violet-500/85 font-semibold text-white shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                        : "text-white/45"
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

          <div className="rounded-[28px] border border-violet-200/[0.12] bg-white/[0.045] p-5 backdrop-blur-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-[0.18em] text-violet-300/50 uppercase">
                  Coming up
                </p>
                <h2 className="mt-1 text-base font-semibold text-white">Deadlines</h2>
              </div>
              <span className="rounded-full border border-violet-300/15 bg-violet-400/10 px-2.5 py-1 text-[10px] text-violet-200/65">
                under 10 days
              </span>
            </div>
            {nearDeadlines.length === 0 ? (
              <p className="py-4 text-center text-xs text-white/30">No deadlines nearby</p>
            ) : (
              <ul className="space-y-2">
                {nearDeadlines.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.025] px-3 py-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs text-white/65">
                      {e.title}
                    </span>
                    <span className="shrink-0 text-[10px] text-white/30">{e.daysLeft}d</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Today timeline */}
      <section className="relative mt-6 overflow-hidden rounded-[30px] border border-violet-200/[0.14] bg-white/[0.05] p-5 backdrop-blur-2xl sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] tracking-[0.2em] text-violet-300/60 uppercase">
              Daily
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">Today’s tasks</h2>
          </div>
          <form onSubmit={createTask} className="flex gap-2">
            <input
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              placeholder="Add a task for today…"
              className="w-52 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs text-white outline-none placeholder:text-white/25 focus:border-violet-300/30"
            />
            <button
              type="submit"
              className="rounded-xl border border-violet-300/20 bg-violet-500/15 px-3.5 py-2.5 text-xs text-violet-100 hover:bg-violet-500/25"
            >
              Add
            </button>
          </form>
        </div>

        {todayTasks.length === 0 ? (
          <p className="py-8 text-center text-xs text-white/30">No tasks for today yet</p>
        ) : (
          <ul className="space-y-2">
            {todayTasks.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => toggleTask(t.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-left ${
                    t.done ? "opacity-50" : ""
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                      t.done
                        ? "border-violet-400/50 bg-violet-500/30"
                        : "border-white/20"
                    }`}
                  >
                    {t.done ? "✓" : ""}
                  </span>
                  <span className={`text-sm ${t.done ? "line-through text-white/40" : "text-white/80"}`}>
                    {t.text}
                  </span>
                  {t.time ? (
                    <span className="ml-auto text-[10px] text-white/30">{t.time}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
