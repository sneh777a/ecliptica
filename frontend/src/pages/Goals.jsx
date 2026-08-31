import { useState } from "react";

export default function Goals() {
  const goals = [
    {
      id: 1,
      category: "Learning",
      title: "Learn React Advanced",
      description: "Master modern React development",
      progress: 80,
      milestones: "8 / 10 milestones",
      deadline: "Sep 30, 2026",
    },
    {
      id: 2,
      category: "Finance",
      title: "Save ₹1,00,000",
      description: "Emergency fund + laptop",
      progress: 40,
      milestones: "₹40K / ₹100K",
      deadline: "Dec 31, 2026",
    },
    {
      id: 3,
      category: "Health",
      title: "Run 5 km",
      description: "Build consistent running habit",
      progress: 60,
      milestones: "3 / 5 milestones",
      deadline: "Oct 15, 2026",
    },
  ];

  const dailyMissions = [
    { id: 1, text: "Study React", time: "09:00", done: false },
    { id: 2, text: "Complete project report", time: "14:00", done: false },
    { id: 3, text: "Gym", time: "18:00", done: true },
  ];

  const weeklyMissions = [
    { id: 1, text: "Team meeting", time: "Wed 14:00", done: false },
    { id: 2, text: "Review monthly budget", time: "Fri 10:00", done: false },
  ];

  const monthlyMissions = [
    { id: 1, text: "Pay rent", time: "01 Sep", done: false },
    { id: 2, text: "Submit assignment", time: "15 Sep", done: false },
  ];

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dates = [24, 25, 26, 27, 28, 29, 30];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-400 text-sm">✦</span>
            <span className="text-xs uppercase tracking-[0.25em] text-purple-300/70">
              Personal Journey
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Goals</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Your missions, milestones & progress
          </p>
        </div>
        <button className="bg-purple-600 hover:bg-purple-500 px-5 py-2.5 rounded-xl text-sm font-medium transition">
          + Add Goal
        </button>
      </div>

      {/* Journey Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-purple-400/10 bg-gradient-to-br from-purple-500/[0.08] to-transparent p-8">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="text-center relative">
          <div className="text-purple-300/60 text-sm mb-2">✦</div>
          <div className="text-5xl font-semibold tracking-tight mb-2">72%</div>
          <div className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-5">
            Overall Journey Progress
          </div>
          <div className="w-48 mx-auto bg-white/10 rounded-full h-1.5 mb-4">
            <div className="bg-purple-400 h-1.5 rounded-full" style={{ width: "72%" }} />
          </div>
          <p className="text-sm text-gray-400">
            4 of 6 goals on track · ↑ 12% from last month
          </p>
        </div>
      </div>

      {/* Active Missions (Goals) */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-medium">Active Missions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] backdrop-blur-xl p-6 hover:border-purple-400/30 hover:bg-white/[0.05] transition-all duration-300"
            >
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative">
                <div className="text-xs uppercase tracking-[0.15em] text-purple-300/70 mb-3">
                  ✦ {goal.category}
                </div>
                <h3 className="text-lg font-medium mb-1">{goal.title}</h3>
                <p className="text-sm text-gray-400 mb-5">{goal.description}</p>

                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-400">{goal.milestones}</span>
                  <span className="text-purple-300 font-medium">{goal.progress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5 mb-5">
                  <div
                    className="bg-purple-400 h-1.5 rounded-full"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>◷ {goal.deadline}</span>
                  <span className="text-purple-300 hover:text-purple-200 cursor-pointer">
                    View →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-medium">August 2026</h2>
          <div className="flex gap-4 text-gray-400 text-sm">
            <button className="hover:text-white transition">‹</button>
            <button className="hover:text-white transition">›</button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2 text-center text-sm">
          {days.map((day) => (
            <div key={day} className="text-gray-500 text-xs py-1 tracking-wider">
              {day}
            </div>
          ))}
          {dates.map((date) => (
            <div
              key={date}
              className={`py-2.5 rounded-xl cursor-pointer transition relative ${
                date === 28
                  ? "bg-purple-600/80 text-white"
                  : "hover:bg-white/5 text-gray-300"
              }`}
            >
              {date}
              {date === 28 && (
                <div className="flex justify-center gap-1 mt-1">
                  <div className="w-1 h-1 rounded-full bg-green-400" />
                  <div className="w-1 h-1 rounded-full bg-blue-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Daily */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
          <h3 className="text-sm uppercase tracking-[0.15em] text-gray-400 mb-4">
            Today’s Missions
          </h3>
          <div className="space-y-3">
            {dailyMissions.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border ${
                      task.done
                        ? "bg-purple-500 border-purple-500"
                        : "border-gray-600"
                    }`}
                  />
                  <span className={`text-sm ${task.done ? "text-gray-500 line-through" : "text-gray-200"}`}>
                    {task.text}
                  </span>
                </div>
                <span className="text-xs text-gray-500">{task.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
          <h3 className="text-sm uppercase tracking-[0.15em] text-gray-400 mb-4">
            Weekly Missions
          </h3>
          <div className="space-y-3">
            {weeklyMissions.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border border-gray-600" />
                  <span className="text-sm text-gray-200">{task.text}</span>
                </div>
                <span className="text-xs text-gray-500">{task.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-5">
          <h3 className="text-sm uppercase tracking-[0.15em] text-gray-400 mb-4">
            Monthly Missions
          </h3>
          <div className="space-y-3">
            {monthlyMissions.map((task) => (
              <div key={task.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border border-gray-600" />
                  <span className="text-sm text-gray-200">{task.text}</span>
                </div>
                <span className="text-xs text-gray-500">{task.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}