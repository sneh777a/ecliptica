import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import AssistantWidget from "./AssistantWidget";
import AssistantProvider from "./AssistantProvider";

const navItems = [
  { to: "/dashboard", icon: "✦", label: "Dashboard" },
  { to: "/goals", icon: "◎", label: "Goals" },
  { to: "/health", icon: "♡", label: "Health" },
  { to: "/finance", icon: "◈", label: "Finance" },
  { to: "/assistant", icon: "✧", label: "Assistant" },
];

export default function Layout() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("ecliptica-sidebar-collapsed") === "true",
  );
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("ecliptica-sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed]);

  const handleLogout = () => { localStorage.removeItem("token"); navigate("/login"); };

  return (
    <AssistantProvider>
      <div className="min-h-screen bg-[#070817] text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-violet-600/10 blur-[110px]" />
          <div className="absolute right-0 top-1/3 h-96 w-96 rounded-full bg-indigo-500/10 blur-[130px]" />
        </div>

        <div className="relative z-10 flex min-h-screen gap-0 lg:gap-6">
          {isMobileOpen && (
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
            />
          )}

          <aside
            id="primary-sidebar"
            className={
              "fixed inset-y-0 left-0 z-30 flex w-[250px] flex-col border-r border-violet-300/[0.10] bg-gradient-to-b from-[#0d0a24]/95 via-[#08091b]/95 to-[#070817]/98] py-6 backdrop-blur-2xl shadow-[8px_0_40px_rgba(91,33,182,0.08)] transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 lg:transition-[width,padding] " +
              (isMobileOpen ? "visible translate-x-0" : "invisible -translate-x-full lg:visible") +
              (isCollapsed ? " lg:w-[76px] lg:px-2" : " lg:w-[250px] lg:px-5")
            }
          >
            <div className={"mb-8 flex items-center justify-between gap-3 px-3 lg:px-0 " + (isCollapsed ? "lg:flex-col lg:justify-start lg:gap-5" : "")}>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                aria-label="Ecliptica dashboard"
                className={"group flex items-center gap-3 text-left " + (isCollapsed ? "lg:justify-center" : "")}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-300/20 bg-gradient-to-br from-fuchsia-400/15 to-violet-500/15 text-lg text-violet-100 shadow-[0_0_24px_rgba(139,92,246,0.16)]">✦</span>
                <span className={"min-w-0 " + (isCollapsed ? "lg:hidden" : "")}>
                  <span className="block text-xl font-semibold tracking-wide">Ecliptica</span>
                  <span className="mt-0.5 block text-[11px] tracking-[0.18em] text-white/30 uppercase">Personal orbit</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-lg text-white/55 transition hover:bg-white/[0.06] hover:text-white lg:hidden"
              >
                ×
              </button>
              <button
                type="button"
                onClick={() => setIsCollapsed((collapsed) => !collapsed)}
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-lg text-white/55 transition hover:border-violet-300/20 hover:bg-white/[0.06] hover:text-white lg:flex"
              >
                {isCollapsed ? "›" : "‹"}
              </button>
            </div>

            <nav aria-label="Primary navigation" className="flex-1 space-y-2 px-3 lg:px-0">
              <p className={"mb-4 px-3 text-[10px] font-semibold tracking-[0.2em] text-white/25 uppercase " + (isCollapsed ? "lg:hidden" : "")}>Navigate</p>
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) =>
                  "group flex items-center rounded-2xl border py-3.5 text-sm transition-all duration-300 " +
                  "gap-3 px-4 " + (isCollapsed ? "lg:justify-center lg:gap-0 lg:px-2 " : "") +
                  (isActive
                    ? "border-violet-300/20 bg-gradient-to-r from-violet-600/25 to-fuchsia-500/10 text-violet-100 shadow-[0_0_24px_rgba(124,58,237,0.16)]"
                    : "border-transparent text-white/40 hover:bg-white/[0.045] hover:text-white/80")
                } title={item.label} aria-label={item.label} onClick={() => setIsMobileOpen(false)}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/[0.04] text-sm text-violet-200/80">{item.icon}</span>
                  <span className={isCollapsed ? "lg:hidden" : ""}>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="mx-3 border-t border-white/[0.07] pt-5 lg:mx-0">
              <button onClick={handleLogout} className={"flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-white/35 transition hover:bg-white/[0.04] hover:text-white/75 " + (isCollapsed ? "lg:justify-center lg:gap-0 lg:px-2" : "")}>
                <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/[0.04]">↗</span>
                <span className={isCollapsed ? "lg:hidden" : ""}>Sign out</span>
              </button>
            </div>
          </aside>

          <main className="min-h-screen min-w-0 flex-1 overflow-x-hidden">
            <div className="mx-auto min-h-screen w-full max-w-[1500px] px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
              <div className="mb-5 lg:hidden">
                <button
                  type="button"
                  aria-label="Open navigation menu"
                  aria-expanded={isMobileOpen}
                  aria-controls="primary-sidebar"
                  onClick={() => setIsMobileOpen(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-300/15 bg-white/[0.04] text-lg text-violet-100 transition hover:bg-white/[0.08]"
                >
                  <span aria-hidden="true">☰</span>
                </button>
              </div>
              <Outlet />
            </div>
          </main>
        </div>
        {pathname === "/assistant" ? null : <AssistantWidget />}
      </div>
    </AssistantProvider>
  );
}
