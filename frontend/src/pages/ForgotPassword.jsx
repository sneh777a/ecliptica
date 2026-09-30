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
            Forgot password? <span className="text-purple-300">✦</span>
          </h2>
          <p className="relative text-base text-white/40 mb-9">
            Enter your email and we will help you get back in.
          </p>

          {error && (
            <div className="relative mb-5 text-sm text-red-200/90 bg-red-500/10 border border-red-400/20 rounded-2xl px-4 py-3">
              {error}
            </div>
          )}

          {result ? (
            <div className="relative space-y-6">
              <div className="rounded-2xl border border-white/15 bg-white/5 px-5 py-5">
                <p className="text-sm leading-relaxed text-white/75">
                  {result.message ||
                    "If that email is registered, you can reset your password."}
                </p>
              </div>

              {result.reset_path && (
                <div className="rounded-2xl border border-purple-400/25 bg-purple-500/10 px-5 py-5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wider text-purple-200/70">
                    Your reset link
                  </p>
                  <Link
                    to={result.reset_path}
                    className="inline-flex text-sm font-medium text-purple-300 hover:text-purple-200 transition"
                  >
                    Set a new password →
                  </Link>
                  <p className="mt-3 text-xs text-white/35">This link works for 1 hour.</p>
                </div>
              )}

              <Link
                to="/login"
                className="block text-center text-sm text-purple-300 hover:text-purple-200 font-medium"
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <>
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-3 py-4 rounded-2xl font-medium text-white bg-gradient-to-r from-purple-600/90 to-violet-500/90 hover:from-purple-500 hover:to-violet-400 border border-white/20 shadow-[0_0_32px_rgba(139,92,246,0.35)] disabled:opacity-50 transition-all duration-300"
                >
                  {loading ? "Sending…" : "Send reset link  ✦"}
                </button>
              </form>

              <p className="relative text-center text-white/40 text-base mt-9">
                <Link to="/login" className="text-purple-300 hover:text-purple-200 font-medium">
                  Back to sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
