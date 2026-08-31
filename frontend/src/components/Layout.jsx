import { NavLink, Outlet, useNavigate } from "react-router-dom";

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Later we will clear the token
    navigate("/login");
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl transition ${
      isActive
        ? "bg-purple-600/20 text-purple-400"
        : "text-gray-400 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111118] border-r border-gray-800 p-5 flex flex-col">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-wide">Ecliptica</h1>
          <p className="text-xs text-gray-500 mt-1">Personal OS</p>
        </div>

        <nav className="flex-1 space-y-1">
          <NavLink to="/dashboard" className={linkClass}>
            <span>🏠</span> Dashboard
          </NavLink>
          <NavLink to="/health" className={linkClass}>
            <span>💪</span> Health
          </NavLink>
          <NavLink to="/finance" className={linkClass}>
            <span>💰</span> Finance
          </NavLink>
          <NavLink to="/goals" className={linkClass}>
            <span>🎯</span> Goals
          </NavLink>
        </nav>

        <div className="space-y-1 pt-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition"
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}