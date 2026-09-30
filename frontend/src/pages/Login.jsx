import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthCosmos from "../components/AuthCosmos";

const API_URL = "https://ecliptica-api.onrender.com";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem("token", res.data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-white/5 border border-white/15 text-white rounded-2xl px-5 py-4 text-base placeholder:text-white/30 focus:outline-none focus:border-purple-400/50 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all duration-300";

  return (
    <div className="min-h-screen bg-[#07070c] flex items-center justify-center px-4 relative overflow-hidden">
      <AuthCosmos />

      <div className="w-full max-w-xl relative z-10">
        <div className="text-center mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-[0.08em] drop-shadow-[0_0_24px_rgba(168,85,247,0.35)]">
            Ecliptica
          </h1>
          <p className="text-white/40 mt-3 text-base">Your personal orbit</p>
        </div>

        <div className="relative rounded-[2rem] p-9 sm:p-12 bg-white/[0.06] backdrop-blur-2xl border border-white/20 shadow-[0_0_60px_rgba(139,92,246,0.12),inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/10" />

          <h2 className="relative text-2xl font-medium text-white/95 mb-2">
            Welcome back <span className="text-purple-300">✦</span>
          </h2>
          <p className="relative text-base text-white/40 mb-9">
            Your little space is waiting for you.
          </p>

          {error && (
            <div className="relative mb-5 text-sm text-red-200/90 bg-red-500/10 border border-red-400/20 rounded-2xl px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative space-y-7">
            <div>
              <label className="block text-xs font-medium text-white/45 mb-3 tracking-wider uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={inputClass}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-medium text-white/45 tracking-wider uppercase">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-purple-300/90 hover:text-purple-200 transition"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${inputClass} pr-12`}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-sm text-white/30 hover:text-white/70"
                >
                  {showPassword ? "◉" : "○"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-3 py-4 rounded-2xl font-medium text-white bg-gradient-to-r from-purple-600/90 to-violet-500/90 hover:from-purple-500 hover:to-violet-400 border border-white/20 shadow-[0_0_32px_rgba(139,92,246,0.35)] disabled:opacity-50 transition-all duration-300"
            >
              {loading ? "Entering your orbit..." : "Sign in  ✦"}
            </button>
          </form>

          <p className="relative text-center text-white/40 text-base mt-9">
            New to Ecliptica?{" "}
            <Link to="/register" className="text-purple-300 hover:text-purple-200 font-medium">
              Create your space
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
