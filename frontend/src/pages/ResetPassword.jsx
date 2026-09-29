import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";

const API_URL = "https://ecliptica-api.onrender.com";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!token) {
      setError("Missing reset token. Request a new link.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_URL}/auth/reset-password`, {
        token,
        new_password: password,
      });
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full bg-black/20 border border-white/10 text-white rounded-2xl px-5 py-4 text-base placeholder:text-white/20 focus:outline-none focus:border-violet-300/45 focus:bg-white/[0.07] focus:shadow-[0_0_25px_rgba(139,92,246,0.13)] transition-all duration-300";

  return (
    <main className="auth-page relative min-h-screen overflow-hidden bg-[#070817] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -right-32 top-1/4 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/10 blur-[130px]" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-indigo-500/15 blur-[140px]" />
        <div className="absolute left-[12%] top-[20%] h-1 w-1 animate-pulse rounded-full bg-white/70 shadow-[0_0_12px_rgba(255,255,255,0.8)]" />
        <div className="absolute right-[17%] top-[17%] h-1 w-1 animate-pulse rounded-full bg-white/60" />
        <div className="absolute left-[8%] top-[52%] text-xs text-white/20">✦</div>
        <div className="absolute right-[10%] top-[65%] text-sm text-violet-200/25">✧</div>
      </div>

      <div className="auth-shell relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <div className="auth-container w-full max-w-xl">
          <div className="auth-brand mb-10 text-center sm:mb-12">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-violet-200/70 backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,0.9)]" />
              One last step
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-[0.12em] text-white drop-shadow-[0_0_28px_rgba(167,139,250,0.3)]">ECLIPTICA</h1>
          </div>

          <section className="auth-card relative overflow-hidden rounded-[30px] border border-white/[0.13] bg-white/[0.055] p-9 sm:p-12 shadow-[0_25px_100px_rgba(0,0,0,0.45),0_0_70px_rgba(124,58,237,0.12),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl sm:p-9">
            <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-violet-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-fuchsia-400/10 blur-3xl" />

            <div className="auth-card-content relative">
              <div className="auth-description mb-9">
                <p className="mb-2 text-2xl sm:text-3xl font-medium tracking-tight text-white">Set a new password <span className="text-violet-300">✦</span></p>
                <p className="text-sm leading-6 text-white/40">Choose something secure for your next chapter.</p>
              </div>

              {error && <div role="alert" className="mb-5 rounded-2xl border border-red-300/15 bg-red-400/[0.07] px-4 py-3 text-sm text-red-100/80">{error}</div>}

              {done ? (
                <div className="rounded-2xl border border-emerald-300/10 bg-emerald-400/[0.06] p-5 text-center">
                  <div className="mb-2 text-2xl text-emerald-200/90">✦</div>
                  <p className="text-sm leading-6 text-white/70">Password updated successfully.</p>
                  <p className="mt-1 text-xs text-white/30">Taking you back to sign in…</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="auth-form space-y-7">
                  <div>
                    <label className="auth-label mb-3 block text-xs font-medium uppercase tracking-[0.16em] text-white/45">New password</label>
                    <div className="auth-password relative">
                      <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className={`auth-input ${inputClass} pr-12`} required autoComplete="new-password" />
                      <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm text-white/30 transition hover:text-white/70">{showPassword ? "◉" : "○"}</button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-white/45">Confirm password</label>
                    <div className="auth-password relative">
                      <input type={showConfirm ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" className={`auth-input ${inputClass} pr-12`} required autoComplete="new-password" />
                      <button type="button" onClick={() => setShowConfirm((value) => !value)} aria-label={showConfirm ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-sm text-white/30 transition hover:text-white/70">{showConfirm ? "◉" : "○"}</button>
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="auth-button group relative mt-3 w-full overflow-hidden rounded-2xl border border-violet-200/20 bg-gradient-to-r from-violet-600/90 via-purple-500/90 to-fuchsia-500/80 py-4 font-medium text-white shadow-[0_0_30px_rgba(139,92,246,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_45px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-50">
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    <span className="relative">{loading ? "Updating your orbit..." : "Update password  ✦"}</span>
                  </button>
                </form>
              )}

              <p className="mt-9 text-center text-base text-white/35">
                <Link to="/login" className="font-medium text-violet-300 transition hover:text-violet-200">Back to sign in</Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}