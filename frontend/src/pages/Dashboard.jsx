export default function Dashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Good day</h1>
        <p className="text-gray-400 text-sm mt-1">Here's your life overview</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Health Card */}
        <div className="bg-[#16161d] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm">Health</h3>
            <span className="text-xl">💪</span>
          </div>
          <p className="text-3xl font-semibold">4/6</p>
          <p className="text-sm text-gray-400 mt-1">Habits completed today</p>
          <p className="text-purple-400 text-sm mt-3">🔥 12 day streak</p>
        </div>

        {/* Finance Card */}
        <div className="bg-[#16161d] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm">Finance</h3>
            <span className="text-xl">💰</span>
          </div>
          <p className="text-3xl font-semibold">₹12,400</p>
          <p className="text-sm text-gray-400 mt-1">Current Balance</p>
          <p className="text-green-400 text-sm mt-3">+ ₹45,000 this month</p>
        </div>

        {/* Goals Card */}
        <div className="bg-[#16161d] border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400 text-sm">Goals</h3>
            <span className="text-xl">🎯</span>
          </div>
          <p className="text-3xl font-semibold">68%</p>
          <p className="text-sm text-gray-400 mt-1">Overall progress</p>
          <p className="text-purple-400 text-sm mt-3">3 active goals</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button className="bg-purple-600 hover:bg-purple-700 px-5 py-2.5 rounded-xl text-sm transition">
            + Add Habit
          </button>
          <button className="bg-[#16161d] border border-gray-700 hover:border-gray-500 px-5 py-2.5 rounded-xl text-sm transition">
            + Add Expense
          </button>
          <button className="bg-[#16161d] border border-gray-700 hover:border-gray-500 px-5 py-2.5 rounded-xl text-sm transition">
            + Add Goal
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-lg font-medium mb-4">Recent Activity</h2>
        <div className="bg-[#16161d] border border-gray-800 rounded-2xl divide-y divide-gray-800">
          <div className="px-5 py-4 flex justify-between items-center">
            <span className="text-sm">Completed “Drink Water”</span>
            <span className="text-xs text-gray-500">2 min ago</span>
          </div>
          <div className="px-5 py-4 flex justify-between items-center">
            <span className="text-sm">Added expense ₹250 (Food)</span>
            <span className="text-xs text-gray-500">1 hour ago</span>
          </div>
          <div className="px-5 py-4 flex justify-between items-center">
            <span className="text-sm">Updated goal “Learn React”</span>
            <span className="text-xs text-gray-500">Yesterday</span>
          </div>
        </div>
      </div>
    </div>
  );
}