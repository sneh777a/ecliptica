import { useState, useRef, useEffect } from "react";
import { createApi, formatApiError } from "../api";

const QUICK = [
  "what should i focus on today?",
  "exam next week help me plan",
  "put a TOC goal in my app with steps",
  "how are my goals looking overall?",
];

const CHAT_STORAGE_KEY = "ecliptica_assistant_chat_v1";
const MAX_STORED = 120;
const MAX_IMAGE_MB = 4;
const MAX_PDF_MB = 8;

const WELCOME = {
  role: "assistant",
  text:
    "I'm your Ecliptica coach — talk the same way you would to Gemini.\n\nI can see your **Goals**, **tasks**, and **Dashboard** schedule live, and I can add goals, steps, and tasks when you want.\n\nYou can **attach an image or PDF** (screenshot, syllabus, past papers, timetable) — I'll read the text.\n\nChat is saved on this device — scroll up for earlier messages.",
  at: null,
  imagePreview: null,
};

function loadChatLog() {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return [WELCOME];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return [WELCOME];
    return parsed
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.text)
      .map((m) => ({
        role: m.role,
        text: String(m.text),
        at: m.at || null,
        imagePreview: null,
        hadImage: Boolean(m.hadImage),
        hadPdf: Boolean(m.hadPdf),
      }));
  } catch {
    return [WELCOME];
  }
}

function saveChatLog(messages) {
  try {
    const trimmed = messages.slice(-MAX_STORED).map((m) => ({
      role: m.role,
      text: m.text,
      at: m.at || null,
      hadImage: Boolean(m.hadImage || m.imagePreview),
      hadPdf: Boolean(m.hadPdf),
    }));
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

function formatTime(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export default function Assistant() {
  const [messages, setMessages] = useState(() => loadChatLog());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const didInitialScroll = useRef(false);

  useEffect(() => {
    saveChatLog(messages);
  }, [messages]);

  useEffect(() => {
    if (!didInitialScroll.current) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
      didInitialScroll.current = true;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const clearChat = () => {
    if (!window.confirm("Clear this chat log on this device? Goals in the app stay safe.")) {
      return;
    }
    const fresh = [{ ...WELCOME, at: new Date().toISOString() }];
    setMessages(fresh);
    saveChatLog(fresh);
    setError("");
    setPendingImage(null);
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");

    if (!isImage && !isPdf) {
      setError("Please choose an image (png, jpg, webp) or a PDF");
      return;
    }
    if (isImage && file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`Image is too large (max ${MAX_IMAGE_MB}MB)`);
      return;
    }
    if (isPdf && file.size > MAX_PDF_MB * 1024 * 1024) {
      setError(`PDF is too large (max ${MAX_PDF_MB}MB)`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const parts = dataUrl.split(",");
      const base64 = parts.length > 1 ? parts[1] : "";
      if (!base64) {
        setError("Could not read that file");
        return;
      }
      setPendingImage({
        kind: isPdf ? "pdf" : "image",
        name: file.name,
        base64,
        mime: isPdf ? "application/pdf" : file.type || "image/jpeg",
        preview: isImage ? dataUrl : null,
      });
      setError("");
    };
    reader.onerror = () => setError("Could not read that file");
    reader.readAsDataURL(file);
  };

  const send = async (text) => {
    const content = (text || input).trim();
    if ((!content && !pendingImage) || loading) return;

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const fileToSend = pendingImage;
    const displayText =
      content ||
      (fileToSend?.kind === "pdf"
        ? `📄 Please read this PDF${fileToSend.name ? `: ${fileToSend.name}` : ""}`
        : fileToSend
          ? "📷 Please read this image"
          : "");

    setInput("");
    setPendingImage(null);
    setError("");
    const now = new Date().toISOString();
    setMessages((m) => [
      ...m,
      {
        role: "user",
        text: displayText,
        at: now,
        imagePreview: fileToSend?.preview || null,
        hadImage: fileToSend?.kind === "image",
        hadPdf: fileToSend?.kind === "pdf",
      },
    ]);
    setLoading(true);

    try {
      const api = createApi(token, 120000);
      const history = messages
        .filter((m) => m.text && m.role !== "system")
        .slice(-16)
        .map((m) => ({ role: m.role, text: m.text }));

      const payload = {
        message: content || displayText,
        history,
      };
      if (fileToSend?.kind === "image") {
        payload.image_base64 = fileToSend.base64;
        payload.image_mime = fileToSend.mime;
      }
      if (fileToSend?.kind === "pdf") {
        payload.pdf_base64 = fileToSend.base64;
      }

      const res = await api.post("/assistant/chat", payload);

      let reply =
        res.data?.reply ||
        "I could not generate a reply. Please try again.";

      const applied = res.data?.actions_applied;
      if (Array.isArray(applied) && applied.length > 0 && !reply.includes("✓")) {
        reply +=
          "\n\n—\n" +
          applied.map((a) => `✓ ${a}`).join("\n");
      }

      setMessages((m) => [
        ...m,
        { role: "assistant", text: reply, at: new Date().toISOString() },
      ]);
    } catch (err) {
      const msg = formatApiError(err, "Assistant request failed");
      setError(msg);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: `Sorry — I hit a problem: ${msg}`,
          at: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send();
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-3xl flex-col">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Assistant</h1>
          <p className="mt-1 text-sm text-gray-400">
            Chat log · images & PDFs · scroll up for history
          </p>
        </div>
        <button
          type="button"
          onClick={clearChat}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-gray-400 transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-200"
        >
          Clear log
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {QUICK.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            disabled={loading}
            className="rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-200 transition hover:bg-purple-500/20 disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200/90">
          {error}
        </div>
      ) : null}

      <div className="mb-4 flex-1 space-y-3 overflow-y-auto rounded-2xl border border-white/5 bg-[#121218] p-4">
        {messages.map((msg, i) => (
          <div
            key={`${msg.at || "m"}-${i}`}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-purple-600 text-white"
                  : "border border-white/5 bg-white/5 text-gray-200"
              }`}
            >
              {msg.at ? (
                <div
                  className={`mb-1 text-[10px] ${
                    msg.role === "user" ? "text-purple-200/70" : "text-gray-500"
                  }`}
                >
                  {formatTime(msg.at)}
                  {msg.hadImage && !msg.imagePreview ? " · 📷 image" : ""}
                  {msg.hadPdf ? " · 📄 PDF" : ""}
                </div>
              ) : null}
              {msg.imagePreview ? (
                <img
                  src={msg.imagePreview}
                  alt="Attached"
                  className="mb-2 max-h-40 rounded-lg border border-white/10 object-contain"
                />
              ) : null}
              <div className="whitespace-pre-wrap">{msg.text}</div>
            </div>
          </div>
        ))}
        {loading ? (
          <div className="px-1 text-xs text-gray-500">
            Reading… (PDFs/images can take longer; API may wake up first)
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {pendingImage ? (
        <div className="mb-2 flex items-center gap-3 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2">
          {pendingImage.kind === "image" && pendingImage.preview ? (
            <img
              src={pendingImage.preview}
              alt="Preview"
              className="h-14 w-14 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-white/10 text-2xl">
              📄
            </div>
          )}
          <div className="min-w-0 flex-1 text-xs text-purple-100">
            {pendingImage.kind === "pdf" ? "PDF" : "Image"} ready
            {pendingImage.name ? ` — ${pendingImage.name}` : ""} · add a note or Send
          </div>
          <button
            type="button"
            onClick={() => setPendingImage(null)}
            className="text-xs text-gray-400 hover:text-white"
          >
            Remove
          </button>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf,.pdf"
          className="hidden"
          onChange={onPickFile}
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => fileRef.current?.click()}
          title="Attach image or PDF"
          className="rounded-xl border border-gray-700 bg-[#0b0b0f] px-3 py-3 text-sm text-gray-300 transition hover:border-purple-500 hover:text-white disabled:opacity-50"
        >
          📎
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message, image, or PDF…"
          disabled={loading}
          className="flex-1 rounded-xl border border-gray-700 bg-[#0b0b0f] px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-purple-500 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || (!input.trim() && !pendingImage)}
          className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-medium transition hover:bg-purple-500 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
