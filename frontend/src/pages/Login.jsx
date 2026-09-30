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

  return (
    <main className="auth-page min-h-screen bg-[#070817] text-white relative overflow-hidden">
      <AuthCosmos />
      <div className="relative z-10 min-h-screen flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-[520px]">
          <header className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/10 bg-white/[0.035] px-3.5 py-1.5 text-[10px] uppercase tracking-[0.24em] text-violet-200/65 backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,.9)]" />
              Your personal orbit
            </div>
            <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-[0.12em]">ECLIPTICA</h1>
          </header>

          <section className="relative overflow-hidden rounded-[30px] border border-white/[0.12] bg-white/[0.055] p-8 sm:p-10 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,.45),0_0_60px_rgba(124,58,237,.1)]">
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl sm:text-[27px] font-medium tracking-tight">Welcome back <span className="text-violet-300">✦</span></h2>
              <p className="mt-2 text-sm leading-6 text-white/38">Your little space is waiting for you.</p>

              {error && (
                <div role="alert" className="mt-6 rounded-2xl border border-rose-300/15 bg-rose-400/[0.055] px-4 py-3 text-sm text-rose-100/75">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <div>
                  <label className="mb-2.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"
                    className="w-full h-13 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-violet-300/40 focus:bg-white/[0.055] focus:shadow-[0_0_24px_rgba(139,92,246,.12)]" />
                </div>

                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Password</label>
                    <Link to="/forgot-password" className="text-xs text-violet-300/75 hover:text-violet-200 transition">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password"
                      className="w-full h-13 rounded-2xl border border-white/10 bg-black/20 px-4 pr-12 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-violet-300/40 focus:bg-white/[0.055] focus:shadow-[0_0_24px_rgba(139,92,246,.12)]" />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-2 py-1.5 text-xs text-white/30 hover:text-white/70 transition" aria-label="Toggle password visibility">
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="relative mt-2 w-full h-13 overflow-hidden rounded-2xl border border-violet-200/20 bg-gradient-to-r from-violet-600/90 via-purple-500/90 to-fuchsia-500/80 text-sm font-medium shadow-[0_0_30px_rgba(139,92,246,.22)] transition hover:-translate-y-0.5 hover:shadow-[0_0_42px_rgba(139,92,246,.32)] disabled:opacity-50">
                  {loading ? "Entering your orbit..." : "Sign in  ✦"}
                </button>
              </form>

              <div className="mt-7 border-t border-white/[0.07] pt-6 text-center text-sm text-white/30">
                New to Ecliptica?{" "}
                <Link to="/register" className="text-violet-300 hover:text-violet-200 transition">Create your space</Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
