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

  if (loading) {
    return <div className="text-gray-400 text-sm p-8">Loading goals...</div>;
  }

  return (
    <div className="space-y-5 max-w-[1400px]">
      {error && (
        <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
          {String(error)}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT — My Goals */}
        <div className="xl:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">My Goals</h2>
            <span className="text-xs text-purple-400">{goals.length} active</span>
          </div>

          <form onSubmit={createGoal} className="space-y-2 p-3 rounded-2xl border border-white/5 bg-[#121218]">
            <input
              value={newGoalTitle}
              onChange={(e) => setNewGoalTitle(e.target.value)}
              placeholder="+ New goal"
              className="w-full bg-[#0b0b0f] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
            />
            <div className="flex gap-2">
              <select
                value={newGoalType}
                onChange={(e) => setNewGoalType(e.target.value)}
                className="flex-1 bg-[#0b0b0f] border border-gray-700 rounded-xl px-2 py-2 text-xs text-gray-300"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="year">Year</option>
              </select>
              <button type="submit" className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-medium">
                Add
              </button>
            </div>
          </form>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            {goals.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8 border border-dashed border-gray-800 rounded-2xl">
                No goals yet
              </p>
            )}
            {goals.map((g) => {
              const a = ACCENTS[g.type] || ACCENTS.weekly;
              return (
                <div
                  key={g.id}
                  className="rounded-2xl border border-white/5 bg-[#121218] p-4 hover:border-white/10 transition"
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <p className="text-sm font-medium text-white">{g.title}</p>
                    <span className="text-xs text-gray-400 shrink-0">
                      {g.completed_count}/{g.target_count}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full ${a.bar}`}
                      style={{ width: `${Math.min(g.progress || 0, 100)}%` }}
                    />
                  </div>
                  <span className={`inline-block text-[10px] px-2 py-0.5 rounded-full border ${a.chip}`}>
                    {g.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER — Calendar + Schedule */}
        <div className="xl:col-span-5 space-y-4">
          {/* Calendar */}
          <div className="rounded-2xl border border-white/5 bg-[#121218] p-5">
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() =>
                  setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
                }
                className="text-gray-400 hover:text-white px-2"
              >
                ‹
              </button>
              <h3 className="text-sm font-semibold text-white">{calendar.label}</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewDate(new Date())}
                  className="text-[11px] px-2 py-1 rounded-lg border border-gray-700 text-gray-300 hover:border-purple-500"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
                  }
                  className="text-gray-400 hover:text-white px-2"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="text-[10px] uppercase text-gray-500 py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendar.cells.map((d, i) => {
                if (!d) return <div key={`e-${i}`} />;
                const iso = `${calendar.y}-${String(calendar.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const isToday = iso === todayStr;
                const hasTask = taskDates.has(iso);
                return (
                  <div
                    key={iso}
                    className={`relative aspect-square flex items-center justify-center rounded-xl text-sm ${
                      isToday
                        ? "bg-purple-600 text-white font-semibold"
                        : "text-gray-300 hover:bg-white/5"
                    }`}
                  >
                    {d}
                    {hasTask && !isToday && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-purple-400" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* My Schedule — under calendar */}
          <div className="rounded-2xl border border-white/5 bg-[#121218] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">My Schedule</h3>
              <span className="text-[11px] text-gray-500">Today</span>
            </div>

            {/* Hours header */}
            <div className="overflow-x-auto">
              <div className="min-w-[520px]">
                <div className="grid grid-cols-10 gap-1 mb-2">
                  {["9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"].map(
                    (h) => (
                      <div key={h} className="text-[10px] text-gray-500 text-center">
                        {h}
                      </div>
                    )
                  )}
                </div>

                {/* Schedule track */}
                <div className="relative h-28 rounded-xl border border-white/5 bg-[#0b0b0f] overflow-hidden">
                  {/* vertical grid lines */}
                  <div className="absolute inset-0 grid grid-cols-10">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="border-r border-white/5 last:border-r-0" />
                    ))}
                  </div>

                  {/* Task blocks */}
                  <div className="relative z-10 h-full p-2 flex flex-wrap gap-2 content-start">
                    {todayTasks.length === 0 && (
                      <p className="text-xs text-gray-500 m-auto">
                        Add tasks to see them on your schedule
                      </p>
                    )}

                    {todayTasks.map((t, idx) => {
                      const colors = [
                        "bg-purple-600/90 border-purple-400/40",
                        "bg-blue-600/90 border-blue-400/40",
                        "bg-amber-700/90 border-amber-500/40",
                        "bg-cyan-700/90 border-cyan-500/40",
                      ];
                      const color = colors[idx % colors.length];
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTask(t.id)}
                          className={`rounded-lg border px-3 py-2 text-left shadow-lg max-w-[140px] ${color} ${
                            t.done ? "opacity-50" : ""
                          }`}
                        >
                          <p
                            className={`text-xs font-medium text-white truncate ${
                              t.done ? "line-through" : ""
                            }`}
                          >
                            {t.text}
                          </p>
                          <p className="text-[10px] text-white/70 mt-0.5">
                            {t.time || "Anytime"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* List fallback under the track */}
            <div className="mt-4 space-y-2">
              {todayTasks.map((t) => (
                <div
                  key={`row-${t.id}`}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/5 px-3 py-2"
                >
                  <span className="text-[11px] text-purple-300 w-14 shrink-0">
                    {t.time || "—"}
                  </span>
                  <span
                    className={`text-sm flex-1 ${
                      t.done ? "line-through text-gray-500" : "text-gray-200"
                    }`}
                  >
                    {t.text}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleTask(t.id)}
                    className={`text-[10px] px-2 py-1 rounded-lg border ${
                      t.done
                        ? "border-purple-500/40 text-purple-300"
                        : "border-gray-600 text-gray-400 hover:border-purple-500"
                    }`}
                  >
                    {t.done ? "Done" : "Mark"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — My Day */}
        <div className="xl:col-span-4 space-y-4">
          <div className="rounded-2xl border border-white/5 bg-[#121218] p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-white">My Day</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              {new Date().toLocaleDateString("en", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>

            <ProgressRing value={dayPct} />
            <p className="text-center text-xs text-gray-400 mt-2 mb-5">
              {doneToday} of {todayTasks.length} tasks complete
            </p>

            <form onSubmit={createTask} className="flex gap-2 mb-4">
              <input
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Add a task..."
                className="flex-1 bg-[#0b0b0f] border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
              />
              <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm">
                Add
              </button>
            </form>

            <h3 className="text-xs uppercase tracking-wider text-gray-500 mb-2">Today&apos;s Tasks</h3>
            <ul className="space-y-2 max-h-[40vh] overflow-y-auto">
              {todayTasks.length === 0 && (
                <li className="text-sm text-gray-500 text-center py-6">No tasks yet</li>
              )}
              {todayTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => toggleTask(t.id)}
                    className={`w-5 h-5 rounded-md border flex items-center justify-center text-[10px] ${
                      t.done ? "bg-purple-600 border-purple-600 text-white" : "border-gray-600"
                    }`}
                  >
                    {t.done ? "✓" : ""}
                  </button>
                  <span className={`flex-1 text-sm ${t.done ? "line-through text-gray-500" : "text-gray-100"}`}>
                    {t.text}
                  </span>
                  {t.time && <span className="text-[11px] text-gray-500">{t.time}</span>}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4">
            <p className="text-xs text-purple-300 mb-1">Next focus</p>
            <p className="text-sm text-white font-medium">
              {todayTasks.find((t) => !t.done)?.text || "All clear — add a new mission"}
            </p>
            <p className="text-[11px] text-gray-500 mt-2">
              {goals.length} goals · {dayPct}% today
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
