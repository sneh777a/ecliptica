import { Fragment, useEffect, useId, useRef, useState } from "react";
import useAssistant from "./useAssistant";
import "./Assistant.css";

const SUGGESTIONS = [
  {
    icon: "book",
    label: "Learn something",
    prompt: "Explain a tricky concept in simple terms, then give me a quick example.",
  },
  {
    icon: "calendar",
    label: "Plan my study",
    prompt: "Help me make a realistic study plan for this week.",
  },
  {
    icon: "target",
    label: "Check my goals",
    prompt: "What should I focus on next based on my goals and tasks?",
  },
  {
    icon: "quiz",
    label: "Quiz me",
    prompt: "Quiz me on a topic I choose, one question at a time.",
  },
];

const FILE_ACCEPT =
  "image/*,.pdf,.docx,.pptx,.xlsx,.xlsm,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function attachmentLabel(attachment) {
  if (attachment?.kind === "pdf") return "PDF";
  if (attachment?.kind === "docx") return "Word document";
  if (attachment?.kind === "pptx") return "PowerPoint";
  if (attachment?.kind === "xlsx") return "spreadsheet";
  return "image";
}

function Icon({ name, size = 17 }) {
  const paths = {
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21V5.5Z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8M8 10h6" /></>,
    calendar: <><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M7.5 3.5v3M16.5 3.5v3M3.5 9h17M8 13h2M14 13h2M8 16h2" /></>,
    target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
    quiz: <><path d="M9.5 9a2.6 2.6 0 1 1 4.5 1.8c-1.1 1-2 1.4-2 3" /><path d="M12 17.5h.01" /><circle cx="12" cy="12" r="9" /></>,
    send: <><path d="m21 3-7.3 18-3.9-7.8L2 9.3 21 3Z" /><path d="M9.8 13.2 21 3" /></>,
    attach: <><path d="m8.5 12.5 6.6-6.6a3 3 0 0 1 4.2 4.2l-8.8 8.8a4.5 4.5 0 0 1-6.4-6.4l8.1-8.1" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    minimize: <path d="M5 12h14" />,
    trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="m5.5 7 .8 13h11.4l.8-13M9 7V4h6v3" /></>,
    retry: <><path d="M20 7v5h-5" /><path d="M19 12a7 7 0 1 0 1 4" /></>,
    sparkle: <><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z" /></>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function formatInline(text, keyPrefix) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${keyPrefix}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={`${keyPrefix}-${index}`}>{part.slice(1, -1)}</code>;
    }
    return <Fragment key={`${keyPrefix}-${index}`}>{part}</Fragment>;
  });
}

function SafeMessageText({ text }) {
  return (
    <div className="assistant-message__text">
      {String(text).split("\n").map((line, index) => (
        <Fragment key={`line-${index}`}>
          {index > 0 ? <br /> : null}
          {line.startsWith("- ") || line.startsWith("* ")
            ? <>• {formatInline(line.slice(2), `item-${index}`)}</>
            : formatInline(line, `line-${index}`)}
        </Fragment>
      ))}
    </div>
  );
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function fileKindLabel(message) {
  if (message.hadImage) return "Image";
  if (message.hadPdf) return "PDF";
  if (message.hadDoc) return "Document";
  return "";
}

export default function AssistantChat({ variant = "page", onMinimize, onClose }) {
  const {
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
  } = useAssistant();
  const [input, setInput] = useState("");
  const [readingFile, setReadingFile] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const panelTitleId = useId();
  const isFloating = variant === "floating";
  const hasUserMessage = messages.some((message) => message.role === "user");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  useEffect(() => {
    if (isFloating) textareaRef.current?.focus();
  }, [isFloating]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (loading || readingFile || (!input.trim() && !pendingAttachment)) return;
    void send(input, pendingAttachment);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "";
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleInput = (event) => {
    setInput(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 112)}px`;
  };

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setReadingFile(true);
    setError("");
    try {
      const attachment = await prepareAttachment(file);
      setPendingAttachment(attachment);
    } catch (attachmentError) {
      setError(attachmentError.message || "Could not prepare that attachment.");
    } finally {
      setReadingFile(false);
    }
  };

  const removeAttachment = () => {
    setPendingAttachment(null);
    setFileInputKey((current) => current + 1);
  };

  const content = (
    <>
      <header className="assistant-chat__header">
        <div className="assistant-chat__identity">
          <span className="assistant-avatar" aria-hidden="true">
            <span className="assistant-avatar__planet" />
            <span className="assistant-avatar__satellite" />
          </span>
          <span className="assistant-chat__identity-copy">
            <strong id={panelTitleId}>Ecliptica AI</strong>
            <span>Your study companion</span>
          </span>
        </div>
        <div className="assistant-chat__header-actions">
          <button
            type="button"
            className="assistant-icon-button assistant-chat__clear"
            onClick={clearConversation}
            disabled={loading}
            aria-label="Clear conversation"
            title="Clear conversation"
          >
            <Icon name="trash" size={15} />
          </button>
          {isFloating ? (
            <>
              <button
                type="button"
                className="assistant-icon-button"
                onClick={onMinimize}
                aria-label="Minimize assistant"
                title="Minimize"
              >
                <Icon name="minimize" size={17} />
              </button>
              <button
                type="button"
                className="assistant-icon-button"
                onClick={onClose}
                aria-label="Close assistant"
                title="Close"
              >
                <Icon name="close" size={17} />
              </button>
            </>
          ) : null}
        </div>
      </header>

      <div className="assistant-chat__messages" role="log" aria-label="Conversation" aria-live="polite">
        {!hasUserMessage ? (
          <div className="assistant-welcome">
            <div className="assistant-welcome__mark"><Icon name="sparkle" size={19} /></div>
            <p className="assistant-welcome__eyebrow">A LITTLE HELP, WHENEVER YOU NEED IT</p>
            <h2>Let’s make today count.</h2>
            <p className="assistant-welcome__copy">
              Learn something new, find a study rhythm, or take the next step toward a goal.
            </p>
            <div className="assistant-suggestions" aria-label="Suggested prompts">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  type="button"
                  className="assistant-suggestion"
                  key={suggestion.label}
                  disabled={loading}
                  onClick={() => void send(suggestion.prompt, null)}
                >
                  <span className="assistant-suggestion__icon"><Icon name={suggestion.icon} size={15} /></span>
                  <span>{suggestion.label}</span>
                  <span className="assistant-suggestion__arrow">↗</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.filter((message) => message.id !== "welcome").map((message) => (
          <article
            key={message.id}
            className={`assistant-message assistant-message--${message.role}${message.error ? " assistant-message--error" : ""}`}
          >
            {message.role === "assistant" ? (
              <span className="assistant-message__avatar" aria-hidden="true">
                <Icon name="sparkle" size={13} />
              </span>
            ) : null}
            <div className="assistant-message__body">
              <div className="assistant-message__bubble">
                {message.imagePreview ? (
                  <img className="assistant-message__image" src={message.imagePreview} alt="User attachment" />
                ) : null}
                <SafeMessageText text={message.text} />
              </div>
              <div className="assistant-message__meta">
                <time dateTime={message.at || undefined}>{formatTime(message.at)}</time>
                {fileKindLabel(message) ? <span>{fileKindLabel(message)} attached</span> : null}
                {message.error && failedRequest ? (
                  <button type="button" className="assistant-retry" onClick={retry} disabled={loading}>
                    <Icon name="retry" size={13} /> Retry
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}

        {error && !messages.some((message) => message.error && message.text === error) ? (
          <p className="assistant-chat__notice" role="status">{error}</p>
        ) : null}

        {loading ? (
          <div className="assistant-typing" role="status" aria-label="Ecliptica AI is thinking">
            <span className="assistant-message__avatar" aria-hidden="true"><Icon name="sparkle" size={13} /></span>
            <span className="assistant-typing__bubble">
              <span /><span /><span />
              <span className="assistant-typing__label">Thinking through it</span>
            </span>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {pendingAttachment ? (
        <div className="assistant-attachment">
          {pendingAttachment.preview ? (
            <img src={pendingAttachment.preview} alt="" />
          ) : (
            <span className="assistant-attachment__file"><Icon name="attach" size={17} /></span>
          )}
          <span className="assistant-attachment__name">
            <strong>{pendingAttachment.name}</strong>
            <small>{attachmentLabel(pendingAttachment)} ready to share</small>
          </span>
          <button type="button" onClick={removeAttachment} aria-label="Remove attachment">
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : null}

      <form className="assistant-composer" onSubmit={handleSubmit}>
        <input
          key={fileInputKey}
          ref={fileInputRef}
          type="file"
          accept={FILE_ACCEPT}
          className="assistant-composer__file-input"
          aria-label="Attach a file"
          onChange={handleFile}
        />
        <button
          type="button"
          className="assistant-icon-button assistant-composer__attach"
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || readingFile}
          aria-label="Attach image, PDF, Word, PowerPoint, or Excel file"
          title="Attach a file"
        >
          <Icon name="attach" size={18} />
        </button>
        <label className="assistant-composer__field">
          <span className="assistant-sr-only">Message Ecliptica AI</span>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={readingFile ? "Reading your file…" : "Ask, plan, or learn something…"}
            rows={1}
            maxLength={4000}
            disabled={loading || readingFile}
          />
        </label>
        <button
          type="submit"
          className="assistant-send"
          disabled={loading || readingFile || (!input.trim() && !pendingAttachment)}
          aria-label={loading ? "Generating response" : "Send message"}
          title="Send message"
        >
          {loading ? <span className="assistant-send__spinner" /> : <Icon name="send" size={17} />}
        </button>
      </form>
      <p className="assistant-chat__hint">Enter to send · Shift + Enter for a new line</p>
    </>
  );

  if (isFloating) {
    return (
      <section className="assistant-chat assistant-chat--floating" aria-labelledby={panelTitleId}>
        {content}
      </section>
    );
  }

  return (
    <section className="assistant-page">
      <div className="assistant-page__ambient" aria-hidden="true" />
      <div className="assistant-page__heading">
        <div>
          <p className="assistant-page__eyebrow"><Icon name="sparkle" size={14} /> YOUR PERSONAL STUDY COMPANION</p>
          <h1>Ask Ecliptica AI</h1>
          <p>Learn, plan, and make progress toward the things that matter.</p>
        </div>
        <div className="assistant-page__capabilities">
          <span><Icon name="book" size={14} /> Learn</span>
          <span><Icon name="calendar" size={14} /> Plan</span>
          <span><Icon name="target" size={14} /> Make progress</span>
        </div>
      </div>
      <section className="assistant-chat assistant-chat--page" aria-labelledby={panelTitleId}>
        {content}
      </section>
    </section>
  );
}
