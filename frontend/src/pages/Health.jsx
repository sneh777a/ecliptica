import { useEffect, useMemo, useRef, useState } from "react";

const BLUE_CARD =
  "border border-cyan-300/10 bg-gradient-to-br from-[#0b1830]/95 via-[#0a1429]/90 to-[#08101f]/95 shadow-[0_0_30px_rgba(56,189,248,0.08)] backdrop-blur-2xl";

const remindersDefault = [
  { id: 1, time: "08:00", amount: 250, enabled: true },
  { id: 2, time: "10:00", amount: 250, enabled: true },
  { id: 3, time: "12:00", amount: 300, enabled: true },
  { id: 4, time: "14:00", amount: 250, enabled: true },
];

function formatReminderTime(time) {
  const [hour, minute] = time.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatLitres(ml) {
  return ml >= 1000 ? `${(ml / 1000).toFixed(2)} L` : `${ml} ml`;
}

export default function Health() {
  const [habits, setHabits] = useState([
    { id: 1, name: "Drink 3L Water", streak: 14, done: true },
    { id: 2, name: "Exercise 30 min", streak: 8, done: true },
    { id: 3, name: "Read 20 pages", streak: 3, done: false },
    { id: 4, name: "Meditate 10 min", streak: 21, done: true },
    { id: 5, name: "No Sugar", streak: 2, done: false },
    { id: 6, name: "Sleep before 11 PM", streak: 5, done: true },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [newHabit, setNewHabit] = useState("");
  const [water, setWater] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2000);
  const [reminders, setReminders] = useState(remindersDefault);
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [newReminderTime, setNewReminderTime] = useState("16:00");
  const [newReminderAmount, setNewReminderAmount] = useState(250);
  const [notificationStatus, setNotificationStatus] = useState("");
  const [now, setNow] = useState(new Date());
  const notifiedReminderRef = useRef("");

  const completedCount = habits.filter((h) => h.done).length;
  const totalCount = habits.length;
  const progressPercent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const hydrationPercent =
    waterGoal > 0 ? Math.min(Math.round((water / waterGoal) * 100), 100) : 0;

  const nextReminder = useMemo(() => {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return (
      reminders
        .filter((item) => item.enabled)
        .map((item) => {
          const [hour, minute] = item.time.split(":").map(Number);
          return {
            ...item,
            minutes: hour * 60 + minute,
            diff: hour * 60 + minute - currentMinutes,
          };
        })
        .filter((item) => item.diff >= 0)
        .sort((a, b) => a.minutes - b.minutes)[0] ||
      reminders
        .filter((item) => item.enabled)
        .map((item) => {
          const [hour, minute] = item.time.split(":").map(Number);
          return { ...item, minutes: hour * 60 + minute };
        })
        .sort((a, b) => a.minutes - b.minutes)[0]
    );
  }, [now, reminders]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkReminder = () => {
      const current = new Date();
      const currentTime = `${String(current.getHours()).padStart(2, "0")}:${String(
        current.getMinutes()
      ).padStart(2, "0")}`;
      const reminder = reminders.find(
        (item) => item.enabled && item.time === currentTime
      );

      if (!reminder || current.getSeconds() > 5) return;

      const reminderKey = `${current.toDateString()}-${reminder.time}`;
      if (notifiedReminderRef.current === reminderKey) return;
      notifiedReminderRef.current = reminderKey;

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Ecliptica · Time to drink water", {
          body: `You planned ${reminder.amount} ml. Tap the Health page to log it.`,
        });
      }
      setNotificationStatus(`Hydration reminder: ${formatReminderTime(reminder.time)}`);
    };

    const timer = window.setInterval(checkReminder, 1000);
    return () => window.clearInterval(timer);
  }, [reminders]);

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      setNotificationStatus("Browser notifications are not supported here.");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationStatus(
      permission === "granted"
        ? "Notifications enabled for your water reminders."
        : "Notifications are blocked. You can enable them in browser settings."
    );
  };

  const addWater = (amount) => {
    setWater((current) => Math.min(current + amount, waterGoal));
  };

  const addHabit = (e) => {
    e.preventDefault();
    if (!newHabit.trim()) return;

    const habit = {
      id: Date.now(),
      name: newHabit,
      streak: 0,
      done: false,
    };

    setHabits([habit, ...habits]);
    setNewHabit("");
    setShowForm(false);
  };

  const toggleHabit = (id) => {
    setHabits(
      habits.map((habit) =>
        habit.id === id ? { ...habit, done: !habit.done } : habit
      )
    );
  };

  const deleteHabit = (id) => {
    setHabits(habits.filter((habit) => habit.id !== id));
  };

  const toggleReminder = (id) => {
    setReminders((items) =>
      items.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const addReminder = (e) => {
    e.preventDefault();
    setReminders((items) => [
      ...items,
      {
        id: Date.now(),
        time: newReminderTime,
        amount: Number(newReminderAmount) || 250,
        enabled: true,
      },
    ]);
    setShowReminderForm(false);
  };

  const streak = Math.max(...habits.map((habit) => habit.streak), 0);

  return (
    <div className="relative min-h-full overflow-hidden pb-12 text-white">
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-sky-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-0 top-20 h-96 w-96 rounded-full bg-blue-600/10 blur-[140px]" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-72 w-72 rounded-full bg-cyan-400/[0.04] blur-[120px]" />

      <div className="relative mb-7 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-cyan-300/65">
            ✦ Health Orbit
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Your body, gently tracked.
          </h1>
          <p className="mt-2 text-sm text-white/40">
            Wellness habits today · {now.toLocaleDateString("en", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={requestNotifications}
            className="rounded-xl border border-cyan-300/15 bg-cyan-400/[0.06] px-4 py-2.5 text-xs font-medium text-cyan-100 transition hover:border-cyan-300/30 hover:bg-cyan-400/10"
          >
            🔔 Enable reminders
          </button>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl border border-blue-300/20 bg-blue-500/15 px-4 py-2.5 text-xs font-medium text-blue-100 shadow-[0_0_20px_rgba(59,130,246,0.12)] transition hover:bg-blue-500/25"
          >
            + Add Habit
          </button>
        </div>
      </div>

      {notificationStatus ? (
        <div className="relative mb-5 rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.05] px-4 py-3 text-xs text-cyan-100/75">
          {notificationStatus}
        </div>
      ) : null}

      {showForm ? (
        <form
          onSubmit={addHabit}
          className={`${BLUE_CARD} relative mb-6 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row`}
        >
          <input
            type="text"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            placeholder="Enter habit name..."
            className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#07101f]/80 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-cyan-300/30"
            autoFocus
          />
          <button
            type="submit"
            className="rounded-xl bg-blue-500/20 px-5 py-3 text-sm font-medium text-blue-100 ring-1 ring-blue-300/15 transition hover:bg-blue-500/30"
          >
            Add
          </button>
        </form>
      ) : null}

      <div className="relative grid grid-cols-1 gap-5 xl:grid-cols-[0.82fr_1.55fr_0.9fr]">
        <aside className="flex flex-col gap-4">
          <MetricCard icon="◉" label="STEPS" title="Steps Taken" value="—" note="Connect a fitness band" />
          <MetricCard icon="♡" label="HEART" title="Heart Rate" value="—" note="Wearable data will appear here" />
          <MetricCard icon="☾" label="SLEEP" title="Sleep Duration" value="—" note="Connect a fitness band" />

          <section className={`${BLUE_CARD} relative overflow-hidden rounded-[26px] p-5`}>
            <GlowOrb />
            <div className="relative">
              <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/55">
                Consistency
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm text-white/55">Goal Consistency</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{streak} day streak</p>
                </div>
                <div className="flex gap-1">
                  {habits.slice(0, 7).map((habit) => (
                    <span
                      key={habit.id}
                      className={`h-2.5 w-2.5 rounded-full ${habit.done ? "bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,0.7)]" : "bg-white/10"}`}
                    />
                  ))}
                </div>
              </div>
              <p className="mt-3 text-xs text-white/30">
                {completedCount}/{totalCount} habits completed today
              </p>
            </div>
          </section>
        </aside>

        <main className="min-w-0">
          <section className={`${BLUE_CARD} relative overflow-hidden rounded-[28px] p-5 sm:p-6`}>
            <GlowOrb />
            <div className="relative flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/55">
                  Activity Summary
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">Your movement</h2>
              </div>
              <div className="flex rounded-xl border border-white/[0.06] bg-white/[0.025] p-1 text-[11px]">
                {["Today", "Week", "Month", "3 Months"].map((tab, index) => (
                  <span
                    key={tab}
                    className={`rounded-lg px-2.5 py-1.5 ${index === 0 ? "bg-cyan-400/10 text-cyan-100" : "text-white/30"}`}
                  >
                    {tab}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-2xl border border-cyan-300/[0.06] bg-[#07101f]/65 p-4">
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cyan-500/[0.05] to-transparent" />
              <div className="grid h-56 grid-cols-7 items-end gap-2 sm:gap-4">
                {[28, 44, 36, 54, 42, 62, 48].map((height, index) => (
                  <div key={index} className="flex h-full flex-col items-center justify-end gap-2">
                    <div
                      className="w-full max-w-9 rounded-t-xl bg-gradient-to-t from-blue-500/20 to-cyan-300/50 shadow-[0_0_18px_rgba(34,211,238,0.12)]"
                      style={{ height: `${height}%` }}
                    />
                    <span className="text-[9px] text-white/25">
                      {["M", "T", "W", "T", "F", "S", "S"][index]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-x-4 top-1/2 h-px bg-white/[0.04]" />
              <div className="mt-4 rounded-xl border border-dashed border-cyan-300/[0.08] bg-cyan-400/[0.025] px-3 py-2 text-center text-[10px] text-white/30">
                Activity chart is ready for fitness-band data.
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-3">
              <MiniStat label="Distance" value="—" />
              <MiniStat label="Active time" value="—" />
              <MiniStat label="Calories" value="—" />
            </div>
          </section>

          <section className={`${BLUE_CARD} mt-5 rounded-[28px] p-5`}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/55">
                  Recent Workouts
                </p>
                <h2 className="mt-1 text-lg font-semibold">Movement history</h2>
              </div>
              <span className="text-[10px] text-white/25">Wearable ready</span>
            </div>

            <div className="rounded-2xl border border-dashed border-white/[0.07] bg-white/[0.018] px-4 py-8 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/10 bg-cyan-400/[0.05] text-cyan-200">
                ◌
              </div>
              <p className="text-sm text-white/45">No workout data connected yet.</p>
              <p className="mt-1 text-xs text-white/25">
                Your fitness-band workouts can appear here later.
              </p>
            </div>
          </section>
        </main>

        <aside className="flex flex-col gap-4">
          <section className={`${BLUE_CARD} relative overflow-hidden rounded-[26px] p-5`}>
            <GlowOrb />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/55">
                    Hydration
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">Daily hydration</h2>
                </div>
                <span className="text-cyan-300">◒</span>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold text-white">
                    {formatLitres(water)}
                    <span className="text-sm font-normal text-white/30"> / {formatLitres(waterGoal)}</span>
                  </p>
                  <p className="mt-1 text-xs text-cyan-200/55">{hydrationPercent}% completed</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWaterGoal((goal) => (goal === 2000 ? 2500 : 2000))}
                  className="text-[10px] text-white/25 transition hover:text-cyan-200"
                  title="Switch daily goal"
                >
                  Goal
                </button>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.45)] transition-all"
                  style={{ width: `${hydrationPercent}%` }}
                />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[250, 500].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => addWater(amount)}
                    className="rounded-xl border border-cyan-300/10 bg-cyan-400/[0.06] px-2 py-2.5 text-[11px] font-medium text-cyan-100 transition hover:border-cyan-300/25 hover:bg-cyan-400/10"
                  >
                    +{amount} ml
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const custom = Number(window.prompt("How many ml did you drink?"));
                    if (Number.isFinite(custom) && custom > 0) addWater(custom);
                  }}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-2 py-2.5 text-[11px] text-white/55 transition hover:bg-white/[0.06]"
                >
                  Custom
                </button>
              </div>
            </div>
          </section>

          <section className={`${BLUE_CARD} rounded-[26px] p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/55">
                  Water Reminders
                </p>
                <h2 className="mt-1 text-lg font-semibold">Schedule reminders</h2>
              </div>
              <span className="text-cyan-300">♧</span>
            </div>

            <div className="mt-4 space-y-2">
              {reminders
                .slice()
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.018] px-3 py-2.5"
                  >
                    <span className="w-16 text-xs font-medium text-white/65">
                      {formatReminderTime(item.time)}
                    </span>
                    <span className="flex-1 text-[11px] text-white/35">
                      {item.amount} ml
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleReminder(item.id)}
                      aria-label={`${item.enabled ? "Disable" : "Enable"} reminder at ${formatReminderTime(item.time)}`}
                      className={`relative h-5 w-9 rounded-full transition ${item.enabled ? "bg-cyan-400/35" : "bg-white/10"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full transition ${item.enabled ? "left-[18px] bg-cyan-200 shadow-[0_0_8px_rgba(103,232,249,0.7)]" : "left-0.5 bg-white/35"}`}
                      />
                    </button>
                  </div>
                ))}
            </div>

            {showReminderForm ? (
              <form onSubmit={addReminder} className="mt-3 space-y-2 rounded-xl border border-cyan-300/10 bg-cyan-400/[0.03] p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="time"
                    value={newReminderTime}
                    onChange={(e) => setNewReminderTime(e.target.value)}
                    className="min-w-0 rounded-lg border border-white/[0.08] bg-[#07101f] px-2 py-2 text-xs text-white outline-none focus:border-cyan-300/30"
                  />
                  <input
                    type="number"
                    min="1"
                    value={newReminderAmount}
                    onChange={(e) => setNewReminderAmount(e.target.value)}
                    className="min-w-0 rounded-lg border border-white/[0.08] bg-[#07101f] px-2 py-2 text-xs text-white outline-none focus:border-cyan-300/30"
                    placeholder="ml"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-100 ring-1 ring-cyan-300/10 hover:bg-cyan-400/15"
                >
                  Save reminder
                </button>
              </form>
            ) : null}

            <button
              type="button"
              onClick={() => setShowReminderForm(!showReminderForm)}
              className="mt-3 w-full rounded-xl border border-cyan-300/15 bg-blue-500/10 px-3 py-2.5 text-xs font-medium text-cyan-100 transition hover:bg-blue-500/15"
            >
              {showReminderForm ? "Close" : "+ Add reminder"}
            </button>

            {nextReminder ? (
              <p className="mt-3 text-center text-[10px] text-white/30">
                🔔 Next reminder · <span className="text-cyan-200/70">{formatReminderTime(nextReminder.time)}</span>
              </p>
            ) : (
              <p className="mt-3 text-center text-[10px] text-white/25">No reminders enabled</p>
            )}
          </section>

          <section className={`${BLUE_CARD} rounded-[26px] p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/55">
                  Device
                </p>
                <h2 className="mt-1 text-lg font-semibold">Fitness Band</h2>
              </div>
              <span className="text-cyan-300">⌚</span>
            </div>

            <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-sm text-white/65">Not connected</p>
              <p className="mt-1 text-[10px] text-white/25">
                Ready for future wearable integration.
              </p>
            </div>

            <button
              type="button"
              className="mt-3 w-full rounded-xl border border-blue-300/15 bg-blue-500/10 px-3 py-2.5 text-xs font-medium text-blue-100 transition hover:bg-blue-500/20"
            >
              + Connect device
            </button>
          </section>
        </aside>
      </div>

      <section className={`${BLUE_CARD} relative mt-5 overflow-hidden rounded-[28px] p-5 sm:p-6`}>
        <GlowOrb />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/55">
              Today's Habits
            </p>
            <h2 className="mt-1 text-lg font-semibold">Daily wellness rhythm</h2>
            <p className="mt-1 text-xs text-white/30">
              {completedCount}/{totalCount} completed · {progressPercent}% today
            </p>
          </div>

          <div className="min-w-[240px] lg:w-[420px]">
            <div className="mb-2 flex justify-between text-[10px] text-white/30">
              <span>Consistency</span>
              <span className="text-cyan-200/60">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.35)] transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {habits.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center justify-between rounded-2xl border border-white/[0.05] bg-white/[0.018] px-3.5 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => toggleHabit(habit.id)}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border transition ${
                    habit.done
                      ? "border-cyan-300/30 bg-cyan-400/15 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.18)]"
                      : "border-white/10 bg-white/[0.02] text-transparent hover:border-cyan-300/25"
                  }`}
                  aria-label={`${habit.done ? "Mark incomplete" : "Mark complete"} ${habit.name}`}
                >
                  ✓
                </button>
                <div className="min-w-0">
                  <p className={`truncate text-sm font-medium ${habit.done ? "text-white/40 line-through" : "text-white/80"}`}>
                    {habit.name}
                  </p>
                  <p className="mt-0.5 text-[10px] text-cyan-200/45">🔥 {habit.streak} day streak</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteHabit(habit.id)}
                className="ml-3 shrink-0 text-[10px] text-white/20 transition hover:text-red-300"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, title, value, note }) {
  return (
    <section className={`${BLUE_CARD} relative overflow-hidden rounded-[26px] p-5`}>
      <GlowOrb />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan-300/55">
              {label}
            </p>
            <p className="mt-1 text-sm text-white/55">{title}</p>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-300/10 bg-cyan-400/[0.06] text-lg text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.10)]">
            {icon}
          </span>
        </div>
        <p className="mt-4 text-2xl font-semibold text-white">{value}</p>
        <p className="mt-1 text-[10px] text-white/25">{note}</p>
      </div>
    </section>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/[0.05] bg-white/[0.018] px-3 py-3">
      <p className="text-[10px] text-white/25">{label}</p>
      <p className="mt-1 text-sm font-medium text-white/70">{value}</p>
    </div>
  );
}

function GlowOrb() {
  return (
    <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-cyan-400/[0.07] blur-3xl" />
  );
}
