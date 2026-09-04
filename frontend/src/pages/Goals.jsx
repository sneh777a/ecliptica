import { useState, useEffect } from "react";
import axios from "axios";

const API_URL = "https://ecliptica-api.onrender.com";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalType, setNewGoalType] = useState("weekly");
  const [newTaskText, setNewTaskText] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [goalsRes, tasksRes] = await Promise.all([
        api.get("/goals/"),
        api.get("/goals/tasks"),
      ]);
      setGoals(goalsRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load goals");
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
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create goal");
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
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create task");
    }
  };

  const toggleTask = async (taskId) => {
    try {
      await api.patch(`/goals/tasks/${taskId}/toggle`);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update task");
    }
  };

  const weeklyGoals = goals.filter((g) => g.type === "weekly");
  const monthlyGoals = goals.filter((g) => g.type === "monthly");
  const yearGoals = goals.filter((g) => g.type === "year");
  const todayTasks = tasks.filter((t) => t.type === "daily" || t.date);

  if (loading) {
    return <div className="text-gray-400 p-8">Loading goals...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Goals</h1>
        <p className="text-gray-400 text-sm mt-1">Weekly · Monthly · Year schedule</p>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {/* Add Goal */}
      <form onSubmit={createGoal} className="flex flex-wrap gap-3 items-center">
        <input
          value={newGoalTitle}
          onChange={(e) => setNewGoalTitle(e.target.value)}
          placeholder="New goal title..."
          className="bg-[#0f0f13] border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 flex-1 min-w-[200px]"
        />
        <select
          value={newGoalType}
          onChange={(e) => setNewGoalType(e.target.value)}
          className="bg-[#0f0f13] border border-gray-700 rounded-xl px-4 py-2.5 text-sm"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="year">Year</option>
        </select>
        <button type="submit" className="bg-purple-600 hover:bg-purple-500 px-5 py-2.5 rounded-xl text-sm">
          + Add Goal
        </button>
      </form>

      {/* Goals by type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Weekly */}
        <div className="bg-[#16161d] border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm uppercase tracking-wider text-purple-300 mb-4">Weekly Tasks</h2>
          {weeklyGoals.length === 0 && <p className="text-gray-500 text-sm">No weekly goals yet</p>}
          {weeklyGoals.map((g) => (
            <div key={g.id} className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>{g.title}</span>
                <span className="text-purple-400">{g.completed_count}/{g.target_count}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${g.progress}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Monthly */}
        <div className="bg-[#16161d] border border-gray-800 rounded-2xl p-5">
          <h2 className="text-sm uppercase tracking-wider text-cyan-300 mb-4">Monthly Tasks</h2>
          {monthlyGoals.length === 0 && <p className="text-gray-500 text-sm">No monthly goals yet</p>}
          {monthlyGoals.map((g) => (
            <div key={g.id} className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span>{g.title}</span>
                <span className="text-cyan-400">{g.completed_count}/{g.target_count}</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div className="bg-cyan-500 h-1.5 rounded-full" style={{ width: `${g.progress}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Year */}
