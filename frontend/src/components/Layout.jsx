import { NavLink, Outlet, useNavigate } from "react-router-dom";

const navItems = [
  { to: "/dashboard", icon: "✦", label: "Dashboard" },
  { to: "/goals", icon: "◎", label: "Goals" },
  { to: "/health", icon: "♡", label: "Health" },
  { to: "/finance", icon: "◈", label: "Finance" },
  { to: "/assistant", icon: "✧", label: "Assistant" },
];

export default function Layout() {
  const navigate = useNavigate();
  const handleLogout = () => { localStorage.removeItem("token"); navigate("/login"); };

  return (
    <div className="min-h-screen bg-[#070817] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-violet-600/10 blur-[110px]" />
        <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-indigo-500/10 blur-[130px]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[250px] shrink-0 border-r border-violet-300/[0.10] bg-gradient-to-b from-[#0d0a24]/95 via-[#08091b]/95 to-[#070817]/98] px-5 py-7 backdrop-blur-2xl shadow-[8px_0_40px_rgba(91,33,182,0.08)] lg:flex lg:flex-col">
          <button onClick={() => navigate("/dashboard")} className="mb-11 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-300/20 bg-gradient-to-br from-fuchsia-400/15 to-violet-500/15 text-lg text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.16)]">✦</div>
              <div>
                <h1 className="text-xl font-semibold tracking-wide">Ecliptica</h1>
                <p className="mt-0.5 text-[11px] tracking-[0.18em] text-white/30 uppercase">Personal orbit</p>
              </div>
            </div>
          </button>

          <nav className="flex-1 space-y-2">
            <p className="mb-4 px-3 text-[10px] font-semibold tracking-[0.2em] text-white/25 uppercase">Navigate</p>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) =>
                "group flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm transition-all duration-300 " +
                (isActive
                  ? "border-violet-300/20 bg-gradient-to-r from-violet-600/25 to-fuchsia-500/10 text-violet-100 shadow-[0_0_24px_rgba(124,58,237,0.16)]"
                  : "border-transparent text-white/40 hover:bg-white/[0.045] hover:text-white/80")
              }>
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/[0.04] text-sm text-violet-200/80">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="border-t border-white/[0.07] pt-5">
            <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/35 transition hover:bg-white/[0.04] hover:text-white/75">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/[0.04]">↗</span>
              Sign out
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto min-h-screen w-full max-w-[1500px] px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
