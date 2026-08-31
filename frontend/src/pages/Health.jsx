import { useState } from "react";

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

  const completedCount = habits.filter((h) => h.done).length;
  const totalCount = habits.length;
  const progressPercent = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const toggleHabit = (id) => {
    setHabits(
      habits.map((habit) =>
        habit.id === id ? { ...habit, done: !habit.done } : habit
      )
    );
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

  const deleteHabit = (id) => {
    setHabits(habits.filter((habit) => habit.id !== id));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Health</h1>
          <p className="text-gray-400 text-sm mt-1">Daily habits & streaks</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-purple-600 hover:bg-purple-500 px-5 py-2.5 rounded-xl text-sm font-medium transition"
        >
          + Add Habit
        </button>
      </div>

      {/* Progress Card */}
      <div className="bg-[#16161d] border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm text-gray-400">Today’s Progress</h2>
          <span className="text-purple-400 font-medium">
            {completedCount}/{totalCount} completed
          </span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-2.5 mb-2">
          <div
            className="bg-purple-500 h-2.5 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-400">{progressPercent}% of habits done today</p>
      </div>

      {/* Add Habit Form */}
      {showForm && (
        <form
          onSubmit={addHabit}
          className="bg-[#16161d] border border-gray-800 rounded-2xl p-5 flex gap-3"
        >
          <input
            type="text"
            value={newHabit}
            onChange={(e) => setNewHabit(e.target.value)}
            placeholder="Enter habit name..."
            className="flex-1 bg-[#0f0f13] border border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500"
            autoFocus
          />
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 px-5 py-2.5 rounded-xl text-sm transition"
          >
            Add
          </button>
        </form>
      )}

      {/* Habits List */}
      <div className="space-y-3">
        {habits.map((habit) => (
          <div
            key={habit.id}
            className="bg-[#16161d] border border-gray-800 rounded-2xl px-5 py-4 flex items-center justify-between hover:border-gray-700 transition"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={() => toggleHabit(habit.id)}
                className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                  habit.done
                    ? "bg-purple-600 border-purple-600"
                    : "border-gray-600 hover:border-purple-500"
                }`}
              >
                {habit.done && <span className="text-xs">✓</span>}
              </button>
              <div>
                <p
                  className={`font-medium ${
                    habit.done ? "text-gray-400 line-through" : "text-white"
                  }`}
                >
                  {habit.name}
                </p>
                <p className="text-xs text-purple-400 mt-0.5">
                  🔥 {habit.streak} day streak
                </p>
              </div>
            </div>

            <button
              onClick={() => deleteHabit(habit.id)}
              className="text-gray-500 hover:text-red-400 text-sm transition"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
