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
        <aside className="hidden w-[250px] shrink-0 border-r border-white/[0.08] bg-white/[0.025] px-5 py-6 backdrop-blur-2xl lg:flex lg:flex-col">
          <button onClick={() => navigate("/dashboard")} className="mb-10 text-left">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-300/20 bg-violet-500/10 text-lg text-violet-200">✦</div>
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
                "group flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm transition-all " +
                (isActive
                  ? "border-violet-300/15 bg-violet-500/10 text-violet-200"
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
