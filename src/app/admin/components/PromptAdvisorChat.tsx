"use client";

import { useState, useRef, useEffect } from "react";
import { usePromptAdvisor, type AdvisorMessage } from "../hooks/usePromptAdvisor";
import styles from "./PromptAdvisorChat.module.css";

interface PromptAdvisorChatProps {
  submissionId?: string;
  photoAnalyses?: Record<string, unknown>;
  compact?: boolean;
}

const SUGGESTIONS = [
  "Show me the current prompts",
  "Which checks fail most often?",
  "The blur check is too strict",
  "Why would a side view photo fail?",
  "Make the lighting check more lenient",
  "What does the front view prompt look for?",
];

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Simple markdown-like rendering: **bold**, `code`, bullet points */
function renderContent(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle bullet points
    const isBullet = /^[-*•]\s/.test(line);
    if (isBullet) {
      line = line.replace(/^[-*•]\s/, "");
    }

    // Process inline formatting
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**")) {
        parts.push(<strong key={`${i}-${match.index}`}>{token.slice(2, -2)}</strong>);
      } else if (token.startsWith("`")) {
        parts.push(<code key={`${i}-${match.index}`} className={styles.inlineCode}>{token.slice(1, -1)}</code>);
      }
      lastIndex = match.index + token.length;
    }
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    if (isBullet) {
      elements.push(
        <div key={i} className={styles.bulletLine}>
          <span className={styles.bulletDot}>•</span>
          <span>{parts}</span>
        </div>
      );
    } else if (line.trim() === "") {
      elements.push(<br key={i} />);
    } else {
      elements.push(<p key={i} className={styles.textLine}>{parts}</p>);
    }
  }

  return elements;
}

export function PromptAdvisorChat({ submissionId, photoAnalyses, compact }: PromptAdvisorChatProps) {
  const { messages, sendMessage, isLoading, clearMessages } = usePromptAdvisor(
    submissionId || photoAnalyses
      ? { submissionId, photoAnalyses }
      : undefined
  );

  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading]);

  function handleSend() {
    const text = draft.trim();
    if (!text || isLoading) return;
    setDraft("");
    sendMessage(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSuggestion(text: string) {
    sendMessage(text);
  }

  return (
    <div className={`${styles.panel} ${compact ? styles.panelCompact : ""}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>🤖</span>
          <div>
            <span className={styles.headerTitle}>AI Prompt Advisor</span>
            <span className={styles.headerSub}>Helps you optimize photo analysis prompts</span>
          </div>
        </div>
        {messages.length > 0 && (
          <button className={styles.clearBtn} onClick={clearMessages} title="Clear conversation">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Messages */}
      <div className={styles.messageList}>
        {messages.length === 0 ? (
          <div className={styles.welcome}>
            <div className={styles.welcomeIcon}>✨</div>
            <p className={styles.welcomeTitle}>How can I help?</p>
            <p className={styles.welcomeText}>
              I can help you understand and improve the AI prompts that analyze patient dental photos.
              Ask me about failure patterns, suggest changes, or let me optimize a specific check.
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className={styles.suggestionChip}
                  onClick={() => handleSuggestion(s)}
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg: AdvisorMessage) => (
              <div
                key={msg.id}
                className={`${styles.messageWrap} ${
                  msg.role === "user" ? styles.messageUser : styles.messageAssistant
                }`}
              >
                {msg.role === "assistant" && (
                  <span className={styles.avatarBot}>🤖</span>
                )}
                <div
                  className={`${styles.bubble} ${
                    msg.role === "user" ? styles.bubbleUser : styles.bubbleAssistant
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className={styles.richContent}>{renderContent(msg.content)}</div>
                  ) : (
                    msg.content
                  )}
                </div>
                <span className={styles.timestamp}>{formatTime(msg.timestamp)}</span>
              </div>
            ))}

            {isLoading && (
              <div className={`${styles.messageWrap} ${styles.messageAssistant}`}>
                <span className={styles.avatarBot}>🤖</span>
                <div className={`${styles.bubble} ${styles.bubbleAssistant}`}>
                  <div className={styles.typingIndicator}>
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={styles.inputBar}>
        <textarea
          ref={inputRef}
          className={styles.input}
          placeholder="Ask about prompts, suggest changes…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isLoading}
        />
        <button
          className={styles.sendBtn}
          onClick={handleSend}
          disabled={!draft.trim() || isLoading}
          aria-label="Send"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M18.5 1.5L9 11M18.5 1.5L12.5 18.5L9 11M18.5 1.5L1.5 7.5L9 11"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
