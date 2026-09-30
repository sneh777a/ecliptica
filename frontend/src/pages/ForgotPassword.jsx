import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AuthCosmos from "../components/AuthCosmos";

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

  return (
    <main className="auth-page min-h-screen bg-[#070817] text-white relative overflow-hidden">
      <AuthCosmos />
      <div className="auth-shell">
        <div className="w-full max-w-[520px]">
          <header className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/10 bg-white/[0.035] px-3.5 py-1.5 text-[10px] uppercase tracking-[0.24em] text-violet-200/65 backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-300 shadow-[0_0_10px_rgba(196,181,253,.9)]" />
              Find your way back
            </div>
            <h1 className="mt-3 text-4xl sm:text-5xl font-semibold tracking-[0.12em]">ECLIPTICA</h1>
          </header>

          <section className="relative overflow-hidden rounded-[30px] border border-white/[0.12] bg-white/[0.055] p-8 sm:p-10 backdrop-blur-2xl shadow-[0_25px_90px_rgba(0,0,0,.45),0_0_60px_rgba(124,58,237,.1)]">
            <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-500/10 blur-3xl" />
            <div className="auth-card-content">
              <h2 className="text-2xl sm:text-[27px] font-medium tracking-tight">Forgot your password? <span className="text-violet-300">✦</span></h2>
              <p className="mt-2 text-sm leading-6 text-white/38">Enter your email and we'll help you find your way back.</p>

              {error && <div role="alert" className="mt-6 rounded-2xl border border-rose-300/15 bg-rose-400/[0.055] px-4 py-3 text-sm text-rose-100/75">{error}</div>}

              {result ? (
                <div className="mt-7">
                  <div className="rounded-2xl border border-violet-200/10 bg-white/[0.025] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-200/10 bg-violet-300/[0.07] text-violet-200">✦</div>
                      <p className="text-sm leading-6 text-white/70">{result.message || "If that email is registered, a reset link has been sent."}</p>
                    </div>
                    <p className="mt-4 pl-12 text-xs leading-5 text-white/30">Check your inbox and spam folder for the reset link.</p>
                  </div>
                  <Link to="/login" className="mt-6 block text-center text-sm text-white/35 hover:text-white/70 transition">Back to sign in</Link>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                    <div>
                      <label className="mb-2.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Email</label>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"
                        className="w-full h-13 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-violet-300/40 focus:bg-white/[0.055] focus:shadow-[0_0_24px_rgba(139,92,246,.12)]" />
                    </div>
                    <button type="submit" disabled={loading} className="mt-2 w-full h-13 rounded-2xl border border-violet-200/20 bg-gradient-to-r from-violet-600/90 via-purple-500/90 to-fuchsia-500/80 text-sm font-medium shadow-[0_0_30px_rgba(139,92,246,.22)] transition hover:-translate-y-0.5 hover:shadow-[0_0_42px_rgba(139,92,246,.32)] disabled:opacity-50">
                      {loading ? "Sending..." : "Send reset link  ✦"}
                    </button>
                  </form>
                  <p className="mt-7 border-t border-white/[0.07] pt-6 text-center text-sm text-white/30">
                    <Link to="/login" className="text-violet-300 hover:text-violet-200 transition">Back to sign in</Link>
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
