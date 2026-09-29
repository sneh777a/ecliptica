import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "https://ecliptica-api.onrender.com";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/register`, { name, email, password });
      const loginRes = await axios.post(`${API_URL}/auth/login`, { email, password });
      localStorage.setItem("token", loginRes.data.access_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-black/20 border border-white/10 text-white rounded-2xl px-4 py-3.5 text-sm placeholder:text-white/20 focus:outline-none focus:border-violet-300/45 focus:bg-white/[0.07] focus:shadow-[0_0_25px_rgba(139,92,246,0.13)] transition-all duration-300";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070817] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -right-32 top-1/4 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/10 blur-[130px]" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-indigo-500/15 blur-[140px]" />
        <div className="absolute left-[12%] top-[20%] h-1 w-1 animate-pulse rounded-full bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
        <div className="absolute right-[17%] top-[17%] h-1 w-1 animate-pulse rounded-full bg-white/60 [animation-delay:1200ms]" />
        <div className="absolute left-[8%] top-[52%] text-xs text-white/20">✦</div>
        <div className="absolute right-[10%] top-[65%] text-sm text-violet-200/25">✧</div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-[430px]">
          <div className="mb-7 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-violet-200/70 backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.9)]" />
              Begin your journey
            </div>
            <h1 className="text-4xl font-semibold tracking-[0.12em] text-white drop-shadow-[0_0_28px_rgba(167,139,250,0.3)]">
              ECLIPTICA
            </h1>
          </div>

          <section className="relative overflow-hidden rounded-[30px] border border-white/[0.13] bg-white/[0.055] p-7 shadow-[0_25px_100px_rgba(0,0,0,0.45),0_0_70px_rgba(124,58,237,0.12),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl sm:p-9">
            <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-violet-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-fuchsia-400/10 blur-3xl" />

            <div className="relative">
              <div className="mb-7">
                <p className="mb-2 text-2xl font-medium tracking-tight text-white">
                  Create your space <span className="text-violet-300">✦</span>
                </p>
                <p className="text-sm leading-6 text-white/40">
                  A little space for your goals, plans & growth.
                </p>
              </div>

              {error && (
                <div role="alert" className="mb-5 rounded-2xl border border-red-300/15 bg-red-400/[0.07] px-4 py-3 text-sm text-red-100/80">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-white/45">Full name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputClass} required autoComplete="name" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-white/45">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} required autoComplete="email" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-white/45">Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={`${inputClass} pr-12`} required autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm text-white/30 transition hover:text-white/70">
                      {showPassword ? "◉" : "○"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-white/45">Confirm password</label>
                  <div className="relative">
                    <input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className={`${inputClass} pr-12`} required autoComplete="new-password" />
                    <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm text-white/30 transition hover:text-white/70">
                      {showConfirmPassword ? "◉" : "○"}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="group relative mt-2 w-full overflow-hidden rounded-2xl border border-violet-200/20 bg-gradient-to-r from-violet-600/90 via-purple-500/90 to-fuchsia-500/80 py-3.5 font-medium text-white shadow-[0_0_30px_rgba(139,92,246,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_45px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-50">
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative">{loading ? "Creating your orbit..." : "Create account  ✦"}</span>
                </button>
              </form>

              <div className="my-7 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/[0.07]" />
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/20">Ecliptica</span>
                <div className="h-px flex-1 bg-white/[0.07]" />
              </div>

              <p className="text-center text-sm text-white/35">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-violet-300 transition hover:text-violet-200">Sign in</Link>
              </p>
            </div>
          </section>

          <p className="mt-6 text-center text-[11px] tracking-wide text-white/20">Your journey starts with one small step ✨</p>
        </div>
      </div>
    </main>
  );
}