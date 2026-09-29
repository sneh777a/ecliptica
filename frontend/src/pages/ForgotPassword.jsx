import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const API_URL = "https://ecliptica-api.onrender.com";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Request failed");
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
              Find your way back
            </div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-[0.12em] text-white drop-shadow-[0_0_28px_rgba(167,139,250,0.3)]">
              ECLIPTICA
            </h1>
          </div>

          <section className="auth-card relative overflow-hidden rounded-[30px] border border-white/[0.13] bg-white/[0.055] p-9 sm:p-12 shadow-[0_25px_100px_rgba(0,0,0,0.45),0_0_70px_rgba(124,58,237,0.12),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-2xl">
            <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-violet-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-fuchsia-400/10 blur-3xl" />

            <div className="auth-card-content relative">
              <div className="auth-description mb-10">
                <p className="mb-3 text-2xl sm:text-3xl font-medium tracking-tight text-white">
                  Forgot your password? <span className="text-violet-300">✦</span>
                </p>
                <p className="text-sm leading-6 text-white/40">
                  Enter your email and we'll help you get back in.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-6 rounded-2xl border border-red-300/15 bg-red-400/[0.07] px-5 py-4 text-sm text-red-100/80"
                >
                  {error}
                </div>
              )}

              {result ? (
                <div className="flex flex-col gap-6">
                  <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/[0.07] px-5 py-5">
                    <div className="mb-3 text-lg text-emerald-200/90">✦</div>
                    <p className="text-sm leading-relaxed text-white/75">{result.message}</p>
                  </div>

                  {result.reset_token && (
                    <div className="rounded-2xl border border-violet-300/20 bg-violet-400/[0.08] px-5 py-5">
                      <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-violet-200/55">
                        Reset link
                      </p>
                      <Link
                        to={result.reset_path}
                        className="inline-flex items-center gap-2 text-sm font-medium text-violet-300 underline decoration-violet-300/30 underline-offset-4 transition hover:text-violet-200"
                      >
                        Set a new password
                        <span aria-hidden="true">→</span>
                      </Link>
                      <p className="mt-3 text-xs leading-5 text-white/30">
                        This link works for one hour. Keep it private.
                      </p>
                    </div>
                  )}

                  <Link
                    to="/login"
                    className="block pt-2 text-center text-sm text-white/40 transition hover:text-white/70"
                  >
                    Back to sign in
                  </Link>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="auth-form space-y-7">
                    <div>
                      <label className="auth-label mb-3 block text-xs font-medium uppercase tracking-[0.16em] text-white/45">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={`auth-input ${inputClass}`}
                        required
                        autoComplete="email"
                      />
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={loading}
                        className="auth-button group relative w-full overflow-hidden rounded-2xl border border-violet-200/20 bg-gradient-to-r from-violet-600/90 via-purple-500/90 to-fuchsia-500/80 py-4 font-medium text-white shadow-[0_0_30px_rgba(139,92,246,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_45px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                        <span className="relative">
                          {loading ? "Looking for your orbit..." : "Send reset link  ✦"}
                        </span>
                      </button>
                    </div>
                  </form>

                  <p className="mt-10 text-center text-base text-white/35">
                    <Link
                      to="/login"
                      className="font-medium text-violet-300 transition hover:text-violet-200"
                    >
                      Back to sign in
                    </Link>
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
