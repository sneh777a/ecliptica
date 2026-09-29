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

  return (
    <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-wide">Ecliptica</h1>
          <p className="text-gray-400 mt-2 text-sm">Reset your password</p>
        </div>

        <div className="bg-[#16161d] border border-gray-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Forgot password</h2>

          {error && (
            <div className="mb-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {result ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-300">{result.message}</p>
              {result.reset_token && (
                <div className="text-sm bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 space-y-2">
                  <p className="text-purple-200">Test reset link (no email yet):</p>
                  <Link
                    to={result.reset_path}
                    className="text-purple-400 hover:text-purple-300 break-all underline"
                  >
                    Set new password
                  </Link>
                </div>
              )}
              <Link to="/login" className="block text-center text-sm text-gray-400 hover:text-white">
                Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-[#0f0f13] border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-medium py-3 rounded-xl"
              >
                {loading ? "Sending..." : "Continue"}
              </button>
            </form>
          )}

          {!result && (
            <p className="text-center text-gray-400 text-sm mt-6">
              <Link to="/login" className="text-purple-400 hover:text-purple-300">
                Back to sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
