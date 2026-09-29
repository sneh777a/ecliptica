const stats = [
  { label: "Health", value: "4/6", detail: "Habits completed today", note: "12 day streak", icon: "♡", glow: "from-emerald-400/15 to-cyan-400/5" },
  { label: "Finance", value: "₹12,400", detail: "Current balance", note: "+ ₹45,000 this month", icon: "◈", glow: "from-amber-300/15 to-orange-400/5" },
  { label: "Goals", value: "68%", detail: "Overall progress", note: "3 active goals", icon: "◎", glow: "from-violet-400/20 to-fuchsia-400/5" },
];

const schedule = [
  { time: "09:00", title: "Deep work", meta: "Focus session", active: true },
  { time: "13:00", title: "Lunch & reset", meta: "Personal time" },
  { time: "17:00", title: "Networking study", meta: "Learning block" },
  { time: "21:00", title: "Daily reflection", meta: "Wind down" },
];

export default function Dashboard() {
  return (
    <div className="relative space-y-8 pb-10">
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-[100px]" />

      <header className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-medium tracking-[0.22em] text-violet-300/55 uppercase">Your orbit</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Good day, Sneha <span className="text-violet-300">✦</span></h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/35">A quiet overview of what is moving in your life today.</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] px-4 py-3 text-right backdrop-blur-xl">
          <p className="text-[10px] tracking-[0.18em] text-white/25 uppercase">Today</p>
          <p className="mt-1 text-sm text-white/70">Your space is yours.</p>
        </div>
      </header>

      <section className="grid gap-5 md:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className={"group relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-gradient-to-br " + stat.glow + " bg-white/[0.035] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-violet-300/15"}>
            <div className="relative flex items-center justify-between">
              <span className="text-sm text-white/40">{stat.label}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-violet-200/80">{stat.icon}</span>
            </div>
            <p className="relative mt-6 text-3xl font-semibold tracking-tight">{stat.value}</p>
            <p className="relative mt-1 text-xs text-white/30">{stat.detail}</p>
            <p className="relative mt-5 text-xs text-violet-200/65">✦ {stat.note}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.035] p-6 backdrop-blur-xl sm:p-7">
          <div className="mb-7 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-medium tracking-[0.2em] text-white/25 uppercase">Your day</p>
              <h2 className="mt-1 text-xl font-medium">Today's rhythm</h2>
            </div>
            <span className="rounded-full border border-violet-300/10 bg-violet-400/5 px-3 py-1.5 text-[11px] text-violet-200/60">4 blocks</span>
          </div>
          <div className="space-y-3">
            {schedule.map((item) => (
              <div key={item.time} className={"group flex items-center gap-4 rounded-2xl border p-4 transition " + (item.active ? "border-violet-300/15 bg-violet-500/[0.07]" : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.045]")}>
                <span className="w-12 shrink-0 text-xs text-white/25">{item.time}</span>
                <span className={"h-2 w-2 shrink-0 rounded-full " + (item.active ? "bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.8)]" : "bg-white/20")} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80">{item.title}</p>
                  <p className="mt-1 text-xs text-white/25">{item.meta}</p>
                </div>
                <span className="text-white/20 transition group-hover:text-violet-200/50">→</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[28px] border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.09] to-fuchsia-500/[0.03] p-6 backdrop-blur-xl sm:p-7">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-400/10 blur-3xl" />
          <p className="relative text-[10px] font-medium tracking-[0.2em] text-violet-200/45 uppercase">Quick actions</p>
          <h2 className="relative mt-2 text-xl font-medium">What do you want to move?</h2>
          <p className="relative mt-2 text-sm leading-6 text-white/30">Keep small actions close so your day stays easy to navigate.</p>
          <div className="relative mt-7 grid gap-3">
            <button className="rounded-2xl border border-violet-300/15 bg-violet-500/10 px-4 py-3.5 text-left text-sm text-violet-100 transition hover:bg-violet-500/15"><span className="mr-3 text-violet-300">+</span>Add a habit</button>
            <button className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3.5 text-left text-sm text-white/65 transition hover:bg-white/[0.06]"><span className="mr-3 text-white/30">+</span>Add an expense</button>
            <button className="rounded-2xl border border-white/[0.07] bg-white/[0.035] px-4 py-3.5 text-left text-sm text-white/65 transition hover:bg-white/[0.06]"><span className="mr-3 text-white/30">+</span>Create a goal</button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-5 sm:px-7">
          <div>
            <p className="text-[10px] font-medium tracking-[0.2em] text-white/25 uppercase">Timeline</p>
            <h2 className="mt-1 text-lg font-medium">Recent activity</h2>
          </div>
          <span className="text-xs text-white/20">Your latest orbit changes</span>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {[
            ["Completed “Drink Water”", "2 min ago"],
            ["Added expense ₹250 · Food", "1 hour ago"],
            ["Updated goal “Learn React”", "Yesterday"],
          ].map(([text, time]) => (
            <div key={text} className="flex items-center gap-4 px-6 py-4 sm:px-7">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-400/5 text-xs text-violet-200/50">✦</span>
              <span className="flex-1 text-sm text-white/55">{text}</span>
              <span className="text-[11px] text-white/20">{time}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="pointer-events-none flex justify-center pt-1">
        <span className="text-[10px] tracking-[0.25em] text-white/15 uppercase">✦ stay in your orbit ✦</span>
      </div>
    </div>
  );
}
