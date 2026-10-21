import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createApi } from "../api";
import AssistantContext from "./AssistantContext";

const CHAT_STORAGE_KEY = "ecliptica_assistant_chat_v1";
const MAX_STORED_MESSAGES = 120;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 8 * 1024 * 1024;

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  text: "Hey! I’m your Ecliptica AI companion. I can help you understand a tricky topic, plan your study time, quiz you, or make progress on your goals. What would you like to work on?",
  at: null,
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getChatStorageKey(token) {
  if (!token) return CHAT_STORAGE_KEY;
  try {
    const payload = token.split(".")[1];
    const base64Payload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64Payload.padEnd(Math.ceil(base64Payload.length / 4) * 4, "=");
    const claims = JSON.parse(window.atob(normalized));
    if (claims.sub) return `${CHAT_STORAGE_KEY}_${String(claims.sub)}`;
  } catch {
    return CHAT_STORAGE_KEY;
  }
  return CHAT_STORAGE_KEY;
}

function readChatLog(storageKey) {
  try {
    let stored = localStorage.getItem(storageKey);
    if (!stored && storageKey !== CHAT_STORAGE_KEY) {
      stored = localStorage.getItem(CHAT_STORAGE_KEY);
      if (stored) {
        localStorage.setItem(storageKey, stored);
        localStorage.removeItem(CHAT_STORAGE_KEY);
      }
    }
    if (!stored) return [WELCOME_MESSAGE];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [WELCOME_MESSAGE];
    const messages = parsed
      .filter((message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.text === "string" &&
        !(message.role === "assistant" && !message.at && message.text.startsWith("I'm your Ecliptica coach"))
      )
      .map((message) => ({
        id: message.id || makeId(),
        role: message.role,
        text: message.text,
        at: message.at || null,
        hadImage: Boolean(message.hadImage),
        hadPdf: Boolean(message.hadPdf),
        hadDoc: Boolean(message.hadDoc),
        error: Boolean(message.error),
      }));
    return messages.length ? messages : [WELCOME_MESSAGE];
  } catch {
    return [WELCOME_MESSAGE];
  }
}

function safeErrorMessage(error) {
  const status = error?.response?.status;
  if (status === 401) return "Your session may have expired. Sign in again to keep chatting.";
  if (status === 429) return "Ecliptica AI has reached its current request limit. Please try again in a little while.";
  if (status === 503) return "The AI service isn’t ready right now. Please try again later.";
  if (error?.code === "ECONNABORTED" || /timeout/i.test(error?.message || "")) {
    return "That took longer than expected. Please try again.";
  }
  if (error?.message === "Network Error") {
    return "I couldn’t reach Ecliptica AI. Check your connection and try again.";
  }
  return "Something interrupted the response. Please try again.";
}

function attachmentLabel(attachment) {
  if (!attachment) return "";
  if (attachment.kind === "pdf") return "PDF";
  if (attachment.kind === "docx") return "Word document";
  if (attachment.kind === "pptx") return "PowerPoint";
  if (attachment.kind === "xlsx") return "spreadsheet";
  return "image";
}

export default function AssistantProvider({ children }) {
  const token = typeof window === "undefined" ? null : localStorage.getItem("token");
  const storageKey = useMemo(() => getChatStorageKey(token), [token]);
  const [messages, setMessages] = useState(() => readChatLog(storageKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState(null);
  const [failedRequest, setFailedRequest] = useState(null);
  const messagesRef = useRef(messages);
  const sendingRef = useRef(false);
  const mountedRef = useRef(false);
  const api = useMemo(() => createApi(token, 120000), [token]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    try {
      const stored = messages.slice(-MAX_STORED_MESSAGES).map((message) => ({
        id: message.id,
        role: message.role,
        text: message.text,
        at: message.at || null,
        hadImage: Boolean(message.hadImage || message.imagePreview),
        hadPdf: Boolean(message.hadPdf),
        hadDoc: Boolean(message.hadDoc),
        error: Boolean(message.error),
      }));
      localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch {
      if (mountedRef.current) {
        setError("This browser couldn’t save the conversation on this device.");
      }
    }
  }, [messages, storageKey]);

  const appendMessages = useCallback((newMessages) => {
    setMessages((current) => {
      const next = [...current, ...newMessages].slice(-MAX_STORED_MESSAGES);
      messagesRef.current = next;
      return next;
    });
  }, []);

  const prepareAttachment = useCallback((file) => new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }
    const name = (file.name || "").toLowerCase();
    const isImage = file.type.startsWith("image/");
    let kind = null;
    if (isImage) kind = "image";
    else if (file.type === "application/pdf" || name.endsWith(".pdf")) kind = "pdf";
    else if (name.endsWith(".docx")) kind = "docx";
    else if (name.endsWith(".pptx")) kind = "pptx";
    else if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) kind = "xlsx";

    if (!kind) {
      reject(new Error("Choose an image, PDF, Word, PowerPoint, or Excel file."));
      return;
    }
    const maxBytes = kind === "image" ? MAX_IMAGE_BYTES : MAX_DOCUMENT_BYTES;
    const maxMb = kind === "image" ? 4 : 8;
    if (file.size > maxBytes) {
      reject(new Error(`${attachmentLabel({ kind })} is too large. The limit is ${maxMb} MB.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.split(",")[1] || "";
      if (!base64) {
        reject(new Error("I couldn’t read that file. Please try another one."));
        return;
      }
      resolve({
        kind,
        name: file.name,
        base64,
        mime: file.type || "application/octet-stream",
        preview: kind === "image" ? dataUrl : null,
      });
    };
    reader.onerror = () => reject(new Error("I couldn’t read that file. Please try another one."));
    reader.readAsDataURL(file);
  }), []);

  const send = useCallback(async (messageText, attachment = pendingAttachment, retry = null) => {
    const text = String(messageText || "").trim();
    if ((!text && !attachment) || sendingRef.current) return false;
    if (!token) {
      window.location.href = "/login";
      return false;
    }

    const displayText = text || `Please read this ${attachmentLabel(attachment)}${attachment?.name ? `: ${attachment.name}` : ""}.`;
    let history = retry?.history;
    if (!history) {
      const conversation = messagesRef.current.filter(
        (message) => message.text && !message.error && message.id !== "welcome"
      );
      const firstUserMessage = conversation.findIndex((message) => message.role === "user");
      history = (firstUserMessage < 0 ? [] : conversation.slice(firstUserMessage))
        .slice(-12)
        .map((message) => ({ role: message.role, text: message.text }));
    }
    const request = {
      message: displayText,
      attachment,
      history,
    };

    sendingRef.current = true;
    setLoading(true);
    setError("");
    setFailedRequest(null);
    if (!retry) {
      appendMessages([{
        id: makeId(),
        role: "user",
        text: displayText,
        at: new Date().toISOString(),
        imagePreview: attachment?.preview || null,
        hadImage: attachment?.kind === "image",
        hadPdf: attachment?.kind === "pdf",
        hadDoc: ["docx", "pptx", "xlsx"].includes(attachment?.kind),
      }]);
      setPendingAttachment(null);
    }

    try {
      const payload = { message: request.message, history: request.history };
      if (attachment?.kind === "image") {
        payload.image_base64 = attachment.base64;
        payload.image_mime = attachment.mime;
      } else if (attachment?.kind) {
        payload.file_base64 = attachment.base64;
        payload.file_type = attachment.kind;
        payload.file_name = attachment.name || "";
        if (attachment.kind === "pdf") payload.pdf_base64 = attachment.base64;
      }

      const response = await api.post("/assistant/chat", payload);
      if (!mountedRef.current) return false;
      let reply = response.data?.reply;
      if (typeof reply !== "string" || !reply.trim()) {
        reply = "I couldn’t make a response this time. Please try again.";
      }
      const actions = response.data?.actions_applied;
      if (
        Array.isArray(actions) &&
        actions.length > 0 &&
        !actions.some((action) => reply.includes(action))
      ) {
        reply += `\n\n${actions.map((action) => `✓ ${action}`).join("\n")}`;
      }
      appendMessages([{
        id: makeId(),
        role: "assistant",
        text: reply,
        at: new Date().toISOString(),
      }]);
      setFailedRequest(null);
      return true;
    } catch (requestError) {
      if (mountedRef.current) {
        const friendlyError = safeErrorMessage(requestError);
        setError(friendlyError);
        setFailedRequest(request);
        appendMessages([{
          id: makeId(),
          role: "assistant",
          text: friendlyError,
          at: new Date().toISOString(),
          error: true,
        }]);
      }
      return false;
    } finally {
      sendingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, [api, appendMessages, pendingAttachment, token]);

  const retry = useCallback(() => {
    if (!failedRequest) return;
    const retryHistory = failedRequest.history.filter((message) => !message.error);
    void send(failedRequest.message, failedRequest.attachment, {
      history: retryHistory,
    });
  }, [failedRequest, send]);

  const clearConversation = useCallback(() => {
    if (!window.confirm("Clear this chat on this device? Your goals and tasks will stay safe.")) {
      return;
    }
    const fresh = [{ ...WELCOME_MESSAGE, id: "welcome", at: null }];
    messagesRef.current = fresh;
    setMessages(fresh);
    setError("");
    setFailedRequest(null);
    setPendingAttachment(null);
    try {
      localStorage.setItem(storageKey, JSON.stringify(fresh));
    } catch {
      setError("This browser couldn’t save the conversation on this device.");
    }
  }, [storageKey]);

  const value = useMemo(() => ({
    messages,
    loading,
    error,
    pendingAttachment,
    failedRequest,
    setPendingAttachment,
    setError,
    prepareAttachment,
    send,
    retry,
    clearConversation,
  }), [
    clearConversation,
    error,
    failedRequest,
    loading,
    messages,
    pendingAttachment,
    prepareAttachment,
    retry,
    send,
  ]);

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}
