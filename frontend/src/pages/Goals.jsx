import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createApi, formatApiError } from "../api";
import "./Goals.css";

const TYPE_LABEL = {
  year: "Yearly",
  monthly: "Monthly",
  weekly: "Weekly",
};

const TYPE_STYLES = {
  year: "goal-chip--year",
  monthly: "goal-chip--month",
  weekly: "goal-chip--week",
};

function parseDeadlineDate(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  const dateOnly = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly.map(Number);
    const parsed = new Date(0);
    parsed.setHours(0, 0, 0, 0);
    parsed.setFullYear(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }
    return parsed;
  }

  const timestamp = value.trim();
  if (!/(?:T|\s)\d{2}:\d{2}|Z$|[+-]\d{2}:?\d{2}$/i.test(timestamp)) return null;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function localDayNumber(date) {
  const utcDate = new Date(0);
  utcDate.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  utcDate.setUTCHours(0, 0, 0, 0);
  return utcDate.getTime() / 86400000;
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function getGoalSteps(goal, allTasks) {
  const taskMap = new Map();
  (Array.isArray(goal.tasks) ? goal.tasks : []).forEach((task) => {
    if (task && (task.type === "step" || task.goal_id === goal.id)) {
      taskMap.set(task.id, task);
    }
  });
  allTasks.forEach((task) => {
    if (task?.goal_id === goal.id) taskMap.set(task.id, task);
  });
  return [...taskMap.values()].filter(
    (task) => task.type === "step" || task.goal_id === goal.id
  );
}

function getGoalProgress(goal, steps) {
  if (steps.length > 0) {
    return Math.round((steps.filter((step) => step.done).length / steps.length) * 100);
  }
  return Math.max(0, Math.min(100, Math.round(Number(goal.progress) || 0)));
}

function getGoalStatus(goal, progress, todayNumber) {
  if (progress >= 100) return "completed";
  const deadline = parseDeadlineDate(goal.deadline);
  if (deadline && localDayNumber(deadline) < todayNumber) return "overdue";
  return progress > 0 ? "in-progress" : "planned";
}

function formatDeadline(value) {
  const date = parseDeadlineDate(value);
  return date
    ? date.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })
    : "";
}

function deadlineLabel(value, todayNumber) {
  const date = parseDeadlineDate(value);
  if (!date) return "No deadline";
  const daysLeft = localDayNumber(date) - todayNumber;
  if (daysLeft < 0) return `Overdue by ${Math.abs(daysLeft)} ${Math.abs(daysLeft) === 1 ? "day" : "days"}`;
  if (daysLeft === 0) return "Due today";
  if (daysLeft === 1) return "Due tomorrow";
  return `Due in ${daysLeft} days`;
}

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };

  const paths = {
    plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
    target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
    check: <path d="m5 12 4.2 4.2L19 6.5" />,
    calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="m5.5 7 .8 13h11.4l.8-13M9 7V4h6v3" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    sparkle: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function GoalCard({
  goal,
  steps,
  todayNumber,
  expanded,
  stepDraft,
  stepBusy,
  goalBusy,
  busyTasks,
  onToggle,
  onExpand,
  onStepDraft,
  onAddStep,
  onDelete,
}) {
  const done = steps.filter((step) => step.done).length;
  const progress = getGoalProgress(goal, steps);
  const status = getGoalStatus(goal, progress, todayNumber);
  const deadline = parseDeadlineDate(goal.deadline);
  const daysLeft = deadline ? localDayNumber(deadline) - todayNumber : null;
  const deadlineTone =
    status === "completed"
      ? "goal-deadline--complete"
      : status === "overdue"
        ? "goal-deadline--overdue"
        : daysLeft !== null && daysLeft <= 3
          ? "goal-deadline--soon"
          : "";

  return (
    <article className={`goal-card goal-card--${status}`}>
      <div className="goal-card__topline">
        <span className={`goal-chip ${TYPE_STYLES[goal.type] || "goal-chip--week"}`}>
          {TYPE_LABEL[goal.type] || goal.type || "Goal"}
        </span>
        <span className={`goal-status goal-status--${status}`}>
          <span className="goal-status__dot" />
          {status === "in-progress"
            ? "In progress"
            : status === "completed"
              ? "Completed"
              : status === "overdue"
                ? "Overdue"
                : "Planned"}
        </span>
      </div>

      <h3 className="goal-card__title">{goal.title}</h3>
      <p className={`goal-card__description${goal.description ? "" : " is-empty"}`}>
        {goal.description || "A clear intention, one small step at a time."}
      </p>

      <div className="goal-card__deadline">
        <Icon name={status === "overdue" ? "clock" : "calendar"} size={15} />
        <span className={deadlineTone}>{deadlineLabel(goal.deadline, todayNumber)}</span>
        {deadline ? <span className="goal-card__date">{formatDeadline(goal.deadline)}</span> : null}
      </div>

      <div className="goal-card__progress-heading">
        <span>Progress</span>
        <strong>{progress}%</strong>
      </div>
      <div
        className="goal-progress"
        role="progressbar"
        aria-label={`${goal.title} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="goal-card__foot">
        <span>{steps.length ? `${done} of ${steps.length} steps complete` : "Your path starts here"}</span>
        <button
          type="button"
          className="goal-link"
          aria-expanded={expanded}
          onClick={onExpand}
        >
          {expanded ? "Hide steps" : "View steps"}
          <Icon name="arrow" size={15} />
        </button>
      </div>

      {expanded ? (
        <div className="goal-card__details">
          {steps.length ? (
            <ul className="goal-step-list">
              {steps.map((step) => (
                <li key={step.id} className={step.done ? "goal-step is-done" : "goal-step"}>
                  <button
                    type="button"
                    className="goal-step__toggle"
                    aria-label={`${step.done ? "Mark incomplete" : "Complete"}: ${step.text}`}
                    aria-pressed={Boolean(step.done)}
                    disabled={busyTasks.has(step.id)}
                    onClick={() => onToggle(step.id)}
                  >
                    {step.done ? <Icon name="check" size={14} /> : null}
                  </button>
                  <span>{step.text}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="goal-card__empty-steps">
              Add a first step to turn this goal into a doable plan.
            </p>
          )}
          <form className="goal-step-form" onSubmit={(event) => onAddStep(event, goal.id)}>
            <label className="goals-sr-only" htmlFor={`step-${goal.id}`}>New step for {goal.title}</label>
            <input
              id={`step-${goal.id}`}
              value={stepDraft}
              onChange={(event) => onStepDraft(event.target.value)}
              placeholder="Add a study step…"
              maxLength={240}
            />
            <button type="submit" disabled={stepBusy || !stepDraft.trim()}>
              {stepBusy ? "Adding…" : "Add step"}
            </button>
          </form>
          <button
            type="button"
            className="goal-delete"
            disabled={goalBusy}
            onClick={() => onDelete(goal)}
          >
            <Icon name="trash" size={14} />
            {goalBusy ? "Removing…" : "Delete goal"}
          </button>
        </div>
      ) : null}
    </article>
  );
}

function GoalSkeleton() {
  return (
    <div className="goals-skeleton" aria-label="Loading goals" role="status">
      <div className="goals-skeleton__hero" />
      <div className="goals-skeleton__stats">
        {[0, 1, 2, 3].map((item) => <div className="goals-skeleton__stat" key={item} />)}
      </div>
      <div className="goals-skeleton__grid">
        {[0, 1, 2].map((item) => <div className="goals-skeleton__card" key={item} />)}
      </div>
      <span className="goals-sr-only">Loading your goals…</span>
    </div>
  );
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalDescription, setNewGoalDescription] = useState("");
  const [newGoalType, setNewGoalType] = useState("monthly");
  const [newGoalDeadline, setNewGoalDeadline] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [expandedId, setExpandedId] = useState(null);
  const [stepDrafts, setStepDrafts] = useState({});
  const [stepBusy, setStepBusy] = useState(null);
  const [goalBusy, setGoalBusy] = useState(null);
  const [busyTasks, setBusyTasks] = useState(() => new Set());
  const [viewDate, setViewDate] = useState(() => new Date());
  const mountedRef = useRef(false);
  const submittingRef = useRef(false);
  const previousFocusRef = useRef(null);
  const modalRef = useRef(null);
  const titleInputRef = useRef(null);

  const token = localStorage.getItem("token");
  const api = useMemo(() => createApi(token), [token]);

  const loadData = useCallback(async ({ showLoading = false } = {}) => {
    if (!mountedRef.current) return;
    if (showLoading) setLoading(true);
    setError("");
    try {
      const [goalsResponse, tasksResponse] = await Promise.allSettled([
        api.get("/goals/"),
        api.get("/goals/tasks"),
      ]);
      if (!mountedRef.current) return;
      if (goalsResponse.status === "fulfilled") {
        setGoals(Array.isArray(goalsResponse.value.data) ? goalsResponse.value.data : []);
      } else {
        setGoals([]);
        setError(formatApiError(goalsResponse.reason, "Could not load goals"));
      }
      if (tasksResponse.status === "fulfilled") {
        setTasks(Array.isArray(tasksResponse.value.data) ? tasksResponse.value.data : []);
      } else {
        setTasks([]);
        setError((current) =>
          current || formatApiError(tasksResponse.reason, "Could not load tasks")
        );
      }
    } catch (requestError) {
      if (mountedRef.current) {
        setError(formatApiError(requestError, "Could not load your goals"));
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    mountedRef.current = true;
    if (!token) {
      window.location.href = "/login";
      return () => {
        mountedRef.current = false;
      };
    }
    const timer = window.setTimeout(() => {
      void loadData({ showLoading: true });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      mountedRef.current = false;
    };
  }, [loadData, token]);

  useEffect(() => {
    if (!showCreate) return undefined;
    titleInputRef.current?.focus();
    const handleEscape = (event) => {
      if (event.key === "Escape" && !submittingRef.current) {
        setShowCreate(false);
        previousFocusRef.current?.focus();
      }
      if (event.key === "Tab") {
        const focusable = modalRef.current?.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [showCreate]);

  const today = new Date();
  const todayNumber = localDayNumber(today);
  const todayKey = dateKey(today);
  const goalDetails = goals.map((goal) => {
    const steps = getGoalSteps(goal, tasks);
    const progress = getGoalProgress(goal, steps);
    return {
      goal,
      steps,
      progress,
      status: getGoalStatus(goal, progress, todayNumber),
    };
  });

  const upcomingDeadlines = goalDetails
    .filter(({ goal, status }) => {
      const deadline = parseDeadlineDate(goal.deadline);
      if (!deadline || status === "completed") return false;
      const daysLeft = localDayNumber(deadline) - todayNumber;
      return daysLeft >= 0 && daysLeft <= 10;
    })
    .map(({ goal }) => ({
      goal,
      daysLeft: localDayNumber(parseDeadlineDate(goal.deadline)) - todayNumber,
    }))
    .sort((first, second) => first.daysLeft - second.daysLeft);

  const completedGoals = goalDetails.filter(({ status }) => status === "completed").length;
  const activeGoals = goalDetails.filter(({ status }) => status !== "completed").length;
  const taskCount = tasks.length;
  const completedTasks = tasks.filter((task) => task.done).length;
  const todayTasks = tasks.filter((task) => (
    task.type === "daily" && (!task.date || String(task.date).slice(0, 10) === todayKey)
  ));

  const normalizedSearch = search.trim().toLowerCase();
  const filteredGoals = goalDetails.filter(({ goal, status }) => {
    const matchesSearch =
      !normalizedSearch ||
      `${goal.title || ""} ${goal.description || ""}`.toLowerCase().includes(normalizedSearch);
    return (
      matchesSearch &&
      (statusFilter === "all" || status === statusFilter) &&
      (typeFilter === "all" || goal.type === typeFilter)
    );
  });
  if (sortBy === "progress-high") {
    filteredGoals.sort((first, second) => second.progress - first.progress);
  } else if (sortBy === "progress-low") {
    filteredGoals.sort((first, second) => first.progress - second.progress);
  } else if (sortBy === "deadline") {
    filteredGoals.sort((first, second) => {
      const firstDate = parseDeadlineDate(first.goal.deadline);
      const secondDate = parseDeadlineDate(second.goal.deadline);
      if (!firstDate) return secondDate ? 1 : 0;
      if (!secondDate) return -1;
      return firstDate - secondDate;
    });
  }

  const calendar = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const first = new Date(year, month, 1);
    const leadingDays = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = Array.from({ length: leadingDays }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    return {
      year,
      month,
      cells,
      label: first.toLocaleDateString("en", { month: "long", year: "numeric" }),
    };
  }, [viewDate]);
  const taskDates = useMemo(
    () => new Set(tasks.filter((task) => task.date).map((task) => String(task.date).slice(0, 10))),
    [tasks]
  );

  const openCreate = () => {
    previousFocusRef.current = document.activeElement;
    setFormError("");
    setShowCreate(true);
  };

  const closeCreate = () => {
    if (submittingRef.current) return;
    setShowCreate(false);
    setFormError("");
    previousFocusRef.current?.focus();
  };

  const createGoal = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;
    const title = newGoalTitle.trim();
    if (!title) {
      setFormError("Add a title for your goal.");
      titleInputRef.current?.focus();
      return;
    }
    submittingRef.current = true;
    setSaving(true);
    setFormError("");
    try {
      const response = await api.post("/goals/", {
        title,
        description: newGoalDescription.trim(),
        type: newGoalType,
        deadline: newGoalDeadline,
        target_count: 0,
      });
      if (!mountedRef.current) return;
      setShowCreate(false);
      previousFocusRef.current?.focus();
      setNewGoalTitle("");
      setNewGoalDescription("");
      setNewGoalType("monthly");
      setNewGoalDeadline("");
      await loadData();
      if (mountedRef.current && response.data?.id) setExpandedId(response.data.id);
    } catch (requestError) {
      if (mountedRef.current) {
        setFormError(formatApiError(requestError, "Could not create this goal"));
      }
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  };

  const createTask = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = String(data.get("dailyTask") || "").trim();
    if (!text) return;
    try {
      await api.post("/goals/tasks", { text, type: "daily", date: todayKey });
      if (!mountedRef.current) return;
      form.reset();
      await loadData();
    } catch (requestError) {
      if (mountedRef.current) {
        setError(formatApiError(requestError, "Could not add your task"));
      }
    }
  };

  const toggleTask = async (taskId) => {
    if (busyTasks.has(taskId)) return;
    setBusyTasks((current) => new Set(current).add(taskId));
    try {
      await api.patch(`/goals/tasks/${taskId}/toggle`);
      await loadData();
    } catch (requestError) {
      if (mountedRef.current) setError(formatApiError(requestError, "Could not update this task"));
    } finally {
      if (mountedRef.current) {
        setBusyTasks((current) => {
          const next = new Set(current);
          next.delete(taskId);
          return next;
        });
      }
    }
  };

  const addStep = async (event, goalId) => {
    event.preventDefault();
    const text = (stepDrafts[goalId] || "").trim();
    if (!text || stepBusy !== null) return;
    setStepBusy(goalId);
    try {
      await api.post(`/goals/${goalId}/steps`, { text });
      if (!mountedRef.current) return;
      setStepDrafts((current) => ({ ...current, [goalId]: "" }));
      await loadData();
    } catch (requestError) {
      if (mountedRef.current) setError(formatApiError(requestError, "Could not add this step"));
    } finally {
      if (mountedRef.current) setStepBusy(null);
    }
  };

  const deleteGoal = async (goal) => {
    if (!window.confirm(`Delete "${goal.title}" and its steps? This cannot be undone.`)) return;
    setGoalBusy(goal.id);
    try {
      await api.delete(`/goals/${goal.id}`);
      if (!mountedRef.current) return;
      if (expandedId === goal.id) setExpandedId(null);
      await loadData();
    } catch (requestError) {
      if (mountedRef.current) setError(formatApiError(requestError, "Could not delete this goal"));
    } finally {
      if (mountedRef.current) setGoalBusy(null);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setSortBy("recent");
  };

  if (loading) return <GoalSkeleton />;

  const motivation = goals.length === 0
    ? "Every meaningful journey starts with one small intention."
    : completedGoals === goals.length
      ? "Look at everything you’ve accomplished. What will you explore next?"
      : completedGoals > 0
        ? `You’ve completed ${completedGoals} ${completedGoals === 1 ? "goal" : "goals"} — keep your momentum gentle and steady.`
        : "Big things grow from the small steps you take today.";

  return (
    <div className="goals-page">
      <div className="goals-page__glow goals-page__glow--one" />
      <div className="goals-page__glow goals-page__glow--two" />

      <header className="goals-hero">
        <div className="goals-hero__copy">
          <p className="goals-eyebrow"><Icon name="sparkle" size={14} /> YOUR PERSONAL ORBIT</p>
          <h1>Your goals, <span>your galaxy.</span></h1>
          <p className="goals-hero__subtitle">{motivation}</p>
          <p className="goals-hero__date">
            {today.toLocaleDateString("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="goals-hero__art" aria-hidden="true">
          <span className="goals-hero__orbit goals-hero__orbit--outer" />
          <span className="goals-hero__orbit goals-hero__orbit--inner" />
          <span className="goals-hero__planet" />
          <span className="goals-hero__star goals-hero__star--one" />
          <span className="goals-hero__star goals-hero__star--two" />
          <span className="goals-hero__star goals-hero__star--three" />
        </div>
        <button type="button" className="goals-primary-button" onClick={openCreate}>
          <Icon name="plus" size={17} />
          Create goal
        </button>
      </header>

      {error ? (
        <div className="goals-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void loadData({ showLoading: true })}>
            Try again
          </button>
        </div>
      ) : null}

      <section className="goals-overview" aria-label="Goals overview">
        <article className="overview-card overview-card--violet">
          <span className="overview-card__icon"><Icon name="target" size={18} /></span>
          <div className="overview-card__label">Active goals</div>
          <div className="overview-card__value">{activeGoals}</div>
          <p>{activeGoals === 1 ? "one intention in orbit" : "intentions in orbit"}</p>
        </article>
        <article className="overview-card overview-card--blue">
          <span className="overview-card__icon"><Icon name="check" size={18} /></span>
          <div className="overview-card__label">Completed goals</div>
          <div className="overview-card__value">{completedGoals}</div>
          <p>{goals.length ? `${Math.round((completedGoals / goals.length) * 100)}% of your goals` : "Your first is waiting"}</p>
        </article>
        <article className="overview-card overview-card--cyan">
          <span className="overview-card__icon"><Icon name="sparkle" size={18} /></span>
          <div className="overview-card__label">Tasks completed</div>
          <div className="overview-card__value">{completedTasks}<span> / {taskCount}</span></div>
          <div className="overview-card__mini-progress" role="progressbar" aria-label="Task completion" aria-valuemin={0} aria-valuemax={taskCount || 1} aria-valuenow={completedTasks}>
            <span style={{ width: `${taskCount ? (completedTasks / taskCount) * 100 : 0}%` }} />
          </div>
        </article>
        <article className={`overview-card ${upcomingDeadlines.length ? "overview-card--warm" : "overview-card--blue"}`}>
          <span className="overview-card__icon"><Icon name="calendar" size={18} /></span>
          <div className="overview-card__label">Coming up</div>
          <div className="overview-card__value">{upcomingDeadlines.length}</div>
          <p>{upcomingDeadlines.length === 1 ? "deadline in 10 days" : "deadlines in 10 days"}</p>
        </article>
      </section>

      <div className="goals-layout">
        <section className="goals-main" aria-labelledby="goals-list-title">
          <div className="goals-section-heading">
            <div>
              <p className="goals-eyebrow">THE BIG PICTURE</p>
              <h2 id="goals-list-title">Your goals</h2>
              <p>Make room for what matters, one step at a time.</p>
            </div>
            <span className="goals-count">{filteredGoals.length} {filteredGoals.length === 1 ? "goal" : "goals"}</span>
          </div>

          <div className="goals-toolbar" role="search">
            <label className="goals-search">
              <Icon name="search" size={17} />
              <span className="goals-sr-only">Search goals</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find a goal…"
              />
              {search ? (
                <button type="button" className="goals-search__clear" onClick={() => setSearch("")} aria-label="Clear search">
                  <Icon name="close" size={15} />
                </button>
              ) : null}
            </label>
            <label className="goals-select">
              <span className="goals-sr-only">Filter by status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="all">All statuses</option>
                <option value="planned">Planned</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </label>
            <label className="goals-select">
              <span className="goals-sr-only">Filter by timeframe</span>
              <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
                <option value="all">All timeframes</option>
                <option value="year">Yearly</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </label>
            <label className="goals-select goals-select--sort">
              <span className="goals-sr-only">Sort goals</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="recent">Recently added</option>
                <option value="deadline">Deadline: soonest</option>
                <option value="progress-high">Progress: highest</option>
                <option value="progress-low">Progress: lowest</option>
              </select>
            </label>
          </div>

          {goals.length === 0 ? (
            <div className="goals-empty">
              <div className="goals-empty__symbol"><Icon name="target" size={26} /></div>
              <h3>Your galaxy is waiting.</h3>
              <p>Give your next study milestone a name. You can add steps whenever you’re ready.</p>
              <button type="button" className="goals-primary-button" onClick={openCreate}>
                <Icon name="plus" size={17} />
                Create your first goal
              </button>
            </div>
          ) : filteredGoals.length === 0 ? (
            <div className="goals-empty goals-empty--search">
              <div className="goals-empty__symbol"><Icon name="search" size={25} /></div>
              <h3>No goals found</h3>
              <p>Try another search or clear your filters to see all your goals.</p>
              <button type="button" className="goals-secondary-button" onClick={resetFilters}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="goal-grid">
              {filteredGoals.map(({ goal, steps }) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  steps={steps}
                  todayNumber={todayNumber}
                  expanded={expandedId === goal.id}
                  stepDraft={stepDrafts[goal.id] || ""}
                  stepBusy={stepBusy === goal.id}
                  goalBusy={goalBusy === goal.id}
                  busyTasks={busyTasks}
                  onToggle={toggleTask}
                  onExpand={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
                  onStepDraft={(value) => setStepDrafts((current) => ({ ...current, [goal.id]: value }))}
                  onAddStep={addStep}
                  onDelete={deleteGoal}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="goals-sidebar">
          <section className="goals-panel goals-calendar">
            <div className="goals-panel__heading">
              <div>
                <p className="goals-eyebrow">YOUR MONTH</p>
                <h2>{calendar.label}</h2>
              </div>
              <div className="goals-calendar__nav">
                <button
                  type="button"
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                  aria-label="Previous month"
                >‹</button>
                <button
                  type="button"
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                  aria-label="Next month"
                >›</button>
              </div>
            </div>
            <div className="goals-calendar__grid goals-calendar__weekdays" aria-hidden="true">
              {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
            </div>
            <div className="goals-calendar__grid">
              {calendar.cells.map((day, index) => {
                if (!day) return <span className="goals-calendar__blank" key={`blank-${index}`} />;
                const date = new Date(calendar.year, calendar.month, day);
                const key = dateKey(date);
                return (
                  <span
                    key={key}
                    className={`goals-calendar__day${key === todayKey ? " is-today" : ""}${taskDates.has(key) ? " has-task" : ""}`}
                    aria-label={`${date.toLocaleDateString("en", { month: "long", day: "numeric" })}${taskDates.has(key) ? ", has tasks" : ""}`}
                  >
                    {day}
                  </span>
                );
              })}
            </div>
            <p className="goals-calendar__legend"><span /> Days with tasks</p>
          </section>

          <section className="goals-panel goals-deadlines">
            <div className="goals-panel__heading">
              <div>
                <p className="goals-eyebrow">ON THE HORIZON</p>
                <h2>Upcoming deadlines</h2>
              </div>
              <span className="goals-panel__count">{upcomingDeadlines.length}</span>
            </div>
            {upcomingDeadlines.length ? (
              <ul className="goals-deadlines__list">
                {upcomingDeadlines.slice(0, 5).map(({ goal, daysLeft }) => (
                  <li key={goal.id}>
                    <span className={`goals-deadlines__marker${daysLeft <= 3 ? " is-soon" : ""}`} />
                    <span className="goals-deadlines__name">{goal.title}</span>
                    <span className="goals-deadlines__when">{daysLeft === 0 ? "Today" : `${daysLeft}d`}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="goals-panel__empty">A little breathing room. No deadlines in the next 10 days.</p>
            )}
          </section>
        </aside>
      </div>

      <section className="goals-daily">
        <div className="goals-daily__heading">
          <div>
            <p className="goals-eyebrow">SMALL STEPS, DAILY</p>
            <h2>Today’s tasks</h2>
          </div>
          <span className="goals-count">{todayTasks.filter((task) => task.done).length} / {todayTasks.length} done</span>
        </div>
        <form className="goals-daily__form" onSubmit={createTask}>
          <label className="goals-sr-only" htmlFor="daily-task">Add a task for today</label>
          <input id="daily-task" name="dailyTask" placeholder="What’s one thing you’d like to get done?" maxLength={240} />
          <button type="submit"><Icon name="plus" size={16} /> Add task</button>
        </form>
        {todayTasks.length ? (
          <ul className="goals-daily__list">
            {todayTasks.map((task) => (
              <li key={task.id} className={task.done ? "is-done" : ""}>
                <button
                  type="button"
                  className="goal-step__toggle"
                  aria-label={`${task.done ? "Mark incomplete" : "Complete"}: ${task.text}`}
                  aria-pressed={Boolean(task.done)}
                  disabled={busyTasks.has(task.id)}
                  onClick={() => toggleTask(task.id)}
                >
                  {task.done ? <Icon name="check" size={14} /> : null}
                </button>
                <span>{task.text}</span>
                {task.done ? <span className="goals-daily__done-label">Done</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="goals-daily__empty">No daily tasks yet. Add a small win for today.</p>
        )}
      </section>

      {showCreate ? (
        <div
          className="goals-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreate();
          }}
        >
          <section
            className="goals-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-goal-title"
            aria-describedby="create-goal-description"
          >
            <div className="goals-modal__header">
              <div className="goals-modal__icon"><Icon name="sparkle" size={20} /></div>
              <button type="button" className="goals-modal__close" onClick={closeCreate} aria-label="Close goal form" disabled={saving}>
                <Icon name="close" size={18} />
              </button>
              <p className="goals-eyebrow">A NEW POINT OF LIGHT</p>
              <h2 id="create-goal-title">Create a goal</h2>
              <p id="create-goal-description">Give your next milestone a place in your orbit.</p>
            </div>
            <form className="goals-form" onSubmit={createGoal} noValidate>
              <label htmlFor="goal-title">Goal name <span>Required</span></label>
              <input
                ref={titleInputRef}
                id="goal-title"
                value={newGoalTitle}
                onChange={(event) => {
                  setNewGoalTitle(event.target.value);
                  if (formError) setFormError("");
                }}
                placeholder="e.g. Prepare for my biology exam"
                maxLength={160}
                required
                aria-invalid={formError === "Add a title for your goal."}
                aria-describedby={formError ? "goal-form-error" : undefined}
              />
              <label htmlFor="goal-description">Description <span>Optional</span></label>
              <textarea
                id="goal-description"
                value={newGoalDescription}
                onChange={(event) => setNewGoalDescription(event.target.value)}
                placeholder="What will reaching this goal mean to you?"
                rows={3}
                maxLength={500}
              />
              <div className="goals-form__row">
                <div>
                  <label htmlFor="goal-type">Timeframe <span>Required</span></label>
                  <select id="goal-type" value={newGoalType} onChange={(event) => setNewGoalType(event.target.value)}>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="goal-deadline">Target date <span>Optional</span></label>
                  <input
                    id="goal-deadline"
                    type="date"
                    value={newGoalDeadline}
                    onChange={(event) => setNewGoalDeadline(event.target.value)}
                  />
                </div>
              </div>
              {formError ? <p className="goals-form__error" id="goal-form-error" role="alert">{formError}</p> : null}
              <div className="goals-form__actions">
                <button type="button" className="goals-secondary-button" onClick={closeCreate} disabled={saving}>Cancel</button>
                <button type="submit" className="goals-primary-button" disabled={saving}>
                  {saving ? "Saving…" : <><Icon name="plus" size={16} /> Save goal</>}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
