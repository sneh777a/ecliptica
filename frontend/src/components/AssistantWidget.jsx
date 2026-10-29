import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import AssistantChat from "./AssistantChat";
import useAssistant from "./useAssistant";
import "./Assistant.css";

export default function AssistantWidget() {
  const { messages } = useAssistant();
  const { pathname } = useLocation();
  const [panelMode, setPanelMode] = useState("closed");
  const [seenReplyCount, setSeenReplyCount] = useState(() =>
    messages.filter((message) => message.role === "assistant" && message.id !== "welcome").length
  );
  const previousPanelMode = useRef(panelMode);
  const floatingButtonRef = useRef(null);
  const minimizedResumeRef = useRef(null);

  const replyCount = messages.filter(
    (message) => message.role === "assistant" && message.id !== "welcome"
  ).length;
  const unread = panelMode === "open" ? 0 : Math.max(0, replyCount - seenReplyCount);

  useEffect(() => {
    if (previousPanelMode.current !== "closed" && panelMode === "closed") {
      floatingButtonRef.current?.focus();
    } else if (previousPanelMode.current === "open" && panelMode === "minimized") {
      minimizedResumeRef.current?.focus();
    }
    previousPanelMode.current = panelMode;
  }, [panelMode]);

  return (
    <div className={`assistant-widget${pathname === "/goals" ? " assistant-widget--goals" : ""}`}>
      {panelMode === "open" ? (
        <AssistantChat
          variant="floating"
          onMinimize={() => {
            setSeenReplyCount(replyCount);
            setPanelMode("minimized");
          }}
          onClose={() => {
            setSeenReplyCount(replyCount);
            setPanelMode("closed");
          }}
        />
      ) : null}

      {panelMode === "minimized" ? (
        <div className="assistant-minimized">
          <span className="assistant-avatar assistant-avatar--small" aria-hidden="true">
            <span className="assistant-avatar__planet" />
            <span className="assistant-avatar__satellite" />
          </span>
          <span className="assistant-minimized__copy">
            <strong>Ecliptica AI</strong>
            <small>Conversation saved</small>
          </span>
          <button
            ref={minimizedResumeRef}
            type="button"
            className="assistant-minimized__resume"
            onClick={() => {
              setSeenReplyCount(replyCount);
              setPanelMode("open");
            }}
          >
            Resume
          </button>
          <button
            type="button"
            className="assistant-minimized__close"
            aria-label="Close minimized assistant"
            onClick={() => {
              setSeenReplyCount(replyCount);
              setPanelMode("closed");
            }}
          >
            ×
          </button>
        </div>
      ) : null}

      {panelMode === "closed" ? (
        <button
          ref={floatingButtonRef}
          type="button"
          className="assistant-orb-button"
          aria-label={unread ? `Open Ecliptica AI, ${unread} new ${unread === 1 ? "reply" : "replies"}` : "Open Ecliptica AI"}
          aria-expanded={false}
          onClick={() => {
            setSeenReplyCount(replyCount);
            setPanelMode("open");
          }}
        >
          <span className="assistant-orb-button__halo" />
          <span className="assistant-orb-button__orb">
            <span className="assistant-orb-button__planet" />
            <span className="assistant-orb-button__ring" />
            <span className="assistant-orb-button__spark assistant-orb-button__spark--one" />
            <span className="assistant-orb-button__spark assistant-orb-button__spark--two" />
          </span>
          <span className="assistant-orb-button__label">Ask Ecliptica AI</span>
          {unread > 0 ? <span className="assistant-orb-button__badge">{unread > 9 ? "9+" : unread}</span> : null}
        </button>
      ) : null}
    </div>
  );
}
