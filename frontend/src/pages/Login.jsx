import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();   // ← must be inside the function

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-wide">
            Ecliptica
          </h1>
          <p className="text-gray-400 mt-2 text-sm">
            Your personal orbit of life
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#16161d] border border-gray-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-6">Welcome back</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#0f0f13] border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0f0f13] border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-xl transition"
            >
              Sign In
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-6">
            Don’t have an account?{" "}
            <Link to="/register" className="text-purple-400 hover:text-purple-300">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}