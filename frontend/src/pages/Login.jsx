import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import AuthCosmos from "../components/AuthCosmos";
import { API_URL, formatApiError } from "../api";

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
      setError(formatApiError(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page min-h-screen bg-[#070817] text-white relative overflow-hidden">
      <AuthCosmos />
      <div className="auth-shell">
        <div className="auth-container">
          <header className="auth-brand">
            <h1>Ecliptica</h1>
            <p>Your personal orbit</p>
          </header>

          <section className="auth-card">
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="auth-card-content">
              <h2 className="text-2xl sm:text-[27px] font-medium tracking-tight">
                Welcome back <span className="text-violet-300">✦</span>
              </h2>
              <p className="mt-2 text-sm leading-6 text-white/38">
                Your little space is waiting for you.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-6 rounded-2xl border border-rose-300/15 bg-rose-400/[0.055] px-4 py-3 text-sm text-rose-100/75"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div>
                  <label className="mb-2.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="auth-input w-full h-[60px] rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-violet-300/40 focus:bg-white/[0.055] focus:shadow-[0_0_24px_rgba(139,92,246,.12)]"
                  />
                </div>

                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                      Password
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-violet-300/75 hover:text-violet-200 transition"
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
                      required
                      autoComplete="current-password"
                      className="w-full h-14 rounded-2xl border border-white/10 bg-black/20 px-4 pr-12 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-violet-300/40 focus:bg-white/[0.055] focus:shadow-[0_0_24px_rgba(139,92,246,.12)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1.5 text-xs text-violet-200/80 hover:text-white transition"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-button relative mt-3 w-full h-[60px] overflow-hidden rounded-2xl border border-violet-200/20 bg-gradient-to-r from-violet-600/90 via-purple-500/90 to-fuchsia-500/80 text-sm font-medium shadow-[0_0_30px_rgba(139,92,246,.22)] transition hover:-translate-y-0.5 hover:shadow-[0_0_42px_rgba(139,92,246,.32)] disabled:opacity-50"
                >
                  {loading ? "Entering your orbit..." : "Sign in  ✦"}
                </button>
              </form>

              <div className="auth-footer">
                New to Ecliptica?{" "}
                <Link to="/register" className="text-violet-300 hover:text-violet-200 transition">
                  Create your space
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
