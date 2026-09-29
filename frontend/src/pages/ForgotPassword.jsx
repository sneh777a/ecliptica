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
    "w-full bg-black/20 border border-white/10 text-white rounded-2xl px-5 py-4 text-base placeholder:text-white/25 focus:outline-none focus:border-violet-300/45 focus:bg-white/[0.07] focus:shadow-[0_0_25px_rgba(139,92,246,0.13)] transition-all duration-300";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#070817] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute -right-32 top-1/4 h-[30rem] w-[30rem] rounded-full bg-fuchsia-500/10 blur-[130px]" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[32rem] w-[32rem] rounded-full bg-indigo-500/15 blur-[140px]" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.28em] text-violet-200/70">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
              Find your way back
            </div>
            <h1 className="text-4xl font-semibold tracking-[0.12em] text-white drop-shadow-[0_0_28px_rgba(167,139,250,0.3)]">
              ECLIPTICA
            </h1>
          </div>

          {/* Card */}
          <section className="rounded-[28px] border border-white/[0.12] bg-white/[0.055] p-8 shadow-[0_25px_80px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-10">
            <h2 className="mb-2 text-2xl font-medium text-white">
              Forgot password? <span className="text-violet-300">✦</span>
            </h2>
            <p className="mb-8 text-sm text-white/40">
              Enter your email and we will help you get back in.
            </p>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {result ? (
              <div className="flex flex-col gap-5">
                {/* Success message */}
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.07] px-5 py-5">
                  <p className="text-sm leading-relaxed text-white/80">
                    {result.message ||
                      "If that email is registered, you can reset your password."}
                  </p>
                </div>

                {/* In-app reset link (shown when API returns a token) */}
                {result.reset_path && (
                  <div className="rounded-2xl border border-violet-400/20 bg-violet-500/[0.08] px-5 py-5">
                    <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-violet-200/60">
                      Your reset link
                    </p>
                    <Link
                      to={result.reset_path}
                      className="inline-flex items-center gap-2 text-sm font-medium text-violet-300 underline decoration-violet-300/40 underline-offset-4 hover:text-violet-200"
                    >
                      Set a new password
                      <span aria-hidden="true">→</span>
                    </Link>
                    <p className="mt-3 text-xs text-white/35">
                      This link works for 1 hour.
                    </p>
                  </div>
                )}

                {!result.reset_path && (
                  <p className="text-xs text-white/35">
                    If an account exists, use the link from your email when mail is
                    set up.
                  </p>
                )}

                <Link
                  to="/login"
                  className="pt-2 text-center text-sm text-white/40 hover:text-white/70"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label className="mb-2.5 block text-xs font-medium uppercase tracking-[0.14em] text-white/45">
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-2xl border border-violet-200/20 bg-gradient-to-r from-violet-600 to-fuchsia-500 py-3.5 font-medium text-white shadow-[0_0_28px_rgba(139,92,246,0.3)] transition hover:opacity-95 disabled:opacity-50"
                  >
                    {loading ? "Sending…" : "Send reset link ✦"}
                  </button>
                </form>

                <p className="mt-8 text-center text-sm text-white/35">
                  <Link to="/login" className="text-violet-300 hover:text-violet-200">
                    Back to sign in
                  </Link>
                </p>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
