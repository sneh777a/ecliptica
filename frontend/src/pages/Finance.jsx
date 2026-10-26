import { useEffect, useMemo, useState } from "react";

import { createApi } from "../api";

const cardClass = "rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-[0_0_24px_rgba(59,130,246,0.08)]";

export default function Finance() {
  const token = localStorage.getItem("token");
  const api = useMemo(() => createApi(token), [token]);

  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({
    entry_type: "expense",
    category: "Housing",
    description: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [summary, setSummary] = useState({ income_total: 0, expense_total: 0, balance: 0, entries: [] });
  const [error, setError] = useState("");

  const fetchSummary = async () => {
    if (!token) return;
    try {
      const response = await api.get("/finance/summary");
      setSummary(response.data || { income_total: 0, expense_total: 0, balance: 0, entries: [] });
      setEntries(response.data?.entries || []);
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to load finance data.");
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [api, token]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      setError("Please sign in to save entries.");
      return;
    }

    try {
      await api.post("/finance/entries", {
        entry_type: form.entry_type,
        category: form.category,
        description: form.description,
        amount: Number(form.amount),
        date: form.date,
      });
      setForm({
        entry_type: "expense",
        category: "Housing",
        description: "",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
      });
      setError("");
      await fetchSummary();
    } catch (err) {
      setError(err?.response?.data?.detail || "Unable to save this entry.");
    }
  };

  return (
    <div className="space-y-6 pb-10 text-white">
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.28em] text-cyan-300/70">Finance</p>
        <h1 className="text-3xl font-semibold tracking-tight">Cash flow snapshot</h1>
      </div>

      {error ? <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className={cardClass}>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/60">Income</p>
          <p className="mt-3 text-3xl font-semibold">${summary.income_total.toFixed(2)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/60">Expenses</p>
          <p className="mt-3 text-3xl font-semibold">${summary.expense_total.toFixed(2)}</p>
        </div>
        <div className={cardClass}>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-300/60">Balance</p>
          <p className="mt-3 text-3xl font-semibold text-cyan-200">${summary.balance.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={handleSubmit} className={`${cardClass} space-y-4`}>
          <h2 className="text-lg font-semibold">Add entry</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span>Type</span>
              <select name="entry_type" value={form.entry_type} onChange={handleChange} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-white outline-none focus:border-cyan-300/40">
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Category</span>
              <input name="category" value={form.category} onChange={handleChange} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-white outline-none focus:border-cyan-300/40" placeholder="Housing" />
            </label>
          </div>

          <label className="block space-y-2 text-sm text-slate-200">
            <span>Description</span>
            <input name="description" value={form.description} onChange={handleChange} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-white outline-none focus:border-cyan-300/40" placeholder="Rent, salary, groceries..." />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-200">
              <span>Amount</span>
              <input type="number" min="0.01" step="0.01" name="amount" value={form.amount} onChange={handleChange} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-white outline-none focus:border-cyan-300/40" placeholder="0.00" />
            </label>

            <label className="space-y-2 text-sm text-slate-200">
              <span>Date</span>
              <input type="date" name="date" value={form.date} onChange={handleChange} className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2.5 text-white outline-none focus:border-cyan-300/40" />
            </label>
          </div>

          <button type="submit" className="w-full rounded-xl bg-cyan-500/15 px-4 py-3 text-sm font-medium text-cyan-100 ring-1 ring-cyan-400/20 transition hover:bg-cyan-500/25">
            Save entry
          </button>
        </form>

        <div className={`${cardClass} space-y-4`}>
          <h2 className="text-lg font-semibold">Recent entries</h2>

          {entries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-8 text-center text-sm text-slate-300">
              No finance entries yet. Add your first income or expense.
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/60 px-3 py-3">
                  <div>
                    <p className="font-medium text-white">{entry.category}</p>
                    <p className="text-xs text-slate-400">{entry.description || "No description"} · {entry.date}</p>
                  </div>
                  <div className={`text-right font-medium ${entry.entry_type === "income" ? "text-emerald-300" : "text-rose-300"}`}>
                    {entry.entry_type === "income" ? "+" : "-"}${Number(entry.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}