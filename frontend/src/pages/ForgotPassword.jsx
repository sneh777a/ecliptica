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
    "w-full bg-white/5 border border-white/15 text-white rounded-2xl px-4 py-3.5 text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-400/50 focus:bg-white/10 focus:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all duration-300";

  return (
    <div className="min-h-screen bg-[#07070c] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[15%] left-[20%] w-72 h-72 rounded-full bg-purple-600/20 blur-[90px]" />
        <div className="absolute bottom-[20%] right-[15%] w-96 h-96 rounded-full bg-indigo-600/15 blur-[110px]" />
        <div className="absolute top-[50%] right-[30%] w-40 h-40 rounded-full bg-fuchsia-500/10 blur-[60px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-white tracking-[0.08em] drop-shadow-[0_0_24px_rgba(168,85,247,0.35)]">
            Ecliptica
          </h1>
          <p className="text-white/40 mt-2 text-sm">Reset your password</p>
        </div>

        <div className="relative rounded-[2rem] p-8 bg-white/[0.06] backdrop-blur-2xl border border-white/20 shadow-[0_0_60px_rgba(139,92,246,0.12),inset_0_1px_0_rgba(255,255,255,0.1)]">
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] ring-1 ring-inset ring-white/10" />

          <h2 className="text-lg font-medium text-white/95 mb-1 relative">Forgot password</h2>
          <p className="text-sm text-white/40 mb-6 relative">We’ll help you get back in</p>

          {error && (
            <div className="mb-5 text-sm text-red-200/90 bg-red-500/10 border border-red-400/20 rounded-2xl px-4 py-3 relative">
              {error}
            </div>
          )}

          {result ? (
            <div className="space-y-4 relative">
              <p className="text-sm text-white/70">{result.message}</p>
              {result.reset_token && (
                <div className="text-sm bg-purple-500/10 border border-purple-400/25 rounded-2xl p-4 space-y-2">
                  <p className="text-purple-200/90">Test reset link (no email yet):</p>
                  <Link
                    to={result.reset_path}
                    className="text-purple-300 hover:text-purple-200 break-all underline"
                  >
                    Set new password
                  </Link>
                </div>
              )}
              <Link to="/login" className="block text-center text-sm text-white/40 hover:text-white/70 transition">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5 relative">
              <div>
                <label className="block text-xs font-medium text-white/45 mb-2 tracking-wider uppercase">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-2xl font-medium text-white bg-gradient-to-r from-purple-600/90 to-violet-500/90 hover:from-purple-500 hover:to-violet-400 border border-white/20 shadow-[0_0_32px_rgba(139,92,246,0.35)] hover:shadow-[0_0_48px_rgba(139,92,246,0.5)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
              >
                {loading ? "Sending..." : "Continue"}
              </button>
            </form>
          )}

          {!result && (
            <p className="text-center text-white/40 text-sm mt-8 relative">
              <Link to="/login" className="text-purple-300 hover:text-purple-200 font-medium transition">
                Back to sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
