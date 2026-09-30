import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import AuthCosmos from "../components/AuthCosmos";

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
            Set a new password <span className="text-purple-300">✦</span>
          </h2>
          <p className="relative text-base text-white/40 mb-9">
            Choose something secure for your next chapter.
          </p>

          {error && (
            <div className="relative mb-5 text-sm text-red-200/90 bg-red-500/10 border border-red-400/20 rounded-2xl px-4 py-3">
              {error}
            </div>
          )}

          {done ? (
            <div className="relative rounded-2xl border border-white/15 bg-white/5 px-5 py-6 text-center">
              <p className="text-sm text-white/75">Password updated successfully.</p>
              <p className="mt-2 text-xs text-white/35">Taking you back to sign in…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="relative space-y-7">
              <div>
                <label className="block text-xs font-medium text-white/45 mb-3 tracking-wider uppercase">
                  New password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pr-12`}
                    required
                    autoComplete="new-password"
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

              <div>
                <label className="block text-xs font-medium text-white/45 mb-3 tracking-wider uppercase">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pr-12`}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-sm text-white/30 hover:text-white/70"
                  >
                    {showConfirm ? "◉" : "○"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-3 py-4 rounded-2xl font-medium text-white bg-gradient-to-r from-purple-600/90 to-violet-500/90 hover:from-purple-500 hover:to-violet-400 border border-white/20 shadow-[0_0_32px_rgba(139,92,246,0.35)] disabled:opacity-50 transition-all duration-300"
              >
                {loading ? "Updating…" : "Update password  ✦"}
              </button>
            </form>
          )}

          <p className="relative text-center text-white/40 text-base mt-9">
            <Link to="/login" className="text-purple-300 hover:text-purple-200 font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
