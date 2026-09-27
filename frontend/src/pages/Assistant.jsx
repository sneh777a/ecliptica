import { useState, useRef, useEffect } from "react";

const QUICK = [
  "What should I do today?",
  "Plan my day",
  "Break down a goal",
  "I missed tasks — help me catch up",
];

export default function Assistant() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi — I'm Ecliptica AI. Tell me what you want to achieve, or paste a message (class, meeting, deadline). I'll help turn it into tasks.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text) => {
    const content = (text || input).trim();
    if (!content || loading) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", text: content }]);
    setLoading(true);

    // Phase 1: local reply only (no AI API yet)
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: "Got it. Real AI planning will connect next — for now this page is ready. Try a quick action below, or describe a goal like \"Learn Networking in 2 months\".",
        },
      ]);
      setLoading(false);
    }, 600);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send();
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          Assistant
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Plan goals, tasks, and your day — you stay in control
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            className="text-xs px-3 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/20 transition"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 rounded-2xl border border-white/5 bg-[#121218] p-4 mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-white/5 text-gray-200 border border-white/5"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-gray-500 px-1">Thinking…</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Ecliptica anything… or paste a WhatsApp message"
          className="flex-1 bg-[#0b0b0f] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-sm font-medium transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
