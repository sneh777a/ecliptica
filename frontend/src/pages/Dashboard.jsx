import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_URL = "https://ecliptica-api.onrender.com";

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

  const nearDeadlines = useMemo(() => {
    const limit = addDays(today, 10);
    const items = [];

    goals.forEach((g) => {
      if (!g.deadline) return;
      const d = startOfDay(new Date(g.deadline));
      if (d >= today && d <= limit) {
        items.push({
          id: `goal-${g.id}`,
          title: g.title,
          daysLeft: Math.round((d - today) / 86400000),
          kind: "goal",
        });
      }
    });

    tasks.forEach((t) => {
      if (!t.date || t.done) return;
      const d = startOfDay(new Date(t.date));
      if (d >= today && d <= limit) {
        items.push({
          id: `task-${t.id}`,
          title: t.text,
          daysLeft: Math.round((d - today) / 86400000),
          kind: "task",
        });
      }
    });

    items.sort((a, b) => a.daysLeft - b.daysLeft);
    return items.slice(0, 8);
  }, [goals, tasks, today]);

  const calendar = useMemo(() => {
    const y = viewDate.getFullYear();
    const m = viewDate.getMonth();
    const first = new Date(y, m, 1);
    const startPad = first.getDay(); // Sun-first like mockup
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
    } catch {
      setError("Could not update task");
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
      {/* ambient */}
      <div className="pointer-events-none absolute -right-10 top-0 h-64 w-64 rounded-full bg-violet-600/20 blur-[100px]" />
      <div className="pointer-events-none absolute left-1/3 top-40 h-40 w-40 rounded-full bg-fuchsia-500/10 blur-[80px]" />

      {/* Greeting */}
      <header className="relative mb-8">
        <p className="mb-1 flex items-center gap-2 text-sm text-violet-300/80">
          <span>✦</span> {greet},
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Ready to make today count?
        </h1>
        <p className="mt-2 text-sm text-white/40">
          Your dreams don't work unless you do.
        </p>
      </header>

      {error && (
        <div className="relative mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200/90">
          {String(error)}
        </div>
      )}

      {/*
        Grid like mockup:
        [ Today's Schedule ] [ Tomorrow's Schedule ] [ Calendar ]
                                                   [ Deadlines ]
      */}
      <div className="relative grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {/* Today */}
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

        {/* Tomorrow */}
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

        {/* Right column: Calendar + Deadlines */}
        <div className="space-y-5 lg:col-span-2 xl:col-span-1">
          {/* Calendar */}
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
          </div>

          {/* Upcoming deadlines */}
          <div className="rounded-3xl border border-white/10 bg-[#12122a]/80 p-5 shadow-[0_0_40px_rgba(88,28,135,0.12)] backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <span className="text-violet-300">◷</span> Upcoming Deadlines
              </h3>
              <span className="rounded-full border border-violet-400/30 bg-violet-500/15 px-2.5 py-0.5 text-[10px] font-medium text-violet-200">
                < 10 days
              </span>
            </div>

            {nearDeadlines.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/30">
                No deadlines in the next 10 days
              </p>
            ) : (
              <ul className="space-y-2.5">
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
                      className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                        <span className="truncate text-sm text-white/80">{e.title}</span>
                      </div>
                      <span className="shrink-0 text-xs text-white/35">
                        Due in {e.daysLeft} day{e.daysLeft === 1 ? "" : "s"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <Link
              to="/goals"
              className="mt-4 inline-block text-xs text-violet-300 hover:text-violet-200"
            >
              View all events →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({ icon, title, dateLabel, tasks, onToggle, emptyText }) {
  return (
    <div className="flex flex-col rounded-3xl border border-white/10 bg-[#12122a]/80 p-5 shadow-[0_0_40px_rgba(88,28,135,0.12)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold text-white">
          <span className="text-violet-300">{icon}</span> {title}
        </h2>
        <span className="text-xs text-white/35">{dateLabel}</span>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center">
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
                <div
                  className={`w-1.5 shrink-0 bg-gradient-to-b ${ACCENTS[i % ACCENTS.length]}`}
                />
                <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white/40">
                      {t.time || "Anytime"}
                    </p>
                    <p
                      className={`mt-0.5 truncate text-sm font-medium ${
                        t.done ? "line-through text-white/35" : "text-white/90"
                      }`}
                    >
                      {t.text}
                    </p>
                  </div>
                  <span className="shrink-0 text-white/25 transition group-hover:text-violet-300">
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
